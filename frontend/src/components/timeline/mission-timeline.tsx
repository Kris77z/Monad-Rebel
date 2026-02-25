'use client';

import { ResultView } from '@/components/agent/result-view';
import { cn } from '@/lib/utils';
import type { AgentEvent, HunterRunResult } from '@/types/agent';
import { motion } from 'motion/react';
import { useMemo } from 'react';

import type { PhaseId, PhaseStatus } from './phase-utils';
import { buildPhaseBuckets, mapEventToPhase, resolvePhaseStatus } from './phase-utils';
import { summaryForPhase } from './phase-summary';
import { DiscoverySnake, type SnakeNode } from './discovery-snake';

/* ─── Phase definitions ─── */
const PHASES: Array<{ id: PhaseId; label: string; icon: string }> = [
  { id: 'thinking', label: 'THINKING', icon: '🧠' },
  { id: 'discovery', label: 'DISCOVERY', icon: '🔍' },
  { id: 'decision', label: 'DECISION', icon: '⚙️' },
  { id: 'payment', label: 'PAYMENT', icon: '💰' },
  { id: 'execution', label: 'EXECUTION', icon: '⚡' },
  { id: 'verification', label: 'VERIFICATION', icon: '🔐' },
  { id: 'complete', label: 'COMPLETE', icon: '🏁' },
];

/* Terminal status markers */
const MARKER: Record<PhaseStatus, { symbol: string; cls: string }> = {
  pending: { symbol: '·', cls: 'text-muted-foreground' },
  active: { symbol: '▸', cls: 'text-primary text-glow animate-pulse' },
  done: { symbol: '✓', cls: 'text-green-600' },
  error: { symbol: '✗', cls: 'text-red-600' },
};

interface MissionTimelineProps {
  events: AgentEvent[];
  result: HunterRunResult | null;
  isRunning: boolean;
  hasError: boolean;
}

interface CommanderTimelinePhase {
  index: number;
  name: string;
  taskType: string;
  goal: string;
  status: PhaseStatus;
  content?: string;
  error?: string;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object') return null;
  return value as Record<string, unknown>;
}

function buildCommanderTimeline(
  events: AgentEvent[],
  result: HunterRunResult | null,
  isRunning: boolean,
  hasError: boolean,
): CommanderTimelinePhase[] {
  const fromResult = result?.phases ?? [];
  const byIndex = new Map<number, { name: string; taskType: string; goal: string }>();

  const missionDecomposed = [...events].reverse().find(
    (event) => event.type === 'mission_decomposed' && typeof event.data === 'object',
  );
  const eventPhases = Array.isArray(asRecord(missionDecomposed?.data)?.phases)
    ? (asRecord(missionDecomposed?.data)?.phases as Array<Record<string, unknown>>)
    : [];
  for (const [index, phase] of eventPhases.entries()) {
    byIndex.set(index, {
      name: typeof phase.name === 'string' ? phase.name : `Phase ${index + 1}`,
      taskType: typeof phase.taskType === 'string' ? phase.taskType : '',
      goal: typeof phase.goal === 'string' ? phase.goal : '',
    });
  }

  for (const phase of fromResult) {
    byIndex.set(phase.index, {
      name: phase.phase.name,
      taskType: phase.phase.taskType,
      goal: phase.phase.goal,
    });
  }

  for (const event of events) {
    if (event.type !== 'phase_started' || typeof event.data !== 'object') continue;
    const data = asRecord(event.data);
    const index = typeof data?.index === 'number' ? data.index : -1;
    if (index < 0) continue;
    byIndex.set(index, {
      name: typeof data?.name === 'string' ? data.name : `Phase ${index + 1}`,
      taskType: typeof data?.taskType === 'string' ? data.taskType : '',
      goal: typeof data?.goal === 'string' ? data.goal : '',
    });
  }

  const basePhases = [...byIndex.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([index, phase]) => ({ index, ...phase }));

  if (basePhases.length === 0) return [];

  const latestStarted = [...events]
    .reverse()
    .find((event) => event.type === 'phase_started' && typeof event.data === 'object');
  const latestStartedIndex = typeof asRecord(latestStarted?.data)?.index === 'number'
    ? (asRecord(latestStarted?.data)?.index as number)
    : -1;

  const completedByIndex = new Map<number, { content?: string; error?: string }>();
  for (const event of events) {
    if (event.type !== 'phase_completed' || typeof event.data !== 'object') continue;
    const data = asRecord(event.data);
    const index = typeof data?.index === 'number' ? data.index : -1;
    if (index < 0) continue;
    completedByIndex.set(index, {
      content: typeof data?.content === 'string' ? data.content : undefined,
      error: typeof data?.error === 'string' ? data.error : undefined,
    });
  }

  return basePhases.map((phase) => {
    const completed = completedByIndex.get(phase.index);
    const fromResultPhase = fromResult.find((item) => item.index === phase.index);
    const hasErrorNow = Boolean(completed?.error || fromResultPhase?.error);
    let status: PhaseStatus = 'pending';
    if (completed || fromResultPhase) {
      status = hasErrorNow ? 'error' : 'done';
    } else if (phase.index === latestStartedIndex && isRunning) {
      status = 'active';
    } else if (hasError && phase.index === latestStartedIndex) {
      status = 'error';
    } else if (phase.index < latestStartedIndex) {
      status = 'done';
    }

    return {
      index: phase.index,
      name: phase.name,
      taskType: phase.taskType,
      goal: phase.goal,
      status,
      content: completed?.content ?? fromResultPhase?.content,
      error: completed?.error ?? fromResultPhase?.error,
    };
  });
}

function summaryForCommanderPhase(phase: CommanderTimelinePhase): string {
  if (phase.status === 'pending') {
    return `Goal: ${phase.goal}`;
  }
  if (phase.status === 'active') {
    return `Running ${phase.taskType}...`;
  }
  if (phase.status === 'error') {
    return phase.error ?? 'Phase failed.';
  }
  if (phase.content && phase.content.trim().length > 0) {
    const compact = phase.content.replace(/\s+/g, ' ').trim();
    return compact.length > 180 ? `${compact.slice(0, 180)}...` : compact;
  }
  return 'Phase completed.';
}


/* ─── Build snake nodes from events ─── */
function buildSnakeNodes(events: AgentEvent[], result: HunterRunResult | null): SnakeNode[] {
  const discoveredByPhase = new Map<
    number,
    { ids: string[]; byId: Map<string, { name?: string; taskType?: string }> }
  >();
  const selectedByPhase = new Map<number, { id: string; taskType?: string; price?: string }>();
  const completedPhases = new Set<number>();

  let phaseCursor = 0;
  for (const event of events) {
    if (event.type === 'phase_started' && typeof event.data === 'object') {
      const phaseIndex = typeof asRecord(event.data)?.index === 'number'
        ? (asRecord(event.data)?.index as number)
        : phaseCursor;
      if (phaseIndex >= 0) phaseCursor = phaseIndex;
      continue;
    }

    if (event.type === 'phase_completed' && typeof event.data === 'object') {
      const completedIndex = typeof asRecord(event.data)?.index === 'number'
        ? (asRecord(event.data)?.index as number)
        : -1;
      if (completedIndex >= 0) completedPhases.add(completedIndex);
      continue;
    }

    if (event.type === 'services_discovered' && typeof event.data === 'object') {
      const data = asRecord(event.data);
      if (!data) continue;
      const bucket = discoveredByPhase.get(phaseCursor) ?? {
        ids: [],
        byId: new Map<string, { name?: string; taskType?: string }>(),
      };
      const services = Array.isArray(data.services)
        ? data.services.filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === 'object')
        : [];
      const serviceIds = Array.isArray(data.serviceIds)
        ? data.serviceIds.filter((id): id is string => typeof id === 'string')
        : [];
      for (const item of services) {
        const id = typeof item.id === 'string' ? item.id : '';
        if (!id) continue;
        bucket.byId.set(id, {
          name: typeof item.name === 'string' ? item.name : undefined,
          taskType: typeof item.taskType === 'string' ? item.taskType : undefined,
        });
        if (!bucket.ids.includes(id)) bucket.ids.push(id);
      }
      for (const id of serviceIds) {
        if (!bucket.ids.includes(id)) bucket.ids.push(id);
      }
      discoveredByPhase.set(phaseCursor, bucket);
      continue;
    }

    if (event.type === 'service_selected' && typeof event.data === 'object') {
      const data = asRecord(event.data);
      const id = typeof data?.id === 'string' ? data.id : '';
      if (!id) continue;
      selectedByPhase.set(phaseCursor, {
        id,
        taskType: typeof data?.taskType === 'string' ? data.taskType : undefined,
        price: typeof data?.price === 'string' ? data.price : undefined,
      });
    }
  }

  if (discoveredByPhase.size === 0) return [];

  /* Deduplicate across phases: same agent ID → single node */
  const nodeMap = new Map<string, SnakeNode>();
  const sortedPhases = [...discoveredByPhase.keys()].sort((a, b) => a - b);
  let insertOrder = 0;

  for (const phaseIndex of sortedPhases) {
    const bucket = discoveredByPhase.get(phaseIndex);
    if (!bucket) continue;
    const selected = selectedByPhase.get(phaseIndex);
    const isClosed = completedPhases.has(phaseIndex);
    const ids = bucket.ids.length > 0 ? bucket.ids : (selected ? [selected.id] : []);

    for (const id of ids) {
      const isSelected = selected?.id === id;
      const status: SnakeNode['status'] =
        isSelected ? 'selected' : (selected || isClosed ? 'failed' : 'online');

      const existing = nodeMap.get(id);
      if (existing) {
        /* Update status if this phase selected / closed this agent */
        if (isSelected) {
          existing.status = 'selected';
          existing.price = selected?.price;
          existing.taskType = selected?.taskType ?? existing.taskType;
          existing.phaseIndex = phaseIndex;
        }
        continue;
      }

      nodeMap.set(id, {
        key: id,
        phaseIndex,
        id,
        name: bucket.byId.get(id)?.name ?? id,
        taskType: (isSelected ? selected?.taskType : undefined)
          ?? bucket.byId.get(id)?.taskType
          ?? (result?.service?.id === id ? result.service.taskType : undefined),
        price: isSelected ? selected?.price : undefined,
        reputation: Math.max(3.9, 4.9 - insertOrder * 0.2),
        status,
      });
      insertOrder += 1;
    }
  }

  return [...nodeMap.values()];
}

/* ─── Component ─── */
export function MissionTimeline({ events, result, isRunning, hasError }: MissionTimelineProps) {
  const commanderPhases = useMemo(
    () => buildCommanderTimeline(events, result, isRunning, hasError),
    [events, result, isRunning, hasError]
  );
  const isCommanderView = commanderPhases.length > 0;
  const buckets = useMemo(() => buildPhaseBuckets(events), [events]);
  const latestPhase = useMemo(
    () => [...events].reverse().map(mapEventToPhase).find((p) => p !== null) ?? 'thinking',
    [events]
  );
  const latestPhaseIndex = PHASES.findIndex((p) => p.id === latestPhase);
  const latestStarted = useMemo(
    () =>
      [...events]
        .reverse()
        .find((event) => event.type === 'phase_started' && typeof event.data === 'object'),
    [events]
  );
  const activePhaseIndex = typeof asRecord(latestStarted?.data)?.index === 'number'
    ? (asRecord(latestStarted?.data)?.index as number)
    : 0;
  /* Snake hunts during discovery→decision→payment (phase indexes 1–3).
     Goes idle once execution starts or when not running. */
  const huntPhases: PhaseId[] = ['discovery', 'decision', 'payment'];
  const snakeMode = isRunning && huntPhases.includes(latestPhase as PhaseId) ? 'hunt' as const : 'idle' as const;

  /* Build snake nodes from events */
  const snakeNodes = useMemo(() => buildSnakeNodes(events, result), [events, result]);

  /* Empty state */
  if (events.length === 0 && !result) {
    return (
      <div className="h-full flex flex-col">
        <div className="px-1 py-2 mb-2 widget-label">─ mission.log</div>
        <div className="flex-1 border border-border bg-card flex items-center justify-center">
          <p className="text-xs text-muted-foreground">
            awaiting mission input<span className="cursor-blink">_</span>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      <div className="px-1 py-2 mb-2 widget-label">─ mission.log</div>

      <div className="flex-1 overflow-y-auto pr-1 scrollbar-thin space-y-2">
        {/* Error banner */}
        {hasError && (
          <div className="border border-red-300 bg-red-50 p-2 text-xs text-red-700">
            ✗ mission failed before completion
          </div>
        )}





        {/* Phase entries — show all in single mode, only active/done in commander */}
        {PHASES.map((phase, index) => {
          const phaseEvents = buckets[phase.id];
          const phaseStatus = resolvePhaseStatus({
            phaseId: phase.id,
            phaseIndex: index,
            latestPhaseIndex,
            hasEvents: phaseEvents.length > 0 || (phase.id === 'complete' && Boolean(result)),
            isRunning,
            hasError,
          });

          /* In commander mode, hide phases that have no events and are pending */
          if (isCommanderView && phaseStatus === 'pending' && phaseEvents.length === 0) {
            /* Exception: show 'complete' when we have a result */
            if (!(phase.id === 'complete' && result)) return null;
          }

          const m = MARKER[phaseStatus];

          return (
            <motion.div
              key={phase.id}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.05 }}
              className={cn(
                'border border-border bg-card p-3 transition-all',
                phaseStatus === 'pending' && 'opacity-50',
                phaseStatus === 'active' && 'phase-active-glow',
              )}
            >
              {/* Header line */}
              <div className="flex items-center justify-between text-xs">
                <span>{phase.icon} {phase.label}</span>
                <span className={cn(m.cls, phaseStatus === 'active' && 'terminal-active-blink')}>
                  [{m.symbol} {phaseStatus.toUpperCase()}]
                </span>
              </div>

              {/* Summary */}
              <p className="text-[11px] text-muted-foreground mt-1.5 leading-relaxed">
                {summaryForPhase(phase.id, phaseEvents, result, events)}
              </p>

              {/* Snake Discovery animation (shown in discovery phase) */}
              {phase.id === 'discovery' && snakeNodes.length > 0 && phaseStatus !== 'pending' && (
                <div className="mt-2">
                  <DiscoverySnake nodes={snakeNodes} activePhaseIndex={activePhaseIndex} mode={snakeMode} />
                </div>
              )}

              {/* Result view */}
              {phase.id === 'complete' && result && (
                <div className="mt-2 pt-2 border-t border-border/70">
                  <ResultView result={result} />
                </div>
              )}
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
