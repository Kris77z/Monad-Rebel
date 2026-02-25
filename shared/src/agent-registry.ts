import type { AgentFeedback, AgentIdentity } from "./types.js";

const identities = new Map<string, AgentIdentity>();
const feedbackByAgent = new Map<string, AgentFeedback[]>();

function normalizeIdentity(identity: AgentIdentity): AgentIdentity {
  const trustModels = [...new Set(identity.trustModels.filter((item) => item.trim().length > 0))];
  return {
    ...identity,
    trustModels,
    capabilities: identity.capabilities.map((item) => ({
      ...item,
      skills: item.skills ? [...item.skills] : undefined,
      tools: item.tools ? [...item.tools] : undefined
    }))
  };
}

export function registerAgentIdentity(identity: AgentIdentity): AgentIdentity {
  const normalized = normalizeIdentity(identity);
  identities.set(normalized.agentId, normalized);
  return normalized;
}

export function getAgentIdentity(agentId: string): AgentIdentity | undefined {
  const identity = identities.get(agentId);
  return identity ? normalizeIdentity(identity) : undefined;
}

export function listAgentIdentities(input: { activeOnly?: boolean } = {}): AgentIdentity[] {
  const items = [...identities.values()];
  const filtered = input.activeOnly ? items.filter((item) => item.active) : items;
  return filtered.map((item) => normalizeIdentity(item));
}

export function addAgentFeedback(feedback: AgentFeedback): AgentFeedback {
  const normalized: AgentFeedback = {
    ...feedback,
    value: Math.max(0, Math.min(100, Math.round(feedback.value))),
    tags: [...new Set(feedback.tags.map((tag) => tag.trim()).filter((tag) => tag.length > 0))]
  };
  const list = feedbackByAgent.get(normalized.agentId) ?? [];
  list.push(normalized);
  feedbackByAgent.set(normalized.agentId, list);
  return normalized;
}

export function listAgentFeedback(agentId: string): AgentFeedback[] {
  const entries = feedbackByAgent.get(agentId) ?? [];
  return entries.map((item) => ({ ...item, tags: [...item.tags] }));
}

export function getAgentReputation(agentId: string): {
  count: number;
  average: number;
  latest?: AgentFeedback;
} {
  const entries = feedbackByAgent.get(agentId) ?? [];
  if (entries.length === 0) {
    return { count: 0, average: 0 };
  }
  const total = entries.reduce((sum, item) => sum + item.value, 0);
  const latest = entries[entries.length - 1];
  return {
    count: entries.length,
    average: Number((total / entries.length).toFixed(2)),
    latest: latest ? { ...latest, tags: [...latest.tags] } : undefined
  };
}

