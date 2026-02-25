'use client';

import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
    { id: 'connect_wallet' as const, label: 'Wallet', icon: Wallet },
    { id: 'fill_profile' as const, label: 'Profile', icon: User },
    { id: 'review' as const, label: 'Review', icon: Eye },
    { id: 'complete' as const, label: 'Done', icon: CheckCircle2 },
];

const ROLE_OPTIONS: Array<{ value: AgentRole; label: string; desc: string }> = [
    { value: 'hunter', label: '🔍 Hunter', desc: 'Discover and consume services' },
    { value: 'writer', label: '✍️ Writer', desc: 'Provide content generation services' },
];

function shortenAddr(addr: string): string {
    return addr.length > 12 ? `${addr.slice(0, 6)}...${addr.slice(-4)}` : addr;
}

/* ─── Component ─── */

interface CreateAgentFormProps {
    onComplete?: () => void;
}

export function CreateAgentForm({ onComplete }: CreateAgentFormProps) {
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
            {/* ─── Step indicator ─── */}
            <div className="flex items-center justify-center gap-2 mb-8">
                {STEPS.map((s, i) => {
                    const Icon = s.icon;
                    const isDone = i < stepIndex;
                    const isActive = i === stepIndex;
                    return (
                        <div key={s.id} className="flex items-center gap-2">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs transition-all ${isDone ? 'bg-green-100 text-green-700'
                                    : isActive ? 'bg-warm-900 text-warm-100'
                                        : 'bg-muted text-muted-foreground'
                                }`}>
                                {isDone ? <CheckCircle2 className="w-4 h-4" /> : <Icon className="w-3.5 h-3.5" />}
                            </div>
                            {i < STEPS.length - 1 && (
                                <div className={`w-8 h-0.5 ${i < stepIndex ? 'bg-green-300' : 'bg-muted'}`} />
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
                        <Card className="p-8 text-center">
                            <Wallet className="w-12 h-12 mx-auto text-warm-600 mb-4" />
                            <h2 className="text-lg font-heading font-semibold mb-2">Connect Your Wallet</h2>
                            <p className="text-sm text-muted-foreground mb-6">
                                Your wallet will be bound to your Agent identity on Monad.
                            </p>
                            <Button
                                onClick={() => void wallet.connect()}
                                disabled={wallet.connecting}
                                className="bg-warm-900 text-warm-100 hover:bg-warm-800 rounded-full px-8"
                            >
                                {wallet.connecting ? (
                                    <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Connecting...</>
                                ) : (
                                    <><Wallet className="w-4 h-4 mr-2" /> Connect Wallet</>
                                )}
                            </Button>
                            {wallet.label && (
                                <p className="mt-3 text-xs text-muted-foreground">via {wallet.label}</p>
                            )}
                        </Card>
                    )}

                    {/* Step 2: Fill Profile */}
                    {state.step === 'fill_profile' && (
                        <Card className="p-6 space-y-5">
                            <h2 className="text-lg font-heading font-semibold">Agent Profile</h2>

                            {/* Connected wallet banner */}
                            {state.walletAddress && (
                                <div className="rounded-lg bg-green-50 border border-green-200 p-3 flex items-center gap-2 text-xs">
                                    <CheckCircle2 className="w-3.5 h-3.5 text-green-600 shrink-0" />
                                    <span className="text-green-800">
                                        Connected: <span className="font-mono">{shortenAddr(state.walletAddress)}</span>
                                    </span>
                                </div>
                            )}

                            {/* Role */}
                            <div>
                                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Role</label>
                                <div className="grid grid-cols-2 gap-3 mt-2">
                                    {ROLE_OPTIONS.map((opt) => (
                                        <button
                                            key={opt.value}
                                            onClick={() => updateForm({ role: opt.value })}
                                            className={`p-3 rounded-lg border text-left transition-all ${state.form.role === opt.value
                                                    ? 'border-warm-600 bg-warm-100/50 shadow-sm'
                                                    : 'border-border hover:border-warm-400'
                                                }`}
                                        >
                                            <p className="text-sm font-semibold">{opt.label}</p>
                                            <p className="text-[11px] text-muted-foreground mt-0.5">{opt.desc}</p>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Name */}
                            <div>
                                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Agent Name</label>
                                <input
                                    type="text"
                                    placeholder="My First Agent"
                                    value={state.form.name}
                                    onChange={(e) => updateForm({ name: e.target.value })}
                                    className="mt-1.5 w-full h-10 px-3 rounded-lg border border-border bg-card text-sm focus:outline-none focus:ring-2 focus:ring-warm-500/30 focus:border-warm-500"
                                />
                            </div>

                            {/* Description */}
                            <div>
                                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Description</label>
                                <textarea
                                    placeholder="What does this agent do?"
                                    value={state.form.description}
                                    onChange={(e) => updateForm({ description: e.target.value })}
                                    rows={3}
                                    className="mt-1.5 w-full px-3 py-2 rounded-lg border border-border bg-card text-sm resize-none focus:outline-none focus:ring-2 focus:ring-warm-500/30 focus:border-warm-500"
                                />
                            </div>

                            {/* Trust */}
                            <div>
                                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Trust Model</label>
                                <div className="flex gap-2 mt-2">
                                    {['reputation', 'crypto-economic'].map((m) => (
                                        <button
                                            key={m}
                                            onClick={() => {
                                                const c = state.form.trustModels;
                                                const next = c.includes(m) ? c.filter((x) => x !== m) : [...c, m];
                                                updateForm({ trustModels: next.length > 0 ? next : ['reputation'] });
                                            }}
                                            className={`px-3 py-1.5 rounded-full text-xs border transition-all ${state.form.trustModels.includes(m)
                                                    ? 'bg-warm-900 text-warm-100 border-warm-900'
                                                    : 'bg-card text-foreground border-border hover:border-warm-400'
                                                }`}
                                        >
                                            {m}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Nav */}
                            <div className="flex justify-between pt-2">
                                <Button variant="outline" onClick={() => setStep('connect_wallet')} className="rounded-full">
                                    <ArrowLeft className="w-4 h-4 mr-1" /> Back
                                </Button>
                                <Button
                                    onClick={goToReview}
                                    disabled={!state.form.name.trim()}
                                    className="bg-warm-900 text-warm-100 hover:bg-warm-800 rounded-full"
                                >
                                    Review <ArrowRight className="w-4 h-4 ml-1" />
                                </Button>
                            </div>
                        </Card>
                    )}

                    {/* Step 3: Review */}
                    {state.step === 'review' && (
                        <Card className="p-6 space-y-4">
                            <h2 className="text-lg font-heading font-semibold">Review & Create</h2>
                            <div className="rounded-lg bg-muted/50 p-4 space-y-3 text-sm">
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Wallet</span>
                                    <span className="font-mono text-xs">{state.walletAddress ? shortenAddr(state.walletAddress) : '—'}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Role</span>
                                    <Badge className="bg-warm-200 text-warm-900 rounded-full text-xs">{state.form.role}</Badge>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Name</span>
                                    <span className="font-semibold">{state.form.name}</span>
                                </div>
                                <div className="flex justify-between items-start">
                                    <span className="text-muted-foreground">Trust</span>
                                    <div className="flex gap-1">
                                        {state.form.trustModels.map((m) => (
                                            <Badge key={m} variant="outline" className="text-[10px] rounded-full">{m}</Badge>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            {state.error && (
                                <div className="flex items-center gap-2 text-xs text-destructive">
                                    <AlertCircle className="w-3.5 h-3.5" /> {state.error}
                                </div>
                            )}

                            <div className="flex justify-between pt-2">
                                <Button variant="outline" onClick={() => setStep('fill_profile')} className="rounded-full">
                                    <ArrowLeft className="w-4 h-4 mr-1" /> Edit
                                </Button>
                                <Button
                                    onClick={() => void submit()}
                                    disabled={state.submitting}
                                    className="bg-warm-900 text-warm-100 hover:bg-warm-800 rounded-full"
                                >
                                    {state.submitting ? 'Creating...' : 'Create Agent'}
                                    <Sparkles className="w-4 h-4 ml-1" />
                                </Button>
                            </div>
                        </Card>
                    )}

                    {/* Step 4: Complete */}
                    {state.step === 'complete' && (
                        <Card className="p-8 text-center">
                            <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 300 }}>
                                <CheckCircle2 className="w-16 h-16 mx-auto text-green-600 mb-4" />
                            </motion.div>
                            <h2 className="text-lg font-heading font-semibold mb-2">Agent Created!</h2>
                            <p className="text-sm text-muted-foreground mb-1">
                                <strong>{state.form.name}</strong> is ready on Monad.
                            </p>
                            <p className="text-[11px] text-muted-foreground/70 font-mono mb-6">
                                {state.walletAddress ? shortenAddr(state.walletAddress) : ''}
                            </p>
                            <div className="flex gap-3 justify-center">
                                <Button onClick={() => { reset(); }} variant="outline" className="rounded-full">Create Another</Button>
                                <Button onClick={() => onComplete?.()} className="bg-warm-900 text-warm-100 hover:bg-warm-800 rounded-full">
                                    Go to Dashboard <ArrowRight className="w-4 h-4 ml-1" />
                                </Button>
                            </div>
                        </Card>
                    )}
                </motion.div>
            </AnimatePresence>
        </div>
    );
}
