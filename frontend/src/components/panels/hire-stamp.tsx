'use client';

import { motion } from 'motion/react';

interface HireStampProps {
    /** Number of times this agent was hired in the current session */
    count: number;
}

/**
 * Square "hired" stamp displayed on the top-right of agent cards.
 * Shows hire count when > 1. Persists (does not fade out).
 */
export function HireStamp({ count }: HireStampProps) {
    if (count <= 0) return null;

    return (
        <motion.div
            className="absolute top-6 right-3 z-10 pointer-events-none opacity-85"
            initial={{ scale: 2.5, opacity: 0, rotate: -20 }}
            animate={{ scale: 1, opacity: 1, rotate: -15 }}
            transition={{ type: 'spring', stiffness: 500, damping: 18 }}
        >
            <div className="w-11 h-10 rounded-sm border-2 border-green-500/80 flex items-center justify-center bg-card/60 shadow-[0_2px_8px_rgba(34,197,94,0.2)] backdrop-blur-[1px]">
                <div className="text-center leading-none">
                    {count > 1 ? (
                        <>
                            <span className="text-[7px] text-green-500/90 font-bold block">HIRED</span>
                            <span className="text-[10px] text-green-500/90 font-bold">×{count}</span>
                        </>
                    ) : (
                        <span className="text-[8px] text-green-500/90 font-bold tracking-widest">HIRED</span>
                    )}
                </div>
            </div>
        </motion.div>
    );
}
