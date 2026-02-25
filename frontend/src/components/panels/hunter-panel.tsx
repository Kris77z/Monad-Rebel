'use client';

import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { motion } from "motion/react";
import { Wallet, Activity, Circle, Bot } from "lucide-react";

/**
 * Agent 状态类型
 */
export type AgentStatus = 'idle' | 'thinking' | 'paying' | 'verifying' | 'completed' | 'error';

/** 状态配置 — 暖色调 */
const STATUS_CONFIG: Record<AgentStatus, { label: string; color: string; dotClass: string }> = {
    idle: { label: 'Idle', color: 'bg-warm-200 text-warm-700', dotClass: 'bg-warm-500' },
    thinking: { label: 'Thinking...', color: 'bg-amber-100 text-amber-800', dotClass: 'bg-amber-500 animate-pulse' },
    paying: { label: 'Paying', color: 'bg-orange-100 text-orange-800', dotClass: 'bg-orange-500 animate-pulse' },
    verifying: { label: 'Verifying', color: 'bg-teal-100 text-teal-800', dotClass: 'bg-teal-500 animate-pulse' },
    completed: { label: 'Done', color: 'bg-green-100 text-green-800', dotClass: 'bg-green-500' },
    error: { label: 'Error', color: 'bg-red-100 text-red-800', dotClass: 'bg-red-500' },
};

interface HunterCardProps {
    name: string;
    role: string;
    address: string;
    balance: string;
    status: AgentStatus;
    mission?: string;
    avatar: string;
    gradient: string;
}

function HunterCard({ name, role, address, balance, status, mission, avatar, gradient }: HunterCardProps) {
    const cfg = STATUS_CONFIG[status];
    const isActive = !['idle', 'completed', 'error'].includes(status);

    return (
        <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
        >
            <Card className={`p-3.5 border-border transition-all duration-500 bg-card ${isActive ? 'border-warm-500 shadow-md' : ''}`}>
                {/* Agent 信息 */}
                <div className="flex items-start gap-3 mb-3">
                    <motion.div
                        className={`w-10 h-10 rounded-xl ${gradient} flex items-center justify-center text-lg shadow-sm shrink-0`}
                        animate={isActive ? { scale: [1, 1.08, 1] } : {}}
                        transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
                    >
                        {avatar}
                    </motion.div>
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                            <span className="font-semibold text-sm">{name}</span>
                            <motion.div
                                key={status}
                                initial={{ scale: 0.8, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                transition={{ type: "spring", stiffness: 500, damping: 30 }}
                            >
                                <Badge className={`${cfg.color} gap-1 text-[10px] px-1.5 py-0.5 rounded-full`}>
                                    <Circle className={`w-1.5 h-1.5 ${cfg.dotClass}`} />
                                    {cfg.label}
                                </Badge>
                            </motion.div>
                        </div>
                        <p className="text-xs text-muted-foreground">{role}</p>
                    </div>
                </div>

                {/* 余额 + 地址 */}
                <div className="space-y-1.5 mb-3">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                            <Wallet className="w-3 h-3" />
                            <span>Balance</span>
                        </div>
                        <span className="text-xs font-mono font-semibold text-warm-900">{balance} MON</span>
                    </div>
                    <div className="text-[10px] text-muted-foreground/50 font-mono truncate">
                        {address}
                    </div>
                </div>

                {/* 当前任务 */}
                {mission && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        transition={{ duration: 0.3 }}
                        className="text-xs bg-warm-200/50 border border-warm-400/30 rounded-md p-2.5"
                    >
                        <div className="flex items-center gap-1 mb-1">
                            <Activity className="w-3 h-3 text-warm-800" />
                            <span className="font-semibold text-warm-800 text-[10px] uppercase tracking-wider">Mission</span>
                        </div>
                        <p className="text-muted-foreground line-clamp-2 leading-relaxed">{mission}</p>
                    </motion.div>
                )}
            </Card>
        </motion.div>
    );
}

/**
 * 左栏：Rebel Agents 面板
 */
export interface HunterPanelProps {
    status: AgentStatus;
    mission?: string;
}

export function HunterPanel({ status, mission }: HunterPanelProps) {
    return (
        <div className="h-full flex flex-col">
            <div className="px-1 py-2 mb-2 flex items-center gap-2">
                <Bot className="w-3.5 h-3.5 text-muted-foreground" />
                <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider font-heading">
                    Rebel Agents
                </h2>
            </div>

            <div className="space-y-3 flex-1 overflow-y-auto scrollbar-thin">
                <HunterCard
                    name="Rebel Agent"
                    role="Autonomous AI Agent"
                    avatar="🤖"
                    gradient="bg-gradient-to-br from-violet-600 to-indigo-800"
                    address="0x7F3a...9c2E"
                    balance="0.95"
                    status={status}
                    mission={mission}
                />

                <div className="border border-dashed border-border rounded-lg p-4 text-center">
                    <p className="text-[10px] text-muted-foreground/40 uppercase tracking-wider">
                        + Deploy More Agents
                    </p>
                </div>
            </div>
        </div>
    );
}
