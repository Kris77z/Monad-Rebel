'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { Loader2, Send, Zap } from 'lucide-react';
import type { RunRequestMode } from '@/hooks/use-agent-stream';

interface GoalInputProps {
    onRun: (goal: string, mode?: RunRequestMode) => void;
    isLoading?: boolean;
    /** Externally injected goal (e.g. from history) */
    externalGoal?: string;
}

/** Terminal-style preset commands */
const PRESETS = [
    // Single-agent quick tasks
    {
        label: '// write',
        goal: 'Write a concise analysis of Monad parallel execution and why it matters for on-chain AI agents.',
    },
    {
        label: '// audit',
        goal: 'Audit this ERC-20 token contract for loss-of-funds vulnerabilities: check reentrancy, access control, and unchecked returns.',
    },
    {
        label: '// defi',
        goal: 'Analyze the DeFi landscape on Monad testnet. What protocols exist, what are their TVL drivers, and what risks should I watch?',
    },
    // Multi-phase commander missions (trigger 2-4 different agent types)
    {
        label: '// full-audit',
        goal: 'Perform a full security review of this token contract: first audit the Solidity code for vulnerabilities, then scan for rug-pull signals, then optimize gas usage, and finally write a comprehensive security report.',
        commander: true,
    },
    {
        label: '// token-report',
        goal: 'Generate an investment report for this token: first scan the contract for risks, then analyze its DeFi ecosystem potential, and write a final investment thesis with risk-reward analysis.',
        commander: true,
    },
    {
        label: '// defi-strategy',
        goal: 'Build a DeFi strategy on Monad: first analyze the current yield landscape, then scan the top protocol tokens for safety, and produce a written portfolio allocation plan.',
        commander: true,
    },
    {
        label: '// tx-deep-dive',
        goal: 'Investigate this suspicious transaction: first decode the transaction to understand what happened, then read the contract ABI to find admin functions, and write a risk assessment report.',
        commander: true,
    },
    {
        label: '// contract-review',
        goal: 'Do a complete contract review: audit the code for security issues, optimize gas efficiency, read the ABI to document all functions, and generate a developer-facing technical report.',
        commander: true,
    },
];

/** Auto-resize textarea to fit content (max 5 rows) */
const MAX_ROWS = 5;
const LINE_HEIGHT = 20; // px per row

export function GoalInput({ onRun, isLoading, externalGoal }: GoalInputProps) {
    const [goal, setGoal] = useState('');
    const [commanderMode, setCommanderMode] = useState(true);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    const autoResize = useCallback(() => {
        const el = textareaRef.current;
        if (!el) return;
        el.style.height = 'auto';
        el.style.height = `${Math.min(el.scrollHeight, LINE_HEIGHT * MAX_ROWS)}px`;
    }, []);

    // Sync external goal (e.g. from history)
    useEffect(() => {
        if (externalGoal !== undefined && externalGoal !== goal) {
            setGoal(externalGoal);
            setTimeout(autoResize, 0);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [externalGoal]);

    const handleSubmit = () => {
        const trimmed = goal.trim();
        if (trimmed && !isLoading) {
            onRun(trimmed, commanderMode ? 'commander' : 'single');
            setGoal('');
            /* Reset textarea height */
            if (textareaRef.current) {
                textareaRef.current.style.height = `${LINE_HEIGHT}px`;
            }
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSubmit();
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        setGoal(e.target.value);
        autoResize();
    };

    return (
        <div className="space-y-2">
            {/* Preset commands */}
            <div className="flex flex-wrap gap-2">
                {PRESETS.map((p) => (
                    <button
                        key={p.label}
                        onClick={() => {
                            setGoal(p.goal);
                            if ('commander' in p && p.commander) setCommanderMode(true);
                            setTimeout(autoResize, 0);
                        }}
                        disabled={isLoading}
                        className={`px-2 py-0.5 text-[11px] border transition-all disabled:opacity-30 cursor-pointer ${'commander' in p && p.commander
                            ? 'text-amber-500 border-amber-500/40 hover:text-amber-400 hover:border-amber-400/60'
                            : 'text-muted-foreground border-border hover:text-primary hover:border-primary/50 hover:text-glow'
                            }`}
                    >
                        {p.label}
                    </button>
                ))}
            </div>

            {/* Terminal command line (multi-line) */}
            {/* Commander mode toggle */}
            <div className="flex items-center gap-2">
                <button
                    onClick={() => setCommanderMode(!commanderMode)}
                    disabled={isLoading}
                    className={`inline-flex items-center gap-1 px-2 py-0.5 text-[10px] border transition-all cursor-pointer disabled:opacity-30 ${commanderMode
                        ? 'text-amber-400 border-amber-500/50 bg-amber-500/10'
                        : 'text-muted-foreground/50 border-border hover:text-muted-foreground'
                        }`}
                >
                    <Zap className="w-2.5 h-2.5" />
                    {commanderMode ? 'COMMANDER' : 'SINGLE'}
                </button>
                {commanderMode && (
                    <span className="text-[10px] text-amber-500/70">multi-phase mission</span>
                )}
            </div>

            {/* Terminal command line (multi-line) */}
            <div className="flex items-end gap-2">
                <span className={`text-sm text-glow shrink-0 pb-0.5 ${commanderMode ? 'text-amber-400' : 'text-primary'}`}>❯</span>
                <textarea
                    ref={textareaRef}
                    placeholder="describe your mission..."
                    value={goal}
                    onChange={handleChange}
                    onKeyDown={handleKeyDown}
                    disabled={isLoading}
                    rows={1}
                    className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground/40 outline-none border-none caret-primary resize-none leading-5"
                    style={{ height: `${LINE_HEIGHT}px` }}
                />
                {isLoading ? (
                    <span className="flex items-center gap-1.5 text-xs text-primary text-glow shrink-0 pb-0.5">
                        <Loader2 className="w-3 h-3 animate-spin" />
                        running...
                    </span>
                ) : (
                    <button
                        onClick={handleSubmit}
                        disabled={!goal.trim()}
                        className="text-muted-foreground hover:text-primary hover:text-glow transition-colors disabled:opacity-30 shrink-0 pb-0.5 cursor-pointer"
                    >
                        <Send className="w-4 h-4" />
                    </button>
                )}
            </div>
        </div>
    );
}
