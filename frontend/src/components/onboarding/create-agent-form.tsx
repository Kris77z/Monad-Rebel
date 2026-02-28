'use client';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useI18n } from '@/components/i18n/locale-provider';
import { useOnboarding, type AgentRole } from '@/hooks/use-onboarding';
import { useWallet } from '@/hooks/use-wallet';
import { motion, AnimatePresence } from 'motion/react';
import {
    Wallet, User, Eye, CheckCircle2,
    ArrowRight, ArrowLeft, AlertCircle, Sparkles, Loader2,
} from 'lucide-react';
import { useEffect } from 'react';

/* ─── Constants ─── */

const STEPS = [
    { id: 'connect_wallet' as const, labelKey: 'onboarding.step.wallet', icon: Wallet },
    { id: 'fill_profile' as const, labelKey: 'onboarding.step.profile', icon: User },
    { id: 'review' as const, labelKey: 'onboarding.step.review', icon: Eye },
    { id: 'complete' as const, labelKey: 'onboarding.step.done', icon: CheckCircle2 },
];

const ROLE_OPTIONS: Array<{ value: AgentRole; icon: string; labelKey: string; descKey: string }> = [
    { value: 'hunter', icon: '🔍', labelKey: 'onboarding.role.hunter.label', descKey: 'onboarding.role.hunter.desc' },
    { value: 'writer', icon: '✍️', labelKey: 'onboarding.role.writer.label', descKey: 'onboarding.role.writer.desc' },
];

function shortenAddr(addr: string): string {
    return addr.length > 12 ? `${addr.slice(0, 6)}...${addr.slice(-4)}` : addr;
}

/* ─── Component ─── */

interface CreateAgentFormProps {
    onComplete?: () => void;
}

export function CreateAgentForm({ onComplete }: CreateAgentFormProps) {
    const { t } = useI18n();
    const { state, setWalletAddress, updateForm, goToReview, submit, reset, setStep } = useOnboarding();
    const wallet = useWallet();
    const stepIndex = STEPS.findIndex((s) => s.id === state.step);

    /* Auto-advance when wallet connects */
    useEffect(() => {
        if (wallet.connected && wallet.address && state.step === 'connect_wallet') {
            setWalletAddress(wallet.address);
        }
    }, [wallet.connected, wallet.address, state.step, setWalletAddress]);

    return (
        <div className="max-w-lg mx-auto">
            {/* ─── Step indicator (terminal style — no rounded, minimal) ─── */}
            <div className="flex items-center justify-center gap-1 mb-6">
                {STEPS.map((s, i) => {
                    const Icon = s.icon;
                    const isDone = i < stepIndex;
                    const isActive = i === stepIndex;
                    return (
                        <div key={s.id} className="flex items-center gap-1">
                            <div className={`w-6 h-6 flex items-center justify-center text-[10px] border transition-all ${isDone
                                    ? 'bg-green-500/15 border-green-500/30 text-green-400'
                                    : isActive
                                        ? 'bg-primary/10 border-primary/30 text-primary text-glow'
                                        : 'bg-card border-border text-muted-foreground'
                                }`}>
                                {isDone ? <CheckCircle2 className="w-3 h-3" /> : <Icon className="w-2.5 h-2.5" />}
                            </div>
                            {i < STEPS.length - 1 && (
                                <div className={`w-5 h-px ${i < stepIndex ? 'bg-green-500/30' : 'bg-border'}`} />
                            )}
                        </div>
                    );
                })}
            </div>

            {/* ─── Step content ─── */}
            <AnimatePresence mode="wait">
                <motion.div
                    key={state.step}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.2 }}
                >
                    {/* Step 1: Connect Wallet */}
                    {state.step === 'connect_wallet' && (
                        <div className="border border-border bg-card p-8 text-center">
                            <div className="w-12 h-12 border border-primary/20 bg-primary/5 flex items-center justify-center mx-auto mb-4">
                                <Wallet className="w-5 h-5 text-primary" />
                            </div>
                            <h2 className="text-sm font-heading font-semibold mb-1.5">{t('onboarding.connect.title')}</h2>
                            <p className="text-[11px] text-muted-foreground mb-5 max-w-xs mx-auto">
                                {t('onboarding.connect.body')}
                            </p>
                            <button
                                onClick={() => void wallet.connect()}
                                disabled={wallet.connecting}
                                className="inline-flex items-center gap-2 px-5 py-2 border border-primary/40 text-primary text-xs hover:bg-primary/10 hover:text-glow transition-all cursor-pointer disabled:opacity-50"
                            >
                                {wallet.connecting ? (
                                    <><Loader2 className="w-3.5 h-3.5 animate-spin" /> {t('onboarding.connect.connecting')}</>
                                ) : (
                                    <><Wallet className="w-3.5 h-3.5" /> {t('onboarding.connect.button')}</>
                                )}
                            </button>
                            {wallet.label && (
                                <p className="mt-3 text-[10px] text-muted-foreground">{t('onboarding.connect.via', { label: wallet.label })}</p>
                            )}
                        </div>
                    )}

                    {/* Step 2: Fill Profile */}
                    {state.step === 'fill_profile' && (
                        <div className="border border-border bg-card p-5 space-y-4">
                            <h2 className="text-sm font-heading font-semibold">{t('onboarding.profile.title')}</h2>

                            {/* Connected wallet banner */}
                            {state.walletAddress && (
                                <div className="border border-green-500/20 bg-green-500/5 p-2 flex items-center gap-2 text-[11px]">
                                    <CheckCircle2 className="w-3 h-3 text-green-400 shrink-0" />
                                    <span className="text-green-300 font-mono">
                                        {t('onboarding.profile.connected', { address: shortenAddr(state.walletAddress) })}
                                    </span>
                                </div>
                            )}

                            {/* Role */}
                            <div>
                                <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">{t('onboarding.profile.role')}</label>
                                <div className="grid grid-cols-2 gap-2 mt-1.5">
                                    {ROLE_OPTIONS.map((opt) => (
                                        <button
                                            key={opt.value}
                                            onClick={() => updateForm({ role: opt.value })}
                                            className={`p-2.5 border text-left transition-all ${state.form.role === opt.value
                                                    ? 'border-primary/40 bg-primary/5'
                                                    : 'border-border bg-card hover:border-primary/20'
                                                }`}
                                        >
                                            <p className="text-xs font-semibold">{opt.icon} {t(opt.labelKey)}</p>
                                            <p className="text-[10px] text-muted-foreground mt-0.5">{t(opt.descKey)}</p>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Name */}
                            <div>
                                <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">{t('onboarding.profile.name')}</label>
                                <input
                                    type="text"
                                    placeholder={t('onboarding.profile.namePlaceholder')}
                                    value={state.form.name}
                                    onChange={(e) => updateForm({ name: e.target.value })}
                                    className="mt-1 w-full h-8 px-3 border border-border bg-background text-xs placeholder:text-muted-foreground/40 focus:outline-none focus:border-primary/40"
                                />
                            </div>

                            {/* Description */}
                            <div>
                                <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">{t('onboarding.profile.description')}</label>
                                <textarea
                                    placeholder={t('onboarding.profile.descriptionPlaceholder')}
                                    value={state.form.description}
                                    onChange={(e) => updateForm({ description: e.target.value })}
                                    rows={2}
                                    className="mt-1 w-full px-3 py-2 border border-border bg-background text-xs resize-none placeholder:text-muted-foreground/40 focus:outline-none focus:border-primary/40"
                                />
                            </div>

                            {/* Trust Models */}
                            <div>
                                <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">{t('onboarding.profile.trust')}</label>
                                <div className="flex gap-2 mt-1.5">
                                    {['reputation', 'crypto-economic'].map((m) => (
                                        <button
                                            key={m}
                                            onClick={() => {
                                                const c = state.form.trustModels;
                                                const next = c.includes(m) ? c.filter((x) => x !== m) : [...c, m];
                                                updateForm({ trustModels: next.length > 0 ? next : ['reputation'] });
                                            }}
                                            className={`px-2.5 py-1 text-[10px] border transition-all ${state.form.trustModels.includes(m)
                                                    ? 'bg-primary/10 text-primary border-primary/30'
                                                    : 'bg-card text-muted-foreground border-border hover:border-primary/20'
                                                }`}
                                        >
                                            {t(`onboarding.trust.${m}`)}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Nav */}
                            <div className="flex justify-between pt-1">
                                <Button variant="outline" size="sm" onClick={() => setStep('connect_wallet')} className="rounded-none border-border text-[11px] h-7 px-3">
                                    <ArrowLeft className="w-3 h-3 mr-1" /> {t('onboarding.profile.back')}
                                </Button>
                                <Button
                                    size="sm"
                                    onClick={goToReview}
                                    disabled={!state.form.name.trim()}
                                    className="rounded-none bg-primary text-primary-foreground hover:bg-primary/90 text-[11px] h-7 px-3"
                                >
                                    {t('onboarding.profile.review')} <ArrowRight className="w-3 h-3 ml-1" />
                                </Button>
                            </div>
                        </div>
                    )}

                    {/* Step 3: Review */}
                    {state.step === 'review' && (
                        <div className="border border-border bg-card p-5 space-y-4">
                            <h2 className="text-sm font-heading font-semibold">{t('onboarding.review.title')}</h2>
                            <div className="border border-border bg-background p-3 space-y-2.5 font-mono text-[11px]">
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">{t('onboarding.review.wallet')}</span>
                                    <span className="text-primary">{state.walletAddress ? shortenAddr(state.walletAddress) : '—'}</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-muted-foreground">{t('onboarding.review.role')}</span>
                                    <Badge className="bg-primary/10 text-primary border border-primary/20 rounded-none text-[10px] px-1.5 py-0">
                                        {t(`onboarding.role.${state.form.role}.label`)}
                                    </Badge>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">{t('onboarding.review.name')}</span>
                                    <span className="text-foreground font-semibold">{state.form.name}</span>
                                </div>
                                <div className="flex justify-between items-start">
                                    <span className="text-muted-foreground">{t('onboarding.review.trust')}</span>
                                    <div className="flex gap-1">
                                        {state.form.trustModels.map((m) => (
                                            <Badge key={m} variant="outline" className="text-[10px] rounded-none border-border px-1.5 py-0">{t(`onboarding.trust.${m}`)}</Badge>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            {state.error && (
                                <div className="flex items-center gap-2 text-[11px] text-destructive">
                                    <AlertCircle className="w-3 h-3" /> {state.error}
                                </div>
                            )}

                            <div className="flex justify-between pt-1">
                                <Button variant="outline" size="sm" onClick={() => setStep('fill_profile')} className="rounded-none border-border text-[11px] h-7 px-3">
                                    <ArrowLeft className="w-3 h-3 mr-1" /> {t('onboarding.review.edit')}
                                </Button>
                                <Button
                                    size="sm"
                                    onClick={() => void submit()}
                                    disabled={state.submitting}
                                    className="rounded-none bg-primary text-primary-foreground hover:bg-primary/90 text-[11px] h-7 px-3"
                                >
                                    {state.submitting ? t('onboarding.review.creating') : t('onboarding.review.create')}
                                    <Sparkles className="w-3 h-3 ml-1" />
                                </Button>
                            </div>
                        </div>
                    )}

                    {/* Step 4: Complete */}
                    {state.step === 'complete' && (
                        <div className="border border-border bg-card p-8 text-center">
                            <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 300 }}>
                                <div className="w-14 h-14 border border-green-500/20 bg-green-500/10 flex items-center justify-center mx-auto mb-4">
                                    <CheckCircle2 className="w-7 h-7 text-green-400" />
                                </div>
                            </motion.div>
                            <h2 className="text-sm font-heading font-semibold mb-1.5">{t('onboarding.complete.title')}</h2>
                            <p className="text-[11px] text-muted-foreground mb-1">
                                {t('onboarding.complete.body', { name: state.form.name })}
                            </p>
                            <p className="text-[10px] text-primary font-mono mb-5">
                                {state.walletAddress ? shortenAddr(state.walletAddress) : ''}
                            </p>
                            <div className="flex gap-2 justify-center">
                                <Button onClick={() => { reset(); }} variant="outline" size="sm" className="rounded-none border-border text-[11px] h-7 px-3">{t('onboarding.complete.createAnother')}</Button>
                                <Button onClick={() => onComplete?.()} size="sm" className="rounded-none bg-primary text-primary-foreground hover:bg-primary/90 text-[11px] h-7 px-3">
                                    {t('onboarding.complete.goDashboard')} <ArrowRight className="w-3 h-3 ml-1" />
                                </Button>
                            </div>
                        </div>
                    )}
                </motion.div>
            </AnimatePresence>
        </div>
    );
}
