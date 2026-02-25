import { readOnchainReputationSummary } from "@rebel/shared";
import { writerConfig } from "./config.js";
import { getWriterOnChainRegistrationStatus } from "./onchain-registration.js";

export async function getWriterOnchainReputation(): Promise<
  | {
      enabled: boolean;
      available: false;
      reason: string;
    }
  | {
      enabled: boolean;
      available: true;
      count: number;
      summaryValue: string;
      summaryValueDecimals: number;
      average: number;
    }
> {
  if (!writerConfig.reputation.onchain.enabled) {
    return {
      enabled: false,
      available: false,
      reason: "onchain reputation disabled"
    };
  }
  if (!writerConfig.reputation.onchain.registryAddress) {
    return {
      enabled: true,
      available: false,
      reason: "REPUTATION_REGISTRY_ADDRESS is missing"
    };
  }
  const identity = await getWriterOnChainRegistrationStatus();
  if (!identity.agentTokenId) {
    return {
      enabled: true,
      available: false,
      reason: "writer has no onchain agentTokenId yet"
    };
  }

  const summary = await readOnchainReputationSummary({
    rpcUrl: writerConfig.rpcUrl,
    chainId: writerConfig.chainId,
    reputationRegistryAddress: writerConfig.reputation.onchain.registryAddress,
    agentTokenId: identity.agentTokenId
  });
  return {
    enabled: true,
    available: true,
    ...summary
  };
}

