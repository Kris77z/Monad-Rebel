'use client';

import { useI18n } from '@/components/i18n/locale-provider';
import { LocaleSwitcher } from '@/components/i18n/locale-switcher';
import { ChainStatusBar } from '@/components/layout/chain-status-bar';
import { TerminalOnboarding } from '@/components/onboarding/terminal-onboarding';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

/**
 * Agent Onboarding Page — Full terminal CLI experience
 * Same shell as Dashboard (header + ChainStatusBar), content is interactive CLI
 */
export default function OnboardingPage() {
    const router = useRouter();
    const { locale, hydrated, t } = useI18n();

    return (
        <div className="h-screen flex flex-col">
            {/* ═══ Terminal Title Bar (identical to Dashboard) ═══ */}
            <header className="border-b border-border bg-card px-4 py-2">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-1.5">
                            <span className="w-2.5 h-2.5 rounded-full bg-[#ff5f57]" />
                            <span className="w-2.5 h-2.5 rounded-full bg-[#febc2e]" />
                            <span className="w-2.5 h-2.5 rounded-full bg-[#28c840]" />
                        </div>
                        <Link href="/" className="text-xs text-muted-foreground hover:text-foreground transition-colors">
                            <span className="text-primary">rebel</span>
                            <span className="text-muted-foreground/50">@</span>
                            <span>{t('onboarding.shellPath')}</span>
                            <span className="text-muted-foreground/50">:</span>
                            <span className="text-primary">~</span>
                            <span className="text-muted-foreground/50">$</span>
                        </Link>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                            <span className="hidden sm:inline">{t('dashboard.network')}</span>
                        </span>
                        <span className="text-border">│</span>
                        <LocaleSwitcher />
                        <span className="text-border">│</span>
                        <Link href="/dashboard" className="hover:text-primary hover:text-glow transition-colors">
                            {t('onboarding.skip')} →
                        </Link>
                    </div>
                </div>
            </header>

            {/* ═══ Terminal CLI Content ═══ */}
            <main className="flex-1 min-h-0">
                {hydrated ? (
                    <TerminalOnboarding
                        key={locale}
                        onComplete={() => router.push('/dashboard')}
                    />
                ) : null}
            </main>

            {/* ═══ Chain Status (identical to Dashboard) ═══ */}
            <ChainStatusBar />
        </div>
    );
}
