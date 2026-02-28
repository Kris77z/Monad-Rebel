'use client';

import { useTypewriter } from '@/hooks/use-typewriter';

interface MissionSectionProps {
    mission?: string;
}

/**
 * Renders the MISSION block in the left panel.
 * Phase 4: stripped down to only the goal text (typewriter effect).
 * All phase-by-phase cards have been moved to the center column's Timeline.
 */
export function MissionSection({ mission }: MissionSectionProps) {
    const typedMission = useTypewriter(mission, 20);
    return (
        <div className="border border-border bg-card p-3 mt-3 flex-1 overflow-y-auto scrollbar-thin">
            <p className="text-[10px] text-muted-foreground mb-2">─── MISSION ───</p>
            <p className="text-xs text-foreground/90 leading-relaxed">
                {mission
                    ? <>&gt; {typedMission}<span className="cursor-blink">_</span></>
                    : <span className="text-muted-foreground">{'> waiting for input'}<span className="cursor-blink">_</span></span>}
            </p>
        </div>
    );
}
