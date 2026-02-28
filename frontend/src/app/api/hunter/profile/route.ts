import { NextResponse } from 'next/server';
import { access, readFile } from 'node:fs/promises';
import path from 'node:path';
import type { HunterProfile } from '@/types/hunter-profile';
import type { LanguageCode } from '@/types/agent';

interface ExperienceRecord {
  missionId: string;
  serviceUsed: string;
  taskType: string;
  score: number;
  lesson: string;
  lessonTranslations?: Partial<Record<LanguageCode, string>>;
}

interface FeedbackRecord {
  missionId: string;
  serviceId: string;
  taskType: string;
  score: number;
}

const MON_WEI = BigInt('1000000000000000000');
const FEEDBACK_SCORE_WEIGHT = 0.35;
const DEFAULT_LOCALE: LanguageCode = 'en-US';
const SUPPORTED_LOCALES: LanguageCode[] = ['en-US', 'zh-CN'];

function toRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' ? (value as Record<string, unknown>) : null;
}

function safeString(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

function normalizeLocale(input: string | null | undefined): LanguageCode {
  if (typeof input !== 'string') return DEFAULT_LOCALE;
  return SUPPORTED_LOCALES.includes(input as LanguageCode) ? (input as LanguageCode) : DEFAULT_LOCALE;
}

function safeNumber(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : Number.NaN;
}

function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

function compactLesson(value: string): string {
  return value.replace(/\s+/g, ' ').trim();
}

function stripLessonMarkdown(value: string): string {
  return compactLesson(
    value
      .replace(/\*\*(.+?)\*\*/g, '$1')
      .replace(/\*(.+?)\*/g, '$1')
      .replace(/^#{1,4}\s+/gm, '')
      .replace(/^-{3,}/gm, '')
      .replace(/^[\-*]\s+/gm, '')
      .replace(/\[(.+?)\]\(.+?\)/g, '$1')
      .replace(/`(.+?)`/g, '$1')
  );
}

function normalizeLessonTranslations(value: unknown): Partial<Record<LanguageCode, string>> | undefined {
  const record = toRecord(value);
  if (!record) return undefined;

  const en = compactLesson(safeString(record['en-US']));
  const zh = compactLesson(safeString(record['zh-CN']));
  if (!en && !zh) {
    return undefined;
  }

  return {
    ...(en ? { 'en-US': en } : {}),
    ...(zh ? { 'zh-CN': zh } : {}),
  };
}

function selectLessonText(
  lesson: string,
  lessonTranslations: Partial<Record<LanguageCode, string>> | undefined,
  locale: LanguageCode,
): string {
  return compactLesson(
    lessonTranslations?.[locale]
    ?? lessonTranslations?.[DEFAULT_LOCALE]
    ?? lesson
  );
}

function isLowQualityInsight(rawLesson: string): boolean {
  const compact = stripLessonMarkdown(rawLesson);
  if (!compact) return true;
  if (compact.length < 12) return true;
  if (compact.length > 170) return true;

  const lowered = compact.toLowerCase();
  const noiseMarkers = [
    'document control',
    'investment brief',
    'market context',
    'current status',
    'executive summary format',
    'audit report template',
  ];

  if (noiseMarkers.some((marker) => lowered.includes(marker))) {
    return true;
  }

  const startsWithHeading = /^[A-Z0-9][A-Z0-9\s:/|-]{18,}$/.test(compact.slice(0, 36));
  return startsWithHeading;
}

function formatWeiToMON(wei: bigint): string {
  const whole = wei / MON_WEI;
  const fraction = wei % MON_WEI;
  if (fraction === BigInt(0)) return whole.toString();
  const padded = fraction.toString().padStart(18, '0');
  const trimmed = padded.slice(0, 4).replace(/0+$/, '');
  return trimmed.length > 0 ? `${whole.toString()}.${trimmed}` : whole.toString();
}

async function readJsonFile<T>(filePath: string, fallback: T): Promise<T> {
  try {
    const raw = await readFile(filePath, 'utf8');
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

async function fileExists(filePath: string): Promise<boolean> {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function resolveRepoRoot(): Promise<string> {
  const candidates = [
    process.env.INIT_CWD,
    process.cwd(),
    path.resolve(process.cwd(), '..'),
  ].filter((item): item is string => Boolean(item));
  const unique = [...new Set(candidates)];

  for (const root of unique) {
    const marker = path.join(root, 'agents/hunter/memory/experience.json');
    if (await fileExists(marker)) {
      return root;
    }
  }
  return unique[0] ?? process.cwd();
}

function normalizeExperience(raw: unknown): ExperienceRecord | null {
  const record = toRecord(raw);
  if (!record) return null;

  const missionId = safeString(record.missionId).trim();
  const serviceUsed = safeString(record.serviceUsed).trim();
  const taskType = safeString(record.taskType).trim();
  const lesson = safeString(record.lesson).trim();
  const rawScore = safeNumber(record.score);
  if (!missionId || !serviceUsed || !taskType || !lesson || !Number.isFinite(rawScore)) {
    return null;
  }
  const normalized = rawScore > 10 ? rawScore / 10 : rawScore;
  const score = Math.max(0, Math.min(10, normalized));
  return {
    missionId,
    serviceUsed,
    taskType,
    score,
    lesson,
    lessonTranslations: normalizeLessonTranslations(record.lessonTranslations),
  };
}

function buildPriceMap(staticServices: unknown, dynamicServices: unknown): Map<string, bigint> {
  const map = new Map<string, bigint>();

  const staticList = Array.isArray(toRecord(staticServices)?.services)
    ? (toRecord(staticServices)?.services as unknown[])
    : [];
  for (const item of staticList) {
    const service = toRecord(item);
    const id = safeString(service?.id).trim();
    const price = safeString(service?.price).trim();
    if (!id || !/^\d+$/.test(price)) continue;
    map.set(id, BigInt(price));
  }

  const dynamicList = Array.isArray(toRecord(dynamicServices)?.services)
    ? (toRecord(dynamicServices)?.services as unknown[])
    : [];
  for (const item of dynamicList) {
    const wrapper = toRecord(item);
    const service = toRecord(wrapper?.service);
    const id = safeString(service?.id).trim();
    const price = safeString(service?.price).trim();
    if (!id || !/^\d+$/.test(price)) continue;
    map.set(id, BigInt(price));
  }
  return map;
}

function buildServiceTaskTypeMap(staticServices: unknown, dynamicServices: unknown): Map<string, string> {
  const map = new Map<string, string>();

  const staticList = Array.isArray(toRecord(staticServices)?.services)
    ? (toRecord(staticServices)?.services as unknown[])
    : [];
  for (const item of staticList) {
    const service = toRecord(item);
    const id = safeString(service?.id).trim();
    const taskType = safeString(service?.taskType).trim();
    if (!id || !taskType) continue;
    map.set(id, taskType);
  }

  const dynamicList = Array.isArray(toRecord(dynamicServices)?.services)
    ? (toRecord(dynamicServices)?.services as unknown[])
    : [];
  for (const item of dynamicList) {
    const wrapper = toRecord(item);
    const service = toRecord(wrapper?.service);
    const id = safeString(service?.id).trim();
    const taskType = safeString(service?.taskType).trim();
    if (!id || !taskType) continue;
    map.set(id, taskType);
  }

  return map;
}

function normalizeFeedback(
  raw: unknown,
  taskTypeByServiceId: Map<string, string>,
  missionIds: Set<string>,
): FeedbackRecord | null {
  const record = toRecord(raw);
  if (!record) return null;

  const missionId = safeString(record.missionId).trim();
  const serviceId = safeString(record.serviceId).trim();
  const rawScore = safeNumber(record.score);
  if (!missionId || !serviceId || !Number.isFinite(rawScore)) {
    return null;
  }
  if (missionIds.size > 0 && !missionIds.has(missionId)) {
    return null;
  }

  const mappedTaskType = taskTypeByServiceId.get(serviceId) ?? '';
  const rawTaskType = safeString(record.taskType).trim();
  const taskType = mappedTaskType || rawTaskType;
  if (!taskType) {
    return null;
  }

  const normalized = rawScore > 10 ? rawScore / 10 : rawScore;
  const score = Math.max(0, Math.min(10, normalized));

  return { missionId, serviceId, taskType, score };
}

function blendAverage(
  experienceScoreTotal: number,
  experienceSamples: number,
  feedbackScoreTotal: number,
  feedbackSamples: number,
): number {
  const denominator = experienceSamples + feedbackSamples * FEEDBACK_SCORE_WEIGHT;
  if (denominator <= 0) return 0;
  const numerator = experienceScoreTotal + feedbackScoreTotal * FEEDBACK_SCORE_WEIGHT;
  return round1(numerator / denominator);
}

function buildSkills(
  experiences: ExperienceRecord[],
  feedbackSignals: FeedbackRecord[],
): HunterProfile['skills'] {
  const grouped = new Map<string, {
    count: number;
    experienceScoreTotal: number;
    experienceSamples: number;
    feedbackScoreTotal: number;
    feedbackSamples: number;
  }>();
  for (const item of experiences) {
    const current = grouped.get(item.taskType) ?? {
      count: 0,
      experienceScoreTotal: 0,
      experienceSamples: 0,
      feedbackScoreTotal: 0,
      feedbackSamples: 0,
    };
    current.count += 1;
    current.experienceSamples += 1;
    current.experienceScoreTotal += item.score;
    grouped.set(item.taskType, current);
  }

  for (const signal of feedbackSignals) {
    const current = grouped.get(signal.taskType) ?? {
      count: 0,
      experienceScoreTotal: 0,
      experienceSamples: 0,
      feedbackScoreTotal: 0,
      feedbackSamples: 0,
    };
    current.feedbackSamples += 1;
    current.feedbackScoreTotal += signal.score;
    grouped.set(signal.taskType, current);
  }

  return [...grouped.entries()]
    .map(([taskType, value]) => ({
      taskType,
      count: value.count > 0 ? value.count : value.feedbackSamples,
      avgScore: blendAverage(
        value.experienceScoreTotal,
        value.experienceSamples,
        value.feedbackScoreTotal,
        value.feedbackSamples,
      ),
    }))
    .sort((a, b) => {
      if (b.count !== a.count) return b.count - a.count;
      return b.avgScore - a.avgScore;
    });
}

function buildPreferredAgents(
  experiences: ExperienceRecord[],
  feedbackSignals: FeedbackRecord[],
): HunterProfile['preferredAgents'] {
  const grouped = new Map<string, {
    hires: number;
    experienceScoreTotal: number;
    experienceSamples: number;
    feedbackScoreTotal: number;
    feedbackSamples: number;
  }>();
  for (const item of experiences) {
    const current = grouped.get(item.serviceUsed) ?? {
      hires: 0,
      experienceScoreTotal: 0,
      experienceSamples: 0,
      feedbackScoreTotal: 0,
      feedbackSamples: 0,
    };
    current.hires += 1;
    current.experienceSamples += 1;
    current.experienceScoreTotal += item.score;
    grouped.set(item.serviceUsed, current);
  }

  for (const signal of feedbackSignals) {
    const current = grouped.get(signal.serviceId) ?? {
      hires: 0,
      experienceScoreTotal: 0,
      experienceSamples: 0,
      feedbackScoreTotal: 0,
      feedbackSamples: 0,
    };
    current.feedbackSamples += 1;
    current.feedbackScoreTotal += signal.score;
    grouped.set(signal.serviceId, current);
  }

  return [...grouped.entries()]
    .map(([agentId, value]) => ({
      agentId,
      hires: value.hires > 0 ? value.hires : value.feedbackSamples,
      avgScore: blendAverage(
        value.experienceScoreTotal,
        value.experienceSamples,
        value.feedbackScoreTotal,
        value.feedbackSamples,
      ),
    }))
    .sort((a, b) => {
      if (b.hires !== a.hires) return b.hires - a.hires;
      return b.avgScore - a.avgScore;
    })
    .slice(0, 3);
}

function truncateLesson(lesson: string): string {
  const compact = stripLessonMarkdown(lesson);
  return compact.length > 180 ? `${compact.slice(0, 177)}...` : compact;
}

function buildInsights(
  rawInsights: unknown,
  experiences: ExperienceRecord[],
  locale: LanguageCode,
): HunterProfile['insights'] {
  const list = Array.isArray(toRecord(rawInsights)?.insights)
    ? (toRecord(rawInsights)?.insights as unknown[])
    : [];

  const parsed = list
    .map((item) => {
      const record = toRecord(item);
      const lesson = safeString(record?.lesson);
      const lessonTranslations = normalizeLessonTranslations(record?.lessonTranslations);
      const count = safeNumber(record?.count);
      const updatedAt = safeNumber(record?.updatedAt);
      if (!lesson || !Number.isFinite(count) || count <= 0 || isLowQualityInsight(lesson)) {
        return null;
      }
      return {
        lesson: truncateLesson(selectLessonText(lesson, lessonTranslations, locale)),
        count: Math.floor(count),
        updatedAt: Number.isFinite(updatedAt) ? updatedAt : 0,
      };
    })
    .filter((item): item is { lesson: string; count: number; updatedAt: number } => Boolean(item))
    .sort((a, b) => {
      if (b.count !== a.count) return b.count - a.count;
      return b.updatedAt - a.updatedAt;
    })
    .slice(0, 3)
    .map(({ lesson, count }) => ({ lesson, count }));

  if (parsed.length > 0) return parsed;

  const byLesson = new Map<string, { lesson: string; count: number }>();
  for (const item of experiences) {
    const selectedLesson = selectLessonText(item.lesson, item.lessonTranslations, locale);
    if (isLowQualityInsight(selectedLesson)) {
      continue;
    }
    const key = selectedLesson.toLowerCase().replace(/\s+/g, ' ').trim();
    const current = byLesson.get(key);
    if (!current) {
      byLesson.set(key, { lesson: truncateLesson(selectedLesson), count: 1 });
      continue;
    }
    current.count += 1;
  }

  return [...byLesson.values()]
    .sort((a, b) => b.count - a.count)
    .slice(0, 3);
}

export async function GET(request: Request) {
  const locale = normalizeLocale(new URL(request.url).searchParams.get('locale'));
  const root = await resolveRepoRoot();
  const memoryFile = path.join(root, 'agents/hunter/memory/experience.json');
  const insightsFile = path.join(root, 'agents/hunter/memory/insights.json');
  const staticServicesFile = path.join(root, 'registry/services.json');
  const dynamicServicesFile = path.join(root, 'registry/dynamic-services.json');
  const serviceFeedbackFile = path.join(root, 'registry/service-feedback-store.json');

  const [memoryRaw, insightsRaw, staticServicesRaw, dynamicServicesRaw, serviceFeedbackRaw] = await Promise.all([
    readJsonFile<{ experiences?: unknown[] }>(memoryFile, { experiences: [] }),
    readJsonFile<{ insights?: unknown[] }>(insightsFile, { insights: [] }),
    readJsonFile<{ services?: unknown[] }>(staticServicesFile, { services: [] }),
    readJsonFile<{ services?: unknown[] }>(dynamicServicesFile, { services: [] }),
    readJsonFile<{ feedback?: unknown[] }>(serviceFeedbackFile, { feedback: [] }),
  ]);

  const experiences = (Array.isArray(memoryRaw.experiences) ? memoryRaw.experiences : [])
    .map(normalizeExperience)
    .filter((item): item is ExperienceRecord => Boolean(item));
  const missionIds = new Set(experiences.map((item) => item.missionId));
  const taskTypeByServiceId = buildServiceTaskTypeMap(staticServicesRaw, dynamicServicesRaw);
  const feedbackSignals = (Array.isArray(serviceFeedbackRaw.feedback) ? serviceFeedbackRaw.feedback : [])
    .map((item) => normalizeFeedback(item, taskTypeByServiceId, missionIds))
    .filter((item): item is FeedbackRecord => Boolean(item));

  const totalMissions = new Set(experiences.map((item) => item.missionId)).size;
  const totalHires = experiences.length;
  const experienceScoreTotal = experiences.reduce((sum, item) => sum + item.score, 0);
  const feedbackScoreTotal = feedbackSignals.reduce((sum, item) => sum + item.score, 0);
  const avgScore = blendAverage(
    experienceScoreTotal,
    totalHires,
    feedbackScoreTotal,
    feedbackSignals.length,
  );

  const priceMap = buildPriceMap(staticServicesRaw, dynamicServicesRaw);
  let totalSpendWei = BigInt(0);
  let pricedHires = 0;
  for (const item of experiences) {
    const price = priceMap.get(item.serviceUsed);
    if (!price) continue;
    totalSpendWei += price;
    pricedHires += 1;
  }

  const payload: HunterProfile = {
    stats: {
      totalMissions,
      avgScore,
      totalSpend: pricedHires > 0 ? formatWeiToMON(totalSpendWei) : '0',
      totalHires,
    },
    skills: buildSkills(experiences, feedbackSignals),
    preferredAgents: buildPreferredAgents(experiences, feedbackSignals),
    insights: buildInsights(insightsRaw, experiences, locale),
  };

  return NextResponse.json(payload);
}
