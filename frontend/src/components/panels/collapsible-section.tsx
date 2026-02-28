'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';

interface CollapsibleSectionProps {
    label: string;
    /** localStorage key suffix for persisting open/closed state */
    storageKey: string;
    /** Initial state before localStorage kicks in (default: false = collapsed) */
    defaultOpen?: boolean;
    children: React.ReactNode;
}

/**
 * Terminal-style collapsible section with ▸/▾ toggle.
 * Persists open/closed state to localStorage.
 */
export function CollapsibleSection({
    label, storageKey, defaultOpen = false, children,
}: CollapsibleSectionProps) {
    const [open, setOpen] = useState(defaultOpen);

    /* Restore from localStorage on mount */
    useEffect(() => {
        try {
            const stored = localStorage.getItem(`collapsible:${storageKey}`);
            if (stored !== null) setOpen(stored === '1');
        } catch { /* ignore in SSR / private mode */ }
    }, [storageKey]);

    /* Toggle handler — persists immediately */
    const toggle = useCallback(() => {
        setOpen((prev) => {
            const next = !prev;
            try { localStorage.setItem(`collapsible:${storageKey}`, next ? '1' : '0'); } catch { }
            return next;
        });
    }, [storageKey]);

    return (
        <div>
            <button
                onClick={toggle}
                className="flex items-center gap-1.5 text-[10px] text-muted-foreground hover:text-foreground transition-colors w-full cursor-pointer select-none"
            >
                <span className="text-[8px] w-2">{open ? '▾' : '▸'}</span>
                <span>{label}</span>
            </button>

            <AnimatePresence initial={false}>
                {open && (
                    <motion.div
                        key="content"
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2, ease: 'easeOut' }}
                        className="overflow-hidden"
                    >
                        <div className="mt-1.5">{children}</div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
