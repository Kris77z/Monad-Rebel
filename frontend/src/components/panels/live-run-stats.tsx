'use client';

import { formatMON } from '@/lib/format';
import { useTypewriter } from '@/hooks/use-typewriter';
import { BudgetBar } from './payment-effects';

interface StatusDisplay {
    symbol: string;
    label: string;
    cls: string;
}

interface LiveRunStatsProps {
    status: StatusDisplay;
    spendWei: string;
    budgetWei?: string;
    budgetSpentWei?: string;
    hasBudget: boolean;
    txCount: number;
    elapsed: number | null;
    mission?: string;
}

/**
 * Compact "LIVE RUN" stats block for the left panel.
 * Merges SPENT + BUDGET into a single visual, and embeds
 * the mission goal as a small text at the bottom.
 */
export function LiveRunStats({
    status, spendWei, budgetWei, budgetSpentWei,
    hasBudget, txCount, elapsed, mission,
}: LiveRunStatsProps) {
    const typedGoal = useTypewriter(mission, 20);

    return (
        <div className="space-y-1.5 text-xs">
            <p className="text-[10px] text-muted-foreground">LIVE RUN</p>

            {/* Status */}
            <div className="flex justify-between">
                <span className="text-muted-foreground">STATUS</span>
                <span className={status.cls}>
                    [{status.symbol} {status.label}]
                </span>
            </div>

            {/* Spent + Budget merged */}
            {hasBudget && budgetWei ? (
                <BudgetBar spentWei={budgetSpentWei ?? spendWei} maxWei={budgetWei} />
            ) : (
                <div className="flex justify-between">
                    <span className="text-muted-foreground">SPENT</span>
                    <span>{formatMON(spendWei)} MON</span>
                </div>
            )}

            {/* TX count + Duration on same row to save space */}
            <div className="flex justify-between">
                <span className="text-muted-foreground">TX_COUNT</span>
                <span>{txCount}</span>
            </div>
            <div className="flex justify-between">
                <span className="text-muted-foreground">DURATION</span>
                <span>{elapsed === null ? '--' : `${elapsed}s`}</span>
            </div>

            {/* Mission goal — compact inline */}
            {mission && (
                <div className="pt-1.5 border-t border-border/50">
                    <p className="text-[10px] text-muted-foreground mb-0.5">GOAL</p>
                    <p className="text-[11px] text-foreground/80 leading-relaxed line-clamp-3">
                        &gt; {typedGoal}<span className="cursor-blink">_</span>
                    </p>
                </div>
            )}
        </div>
    );
}
