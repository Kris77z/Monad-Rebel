import { useState } from 'react';
import { apiBase } from '@/lib/api-config';
import { useI18n } from '@/components/i18n/locale-provider';

/* ─── Types ─── */

export type AgentRole = 'hunter' | 'writer';

export interface AgentOnboardingForm {
    role: AgentRole;
    name: string;
    description: string;
    image?: string;
    trustModels: string[];
}

export type OnboardingStep = 'connect_wallet' | 'fill_profile' | 'review' | 'complete';

export interface OnboardingState {
    step: OnboardingStep;
    walletAddress?: string;
    form: AgentOnboardingForm;
    submitting: boolean;
    error?: string;
}

const INITIAL_FORM: AgentOnboardingForm = {
    role: 'hunter',
    name: '',
    description: '',
    trustModels: ['reputation'],
};

/**
 * Step machine: connect_wallet → fill_profile → review → complete.
 * On submit, POSTs to Registry POST /agents/register.
 */
export function useOnboarding() {
    const { t } = useI18n();
    const [state, setState] = useState<OnboardingState>({
        step: 'connect_wallet',
        form: { ...INITIAL_FORM },
        submitting: false,
    });

    const setStep = (step: OnboardingStep) =>
        setState((prev) => ({ ...prev, step }));

    /** Called when wallet connects successfully */
    const setWalletAddress = (address: string) =>
        setState((prev) => ({ ...prev, walletAddress: address, step: 'fill_profile' }));

    const updateForm = (patch: Partial<AgentOnboardingForm>) =>
        setState((prev) => ({ ...prev, form: { ...prev.form, ...patch } }));

    const goToReview = () => setStep('review');

    /** POST to Registry /agents/register */
    const submit = async () => {
        if (!state.walletAddress) {
            setState((prev) => ({ ...prev, error: t('onboarding.error.walletNotConnected') }));
            return;
        }

        setState((prev) => ({ ...prev, submitting: true, error: undefined }));

        try {
            const res = await fetch(`${apiBase.registry}/agents/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: state.form.name.trim(),
                    description: state.form.description.trim(),
                    image: state.form.image,
                    walletAddress: state.walletAddress,
                    trustModels: state.form.trustModels,
                    capabilities: [],
                }),
            });

            if (!res.ok) {
                const data = await res.json().catch(() => ({}));
                throw new Error((data as Record<string, string>).message ?? t('onboarding.error.registerFailedStatus', { status: res.status }));
            }

            // Also persist to localStorage for offline fallback
            localStorage.setItem(
                'rebel_agent_profile',
                JSON.stringify({ name: state.form.name, walletAddress: state.walletAddress })
            );

            setState((prev) => ({ ...prev, submitting: false, step: 'complete' }));
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : t('onboarding.error.registerFailed');
            setState((prev) => ({ ...prev, submitting: false, error: msg }));
        }
    };

    const reset = () =>
        setState({ step: 'connect_wallet', form: { ...INITIAL_FORM }, submitting: false });

    return { state, setWalletAddress, updateForm, goToReview, submit, reset, setStep };
}
