'use client';

import { CreateAgentForm } from '@/components/onboarding/create-agent-form';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

/**
 * Agent Onboarding Page
 * Users create their Agent identity before accessing the dashboard.
 */
export default function OnboardingPage() {
    const router = useRouter();

    return (
        <div className="min-h-screen bg-background flex flex-col">
            {/* Header */}
            <header className="border-b border-border bg-card/60 backdrop-blur-sm px-6 py-3">
                <div className="flex items-center justify-between">
                    <Link href="/" className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-md bg-warm-800 flex items-center justify-center">
                            <span className="text-xs font-black text-warm-100">R</span>
                        </div>
                        <span className="font-heading text-base font-semibold tracking-tight">Rebel Agent Mesh</span>
                    </Link>
                    <Link href="/dashboard" className="text-xs text-muted-foreground hover:text-foreground transition-colors">
                        Skip to Dashboard →
                    </Link>
                </div>
            </header>

            {/* Main */}
            <main className="flex-1 flex items-center justify-center p-6">
                <div className="w-full max-w-lg">
                    <div className="text-center mb-8">
                        <h1 className="text-2xl font-heading font-bold">Create Your Agent</h1>
                        <p className="text-sm text-muted-foreground mt-2">
                            Register an autonomous agent to operate in the Monad Agent Economy.
                        </p>
                    </div>
                    <CreateAgentForm onComplete={() => router.push('/dashboard')} />
                </div>
            </main>
        </div>
    );
}
