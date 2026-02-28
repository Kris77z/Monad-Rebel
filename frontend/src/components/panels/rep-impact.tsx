'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { asRecord } from '@/lib/type-guards';
import type { AgentEvent } from '@/types/agent';

/* ─── Types ─── */

interface RepFloater {
    id: string;
    nodeId: string;
    delta: number;      // e.g. +10 or -15
    score: number;      // final score
}

interface RepImpactProps {
    events: AgentEvent[];
    /** Only show floaters for this specific agent node ID */
    nodeId: string;
}

/* ─── Extract evaluation events per agent ─── */

function extractLatestEvaluation(events: AgentEvent[], nodeId: string): RepFloater | null {
    for (let i = events.length - 1; i >= 0; i--) {
        const e = events[i];
        if (e.type !== 'evaluation_completed') continue;
        const d = asRecord(e.data);
        const agent = typeof d?.serviceId === 'string' ? d.serviceId : typeof d?.agentId === 'string' ? d.agentId : null;
        if (agent !== nodeId) continue;
        const score = typeof d?.score === 'number' ? d.score : 0;
        // Map 0-100 score to rep delta: 70+ = positive, <50 = negative
        const delta = score >= 70 ? Math.round((score - 50) / 5) : -Math.round((70 - score) / 5);
        return { id: `${nodeId}-${e.at}`, nodeId, delta, score };
    }
    return null;
}

/* ─── Component: floating +/- REP text above agent card ─── */

export function RepImpactFloater({ events, nodeId }: RepImpactProps) {
    const evaluation = useMemo(() => extractLatestEvaluation(events, nodeId), [events, nodeId]);
    const [visible, setVisible] = useState(false);
    const prevEvalId = useRef<string | null>(null);

    useEffect(() => {
        if (!evaluation || evaluation.id === prevEvalId.current) return;
        prevEvalId.current = evaluation.id;
        setVisible(true);
        const timer = setTimeout(() => setVisible(false), 2500);
        return () => clearTimeout(timer);
    }, [evaluation]);

    if (!evaluation || !visible) return null;

    const isPositive = evaluation.delta >= 0;
    const text = isPositive ? `+${evaluation.delta} REP` : `${evaluation.delta} REP`;
    const color = isPositive ? 'text-green-500' : 'text-red-500';

    return (
        <AnimatePresence>
            {visible && (
                <motion.div
                    key={evaluation.id}
                    className={`absolute -top-3 right-2 text-sm font-bold ${color} pointer-events-none z-10`}
                    initial={{ opacity: 1, y: 0, scale: 1.2 }}
                    animate={{ opacity: 0, y: -20, scale: 0.9 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 2.2, ease: 'easeOut' }}
                >
                    {text}
                </motion.div>
            )}
        </AnimatePresence>
    );
}

/* ─── Hook: detect scanning state ─── */

export function useIsScanning(events: AgentEvent[]): boolean {
    return useMemo(() => {
        // Scanning = we've seen services_discovered but no service_selected yet after it
        const lastDiscovered = [...events].reverse().findIndex((e) => e.type === 'services_discovered');
        const lastSelected = [...events].reverse().findIndex((e) => e.type === 'service_selected');
        if (lastDiscovered < 0) return false;
        // If no selection yet, or discovery is more recent than selection → scanning
        return lastSelected < 0 || lastDiscovered < lastSelected;
    }, [events]);
}
