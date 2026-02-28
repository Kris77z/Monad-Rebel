/**
 * Pure data-builder functions for the MissionTimeline.
 * Transforms raw SSE events into structured timeline & snake node data.
 */

import { asRecord } from '@/lib/type-guards';
import type { AgentEvent, HunterRunResult } from '@/types/agent';
import type { PhaseStatus } from './phase-utils';
import type { SnakeNode } from './pipeline-snake';

/* ─── Commander Timeline Phase ─── */

export interface CommanderTimelinePhase {
    index: number;
    name: string;
    taskType: string;
    goal: string;
    status: PhaseStatus;
    content?: string;
    error?: string;
}

/* ─── Build Commander Timeline from events ─── */

export function buildCommanderTimeline(
    events: AgentEvent[],
    result: HunterRunResult | null,
    isRunning: boolean,
    hasError: boolean,
): CommanderTimelinePhase[] {
    const fromResult = result?.phases ?? [];
    const byIndex = new Map<number, { name: string; taskType: string; goal: string }>();

    const missionDecomposed = [...events].reverse().find(
        (event) => event.type === 'mission_decomposed' && typeof event.data === 'object',
    );
    const eventPhases = Array.isArray(asRecord(missionDecomposed?.data)?.phases)
        ? (asRecord(missionDecomposed?.data)?.phases as Array<Record<string, unknown>>)
        : [];
    for (const [index, phase] of eventPhases.entries()) {
        byIndex.set(index, {
            name: typeof phase.name === 'string' ? phase.name : `Phase ${index + 1}`,
            taskType: typeof phase.taskType === 'string' ? phase.taskType : '',
            goal: typeof phase.goal === 'string' ? phase.goal : '',
        });
    }

    for (const phase of fromResult) {
        byIndex.set(phase.index, {
            name: phase.phase.name, taskType: phase.phase.taskType, goal: phase.phase.goal,
        });
    }

    for (const event of events) {
        if (event.type !== 'phase_started' || typeof event.data !== 'object') continue;
        const data = asRecord(event.data);
        const index = typeof data?.index === 'number' ? data.index : -1;
        if (index < 0) continue;
        byIndex.set(index, {
            name: typeof data?.name === 'string' ? data.name : `Phase ${index + 1}`,
            taskType: typeof data?.taskType === 'string' ? data.taskType : '',
            goal: typeof data?.goal === 'string' ? data.goal : '',
        });
    }

    const basePhases = [...byIndex.entries()]
        .sort((a, b) => a[0] - b[0])
        .map(([index, phase]) => ({ index, ...phase }));
    if (basePhases.length === 0) return [];

    const latestStarted = [...events].reverse()
        .find((e) => e.type === 'phase_started' && typeof e.data === 'object');
    const latestStartedIndex = typeof asRecord(latestStarted?.data)?.index === 'number'
        ? (asRecord(latestStarted?.data)?.index as number) : -1;

    const completedByIndex = new Map<number, { content?: string; error?: string }>();
    for (const event of events) {
        if (event.type !== 'phase_completed' || typeof event.data !== 'object') continue;
        const data = asRecord(event.data);
        const index = typeof data?.index === 'number' ? data.index : -1;
        if (index < 0) continue;
        completedByIndex.set(index, {
            content: typeof data?.content === 'string' ? data.content : undefined,
            error: typeof data?.error === 'string' ? data.error : undefined,
        });
    }

    return basePhases.map((phase) => {
        const completed = completedByIndex.get(phase.index);
        const fromRP = fromResult.find((i) => i.index === phase.index);
        const hasErr = Boolean(completed?.error || fromRP?.error);
        let status: PhaseStatus = 'pending';
        if (completed || fromRP) {
            status = hasErr ? 'error' : 'done';
        } else if (phase.index === latestStartedIndex && isRunning) {
            status = 'active';
        } else if (hasError && phase.index === latestStartedIndex) {
            status = 'error';
        } else if (phase.index < latestStartedIndex) {
            status = 'done';
        }
        return {
            index: phase.index, name: phase.name, taskType: phase.taskType, goal: phase.goal,
            status, content: completed?.content ?? fromRP?.content, error: completed?.error ?? fromRP?.error,
        };
    });
}

/* ─── Build Snake Nodes from events ─── */

export function buildSnakeNodes(events: AgentEvent[], result: HunterRunResult | null): SnakeNode[] {
    const discoveredByPhase = new Map<
        number,
        { ids: string[]; byId: Map<string, { name?: string; taskType?: string }> }
    >();
    const selectedByPhase = new Map<number, { id: string; taskType?: string; price?: string }>();
    const completedPhases = new Set<number>();

    let phaseCursor = 0;
    for (const event of events) {
        if (event.type === 'phase_started' && typeof event.data === 'object') {
            const idx = typeof asRecord(event.data)?.index === 'number'
                ? (asRecord(event.data)?.index as number) : phaseCursor;
            if (idx >= 0) phaseCursor = idx;
            continue;
        }
        if (event.type === 'phase_completed' && typeof event.data === 'object') {
            const idx = typeof asRecord(event.data)?.index === 'number'
                ? (asRecord(event.data)?.index as number) : -1;
            if (idx >= 0) completedPhases.add(idx);
            continue;
        }
        if (event.type === 'services_discovered' && typeof event.data === 'object') {
            const data = asRecord(event.data);
            if (!data) continue;
            const bucket = discoveredByPhase.get(phaseCursor) ?? {
                ids: [], byId: new Map<string, { name?: string; taskType?: string }>(),
            };
            const services = Array.isArray(data.services)
                ? data.services.filter((i): i is Record<string, unknown> => Boolean(i) && typeof i === 'object')
                : [];
            const serviceIds = Array.isArray(data.serviceIds)
                ? data.serviceIds.filter((id): id is string => typeof id === 'string')
                : [];
            for (const item of services) {
                const id = typeof item.id === 'string' ? item.id : '';
                if (!id) continue;
                bucket.byId.set(id, {
                    name: typeof item.name === 'string' ? item.name : undefined,
                    taskType: typeof item.taskType === 'string' ? item.taskType : undefined,
                });
                if (!bucket.ids.includes(id)) bucket.ids.push(id);
            }
            for (const id of serviceIds) {
                if (!bucket.ids.includes(id)) bucket.ids.push(id);
            }
            discoveredByPhase.set(phaseCursor, bucket);
            continue;
        }
        if (event.type === 'service_selected' && typeof event.data === 'object') {
            const data = asRecord(event.data);
            const id = typeof data?.id === 'string' ? data.id : '';
            if (!id) continue;
            selectedByPhase.set(phaseCursor, {
                id,
                taskType: typeof data?.taskType === 'string' ? data.taskType : undefined,
                price: typeof data?.price === 'string' ? data.price : undefined,
            });
        }
    }

    if (discoveredByPhase.size === 0) return [];

    /* Deduplicate across phases: same agent ID → single node */
    const nodeMap = new Map<string, SnakeNode>();
    const sortedPhases = [...discoveredByPhase.keys()].sort((a, b) => a - b);
    let insertOrder = 0;

    for (const phaseIndex of sortedPhases) {
        const bucket = discoveredByPhase.get(phaseIndex);
        if (!bucket) continue;
        const selected = selectedByPhase.get(phaseIndex);
        const isClosed = completedPhases.has(phaseIndex);
        const ids = bucket.ids.length > 0 ? bucket.ids : (selected ? [selected.id] : []);

        for (const id of ids) {
            const isSel = selected?.id === id;
            const status: SnakeNode['status'] =
                isSel ? 'selected' : (selected || isClosed ? 'failed' : 'online');
            const existing = nodeMap.get(id);
            if (existing) {
                if (isSel) {
                    existing.status = 'selected';
                    existing.price = selected?.price;
                    existing.taskType = selected?.taskType ?? existing.taskType;
                    existing.phaseIndex = phaseIndex;
                }
                continue;
            }
            nodeMap.set(id, {
                key: id, phaseIndex, id,
                name: bucket.byId.get(id)?.name ?? id,
                taskType: (isSel ? selected?.taskType : undefined)
                    ?? bucket.byId.get(id)?.taskType
                    ?? (result?.service?.id === id ? result.service.taskType : undefined),
                price: isSel ? selected?.price : undefined,
                reputation: Math.max(3.9, 4.9 - insertOrder * 0.2),
                status,
            });
            insertOrder += 1;
        }
    }

    return [...nodeMap.values()];
}
