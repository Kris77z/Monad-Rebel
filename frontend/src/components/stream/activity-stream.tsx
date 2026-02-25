'use client';

import { AgentEvent, HunterRunResult } from "@/types/agent";
import { TraceTimeline } from "@/components/agent/trace-timeline";
import { ResultView } from "@/components/agent/result-view";
import { Terminal, Radio } from "lucide-react";
import { useEffect, useRef } from "react";

/**
 * 中栏：Activity Stream
 * 整合 Trace Timeline（实时执行日志）和 Result View（最终结果）
 * 自动滚动到最新事件
 */
export interface ActivityStreamProps {
    events: AgentEvent[];
    result: HunterRunResult | null;
    isRunning: boolean;
}

export function ActivityStream({ events, result, isRunning }: ActivityStreamProps) {
    const hasActivity = events.length > 0 || result !== null;
    const scrollRef = useRef<HTMLDivElement>(null);
    const bottomRef = useRef<HTMLDivElement>(null);

    // 新事件到来时自动滚动到底部
    useEffect(() => {
        if (bottomRef.current) {
            bottomRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [events.length, result]);

    return (
        <div className="h-full flex flex-col">
            {/* Header */}
            <div className="px-1 py-2 mb-2 flex items-center justify-between">
                <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                    <Radio className={`w-3 h-3 ${isRunning ? 'text-primary animate-pulse' : 'text-muted-foreground'}`} />
                    Activity Feed
                </h2>
                {isRunning && (
                    <div className="flex items-center gap-2">
                        <div className="flex gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce" style={{ animationDelay: '0ms' }} />
                            <span className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce" style={{ animationDelay: '150ms' }} />
                            <span className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce" style={{ animationDelay: '300ms' }} />
                        </div>
                        <span className="text-[10px] text-primary font-mono">streaming</span>
                    </div>
                )}
            </div>

            {/* Content */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto scrollbar-thin space-y-4 pr-1">
                {!hasActivity ? (
                    <EmptyState />
                ) : (
                    <>
                        <TraceTimeline events={events} />

                        {result && (
                            <div className="mt-4 pt-4 border-t border-primary/20">
                                <ResultView result={result} />
                            </div>
                        )}

                        {/* 滚动锚点 */}
                        <div ref={bottomRef} />
                    </>
                )}
            </div>
        </div>
    );
}

/** 空状态 — 带微动画 */
function EmptyState() {
    return (
        <div className="flex items-center justify-center h-full">
            <div className="text-center space-y-4 p-12 max-w-sm mx-auto">
                <div className="w-16 h-16 rounded-2xl bg-muted/30 flex items-center justify-center mx-auto animate-pulse">
                    <Terminal className="w-8 h-8 text-muted-foreground/40" />
                </div>
                <h3 className="text-lg font-semibold text-muted-foreground/80">Waiting for Mission</h3>
                <p className="text-muted-foreground/50 text-sm leading-relaxed">
                    Start a mission above to watch agents discover, negotiate, pay, and verify in real-time.
                </p>
            </div>
        </div>
    );
}
