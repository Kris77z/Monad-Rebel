import type { AgentEvent, HunterRunResult } from '@/types/agent';
import type { PhaseId } from './phase-utils';
import { asRecord } from './phase-utils';
import { formatMON } from '@/lib/format';

/**
 * Generate a human-readable summary for each timeline phase.
 */
export function summaryForPhase(
    phaseId: PhaseId,
    phaseEvents: AgentEvent[],
    result: HunterRunResult | null,
    allEvents: AgentEvent[] = phaseEvents
): string {
    const compactText = (input: string, limit = 80): string => {
        const compact = input.replace(/\s+/g, ' ').trim();
        return compact.length > limit ? `${compact.slice(0, limit)}...` : compact;
    };

    const addUnsignedIntegerStrings = (a: string, b: string): string => {
        let carry = 0;
        let i = a.length - 1;
        let j = b.length - 1;
        let out = '';
        while (i >= 0 || j >= 0 || carry > 0) {
            const da = i >= 0 ? Number(a[i]) : 0;
            const db = j >= 0 ? Number(b[j]) : 0;
            const sum = da + db + carry;
            out = String(sum % 10) + out;
            carry = Math.floor(sum / 10);
            i -= 1;
            j -= 1;
        }
        return out.replace(/^0+(?=\d)/, '');
    };

    const readTotalPaymentWei = (): string | undefined => {
        let total = '0';
        let hasValue = false;
        for (const event of allEvents) {
            if (event.type !== 'quote_received' || typeof event.data !== 'object') continue;
            const amount = asRecord(event.data)?.amount;
            if (typeof amount !== 'string' || !/^\d+$/.test(amount)) continue;
            total = addUnsignedIntegerStrings(total, amount);
            hasValue = true;
        }
        return hasValue ? total : undefined;
    };

    if (phaseId === 'thinking') {
        const run = phaseEvents.find((e) => e.type === 'run_started');
        const goal = typeof asRecord(run?.data)?.goal === 'string' ? (asRecord(run?.data)?.goal as string) : '';
        return goal ? `Mission received: ${goal}` : 'Planning the execution strategy.';
    }

    if (phaseId === 'discovery') {
        const ev = [...phaseEvents].reverse().find((e) => e.type === 'services_discovered');
        const count = typeof asRecord(ev?.data)?.count === 'number' ? (asRecord(ev?.data)?.count as number) : 0;
        return count > 0 ? `Discovered ${count} available providers.` : 'Scanning available providers.';
    }

    if (phaseId === 'decision') {
        const ev = [...phaseEvents].reverse().find((e) => e.type === 'service_selected');
        const data = asRecord(ev?.data);
        const id = typeof data?.id === 'string' ? data.id : typeof data?.serviceId === 'string' ? data.serviceId : '';
        const fb = typeof data?.fallbackFrom === 'string' ? data.fallbackFrom : '';
        if (id && fb && fb !== id) return `Switched provider from ${fb} to ${id}.`;
        return id ? `Selected provider: ${id}.` : 'Selecting the best provider by price and reputation.';
    }

    if (phaseId === 'payment') {
        const quote = [...phaseEvents].reverse().find((e) => e.type === 'quote_received');
        const pay = [...phaseEvents].reverse().find((e) => e.type === 'payment_state');
        const amount = typeof asRecord(quote?.data)?.amount === 'string' ? (asRecord(quote?.data)?.amount as string) : '';
        const status = typeof asRecord(pay?.data)?.status === 'string' ? (asRecord(pay?.data)?.status as string) : '';
        if (amount && status) return `Quote ${formatMON(amount)} MON, status: ${status}.`;
        if (amount) return `Received quote: ${formatMON(amount)} MON.`;
        return 'Preparing and submitting x402 payment.';
    }

    if (phaseId === 'execution') {
        if (result?.execution?.result) {
            return `Result ready: ${compactText(result.execution.result, 80)}`;
        }
        return 'Provider is executing after payment settlement.';
    }

    if (phaseId === 'verification') {
        const receipt = [...phaseEvents].reverse().find((e) => e.type === 'receipt_verified');
        const evalEv = [...phaseEvents].reverse().find((e) => e.type === 'evaluation_completed');
        const verified = asRecord(receipt?.data)?.isValid === true;
        const score = typeof asRecord(evalEv?.data)?.score === 'number' ? (asRecord(evalEv?.data)?.score as number) : null;
        if (verified && score !== null) return `Receipt verified and output scored ${score}/10.`;
        const hasPaymentCompleted = allEvents.some(
            (e) => e.type === 'payment_state' && asRecord(e.data)?.status === 'payment-completed'
        );
        if (!receipt && hasPaymentCompleted) return 'Awaiting receipt...';
        return verified ? 'Receipt signature verification completed.' : 'Verifying receipt and evaluating output quality.';
    }

    if (phaseId === 'complete') {
        const fromEvent = [...allEvents].reverse().find((e) => e.type === 'evaluation_completed');
        const score = typeof result?.evaluation?.score === 'number'
            ? result.evaluation.score
            : typeof asRecord(fromEvent?.data)?.score === 'number'
                ? (asRecord(fromEvent?.data)?.score as number)
                : null;
        const totalWei = readTotalPaymentWei();
        if (score !== null || totalWei) {
            return `Mission closed. Score ${score ?? '--'}/10, total spent ${formatMON(totalWei)} MON.`;
        }
        if (result?.finalMessage) {
            return compactText(result.finalMessage, 80);
        }
    }

    return result?.finalMessage ? compactText(result.finalMessage, 80) : 'Mission flow completed.';
}
