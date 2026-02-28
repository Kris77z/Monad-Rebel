'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';

/* ─── Types ─── */

export interface PresetParam {
    key: string;
    label: string;
    placeholder: string;
}

export interface Preset {
    label: string;
    /** Goal text. Use {paramKey} as placeholder for params. */
    goal: string;
    /** If defined, clicking this preset opens the inline form instead of filling directly */
    params?: PresetParam[];
    commander?: boolean;
}

/* ─── Preset data ─── */

export const PRESETS: Preset[] = [
    /* ── Single-agent ── */
    {
        label: '// write',
        goal: 'Write a concise analysis of Monad parallel execution and why it matters for on-chain AI agents.',
    },
    {
        label: '// audit',
        goal: 'Audit the contract {address} for loss-of-funds vulnerabilities: check reentrancy, access control, and unchecked returns.',
        params: [{ key: 'address', label: 'Contract', placeholder: '0x... or contract name' }],
    },
    /* ── Commander missions ── */
    {
        label: '// full-audit',
        goal: 'Perform a full security review of the contract {address}: first audit the Solidity code for vulnerabilities, then scan for rug-pull signals, then optimize gas usage, and finally write a comprehensive security report.',
        params: [{ key: 'address', label: 'Contract', placeholder: '0x... or contract name' }],
        commander: true,
    },
    {
        label: '// token-report',
        goal: 'Generate an investment report for {token}: first scan the contract for risks, then analyze its DeFi ecosystem potential, and write a final investment thesis with risk-reward analysis.',
        params: [{ key: 'token', label: 'Token', placeholder: 'token name or 0x address' }],
        commander: true,
    },
    {
        label: '// defi-strategy',
        goal: 'Build a DeFi strategy on Monad: first analyze the current yield landscape, then scan the top protocol tokens for safety, and produce a written portfolio allocation plan.',
        commander: true,
    },
];

/* ─── Inline parameter form ─── */

interface PresetFormProps {
    preset: Preset;
    onSubmit: (goal: string, commander: boolean) => void;
    onCancel: () => void;
}

export function PresetForm({ preset, onSubmit, onCancel }: PresetFormProps) {
    const [values, setValues] = useState<Record<string, string>>({});
    const firstRef = useRef<HTMLInputElement>(null);

    useEffect(() => { firstRef.current?.focus(); }, []);

    const canSubmit = (preset.params ?? []).every((p) => values[p.key]?.trim());

    const handleSubmit = () => {
        if (!canSubmit) return;
        let goal = preset.goal;
        for (const p of preset.params ?? []) {
            goal = goal.replaceAll(`{${p.key}}`, values[p.key].trim());
        }
        onSubmit(goal, Boolean(preset.commander));
    };

    return (
        <AnimatePresence>
            <motion.div
                key={preset.label}
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
            >
                <div className="border border-primary/30 bg-card p-3 space-y-2.5">
                    <p className="text-[10px] text-primary font-mono">{preset.label}</p>
                    {(preset.params ?? []).map((param, i) => (
                        <div key={param.key} className="flex items-center gap-2 text-xs">
                            <span className="text-muted-foreground shrink-0 w-16 text-right">{param.label}:</span>
                            <input
                                ref={i === 0 ? firstRef : undefined}
                                placeholder={param.placeholder}
                                value={values[param.key] ?? ''}
                                onChange={(e) => setValues({ ...values, [param.key]: e.target.value })}
                                onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
                                className="flex-1 bg-transparent border border-border px-2 py-1 outline-none focus:border-primary/50 text-foreground placeholder:text-muted-foreground/40 font-mono"
                            />
                        </div>
                    ))}
                    <div className="flex justify-end gap-3 text-[10px]">
                        <button onClick={onCancel} className="text-muted-foreground hover:text-foreground cursor-pointer transition-colors">
                            Cancel
                        </button>
                        <button
                            onClick={handleSubmit}
                            disabled={!canSubmit}
                            className="text-primary hover:text-glow cursor-pointer transition-colors disabled:opacity-30"
                        >
                            Execute ⟩
                        </button>
                    </div>
                </div>
            </motion.div>
        </AnimatePresence>
    );
}
