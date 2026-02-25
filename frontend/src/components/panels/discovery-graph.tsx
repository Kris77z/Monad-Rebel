'use client';

import { cn } from '@/lib/utils';
import { formatMON } from '@/lib/format';
import { motion } from 'motion/react';

interface DiscoveryNode {
    id: string;
    name: string;
    price?: string;
    status: 'online' | 'selected' | 'failed';
}

interface DiscoveryGraphProps {
    nodes: DiscoveryNode[];
    /** Is the system currently in discovery/decision phase? */
    isScanning: boolean;
}

/** Color map for node status */
const STATUS_COLORS = {
    online: { stroke: '#6e6e7a', fill: '#f3f3f5', text: '#6e6e7a' },
    selected: { stroke: '#7c3aed', fill: '#f5f0ff', text: '#7c3aed' },
    failed: { stroke: '#dc2626', fill: '#fef2f2', text: '#dc2626' },
} as const;

const HUNTER_COLOR = '#7c3aed';

/**
 * SVG network topology graph showing Hunter → Agent connections.
 * Displays animated scanning lines during discovery and
 * solid connections for selected/failed nodes.
 */
export function DiscoveryGraph({ nodes, isScanning }: DiscoveryGraphProps) {
    if (nodes.length === 0) return null;

    const nodeCount = nodes.length;
    const width = 280;
    const height = 120;
    const hunterX = width / 2;
    const hunterY = 20;
    const nodeY = 90;
    const nodeSpacing = Math.min(80, (width - 40) / nodeCount);
    const startX = (width - (nodeCount - 1) * nodeSpacing) / 2;

    return (
        <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex justify-center mb-3"
        >
            <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className="overflow-visible">
                {/* Hunter node */}
                <circle cx={hunterX} cy={hunterY} r={12} fill="#f5f0ff" stroke={HUNTER_COLOR} strokeWidth={1.5} />
                <text x={hunterX} y={hunterY + 3.5} textAnchor="middle" className="text-[8px] fill-primary font-medium">
                    H
                </text>

                {/* Connection lines + Agent nodes */}
                {nodes.map((node, i) => {
                    const nx = startX + i * nodeSpacing;
                    const colors = STATUS_COLORS[node.status];
                    const isActive = node.status === 'selected';
                    const isFailed = node.status === 'failed';
                    const showScan = isScanning && node.status === 'online';

                    return (
                        <g key={node.id}>
                            {/* Connection line: Hunter → Node */}
                            <line
                                x1={hunterX} y1={hunterY + 12}
                                x2={nx} y2={nodeY - 10}
                                stroke={colors.stroke}
                                strokeWidth={isActive ? 2 : 1}
                                className={cn(
                                    showScan && 'dash-scanning',
                                    isFailed && 'opacity-40',
                                )}
                                strokeDasharray={isActive ? 'none' : showScan ? '6 4' : '4 4'}
                            />

                            {/* Agent node circle */}
                            <motion.circle
                                cx={nx} cy={nodeY} r={8}
                                fill={colors.fill}
                                stroke={colors.stroke}
                                strokeWidth={isActive ? 2 : 1}
                                initial={false}
                                animate={isActive ? { scale: [1, 1.15, 1] } : { scale: 1 }}
                                transition={isActive ? { repeat: Infinity, duration: 1.5 } : undefined}
                            />

                            {/* Node initial letter */}
                            <text
                                x={nx} y={nodeY + 3}
                                textAnchor="middle"
                                className={cn('text-[7px] font-medium')}
                                fill={colors.text}
                            >
                                {node.name.charAt(0).toUpperCase()}
                            </text>

                            {/* Node label below */}
                            <text
                                x={nx} y={nodeY + 20}
                                textAnchor="middle"
                                className="text-[7px]"
                                fill={isFailed ? '#dc2626' : '#6e6e7a'}
                                textDecoration={isFailed ? 'line-through' : 'none'}
                            >
                                {node.id.length > 10 ? node.id.slice(0, 8) + '…' : node.id}
                            </text>

                            {/* Price label */}
                            {node.price && (
                                <text
                                    x={nx} y={nodeY + 29}
                                    textAnchor="middle"
                                    className="text-[6px]"
                                    fill={isActive ? '#7c3aed' : '#6e6e7a'}
                                >
                                    {formatMON(node.price)} MON
                                </text>
                            )}
                        </g>
                    );
                })}

                {/* "scanning..." label */}
                {isScanning && (
                    <text
                        x={hunterX + 18}
                        y={hunterY + 4}
                        className="text-[7px] fill-primary terminal-active-blink"
                    >
                        scanning…
                    </text>
                )}
            </svg>
        </motion.div>
    );
}
