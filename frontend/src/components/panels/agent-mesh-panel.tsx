'use client';

import { cn } from '@/lib/utils';
import { formatMON } from '@/lib/format';
import { motion } from 'motion/react';
import { useRegistryServices } from '@/hooks/use-registry-services';
import type { AgentEvent, HunterRunResult } from '@/types/agent';
import {
  AGENT_KIND_STYLE,
  STATUS_TERMINAL,
  TREND_STYLE,
  buildMeshNodes,
  cardGlowClass,
  classifyServiceKind,
  reputationTierColor,
  timeAgo,
  type MeshNode,
} from './mesh-helpers';

interface AgentMeshPanelProps {
  events: AgentEvent[];
  result: HunterRunResult | null;
}

function ReputationBar({ value }: { value: number }) {
  const filled = Math.round((value / 5) * 8);
  const bar = '█'.repeat(filled) + '░'.repeat(8 - filled);
  return <span className={reputationTierColor(value)}>{bar} {value.toFixed(1)}</span>;
}

export function AgentMeshPanel({ events, result }: AgentMeshPanelProps) {
  const { services: registryServices } = useRegistryServices();
  const eventNodes = buildMeshNodes(events, result);
  const eventNodeIds = new Set(eventNodes.map((n) => n.id));

  // Merge: event nodes first (with status), then remaining registry services
  const registryOnlyNodes: MeshNode[] = registryServices
    .filter((s) => !eventNodeIds.has(s.id))
    .map((s) => ({
      id: s.id,
      name: s.name,
      endpoint: s.endpoint,
      price: s.price,
      taskType: s.taskType,
      reputation: s.reputation?.score ?? 0,
      reputationCount: s.reputation?.count,
      reputationTrend: s.reputation?.trend,
      reputationQualified: s.reputation?.qualified,
      lastUsedAt: s.reputation?.lastUsedAt,
      kind: classifyServiceKind({ id: s.id, taskType: s.taskType }),
      status: 'online' as const,
    }));

  // Sort: selected/used/failed first, then by reputation descending
  const allNodes = [...eventNodes, ...registryOnlyNodes];
  const statusWeight = (s: MeshNode['status']) =>
    s === 'selected' ? 3 : s === 'used' ? 2 : s === 'failed' ? 1 : 0;
  const nodes = allNodes.sort((a, b) => {
    const sw = statusWeight(b.status) - statusWeight(a.status);
    if (sw !== 0) return sw;
    return b.reputation - a.reputation;
  });

  return (
    <div className="h-full flex flex-col">
      <div className="px-1 py-2 mb-2 widget-label">─ mesh.net</div>

      <div className="space-y-3 flex-1 overflow-y-auto pr-1 scrollbar-thin">
        {nodes.map((node) => {
          const st = STATUS_TERMINAL[node.status];
          const kind = AGENT_KIND_STYLE[node.kind];
          const trend = TREND_STYLE[node.reputationTrend ?? 'stable'];
          const isSelected = node.status === 'selected';
          return (
            <motion.div
              key={node.id}
              layout
              initial={{ opacity: 0, x: 12 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ type: 'spring', stiffness: 300, damping: 24 }}
            >
              <div
                className={cn(
                  'border bg-card p-3 transition-all',
                  cardGlowClass(node),
                  isSelected && 'phase-active-glow',
                )}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm truncate">{node.name}</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5 truncate">{node.id}</p>
                  </div>
                  <span className={cn('text-[10px] shrink-0', st.cls)}>{st.marker}</span>
                </div>

                <div className="mt-2 text-[10px]">
                  <span className={cn(kind.cls)}>{kind.label}</span>
                  {node.taskType && <span className="text-muted-foreground"> · {node.taskType}</span>}
                </div>

                <div className="mt-3 space-y-1 text-[11px]">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">PRICE</span>
                    <span>{formatMON(node.price)} MON</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">REP</span>
                    <ReputationBar value={node.reputation} />
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">SAMPLES</span>
                    {node.reputationQualified === false ? (
                      <motion.span
                        className="text-[10px] text-muted-foreground"
                        animate={{ opacity: [0.4, 1, 0.4] }}
                        transition={{ repeat: Infinity, duration: 2 }}
                      >
                        {node.reputationCount ?? 0} · warming up
                      </motion.span>
                    ) : (
                      <span className={cn('text-[10px]', trend.cls)}>
                        {node.reputationCount ?? 0} {trend.marker}
                      </span>
                    )}
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">LAST USED</span>
                    <span className="text-[10px] text-muted-foreground">
                      {timeAgo(node.lastUsedAt)}
                    </span>
                  </div>
                </div>

                {node.endpoint && (
                  <p className="mt-2 text-[10px] text-muted-foreground truncate">{node.endpoint}</p>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
