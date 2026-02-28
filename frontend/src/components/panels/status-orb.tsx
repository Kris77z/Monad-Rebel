'use client';

import { cn } from '@/lib/utils';
import type { MyAgentStatus } from './panel-helpers';

/* ─── Orb configurations per status ─── */

const ORB: Record<MyAgentStatus, { color: string; anim: string }> = {
    idle: { color: 'bg-cyan-400/60', anim: 'orb-breathe 3s ease-in-out infinite' },
    thinking: { color: 'bg-amber-500', anim: 'orb-radar 1.5s ease-out infinite' },
    paying: { color: 'bg-green-500', anim: 'orb-pay 0.8s ease-in-out infinite' },
    verifying: { color: 'bg-purple-500', anim: 'orb-think 1.2s ease-in-out infinite' },
    completed: { color: 'bg-green-500', anim: '' },
    error: { color: 'bg-red-500', anim: '' },
};

/**
 * Animated status indicator orb.
 * Replaces static text symbols with a pulsing, color-coded circle.
 */
export function StatusOrb({ status, size = 'sm' }: { status: MyAgentStatus; size?: 'sm' | 'md' }) {
    const cfg = ORB[status];
    const sizeClass = size === 'md' ? 'w-2.5 h-2.5' : 'w-2 h-2';
    return (
        <span
            className={cn('inline-block rounded-full shrink-0', sizeClass, cfg.color)}
            style={cfg.anim ? { animation: cfg.anim } : undefined}
        />
    );
}
