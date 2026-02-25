import type { ServiceInfo } from "@rebel/shared";
import { giveFeedbackTool } from "./tools/feedback.js";
import { fetchServiceIdentity } from "./tools/service-identity.js";

function deriveFallbackAgentId(service: ServiceInfo): string {
  const chainId = service.network.startsWith("eip155:") ? service.network.slice("eip155:".length) : "0";
  return `${chainId}:${service.provider.toLowerCase()}`;
}

function scoreToFeedbackValue(score: number): number {
  return Math.max(0, Math.min(100, Math.round(score * 10)));
}

export async function submitAutoFeedback(input: {
  service: ServiceInfo;
  evaluation: { score: number; summary: string };
  missionId?: string;
  taskType?: string;
}): Promise<{ agentId: string; value: number; reviewer: string }> {
  const identity = await fetchServiceIdentity({ service: input.service });
  const agentId = identity.agentId ?? deriveFallbackAgentId(input.service);
  const value = scoreToFeedbackValue(input.evaluation.score);

  const feedback = await giveFeedbackTool({
    agentId,
    value,
    tags: ["auto", "delivery"],
    text: input.evaluation.summary,
    onchainAgentTokenId: identity.onchainAgentTokenId,
    endpoint: input.service.endpoint,
    serviceId: input.service.id,
    missionId: input.missionId,
    taskType: input.taskType ?? input.service.taskType
  });
  return {
    agentId: feedback.agentId,
    value: feedback.value,
    reviewer: feedback.reviewer
  };
}
