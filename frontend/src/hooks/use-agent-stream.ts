import { useState, useEffect, useRef } from 'react';
import { HunterRunResult, AgentEvent, RunRequestMode } from '@/types/agent';
import { apiBase } from '@/lib/api-config';

export type StreamStatus = 'IDLE' | 'RUNNING' | 'COMPLETED' | 'ERROR';
export type { RunRequestMode } from '@/types/agent';

export type StreamState = {
    status: StreamStatus;
    events: AgentEvent[];
    result: HunterRunResult | null;
    error: string | null;
};

/**
 * Direct SSE connection to Hunter Agent (bypasses Next.js rewrite proxy
 * which buffers SSE responses instead of streaming them).
 */
const HUNTER_SSE_URL = apiBase.hunter;

function toErrorMessage(value: unknown, fallback: string): string {
    if (!value || typeof value !== 'object') {
        return fallback;
    }
    const asRecord = value as Record<string, unknown>;
    return typeof asRecord.message === 'string' && asRecord.message.trim().length > 0
        ? asRecord.message
        : fallback;
}

export function useAgentStream() {
    const [state, setState] = useState<StreamState>({
        status: 'IDLE',
        events: [],
        result: null,
        error: null,
    });

    const esRef = useRef<EventSource | null>(null);

    const startRun = (goal: string, mode: RunRequestMode = 'single') => {
        // Cleanup previous run
        stopRun();

        setState({
            status: 'RUNNING',
            events: [],
            result: null,
            error: null,
        });

        try {
            // Connect directly to Hunter Agent for real-time SSE streaming
            // (Next.js rewrites proxy buffers the response, breaking real-time)
            const url = `${HUNTER_SSE_URL}/run/stream?goal=${encodeURIComponent(goal)}&mode=${mode}`;
            const es = new EventSource(url);
            esRef.current = es;

            es.addEventListener('ready', (e) => {
                try {
                    const payload = JSON.parse((e as MessageEvent).data);
                    console.log('[SSE] ready:', payload);
                } catch (err) {
                    console.error('[SSE] parse error on ready:', err);
                }
            });

            es.addEventListener('trace', (e) => {
                try {
                    const payload = JSON.parse((e as MessageEvent).data) as AgentEvent;
                    setState(prev => ({
                        ...prev,
                        events: [...prev.events, payload]
                    }));

                    if (payload.type === 'run_failed') {
                        setState(prev => ({
                            ...prev,
                            status: 'ERROR',
                            error: toErrorMessage(payload.data, 'Run failed')
                        }));
                        es.close();
                    }
                } catch (err) {
                    console.error('[SSE] parse error on trace:', err);
                }
            });

            es.addEventListener('done', (e) => {
                try {
                    const result = JSON.parse((e as MessageEvent).data) as HunterRunResult;
                    console.log('[SSE] done:', result);
                    setState(prev => ({
                        ...prev,
                        status: 'COMPLETED',
                        result
                    }));
                    es.close();
                } catch (err) {
                    console.error('[SSE] parse error on done:', err);
                    setState(prev => ({
                        ...prev,
                        status: 'ERROR',
                        error: 'Invalid done payload'
                    }));
                }
            });

            es.addEventListener('error', (e) => {
                console.error('[SSE] error event:', e);
                setState(prev => ({
                    ...prev,
                    status: 'ERROR',
                    error: 'Connection interrupted'
                }));
                es.close();
            });

        } catch (err: unknown) {
            console.error('[SSE] start error:', err);
            setState(prev => ({
                ...prev,
                status: 'ERROR',
                error: err instanceof Error ? err.message : 'Failed to start stream'
            }));
        }
    };

    const stopRun = () => {
        if (esRef.current) {
            esRef.current.close();
            esRef.current = null;
        }
    };

    useEffect(() => {
        return () => stopRun();
    }, []);

    return { ...state, startRun, stopRun };
}
