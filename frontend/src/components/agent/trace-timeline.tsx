'use client';

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

function getEventConfig(event: AgentEvent): EventConfig {
    const t = event.type;

    if (t === 'run_started') return {
        icon: <Play className="w-3.5 h-3.5" />,
        bg: 'bg-warm-200/60', border: 'border-warm-400',
        title: '🚀 Mission Started', accent: 'text-warm-900',
    };
    if (t === 'services_discovered') return {
        icon: <Search className="w-3.5 h-3.5" />,
        bg: 'bg-blue-50', border: 'border-blue-200',
        title: '🔍 Service Discovery', accent: 'text-blue-800',
    };
    if (t === 'service_selected') return {
        icon: <ArrowRight className="w-3.5 h-3.5" />,
        bg: 'bg-blue-50', border: 'border-blue-200',
        title: '🎯 Service Selected', accent: 'text-blue-800',
    };
    if (t === 'tool_call') return {
        icon: <Brain className="w-3.5 h-3.5" />,
        bg: 'bg-amber-50', border: 'border-amber-200',
        title: '🧠 Agent Reasoning', accent: 'text-amber-800',
    };
    if (t === 'quote_received') return {
        icon: <Wallet className="w-3.5 h-3.5" />,
        bg: 'bg-orange-50', border: 'border-orange-200',
        title: '💰 Quote (x402)', accent: 'text-orange-800',
    };
    if (t === 'payment_state') {
        const data = asRecord(event.data);
        const s = (typeof data?.status === 'string' ? data.status : undefined) as PaymentStatus | undefined;
        if (s === 'payment-completed') return {
            icon: <CheckCircle className="w-3.5 h-3.5" />,
            bg: 'bg-green-50', border: 'border-green-200',
            title: '✅ Payment Confirmed', accent: 'text-green-800',
        };
        if (s === 'payment-submitted') return {
            icon: <Wallet className="w-3.5 h-3.5" />,
            bg: 'bg-orange-50', border: 'border-orange-200',
            title: '⏳ Payment Submitted', accent: 'text-orange-800',
        };
        return {
            icon: <Wallet className="w-3.5 h-3.5" />,
            bg: 'bg-red-50', border: 'border-red-200',
            title: '❌ Payment Failed', accent: 'text-red-800',
        };
    }
    if (t === 'receipt_verified') return {
        icon: <FileCheck className="w-3.5 h-3.5" />,
        bg: 'bg-green-50', border: 'border-green-200',
        title: '🔐 Receipt Verified', accent: 'text-green-800',
    };
    if (t === 'run_completed') return {
        icon: <CheckCircle className="w-3.5 h-3.5" />,
        bg: 'bg-green-50', border: 'border-green-200',
        title: '🎉 Mission Complete', accent: 'text-green-800',
    };
    if (t === 'run_failed' || t === 'error') return {
        icon: <AlertOctagon className="w-3.5 h-3.5" />,
        bg: 'bg-red-50', border: 'border-red-200',
        title: '⚠️ Error', accent: 'text-red-800',
    };
    return {
        icon: <Zap className="w-3.5 h-3.5" />,
        bg: 'bg-warm-100', border: 'border-border',
        title: t.replace(/_/g, ' '), accent: 'text-muted-foreground',
    };
}

/** 事件详情 */
function getEventDetail(event: AgentEvent): React.ReactNode {
    const { type } = event;
    const data = asRecord(event.data);

    if (type === 'services_discovered' && typeof data?.count === 'number')
        return <p>Found <strong>{data.count}</strong> services in registry</p>;
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
        return <p>Price: <strong className="text-orange-700">{data.amount} MON</strong></p>;
    if (type === 'payment_state' && typeof data?.txHash === 'string') {
        return (
            <a href={`https://testnet.monadscan.com/tx/${data.txHash}`}
                target="_blank" rel="noopener noreferrer"
                className="text-teal-700 hover:underline text-xs font-mono inline-flex items-center gap-1">
                View on MonadScan →
            </a>
        );
    }
    if (type === 'receipt_verified')
        return <p className="text-green-700 font-medium">Signature Valid ✓</p>;
    if ((type === 'run_failed' || type === 'error') && typeof data?.message === 'string')
        return <p className="text-red-700">{data.message}</p>;
    return null;
}

function TraceCard({ event, isLatest }: { event: AgentEvent; isLatest: boolean }) {
    const config = getEventConfig(event);
    const detail = getEventDetail(event);
    const time = new Date(event.at).toLocaleTimeString();

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
