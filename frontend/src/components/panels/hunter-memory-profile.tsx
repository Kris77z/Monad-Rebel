'use client';

import { useEffect, useRef, useState } from 'react';
import { motion } from 'motion/react';
import type { HunterProfile } from '@/types/hunter-profile';

/* ─── Hooks ─── */

/** Animates a number from 0 → target over `durationMs`. */
function useCountUp(target: number, durationMs = 600): number {
  const [value, setValue] = useState(0);
  const frameRef = useRef<number>(0);

  useEffect(() => {
    if (target <= 0) { setValue(0); return; }
    const start = performance.now();
    const step = (now: number) => {
      const elapsed = now - start;
      const progress = Math.min(1, elapsed / durationMs);
      /* ease-out cubic */
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(Math.round(target * eased));
      if (progress < 1) frameRef.current = requestAnimationFrame(step);
    };
    frameRef.current = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frameRef.current);
  }, [target, durationMs]);

  return value;
}

/* ─── Helpers ─── */

function makeAsciiBar(value: number, max: number, width = 14): string {
  if (!Number.isFinite(value) || !Number.isFinite(max) || max <= 0) {
    return '░'.repeat(width);
  }
  const ratio = Math.max(0, Math.min(1, value / max));
  const filled = Math.round(width * ratio);
  return `${'█'.repeat(filled)}${'░'.repeat(Math.max(0, width - filled))}`;
}

function formatScore(score: number): string {
  return `${score.toFixed(1)}/10`;
}

/** Strip common markdown formatting from lesson text */
function stripMarkdown(text: string): string {
  return text
    .replace(/\*\*(.+?)\*\*/g, '$1')   // **bold**
    .replace(/\*(.+?)\*/g, '$1')       // *italic*
    .replace(/^#{1,4}\s+/gm, '')       // # headings
    .replace(/^-{3,}/gm, '')           // ---
    .replace(/^[\-*]\s+/gm, '')        // - list items
    .replace(/\[(.+?)\]\(.+?\)/g, '$1') // [link](url)
    .replace(/`(.+?)`/g, '$1')         // `code`
    .replace(/\n{2,}/g, ' ')           // collapse newlines
    .trim();
}

/* ─── Section wrapper with staggered reveal ─── */
function RevealSection({ children, delay = 0 }: { children: React.ReactNode; delay?: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.35, ease: 'easeOut' }}
    >
      {children}
    </motion.div>
  );
}

/* ─── Sub-components ─── */

interface HunterMemoryProfileProps {
  profile: HunterProfile | null;
  loading?: boolean;
  error?: string | null;
}

function StatCell({ label, value }: { label: string; value: string | number }) {
  const isNumber = typeof value === 'number';
  const animated = useCountUp(isNumber ? value : 0);
  return (
    <div className="border border-border bg-background/30 px-1.5 py-1 text-center">
      <p className="text-muted-foreground text-[9px]">{label}</p>
      <p className="text-foreground font-mono">{isNumber ? animated : value}</p>
    </div>
  );
}

function HunterStats({ profile }: { profile: HunterProfile }) {
  const animatedScore = useCountUp(Math.round(profile.stats.avgScore * 10), 800);
  return (
    <RevealSection delay={0}>
      <p className="text-[10px] text-muted-foreground mb-1">OVERVIEW</p>
      <div className="grid grid-cols-4 gap-1 text-[10px]">
        <StatCell label="RUNS" value={profile.stats.totalMissions} />
        <div className="border border-border bg-background/30 px-1.5 py-1 text-center">
          <p className="text-muted-foreground text-[9px]">SCORE</p>
          <p className="text-foreground font-mono">{(animatedScore / 10).toFixed(1)}</p>
        </div>
        <div className="border border-border bg-background/30 px-1.5 py-1 text-center">
          <p className="text-muted-foreground text-[9px]">SPENT</p>
          <p className="text-foreground font-mono">{profile.stats.totalSpend}</p>
        </div>
        <StatCell label="HIRES" value={profile.stats.totalHires} />
      </div>
    </RevealSection>
  );
}

function SkillRadar({ skills }: { skills: HunterProfile['skills'] }) {
  const top = skills.slice(0, 5);
  const maxCount = Math.max(1, ...top.map((item) => item.count));

  return (
    <RevealSection delay={0.12}>
      <p className="text-[10px] text-muted-foreground mb-1.5">SKILL RADAR</p>
      {top.length === 0 ? (
        <p className="text-[10px] text-muted-foreground">No historical skill data.</p>
      ) : (
        <div className="space-y-1.5">
          {top.map((item, i) => (
            <motion.div
              key={item.taskType}
              className="text-[10px]"
              initial={{ opacity: 0, x: -6 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.12 + i * 0.06 }}
            >
              <div className="flex justify-between gap-2">
                <span className="truncate text-foreground/90">{item.taskType}</span>
                <span className="text-muted-foreground">{item.count} · {formatScore(item.avgScore)}</span>
              </div>
              <p className="font-mono text-[9px] tracking-tight text-primary/80">
                {makeAsciiBar(item.count, maxCount)}
              </p>
            </motion.div>
          ))}
        </div>
      )}
    </RevealSection>
  );
}

function InsightsList({ insights }: { insights: HunterProfile['insights'] }) {
  return (
    <RevealSection delay={0.36}>
      <p className="text-[10px] text-muted-foreground mb-1.5">CORE INSIGHTS</p>
      {insights.length === 0 ? (
        <p className="text-[10px] text-muted-foreground">No distilled lessons yet.</p>
      ) : (
        <div className="max-h-28 overflow-y-auto scrollbar-thin space-y-1.5 pr-1">
          {insights.map((insight, index) => (
            <motion.div
              key={`${index}-${insight.lesson}`}
              className="text-[10px] border border-border bg-background/30 px-2 py-1.5"
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.36 + index * 0.06 }}
            >
              <p className="text-foreground/90 leading-relaxed">&ldquo;{stripMarkdown(insight.lesson)}&rdquo;</p>
              <p className="text-[9px] text-muted-foreground mt-0.5">Seen {insight.count} times</p>
            </motion.div>
          ))}
        </div>
      )}
    </RevealSection>
  );
}

/* ─── Main component ─── */

export function HunterMemoryProfile({ profile, loading = false, error = null }: HunterMemoryProfileProps) {
  if (loading && !profile) {
    return (
      <div className="space-y-2">
        <p className="text-[10px] text-muted-foreground">MEMORY PROFILE</p>
        <div className="animate-pulse space-y-1.5">
          <div className="h-7 bg-border/50" />
          <div className="h-7 bg-border/50" />
          <div className="h-7 bg-border/50" />
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="text-[10px] text-muted-foreground">
        {error ? `profile unavailable: ${error}` : 'profile unavailable'}
      </div>
    );
  }

  return (
    <div className="space-y-2.5">
      <motion.div
        className="flex items-center justify-between"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3 }}
      >
        <p className="text-[10px] text-muted-foreground">MEMORY PROFILE</p>
        {error && <span className="text-[9px] text-amber-600">stale cache</span>}
      </motion.div>
      <HunterStats profile={profile} />
      <SkillRadar skills={profile.skills} />
      <InsightsList insights={profile.insights} />
    </div>
  );
}
