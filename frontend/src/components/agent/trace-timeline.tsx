'use client';

import { useI18n } from '@/components/i18n/locale-provider';
import { formatLocaleTime } from '@/lib/i18n';
import { AgentEvent, PaymentStatus } from "@/types/agent";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "motion/react";
import {
    Play, CheckCircle, AlertOctagon, Wallet,
    Search, Zap, ArrowRight, Brain, FileCheck
} from "lucide-react";

interface TraceTimelineProps {
    events: AgentEvent[];
}

export function TraceTimeline({ events }: TraceTimelineProps) {
    if (events.length === 0) return null;

    return (
        <div className="space-y-3">
            <AnimatePresence mode="popLayout">
                {events.map((event, idx) => (
                    <motion.div
                        key={`${event.at}-${idx}`}
                        initial={{ opacity: 0, y: 20, scale: 0.97 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        transition={{
                            type: "spring",
                            stiffness: 500,
                            damping: 30,
                            delay: 0.05,
                        }}
                    >
                        <TraceCard event={event} isLatest={idx === events.length - 1} />
                    </motion.div>
                ))}
            </AnimatePresence>
        </div>
    );
}

/** 事件视觉配置 — 暖色系 */
interface EventConfig {
    icon: React.ReactNode;
    bg: string;
    border: string;
    title: string;
    accent: string;
}

function asRecord(value: unknown): Record<string, unknown> | null {
    if (!value || typeof value !== 'object') {
        return null;
    }
    return value as Record<string, unknown>;
}

function prettifyEventType(value: string): string {
    return value.replace(/_/g, ' ');
}

function getEventConfig(event: AgentEvent, translate: (key: string) => string): EventConfig {
    const eventType = event.type;

    if (eventType === 'run_started') return {
        icon: <Play className="w-3.5 h-3.5" />,
        bg: 'bg-warm-200/60', border: 'border-warm-400',
        title: `🚀 ${translate('trace.run_started')}`, accent: 'text-warm-900',
    };
    if (eventType === 'services_discovered') return {
        icon: <Search className="w-3.5 h-3.5" />,
        bg: 'bg-blue-50', border: 'border-blue-200',
        title: `🔍 ${translate('trace.services_discovered')}`, accent: 'text-blue-800',
    };
    if (eventType === 'service_selected') return {
        icon: <ArrowRight className="w-3.5 h-3.5" />,
        bg: 'bg-blue-50', border: 'border-blue-200',
        title: `🎯 ${translate('trace.service_selected')}`, accent: 'text-blue-800',
    };
    if (eventType === 'tool_call') return {
        icon: <Brain className="w-3.5 h-3.5" />,
        bg: 'bg-amber-50', border: 'border-amber-200',
        title: `🧠 ${translate('trace.tool_call')}`, accent: 'text-amber-800',
    };
    if (eventType === 'quote_received') return {
        icon: <Wallet className="w-3.5 h-3.5" />,
        bg: 'bg-orange-50', border: 'border-orange-200',
        title: `💰 ${translate('trace.quote_received')}`, accent: 'text-orange-800',
    };
    if (eventType === 'payment_state') {
        const data = asRecord(event.data);
        const s = (typeof data?.status === 'string' ? data.status : undefined) as PaymentStatus | undefined;
        if (s === 'payment-completed') return {
            icon: <CheckCircle className="w-3.5 h-3.5" />,
            bg: 'bg-green-50', border: 'border-green-200',
            title: `✅ ${translate('trace.payment_confirmed')}`, accent: 'text-green-800',
        };
        if (s === 'payment-submitted') return {
            icon: <Wallet className="w-3.5 h-3.5" />,
            bg: 'bg-orange-50', border: 'border-orange-200',
            title: `⏳ ${translate('trace.payment_submitted')}`, accent: 'text-orange-800',
        };
        return {
            icon: <Wallet className="w-3.5 h-3.5" />,
            bg: 'bg-red-50', border: 'border-red-200',
            title: `❌ ${translate('trace.payment_failed')}`, accent: 'text-red-800',
        };
    }
    if (eventType === 'receipt_verified') return {
        icon: <FileCheck className="w-3.5 h-3.5" />,
        bg: 'bg-green-50', border: 'border-green-200',
        title: `🔐 ${translate('trace.receipt_verified')}`, accent: 'text-green-800',
    };
    if (eventType === 'run_completed') return {
        icon: <CheckCircle className="w-3.5 h-3.5" />,
        bg: 'bg-green-50', border: 'border-green-200',
        title: `🎉 ${translate('trace.run_completed')}`, accent: 'text-green-800',
    };
    if (eventType === 'run_failed' || eventType === 'error') return {
        icon: <AlertOctagon className="w-3.5 h-3.5" />,
        bg: 'bg-red-50', border: 'border-red-200',
        title: `⚠️ ${translate('trace.error')}`, accent: 'text-red-800',
    };
    return {
        icon: <Zap className="w-3.5 h-3.5" />,
        bg: 'bg-warm-100', border: 'border-border',
        title: prettifyEventType(eventType), accent: 'text-muted-foreground',
    };
}

/** 事件详情 */
function getEventDetail(event: AgentEvent, t: (key: string, variables?: Record<string, string | number>) => string): React.ReactNode {
    const { type } = event;
    const data = asRecord(event.data);

    if (type === 'services_discovered' && typeof data?.count === 'number')
        return <p>{t('trace.foundServices', { count: data.count })}</p>;
    if (type === 'service_selected') {
        const serviceId =
            typeof data?.serviceId === 'string'
                ? data.serviceId
                : typeof data?.id === 'string'
                    ? data.id
                    : undefined;
        if (serviceId) {
            return <p className="font-mono text-xs">{serviceId}</p>;
        }
    }
    if (type === 'tool_call' && data?.tool) {
        const toolName = typeof data.tool === 'string' ? data.tool : undefined;
        if (!toolName) {
            return null;
        }
        return (
            <div className="bg-warm-900/5 rounded p-2 mt-1.5 font-mono text-[11px]">
                <span className="text-amber-700 font-semibold">{toolName}</span>
                {data.args !== undefined && (
                    <pre className="mt-1 text-muted-foreground overflow-x-auto whitespace-pre-wrap">
                        {JSON.stringify(data.args, null, 2)}
                    </pre>
                )}
            </div>
        );
    }
    if (type === 'quote_received' && typeof data?.amount === 'string')
        return <p>{t('trace.price', { amount: data.amount })}</p>;
    if (type === 'payment_state' && typeof data?.txHash === 'string') {
        return (
            <a href={`https://testnet.monadscan.com/tx/${data.txHash}`}
                target="_blank" rel="noopener noreferrer"
                className="text-teal-700 hover:underline text-xs font-mono inline-flex items-center gap-1">
                {t('trace.viewOnExplorer')} →
            </a>
        );
    }
    if (type === 'receipt_verified')
        return <p className="text-green-700 font-medium">{t('trace.signatureValid')}</p>;
    if ((type === 'run_failed' || type === 'error') && typeof data?.message === 'string')
        return <p className="text-red-700">{data.message}</p>;
    return null;
}

function TraceCard({ event, isLatest }: { event: AgentEvent; isLatest: boolean }) {
    const { locale, t } = useI18n();
    const config = getEventConfig(event, t);
    const detail = getEventDetail(event, t);
    const time = formatLocaleTime(locale, event.at);

    return (
        <div className={cn(
            "rounded-lg border p-3 transition-shadow duration-500",
            config.bg, config.border,
            isLatest && "shadow-md"
        )}>
            <div className="flex items-center justify-between mb-1">
                <div className={cn("flex items-center gap-2 font-medium text-sm", config.accent)}>
                    {config.icon}
                    {config.title}
                </div>
                <span className="text-[10px] text-muted-foreground font-mono">{time}</span>
            </div>
            {detail && (
                <div className="text-xs text-muted-foreground mt-1.5">{detail}</div>
            )}
        </div>
    );
}
