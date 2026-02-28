'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowRight } from 'lucide-react';
import Link from 'next/link';

/**
 * Process Section — "How it Works"
 * Left: large serif step names with indices | Right: animated detail card
 * Maps to Discover → Negotiate → Pay → Verify loop from architecture.md
 */

/**
 * Claura service-card images mapped to each step.
 * These are the actual images from Claura's Services section on Framer CDN.
 */
const STEPS = [
    {
        id: 'discover',
        label: 'Discover',
        title: 'Discover',
        desc: 'Hunter Agent scans the on-chain Service Registry to find providers that match the mission goal. Fully autonomous, zero human search.',
        image: 'https://framerusercontent.com/images/3jSoIlDJyMfLx6JTWfHwuwwhjSw.png',
    },
    {
        id: 'negotiate',
        label: 'Negotiate',
        title: 'Negotiate',
        desc: 'The Agent requests a quote via x402 protocol. The service responds with HTTP 402 — a machine-readable payment demand with exact pricing in MON.',
        image: 'https://framerusercontent.com/images/CDafpAJFtQbOD92OMLiiTjjPVRU.png',
    },
    {
        id: 'pay',
        label: 'Pay',
        title: 'Pay',
        desc: 'Agent signs and sends a native MON transfer on Monad (400ms block time). Atomic, trustless, no intermediary. One hand pays, one hand delivers.',
        image: 'https://framerusercontent.com/images/LBKnMROG8HBkFthEPXAy7RIQ8.png',
    },
    {
        id: 'verify',
        label: 'Verify',
        title: 'Verify',
        desc: 'Writer signs a cryptographic Receipt. Hunter verifies the signature via ecrecover — mathematical proof of execution, not trust.',
        image: 'https://framerusercontent.com/images/OX3H8eSRqaFBsMwnXROVH9bRFU.png',
    },
];

export function ProcessSection() {
    const [active, setActive] = useState(0);
    const step = STEPS[active];

    return (
        <section id="process" className="py-32 px-8">
            <div className="max-w-6xl mx-auto">
                {/* Badge */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    className="flex justify-center mb-6"
                >
                    <span className="inline-block px-4 py-1.5 rounded-full border border-border text-xs text-muted-foreground">
                        How It Works
                    </span>
                </motion.div>

                {/* Heading */}
                <motion.h2
                    initial={{ opacity: 0, y: 30 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.1 }}
                    className="font-heading text-5xl md:text-6xl text-center leading-[1.1] tracking-tight max-w-3xl mx-auto mb-20"
                >
                    We handle everything so agents don&apos;t have to.
                </motion.h2>

                {/* Two-column: step list + detail card */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-start">
                    {/* Left: Step list (large text with index) */}
                    <div className="space-y-2">
                        {STEPS.map((s, i) => (
                            <button
                                key={s.id}
                                onClick={() => setActive(i)}
                                className={`w-full text-left px-6 py-5 rounded-2xl transition-all duration-300 group ${i === active
                                    ? 'bg-warm-200/60'
                                    : 'hover:bg-warm-200/30'
                                    }`}
                            >
                                <div className="flex items-baseline gap-3">
                                    <span className="font-heading text-4xl md:text-5xl tracking-tight text-foreground/80 group-hover:text-foreground transition-colors">
                                        {s.label}
                                    </span>
                                    <span className="text-xs text-muted-foreground font-mono">
                                        {String(i + 1).padStart(2, '0')}
                                    </span>
                                </div>
                            </button>
                        ))}
                    </div>

                    {/* Right: Detail card with Claura service image */}
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={step.id}
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            transition={{ duration: 0.3 }}
                        >
                            {/* Service-card image — fixed aspect for consistency */}
                            <div className="rounded-2xl overflow-hidden mb-6 aspect-[4/3]">
                                <img
                                    src={step.image}
                                    alt={`${step.title} — step illustration`}
                                    className="w-full h-full object-cover"
                                    loading="lazy"
                                />
                            </div>

                            <h3 className="text-lg font-semibold text-foreground">
                                {step.title}
                            </h3>
                            <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
                                {step.desc}
                            </p>
                            <Link
                                href="/onboarding"
                                className="inline-flex items-center gap-1 mt-4 text-sm font-medium text-foreground hover:opacity-70 transition-opacity"
                            >
                                ↳ Try it now
                                <ArrowRight className="w-3 h-3" />
                            </Link>
                        </motion.div>
                    </AnimatePresence>
                </div>
            </div>
        </section>
    );
}
