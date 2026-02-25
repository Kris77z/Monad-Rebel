'use client';

import type { AgentEvent, HunterRunResult } from '@/types/agent';
import type { HunterIdentityResponse } from '@/hooks/use-agent-identity';
import type { HunterProfile } from '@/types/hunter-profile';
import { HunterMemoryProfile } from '@/components/panels/hunter-memory-profile';
import { formatMON, shortenAddress } from '@/lib/format';
import { useState, useCallback, useMemo } from 'react';
import { Loader2, RefreshCw, Copy, Check, Bot } from 'lucide-react';

export type MyAgentStatus = 'idle' | 'thinking' | 'paying' | 'verifying' | 'completed' | 'error';

interface MyAgentPanelProps {
  status: MyAgentStatus;
  mission?: string;
  events: AgentEvent[];
  result: HunterRunResult | null;
  identity: HunterIdentityResponse | null;
  identityLoading?: boolean;
  identityError?: string | null;
  onRetryIdentity?: () => void;
  profile: HunterProfile | null;
  profileLoading?: boolean;
  profileError?: string | null;
}

interface CommanderPhaseView {
  index: number;
  name: string;
  taskType: string;
  goal: string;
}

/* ─── Terminal status markers ─── */
const STATUS_DISPLAY: Record<MyAgentStatus, { symbol: string; label: string; cls: string }> = {
  idle: { symbol: '·', label: 'IDLE', cls: 'text-muted-foreground' },
  thinking: { symbol: '▸', label: 'THINKING', cls: 'text-primary text-glow animate-pulse' },
  paying: { symbol: '◎', label: 'PAYING', cls: 'text-amber-600 animate-pulse' },
  verifying: { symbol: '◈', label: 'VERIFYING', cls: 'text-cyan-600 animate-pulse' },
  completed: { symbol: '✓', label: 'COMPLETED', cls: 'text-green-600' },
  error: { symbol: '✗', label: 'ERROR', cls: 'text-red-600' },
};

/* ─── Helpers ─── */
function asRecord(v: unknown): Record<string, unknown> | null {
  return v && typeof v === 'object' ? (v as Record<string, unknown>) : null;
}

function addUnsignedIntegerStrings(a: string, b: string): string {
  let carry = 0;
  let i = a.length - 1;
  let j = b.length - 1;
  let out = '';
  while (i >= 0 || j >= 0 || carry > 0) {
    const da = i >= 0 ? Number(a[i]) : 0;
    const db = j >= 0 ? Number(b[j]) : 0;
    const sum = da + db + carry;
    out = String(sum % 10) + out;
    carry = Math.floor(sum / 10);
    i -= 1;
    j -= 1;
  }
  return out.replace(/^0+(?=\d)/, '');
}

function readTotalPaymentWei(events: AgentEvent[]): string | undefined {
  let total = '0';
  let hasValue = false;
  for (const event of events) {
    if (event.type !== 'quote_received' || typeof event.data !== 'object') continue;
    const amount = asRecord(event.data)?.amount;
    if (typeof amount !== 'string' || !/^\d+$/.test(amount)) continue;
    total = addUnsignedIntegerStrings(total, amount);
    hasValue = true;
  }
  return hasValue ? total : undefined;
}

function readElapsedSeconds(events: AgentEvent[]): number | null {
  const started = events.find((e) => e.type === 'run_started');
  const ended = [...events].reverse().find((e) => e.type === 'run_completed' || e.type === 'run_failed');
  if (!started || !ended) return null;
  const s = new Date(started.at).getTime();
  const e = new Date(ended.at).getTime();
  return Number.isFinite(s) && Number.isFinite(e) && e >= s ? Math.round((e - s) / 1000) : null;
}

function collectCommanderPhases(events: AgentEvent[], result: HunterRunResult | null): CommanderPhaseView[] {
  const byIndex = new Map<number, CommanderPhaseView>();

  const decomposed = [...events].reverse().find((event) => event.type === 'mission_decomposed');
  const decomposedPhases = Array.isArray(asRecord(decomposed?.data)?.phases)
    ? (asRecord(decomposed?.data)?.phases as Array<Record<string, unknown>>)
    : [];
  for (const [index, phase] of decomposedPhases.entries()) {
    byIndex.set(index, {
      index,
      name: typeof phase.name === 'string' ? phase.name : `Phase ${index + 1}`,
      taskType: typeof phase.taskType === 'string' ? phase.taskType : '',
      goal: typeof phase.goal === 'string' ? phase.goal : '',
    });
  }

  for (const phase of result?.phases ?? []) {
    byIndex.set(phase.index, {
      index: phase.index,
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
      index,
      name: typeof data?.name === 'string' ? data.name : `Phase ${index + 1}`,
      taskType: typeof data?.taskType === 'string' ? data.taskType : '',
      goal: typeof data?.goal === 'string' ? data.goal : '',
    });
  }

  return [...byIndex.values()].sort((a, b) => a.index - b.index);
}

function readCommanderBudget(events: AgentEvent[], result: HunterRunResult | null): {
  maxTotalWei?: string;
  maxPerPhaseWei?: string;
  maxPhases?: number;
  spentWei?: string;
} {
  if (result?.budget) {
    return result.budget;
  }

  const latestMission = [...events]
    .reverse()
    .find((event) => event.type === 'mission_decomposed' && typeof event.data === 'object');
  const missionBudget = asRecord(latestMission?.data)?.budget;
  const budgetRecord = asRecord(missionBudget);
  if (budgetRecord) {
    return {
      maxTotalWei: typeof budgetRecord.maxTotalWei === 'string' ? budgetRecord.maxTotalWei : undefined,
      maxPerPhaseWei: typeof budgetRecord.maxPerPhaseWei === 'string' ? budgetRecord.maxPerPhaseWei : undefined,
      maxPhases: typeof budgetRecord.maxPhases === 'number' ? budgetRecord.maxPhases : undefined,
      spentWei: typeof budgetRecord.spentWei === 'string' ? budgetRecord.spentWei : undefined,
    };
  }

  const latestRun = [...events]
    .reverse()
    .find((event) => event.type === 'run_started' && typeof event.data === 'object');
  const runData = asRecord(latestRun?.data);
  return {
    maxTotalWei: typeof runData?.maxTotalWei === 'string' ? runData.maxTotalWei : undefined,
    maxPerPhaseWei: typeof runData?.maxPerPhaseWei === 'string' ? runData.maxPerPhaseWei : undefined,
    maxPhases: typeof runData?.maxPhases === 'number' ? runData.maxPhases : undefined,
  };
}

function readCommanderStatus(
  phases: CommanderPhaseView[],
  events: AgentEvent[],
  fallback: { symbol: string; label: string; cls: string },
  status: MyAgentStatus,
): { symbol: string; label: string; cls: string } {
  const total = phases.length;
  if (total <= 0) return fallback;

  const latestStarted = [...events]
    .reverse()
    .find((event) => event.type === 'phase_started' && typeof event.data === 'object');
  const startedData = asRecord(latestStarted?.data);
  const startedIndex = typeof startedData?.index === 'number' ? startedData.index : 0;
  const startedName = typeof startedData?.name === 'string'
    ? startedData.name
    : phases.find((phase) => phase.index === startedIndex)?.name ?? 'Running';
  const startedOrder = phases.findIndex((phase) => phase.index === startedIndex);
  const current = startedOrder >= 0 ? startedOrder + 1 : Math.min(startedIndex + 1, total);

  if (status === 'completed') {
    return {
      symbol: '✓',
      label: `PHASE ${total}/${total}: COMPLETE`,
      cls: 'text-green-600',
    };
  }
  if (status === 'error') {
    return {
      symbol: '✗',
      label: `PHASE ${current}/${total}: FAILED`,
      cls: 'text-red-600',
    };
  }

  return {
    symbol: '◎',
    label: `PHASE ${current}/${total}: ${startedName.toUpperCase()}`,
    cls: 'text-amber-600 animate-pulse',
  };
}

/* ─── Component ─── */
export function MyAgentPanel({
  status, mission, events, result,
  identity, identityLoading, identityError, onRetryIdentity,
  profile, profileLoading, profileError,
}: MyAgentPanelProps) {
  const cfg = STATUS_DISPLAY[status];
  const commanderPhases = useMemo(
    () => collectCommanderPhases(events, result),
    [events, result]
  );
  const commanderAwareStatus = useMemo(
    () => readCommanderStatus(commanderPhases, events, cfg, status),
    [commanderPhases, events, cfg, status]
  );
  const spendWei = readTotalPaymentWei(events);
  const commanderBudget = useMemo(
    () => readCommanderBudget(events, result),
    [events, result]
  );
  const txCount = events.filter(
    (e) => e.type === 'payment_state' && asRecord(e.data)?.status === 'payment-completed'
  ).length;
  const elapsed = readElapsedSeconds(events);

  const [copied, setCopied] = useState(false);
  const walletAddr = identity?.identity?.walletAddress;
  const copyAddress = useCallback(() => {
    if (!walletAddr) return;
    void navigator.clipboard.writeText(walletAddr);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }, [walletAddr]);

  return (
    <div className="h-full flex flex-col">
      <div className="px-1 py-2 mb-2 widget-label flex items-center gap-1.5">
        <Bot className="w-3 h-3" />
        <span>rebel.agent</span>
      </div>

      {/* Loading state */}
      {identityLoading && (
        <div className="border border-border bg-card p-4 flex items-center gap-2">
          <Loader2 className="w-3.5 h-3.5 animate-spin text-primary" />
          <span className="text-xs text-muted-foreground">connecting to agent...</span>
        </div>
      )}

      {/* Error state */}
      {!identityLoading && identityError && !identity && (
        <div className="border border-red-300 bg-red-50 p-3">
          <p className="text-xs text-red-700">✗ agent offline</p>
          <p className="text-[10px] text-red-500 mt-1 break-all">{identityError}</p>
          {onRetryIdentity && (
            <button onClick={onRetryIdentity} className="mt-2 inline-flex items-center gap-1 text-[10px] text-red-600 hover:text-red-800">
              <RefreshCw className="w-2.5 h-2.5" /> retry
            </button>
          )}
        </div>
      )}

      {/* Connected state */}
      {!identityLoading && identity && (
        <div className="border border-border bg-card p-4 space-y-3">
          <div>
            <p className="text-sm text-foreground">🤖 {identity.identity.name}</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">{identity.identity.description}</p>
            {walletAddr && (
              <button onClick={copyAddress} className="mt-1 inline-flex items-center gap-1 text-[10px] text-muted-foreground hover:text-primary transition-colors" title={walletAddr}>
                {shortenAddress(walletAddr)}
                {copied ? <Check className="w-2.5 h-2.5 text-green-600" /> : <Copy className="w-2.5 h-2.5" />}
              </button>
            )}
          </div>

          <div className="border-t border-border" />

          <HunterMemoryProfile
            profile={profile}
            loading={profileLoading}
            error={profileError}
          />

          <div className="border-t border-border" />

          {/* Key-value stats */}
          <div className="space-y-1.5 text-xs">
            <p className="text-[10px] text-muted-foreground">LIVE RUN</p>
            <div className="flex justify-between">
              <span className="text-muted-foreground">STATUS</span>
              <span className={commanderAwareStatus.cls}>[{commanderAwareStatus.symbol} {commanderAwareStatus.label}]</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">SPENT</span>
              <span>{formatMON(spendWei)} MON</span>
            </div>
            {commanderPhases.length > 0 && commanderBudget.maxTotalWei && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">BUDGET</span>
                <span>
                  {formatMON(commanderBudget.spentWei ?? spendWei)} / {formatMON(commanderBudget.maxTotalWei)} MON
                </span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-muted-foreground">TX_COUNT</span>
              <span>{txCount}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">DURATION</span>
              <span>{elapsed === null ? '--' : `${elapsed}s`}</span>
            </div>
          </div>

          {/* On-chain identity */}
          {identity.identity.agentId && (
            <>
              <div className="border-t border-border" />
              <div className="text-[10px] space-y-1">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">AGENT_ID</span>
                  <span className="text-foreground/80 truncate max-w-[140px]">{identity.identity.agentId}</span>
                </div>
                {identity.onchain?.registered && (
                  <span className="text-primary text-glow">[ERC-8004 REGISTERED]</span>
                )}
              </div>
            </>
          )}
        </div>
      )}

      {/* Current Mission */}
      <div className="border border-border bg-card p-3 mt-3 flex-1 overflow-y-auto scrollbar-thin">
        <p className="text-[10px] text-muted-foreground mb-2">─── MISSION ───</p>
        <p className="text-xs text-foreground/90 leading-relaxed">
          {mission ? `> ${mission}` : <span className="text-muted-foreground">{'> waiting for input'}<span className="cursor-blink">_</span></span>}
        </p>

        {/* Commander sub-agent breakdown */}
        {(() => {
          if (commanderPhases.length === 0) {
            // Single mode: show current service info
            const selected = [...events].reverse().find((e) => e.type === 'service_selected');
            const serviceId = typeof asRecord(selected?.data)?.id === 'string'
              ? (asRecord(selected?.data)?.id as string) : null;
            if (!serviceId) return null;
            const taskType = typeof asRecord(selected?.data)?.taskType === 'string'
              ? (asRecord(selected?.data)?.taskType as string) : '—';
            return (
              <div className="mt-3 border-t border-border pt-2">
                <p className="text-[10px] text-muted-foreground mb-1">HIRED AGENT</p>
                <p className="text-[10px] text-foreground">🤝 {serviceId}</p>
                <p className="text-[10px] text-muted-foreground">   skill: {taskType}</p>
              </div>
            );
          }

          // Commander mode: rich phase breakdown
          const completedMap = new Map<number, Record<string, unknown>>();
          for (const e of events) {
            if (e.type !== 'phase_completed') continue;
            const d = asRecord(e.data);
            const idx = typeof d?.index === 'number' ? d.index : -1;
            if (idx >= 0) completedMap.set(idx, d!);
          }

          // Collect service selections + reasons per phase
          const phaseServiceMap = new Map<number, string>();
          const phaseReasonMap = new Map<number, string>();
          const phaseGoalMap = new Map<number, string>();
          let phaseCounter = -1;
          for (const e of events) {
            if (e.type === 'phase_started') {
              const d = asRecord(e.data);
              phaseCounter = typeof d?.index === 'number' ? d.index : phaseCounter;
              if (phaseCounter >= 0 && typeof d?.goal === 'string') {
                phaseGoalMap.set(phaseCounter, d.goal as string);
              }
            }
            if (e.type === 'service_selected' && phaseCounter >= 0) {
              const d = asRecord(e.data);
              if (typeof d?.id === 'string') phaseServiceMap.set(phaseCounter, d.id);
              if (typeof d?.reason === 'string') phaseReasonMap.set(phaseCounter, d.reason as string);
            }
          }

          // Collect quote amounts per phase
          const phaseQuoteMap = new Map<number, string>();
          let quotePhase = -1;
          for (const e of events) {
            if (e.type === 'phase_started') {
              const d = asRecord(e.data);
              quotePhase = typeof d?.index === 'number' ? d.index : quotePhase;
            }
            if (e.type === 'quote_received' && quotePhase >= 0) {
              const d = asRecord(e.data);
              if (typeof d?.amount === 'string') phaseQuoteMap.set(quotePhase, d.amount);
            }
          }

          const latestStarted = [...events].reverse().find((e) => e.type === 'phase_started');
          const activeIndex = typeof asRecord(latestStarted?.data)?.index === 'number'
            ? (asRecord(latestStarted?.data)?.index as number)
            : -1;

          const doneCount = commanderPhases.filter((phase) => completedMap.has(phase.index)).length;
          const total = commanderPhases.length;
          const pct = total > 0 ? Math.round((doneCount / total) * 100) : 0;

          return (
            <div className="mt-3 space-y-2">
              {/* Progress bar */}
              <div>
                <div className="flex justify-between text-[10px] text-muted-foreground mb-1">
                  <span>PROGRESS</span>
                  <span>{doneCount}/{total} phases ({pct}%)</span>
                </div>
                <div className="h-1 bg-border rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary transition-all duration-500"
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>

              {/* Phase cards */}
              {commanderPhases.map((phase, order) => {
                const completed = completedMap.get(phase.index);
                const done = Boolean(completed);
                const failed = done && typeof completed?.error === 'string';
                const active = phase.index === activeIndex && !done;
                const pending = !done && !active;
                const agentId = phaseServiceMap.get(phase.index);
                const quoteWei = phaseQuoteMap.get(phase.index);
                const content = typeof completed?.content === 'string' ? completed.content : '';
                const snippet = content.replace(/\s+/g, ' ').trim();

                return (
                  <div
                    key={phase.index}
                    className={`border p-2 transition-all ${active ? 'border-amber-500/50 bg-amber-500/5 phase-active-glow' :
                      failed ? 'border-red-600/30 bg-red-600/5' :
                        done ? 'border-green-600/30 bg-green-600/5' :
                          'border-border opacity-50'
                      }`}
                  >
                    {/* Phase header */}
                    <div className="flex items-center justify-between">
                      <span className={`text-[10px] font-medium ${failed ? 'text-red-600' : done ? 'text-green-600' : active ? 'text-amber-500' : 'text-muted-foreground'
                        }`}>
                        {failed ? '✗' : done ? '✓' : active ? '◎' : '·'} {order + 1}. {phase.name}
                      </span>
                      <span className="text-[9px] text-muted-foreground">{phase.taskType}</span>
                    </div>

                    {/* Agent info */}
                    {agentId && (
                      <p className="text-[9px] text-muted-foreground mt-1">
                        🤝 {agentId}{quoteWei ? ` · ${formatMON(quoteWei)} MON` : ''}
                      </p>
                    )}

                    {/* Selection reason */}
                    {phaseReasonMap.has(phase.index) && (
                      <p className="text-[9px] text-green-600/80 mt-0.5">
                        ↳ {phaseReasonMap.get(phase.index)}
                      </p>
                    )}

                    {/* Goal snippet */}
                    {phaseGoalMap.has(phase.index) && (
                      <p className="text-[9px] text-muted-foreground/70 mt-0.5 italic line-clamp-1">
                        {(() => {
                          const g = phaseGoalMap.get(phase.index) ?? '';
                          return g.length > 80 ? `${g.slice(0, 80)}…` : g;
                        })()}
                      </p>
                    )}

                    {/* Active indicator */}
                    {active && !agentId && (
                      <p className="text-[9px] text-amber-500/70 mt-1 animate-pulse">
                        ⟳ discovering agents...
                      </p>
                    )}

                    {/* Result snippet — skip raw JSON */}
                    {done && snippet.length > 0 && !snippet.startsWith('{') && !snippet.startsWith('[') && !snippet.startsWith('[Phase failed]') && (
                      <p className={`text-[9px] mt-1 line-clamp-2 ${failed ? 'text-red-600/90' : 'text-muted-foreground'}`}>
                        {snippet.length > 120 ? `${snippet.slice(0, 120)}…` : snippet}
                      </p>
                    )}
                    {done && failed && (
                      <p className="text-[9px] mt-1 text-red-600/90 line-clamp-2">
                        {typeof completed?.error === 'string'
                          ? (completed.error as string).slice(0, 120)
                          : 'Phase execution failed'}
                      </p>
                    )}

                    {/* Pending */}
                    {pending && (
                      <p className="text-[9px] text-muted-foreground/40 mt-0.5">queued</p>
                    )}
                  </div>
                );
              })}
            </div>
          );
        })()}

        {result?.paymentTx && (
          <p className="mt-2 text-[10px] text-muted-foreground break-all">tx: {result.paymentTx}</p>
        )}
      </div>
    </div>
  );
}
