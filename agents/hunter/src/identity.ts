import type { AgentIdentity } from "@rebel/shared";
import { getHunterAddress } from "./wallet.js";
import { hunterConfig } from "./config.js";

const hunterRegisteredAt = Math.floor(Date.now() / 1000);

export function getHunterIdentity(): AgentIdentity {
  const walletAddress = getHunterAddress();
  return {
    agentId: hunterConfig.identity.agentId ?? `${hunterConfig.chainId}:${walletAddress.toLowerCase()}`,
    name: hunterConfig.identity.name,
    description: hunterConfig.identity.description,
    image: hunterConfig.identity.image,
    walletAddress,
    capabilities: [
      {
        type: "a2a",
        endpoint: `${hunterConfig.publicEndpoint}/run`,
        skills: ["service-discovery", "payment-settlement", "receipt-verification"]
      },
      {
        type: "mcp",
        endpoint: `${hunterConfig.publicEndpoint}/run/stream`,
        tools: ["discover_services", "request_service", "make_payment", "submit_payment"]
      }
    ],
    trustModels: hunterConfig.identity.trustModels,
    active: true,
    registeredAt: hunterRegisteredAt
  };
}
