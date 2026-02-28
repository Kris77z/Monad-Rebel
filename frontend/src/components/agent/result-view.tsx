import { HunterRunResult } from '@/types/agent';
import { useI18n } from '@/components/i18n/locale-provider';
import { CheckCircle2, FileJson, Star, ExternalLink } from 'lucide-react';
import { Streamdown } from 'streamdown';

interface ResultViewProps {
    result: HunterRunResult;
}

/**
 * Terminal-style result display for completed missions.
 * Replaces old Card-based layout with consistent terminal widgets.
 */
export function ResultView({ result }: ResultViewProps) {
    const { t } = useI18n();
    const content = result.execution?.result || result.finalMessage || t('result.empty');
    const receipt = result.execution?.receipt;
    const payment = result.execution?.payment;

    return (
        <div className="space-y-3">
            {/* ─── Final Result ─── */}
            <div className="border border-green-300 bg-green-50 p-3">
                <div className="flex justify-between items-center text-xs mb-2">
                    <span className="flex items-center gap-1.5 text-green-700 font-medium">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        {t('result.title')}
                    </span>
                    <div className="flex items-center gap-1.5">
                        {result.evaluation && (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 border border-amber-300 bg-amber-50 text-[10px] text-amber-700">
                                <Star className="w-2.5 h-2.5" />
                                {result.evaluation.score}/10
                            </span>
                        )}
                        {result.receiptVerified && (
                            <span className="px-1.5 py-0.5 border border-green-300 text-[10px] text-green-700">
                                {t('result.verified')}
                            </span>
                        )}
                    </div>
                </div>
                <div className="text-xs leading-relaxed text-foreground prose prose-sm max-w-none">
                    <Streamdown>{content}</Streamdown>
                </div>
            </div>

            {/* ─── Proof of Execution (x402) ─── */}
            {receipt && (
                <div className="border border-border bg-card p-3">
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-2">
                        <FileJson className="w-3 h-3" />
                        <span className="font-medium">{t('result.proofTitle')}</span>
                    </div>
                    <div className="text-[10px] space-y-1 text-muted-foreground break-all">
                        <div><span className="text-foreground font-medium">{t('result.provider')}:</span> {receipt.provider}</div>
                        <div><span className="text-foreground font-medium">{t('result.signature')}:</span> {receipt.signature}</div>
                        <div><span className="text-foreground font-medium">{t('result.requestHash')}:</span> {receipt.requestHash}</div>
                        {payment?.transaction && (
                            <div className="flex items-center gap-1">
                                <span className="text-foreground font-medium">{t('result.paymentTx')}:</span>
                                <a
                                    href={`https://testnet.monadscan.com/tx/${payment.transaction}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-primary hover:underline inline-flex items-center gap-0.5"
                                >
                                    {payment.transaction.slice(0, 10)}...
                                    <ExternalLink className="w-2.5 h-2.5" />
                                </a>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
