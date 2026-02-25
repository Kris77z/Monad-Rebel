'use client';

import { motion } from 'motion/react';

/**
 * Tech Pillars Section — x402 + ERC-8004 + Monad
 * Dark vs warm comparison cards + three pillar detail cards
 * Content derived from agent-economy-vision.md
 */

const PILLARS = [
    {
        tag: 'Payment Layer',
        title: 'x402 Protocol',
        subtitle: '"How do agents pay?"',
        desc: 'HTTP 402 status code + native-transfer scheme. Agents pay with MON tokens via atomic on-chain transfers. Machine-readable pricing, zero friction.',
    },
    {
        tag: 'Identity Layer',
        title: 'ERC-8004',
        subtitle: '"Who are you? Can I trust you?"',
        desc: 'On-chain agent registry and reputation system. Trustless identity verification through smart contracts — no KYC, no middlemen, pure math.',
    },
    {
        tag: 'Infrastructure',
        title: 'Monad',
        subtitle: '"The 400ms blockchain"',
        desc: '10,000+ TPS with sub-second finality. The only chain fast enough to support high-frequency agent micro-payments at scale.',
    },
];

export function TechPillarsSection() {
    return (
        <section id="tech" className="py-32 px-8">
            <div className="max-w-6xl mx-auto">
                {/* Badge */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    className="flex justify-center mb-6"
                >
                    <span className="inline-block px-4 py-1.5 rounded-full border border-border text-xs text-muted-foreground">
                        Tech Stack
                    </span>
                </motion.div>

                {/* Heading */}
                <motion.h2
                    initial={{ opacity: 0, y: 30 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.1 }}
                    className="font-heading text-5xl md:text-6xl text-center leading-[1.1] tracking-tight max-w-3xl mx-auto mb-8"
                >
                    Three pillars of agent autonomy.
                </motion.h2>

                <motion.p
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.2 }}
                    className="text-base text-muted-foreground text-center max-w-2xl mx-auto leading-relaxed mb-16"
                >
                    Crypto provides agents their native currency and native law.
                    Without crypto, agents are just Web2 workers. With crypto,
                    they become independent economic actors.
                </motion.p>



                {/* Tech Pillar Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {PILLARS.map((pillar, i) => (
                        <motion.div
                            key={pillar.title}
                            initial={{ opacity: 0, y: 30 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ delay: 0.1 * i + 0.5 }}
                            className="p-6 rounded-2xl border border-border bg-card hover:bg-warm-200/40 transition-colors group"
                        >
                            <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest">
                                {pillar.tag}
                            </span>
                            <h3 className="mt-3 text-xl font-heading font-semibold text-foreground">
                                {pillar.title}
                            </h3>
                            <p className="mt-1 text-xs text-muted-foreground/70 italic">
                                {pillar.subtitle}
                            </p>
                            <p className="mt-4 text-sm text-muted-foreground leading-relaxed">
                                {pillar.desc}
                            </p>
                        </motion.div>
                    ))}
                </div>
            </div>
        </section>
    );
}
