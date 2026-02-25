'use client';

import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { motion } from "motion/react";
import { Zap, DollarSign, Star, Server } from "lucide-react";

/**
 * 服务类型定义
 */
export interface ServiceInfo {
    id: string;
    name: string;
    description: string;
    price: string;
    currency: string;
    endpoint: string;
    provider: string;
    avatar: string;
    gradient: string;
    txCount?: number;
    active?: boolean;
}

interface ServiceCardProps {
    service: ServiceInfo;
}

function ServiceCard({ service }: ServiceCardProps) {
    return (
        <motion.div
            whileHover={{ scale: 1.02 }}
            transition={{ type: "spring", stiffness: 400, damping: 25 }}
        >
            <Card className={`p-3.5 border-border transition-all duration-500 cursor-default group bg-card
        hover:border-warm-500 hover:shadow-md
        ${service.active ? 'border-warm-700 shadow-lg bg-warm-100' : ''}`}
            >
                {/* 头部 */}
                <div className="flex items-start gap-3 mb-2">
                    <motion.div
                        className={`w-10 h-10 rounded-xl ${service.gradient} flex items-center justify-center text-lg shadow-sm shrink-0`}
                        animate={service.active ? { scale: [1, 1.1, 1] } : {}}
                        transition={{ repeat: Infinity, duration: 2 }}
                    >
                        {service.avatar}
                    </motion.div>
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                            <span className="font-semibold text-sm group-hover:text-warm-900 transition-colors">{service.name}</span>
                            <Badge variant="outline" className="gap-1 text-[10px] font-mono border-warm-400 text-warm-800 px-1.5 py-0.5 rounded-full">
                                <DollarSign className="w-2.5 h-2.5" />
                                {service.price}
                            </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                            {service.description}
                        </p>
                    </div>
                </div>

                {/* 底部状态 */}
                <div className="flex items-center justify-between text-[10px] text-muted-foreground pt-2 border-t border-border">
                    <div className="flex items-center gap-1">
                        <Zap className="w-2.5 h-2.5 text-green-600" />
                        <span>online</span>
                    </div>
                    {service.txCount !== undefined && (
                        <div className="flex items-center gap-1">
                            <Star className="w-2.5 h-2.5 text-amber-500" />
                            <span>{service.txCount} tx</span>
                        </div>
                    )}
                    {service.active && (
                        <motion.span
                            className="text-warm-800 font-semibold"
                            animate={{ opacity: [0.5, 1, 0.5] }}
                            transition={{ repeat: Infinity, duration: 1.5 }}
                        >
                            ● active
                        </motion.span>
                    )}
                </div>
            </Card>
        </motion.div>
    );
}

/** 默认服务列表 — 暖色渐变 */
const DEFAULT_SERVICES: ServiceInfo[] = [
    {
        id: 'writer-v1',
        name: 'AI Writer',
        description: 'Articles, tweets, and research reports',
        price: '0.01',
        currency: 'MON',
        endpoint: 'http://localhost:3001',
        provider: '0xWriter...',
        avatar: '✍️',
        gradient: 'bg-gradient-to-br from-teal-500 to-teal-700',
        txCount: 12,
    },
    {
        id: 'coder-v1',
        name: 'AI Coder',
        description: 'Code generation, review, and auditing',
        price: '0.02',
        currency: 'MON',
        endpoint: 'http://localhost:3003',
        provider: '0xCoder...',
        avatar: '💻',
        gradient: 'bg-gradient-to-br from-amber-500 to-orange-700',
        txCount: 5,
    },
    {
        id: 'auditor-v1',
        name: 'AI Auditor',
        description: 'Content verification and attestation',
        price: '0.005',
        currency: 'MON',
        endpoint: 'http://localhost:3004',
        provider: '0xAuditor...',
        avatar: '🔍',
        gradient: 'bg-gradient-to-br from-rose-400 to-pink-600',
        txCount: 8,
    },
];

/**
 * 右栏：Service Registry 面板
 */
export interface ServiceRegistryProps {
    services?: ServiceInfo[];
    activeServiceId?: string;
}

export function ServiceRegistry({ services = DEFAULT_SERVICES, activeServiceId }: ServiceRegistryProps) {
    const list = services.map(s => ({
        ...s,
        active: s.id === activeServiceId,
    }));

    return (
        <div className="h-full flex flex-col">
            <div className="px-1 py-2 mb-2 flex items-center gap-2">
                <Server className="w-3.5 h-3.5 text-muted-foreground" />
                <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider font-heading">
                    Service Providers
                </h2>
            </div>

            <div className="space-y-3 flex-1 overflow-y-auto scrollbar-thin">
                {list.map((service, i) => (
                    <motion.div
                        key={service.id}
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.1, type: "spring", stiffness: 300, damping: 25 }}
                    >
                        <ServiceCard service={service} />
                    </motion.div>
                ))}
            </div>
        </div>
    );
}
