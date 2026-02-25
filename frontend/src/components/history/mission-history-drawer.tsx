'use client';

import { formatMON } from '@/lib/format';
import type { MissionRecord } from '@/hooks/use-mission-history';
import { CheckCircle2, XCircle, Clock, Trash2, X } from 'lucide-react';

interface MissionHistoryDrawerProps {
    open: boolean;
    onClose: () => void;
    history: MissionRecord[];
    onClear: () => void;
    onSelect?: (goal: string) => void;
}

/** Format timestamp to relative or short date */
function timeAgo(ts: number): string {
    const diff = Date.now() - ts;
    const mins = Math.floor(diff / 60_000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    return `${days}d ago`;
}

/**
 * Slide-out drawer showing mission execution history.
 * Terminal-styled, slides from the left.
 */
export function MissionHistoryDrawer({
    open, onClose, history, onClear, onSelect,
}: MissionHistoryDrawerProps) {
    return (
        <>
            {/* Backdrop */}
            {open && (
                <div
                    className="fixed inset-0 bg-black/20 backdrop-blur-sm z-[200]"
                    onClick={onClose}
                />
            )}

            {/* Drawer */}
            <div
                className={`fixed top-0 left-0 h-full w-80 max-w-[85vw] bg-card border-r border-border z-[201] transform transition-transform duration-200 ease-out ${open ? 'translate-x-0' : '-translate-x-full'
                    }`}
            >
                {/* Header */}
                <div className="flex items-center justify-between px-4 py-3 border-b border-border">
                    <span className="text-xs text-primary text-glow font-medium">
                        ─ history.log
                    </span>
                    <div className="flex items-center gap-2">
                        {history.length > 0 && (
                            <button
                                onClick={onClear}
                                className="text-muted-foreground hover:text-red-500 transition-colors cursor-pointer"
                                title="Clear history"
                            >
                                <Trash2 className="w-3.5 h-3.5" />
                            </button>
                        )}
                        <button
                            onClick={onClose}
                            className="text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                </div>

                {/* Records list */}
                <div className="overflow-y-auto h-[calc(100%-48px)] scrollbar-thin">
                    {history.length === 0 ? (
                        <div className="flex items-center justify-center h-full">
                            <p className="text-xs text-muted-foreground">
                                no missions yet<span className="cursor-blink">_</span>
                            </p>
                        </div>
                    ) : (
                        <div className="divide-y divide-border">
                            {history.map((rec) => (
                                <button
                                    key={rec.id}
                                    onClick={() => { onSelect?.(rec.goal); onClose(); }}
                                    className="w-full text-left px-4 py-3 hover:bg-muted/50 transition-colors cursor-pointer group"
                                >
                                    {/* Status + Time */}
                                    <div className="flex items-center justify-between mb-1">
                                        <span className={`flex items-center gap-1 text-[10px] ${rec.status === 'completed' ? 'text-green-600' : 'text-red-600'
                                            }`}>
                                            {rec.status === 'completed'
                                                ? <><CheckCircle2 className="w-3 h-3" /> COMPLETED</>
                                                : <><XCircle className="w-3 h-3" /> ERROR</>
                                            }
                                        </span>
                                        <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                                            <Clock className="w-2.5 h-2.5" />
                                            {timeAgo(rec.timestamp)}
                                        </span>
                                    </div>

                                    {/* Goal (truncated) */}
                                    <p className="text-xs text-foreground line-clamp-2 group-hover:text-primary transition-colors">
                                        {rec.goal}
                                    </p>

                                    {/* Meta row */}
                                    <div className="flex items-center gap-3 mt-1 text-[10px] text-muted-foreground">
                                        {rec.duration !== undefined && (
                                            <span>{rec.duration}s</span>
                                        )}
                                        {rec.spentWei && (
                                            <span>{formatMON(rec.spentWei)} MON</span>
                                        )}
                                        {rec.score !== undefined && (
                                            <span>⭑ {rec.score}/10</span>
                                        )}
                                        {rec.serviceName && (
                                            <span>→ {rec.serviceName}</span>
                                        )}
                                    </div>
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </>
    );
}
