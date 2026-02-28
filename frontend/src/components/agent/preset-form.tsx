'use client';

import { useI18n } from '@/components/i18n/locale-provider';
import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';

/* ─── Types ─── */

export interface PresetParam {
    key: string;
    label: string;
    placeholder: string;
}

export interface Preset {
    id: string;
    label: string;
    /** Goal text. Use {paramKey} as placeholder for params. */
    goal: string;
    /** If defined, clicking this preset opens the inline form instead of filling directly */
    params?: PresetParam[];
    commander?: boolean;
    aliases: string[];
}

type Translator = (key: string, variables?: Record<string, string | number>) => string;

/* ─── Preset data ─── */

export function compilePresetGoal(preset: Preset, values: Record<string, string>): string {
    let goal = preset.goal;
    for (const p of preset.params ?? []) {
        goal = goal.replaceAll(`{${p.key}}`, (values[p.key] ?? '').trim());
    }
    return goal;
}

export function buildPresets(t: Translator): Preset[] {
    return [
        {
            id: 'write',
            label: t('preset.command.write'),
            goal: t('preset.goal.write'),
            aliases: ['// write', '// 写作'],
        },
        {
            id: 'audit',
            label: t('preset.command.audit'),
            goal: t('preset.goal.audit', { address: '{address}' }),
            params: [{ key: 'address', label: t('preset.param.contract'), placeholder: t('preset.placeholder.contract') }],
            aliases: ['// audit', '// 审计'],
        },
        {
            id: 'full-audit',
            label: t('preset.command.fullAudit'),
            goal: t('preset.goal.fullAudit', { address: '{address}' }),
            params: [{ key: 'address', label: t('preset.param.contract'), placeholder: t('preset.placeholder.contract') }],
            commander: true,
            aliases: ['// full-audit', '// 全审计'],
        },
        {
            id: 'token-report',
            label: t('preset.command.tokenReport'),
            goal: t('preset.goal.tokenReport', { token: '{token}' }),
            params: [{ key: 'token', label: t('preset.param.token'), placeholder: t('preset.placeholder.token') }],
            commander: true,
            aliases: ['// token-report', '// 代币报告'],
        },
        {
            id: 'defi-strategy',
            label: t('preset.command.defiStrategy'),
            goal: t('preset.goal.defiStrategy'),
            commander: true,
            aliases: ['// defi-strategy', '// defi策略', '// DeFi策略'],
        },
    ];
}

/* ─── Inline parameter form ─── */

interface PresetFormProps {
    preset: Preset;
    onSubmit: (goal: string, commander: boolean) => void;
    onCancel: () => void;
}

export function PresetForm({ preset, onSubmit, onCancel }: PresetFormProps) {
    const { t } = useI18n();
    const [values, setValues] = useState<Record<string, string>>({});
    const firstRef = useRef<HTMLInputElement>(null);

    useEffect(() => { firstRef.current?.focus(); }, []);

    const canSubmit = (preset.params ?? []).every((p) => values[p.key]?.trim());

    const handleSubmit = () => {
        if (!canSubmit) return;
        const goal = compilePresetGoal(preset, values);
        onSubmit(goal, Boolean(preset.commander));
    };

    return (
        <AnimatePresence>
            <motion.div
                key={preset.id}
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
                            {t('preset.cancel')}
                        </button>
                        <button
                            onClick={handleSubmit}
                            disabled={!canSubmit}
                            className="text-primary hover:text-glow cursor-pointer transition-colors disabled:opacity-30"
                        >
                            {t('preset.execute')} ⟩
                        </button>
                    </div>
                </div>
            </motion.div>
        </AnimatePresence>
    );
}
