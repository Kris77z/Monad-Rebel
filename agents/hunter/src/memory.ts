import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

export interface Experience {
  missionId: string;
  goal: string;
  serviceUsed: string;
  taskType: string;
  score: number;
  lesson: string;
  timestamp: number;
}

interface Insight {
  lesson: string;
  count: number;
  taskTypes: string[];
  updatedAt: number;
}

interface ExperienceStore {
  experiences: Experience[];
}

interface InsightStore {
  insights: Insight[];
}

function resolveMemoryDir(): string {
  const base = process.env.INIT_CWD ?? process.cwd();
  return path.resolve(base, "agents/hunter/memory");
}

function experiencePath(): string {
  return path.join(resolveMemoryDir(), "experience.json");
}

function insightsPath(): string {
  return path.join(resolveMemoryDir(), "insights.json");
}

async function readJsonFile<T>(filePath: string, fallback: T): Promise<T> {
  try {
    const content = await readFile(filePath, "utf8");
    return JSON.parse(content) as T;
  } catch (error) {
    const asNodeError = error as NodeJS.ErrnoException;
    if (asNodeError.code === "ENOENT") {
      return fallback;
    }
    throw error;
  }
}

async function writeJsonFile(filePath: string, payload: unknown): Promise<void> {
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, JSON.stringify(payload, null, 2), "utf8");
}

export async function readExperiences(): Promise<Experience[]> {
  const store = await readJsonFile<ExperienceStore>(experiencePath(), { experiences: [] });
  if (!Array.isArray(store.experiences)) {
    return [];
  }
  return store.experiences
    .filter((item) => item && typeof item === "object")
    .map((item) => ({
      missionId: String(item.missionId),
      goal: String(item.goal),
      serviceUsed: String(item.serviceUsed),
      taskType: String(item.taskType),
      score: Number(item.score),
      lesson: String(item.lesson),
      timestamp: Number(item.timestamp)
    }))
    .filter((item) => item.lesson.trim().length > 0);
}

async function writeExperiences(experiences: Experience[]): Promise<void> {
  await writeJsonFile(experiencePath(), { experiences });
}

function normalizeLessonKey(lesson: string): string {
  return lesson.trim().toLowerCase().replace(/\s+/g, " ");
}

function buildInsights(experiences: Experience[]): Insight[] {
  const byLesson = new Map<
    string,
    {
      lesson: string;
      count: number;
      taskTypes: Set<string>;
      updatedAt: number;
    }
  >();

  for (const exp of experiences) {
    const key = normalizeLessonKey(exp.lesson);
    const existing = byLesson.get(key);
    if (!existing) {
      byLesson.set(key, {
        lesson: exp.lesson.trim(),
        count: 1,
        taskTypes: new Set([exp.taskType]),
        updatedAt: exp.timestamp
      });
      continue;
    }
    existing.count += 1;
    existing.taskTypes.add(exp.taskType);
    existing.updatedAt = Math.max(existing.updatedAt, exp.timestamp);
  }

  return [...byLesson.values()]
    .sort((a, b) => {
      if (b.count !== a.count) {
        return b.count - a.count;
      }
      return b.updatedAt - a.updatedAt;
    })
    .slice(0, 20)
    .map((item) => ({
      lesson: item.lesson,
      count: item.count,
      taskTypes: [...item.taskTypes],
      updatedAt: item.updatedAt
    }));
}

async function writeInsights(insights: Insight[]): Promise<void> {
  await writeJsonFile(insightsPath(), { insights });
}

async function readInsights(): Promise<Insight[]> {
  const store = await readJsonFile<InsightStore>(insightsPath(), { insights: [] });
  if (!Array.isArray(store.insights)) {
    return [];
  }
  return store.insights;
}

export async function appendExperience(experience: Experience): Promise<Experience> {
  const all = await readExperiences();
  const next = [...all, experience]
    .sort((a, b) => a.timestamp - b.timestamp)
    .slice(-200);
  await writeExperiences(next);
  await writeInsights(buildInsights(next));
  return experience;
}

function tokenize(value: string): Set<string> {
  return new Set(
    value
      .toLowerCase()
      .split(/[^a-z0-9]+/g)
      .map((item) => item.trim())
      .filter((item) => item.length >= 3)
  );
}

function scoreExperience(exp: Experience, goalTokens: Set<string>, taskType?: string): number {
  let score = 0;
  if (taskType && exp.taskType === taskType) {
    score += 5;
  }

  const expTokens = tokenize(`${exp.goal} ${exp.lesson} ${exp.taskType} ${exp.serviceUsed}`);
  for (const token of goalTokens) {
    if (expTokens.has(token)) {
      score += 1;
    }
  }

  const ageSeconds = Math.max(0, Math.floor(Date.now() / 1000) - exp.timestamp);
  const agePenalty = Math.min(5, ageSeconds / (24 * 3600 * 7));
  score -= agePenalty;
  return score;
}

export async function buildMemoryPrompt(input: {
  goal: string;
  taskType?: string;
  maxExperiences?: number;
}): Promise<string> {
  const [experiences, insights] = await Promise.all([readExperiences(), readInsights()]);
  if (experiences.length === 0 && insights.length === 0) {
    return "No prior mission memory available.";
  }

  const maxExperiences = input.maxExperiences ?? 3;
  const goalTokens = tokenize(input.goal);
  const relevant = [...experiences]
    .sort((a, b) => scoreExperience(b, goalTokens, input.taskType) - scoreExperience(a, goalTokens, input.taskType))
    .slice(0, maxExperiences);

  const topInsights = insights.slice(0, 3);

  const sections: string[] = [];
  if (relevant.length > 0) {
    sections.push("Past experiences:");
    sections.push(
      ...relevant.map(
        (item, index) =>
          `${index + 1}. taskType=${item.taskType}; service=${item.serviceUsed}; score=${item.score}; lesson=${item.lesson}`
      )
    );
  }
  if (topInsights.length > 0) {
    sections.push("Consolidated insights:");
    sections.push(
      ...topInsights.map(
        (item, index) =>
          `${index + 1}. ${item.lesson} (seen ${item.count} times; taskTypes=${item.taskTypes.join(",")})`
      )
    );
  }
  return sections.join("\n");
}
