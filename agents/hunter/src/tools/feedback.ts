import {
  addAgentFeedback,
  appendFeedbackStoreEntry,
  giveOnchainFeedback,
  type AgentFeedback
} from "@rebel/shared";
import { hunterConfig } from "../config.js";
import { getHunterIdentity } from "../identity.js";
import { getHunterAddress } from "../wallet.js";

function normalizeEndpoint(endpoint: string): string {
  return endpoint.endsWith("/") ? endpoint.slice(0, -1) : endpoint;
}

async function submitRegistryServiceFeedback(input: {
  serviceId: string;
  missionId: string;
  score: number;
  taskType: string;
  comment?: string;
}): Promise<void> {
  try {
    const response = await fetch(
      `${normalizeEndpoint(hunterConfig.registryServiceUrl)}/services/${encodeURIComponent(input.serviceId)}/feedback`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          hunterId: getHunterIdentity().agentId,
          missionId: input.missionId,
          score: input.score,
          taskType: input.taskType,
          comment: input.comment
        })
      }
    );
    if (!response.ok) {
      const detail = await response.text();
      console.warn(`[hunter] registry feedback submit failed: status=${response.status} detail=${detail}`);
    }
  } catch (error) {
    console.warn(
      `[hunter] registry feedback submit failed: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

export async function giveFeedbackTool(input: {
  agentId: string;
  value: number;
  tags?: string[];
  text?: string;
  onchainAgentTokenId?: string;
  endpoint?: string;
  serviceId?: string;
  missionId?: string;
  taskType?: string;
}): Promise<AgentFeedback> {
  const feedback = addAgentFeedback({
    agentId: input.agentId,
    reviewer: getHunterAddress(),
    value: input.value,
    tags: input.tags ?? [],
    text: input.text,
    timestamp: Math.floor(Date.now() / 1000)
  });
  await appendFeedbackStoreEntry(feedback);

  if (
    hunterConfig.reputation.onchain.enabled &&
    hunterConfig.reputation.onchain.registryAddress &&
    hunterConfig.privateKey &&
    input.onchainAgentTokenId
  ) {
    try {
      await giveOnchainFeedback({
        rpcUrl: hunterConfig.rpcUrl,
        chainId: hunterConfig.chainId,
        privateKey: hunterConfig.privateKey,
        reputationRegistryAddress: hunterConfig.reputation.onchain.registryAddress,
        agentTokenId: input.onchainAgentTokenId,
        value: feedback.value,
        valueDecimals: 0,
        tag1: hunterConfig.reputation.onchain.tag1,
        tag2: hunterConfig.reputation.onchain.tag2,
        endpoint: input.endpoint ?? "",
        feedbackUri: "",
        feedbackHash: undefined
      });
    } catch (error) {
      console.warn(
        `[hunter] on-chain feedback submit failed: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  if (input.serviceId && input.missionId) {
    await submitRegistryServiceFeedback({
      serviceId: input.serviceId,
      missionId: input.missionId,
      score: feedback.value,
      taskType: input.taskType ?? "unknown",
      comment: input.text
    });
  }

  return feedback;
}
