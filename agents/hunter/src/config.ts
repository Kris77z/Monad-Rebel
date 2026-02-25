import path from "node:path";
import { config as loadDotenv } from "dotenv";
import { ethers } from "ethers";

loadDotenv({ path: path.resolve(process.env.INIT_CWD ?? process.cwd(), ".env") });

function mustNumber(name: string, fallback: number): number {
  const raw = process.env[name];
  if (!raw) {
    return fallback;
  }
  const parsed = Number(raw);
  if (Number.isNaN(parsed)) {
    throw new Error(`Invalid number env: ${name}`);
  }
  return parsed;
}

function normalizePrivateKey(raw: string | undefined): string | undefined {
  if (!raw || raw.trim() === "" || raw === "0x...") {
    return undefined;
  }
  try {
    return new ethers.Wallet(raw).privateKey;
  } catch {
    return undefined;
  }
}

function normalizeAddress(raw: string | undefined): string | undefined {
  if (!raw || raw.trim() === "" || raw === "0x...") {
    return undefined;
  }
  try {
    return ethers.getAddress(raw);
  } catch {
    return undefined;
  }
}

function normalizeApiKey(raw: string | undefined): string | undefined {
  if (!raw || raw.trim() === "" || raw.includes("...")) {
    return undefined;
  }
  return raw.trim();
}

function parseCsv(raw: string | undefined, fallback: string[]): string[] {
  if (!raw || raw.trim() === "") {
    return fallback;
  }
  const parsed = raw
    .split(",")
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
  return parsed.length > 0 ? parsed : fallback;
}

function parseBoolean(raw: string | undefined, fallback: boolean): boolean {
  if (raw === undefined) {
    return fallback;
  }
  return raw === "true";
}

function firstNonEmpty(...values: Array<string | undefined>): string | undefined {
  for (const value of values) {
    if (value && value.trim() !== "") {
      return value;
    }
  }
  return undefined;
}

const explicitPrivateKey = normalizePrivateKey(process.env.HUNTER_PRIVATE_KEY);
const hunterSignerAddress = explicitPrivateKey ? new ethers.Wallet(explicitPrivateKey).address : undefined;
const kimiApiKey = normalizeApiKey(process.env.KIMI_API_KEY);
const openaiApiKey = normalizeApiKey(process.env.OPENAI_API_KEY);
const llmProvider = kimiApiKey ? "kimi" : openaiApiKey ? "openai" : "none";
const port = mustNumber("HUNTER_PORT", 3002);
const publicEndpoint = process.env.HUNTER_PUBLIC_ENDPOINT ?? `http://localhost:${port}`;
const registryServiceUrl = process.env.REGISTRY_SERVICE_URL ?? "http://localhost:3003";

export const hunterConfig = {
  port,
  chainId: mustNumber("CHAIN_ID", 10143),
  rpcUrl: process.env.MONAD_RPC_URL ?? "https://testnet-rpc.monad.xyz",
  privateKey: explicitPrivateKey,
  registryPath: path.resolve(
    process.env.INIT_CWD ?? process.cwd(),
    process.env.REGISTRY_PATH ?? "./registry/services.json"
  ),
  llm: {
    provider: llmProvider,
    apiKey: llmProvider === "kimi" ? kimiApiKey : llmProvider === "openai" ? openaiApiKey : undefined,
    model: llmProvider === "kimi" ? process.env.KIMI_MODEL ?? "kimi-k2.5" : process.env.OPENAI_MODEL ?? "gpt-4o-mini",
    baseURL:
      llmProvider === "kimi"
        ? process.env.KIMI_BASE_URL ?? "https://api.moonshot.cn/v1"
        : process.env.OPENAI_BASE_URL
  },
  defaultGoal:
    "Find a writer service and buy an analysis on Monad's performance characteristics.",
  useReact: process.env.HUNTER_USE_REACT === "true",
  isMockMode: !explicitPrivateKey,
  publicEndpoint,
  registryServiceUrl,
  discoveryEndpoints: parseCsv(process.env.DYNAMIC_AGENT_ENDPOINTS, []),
  identity: {
    agentId: process.env.HUNTER_AGENT_ID || undefined,
    name: process.env.HUNTER_AGENT_NAME ?? "Rebel Agent",
    description:
      process.env.HUNTER_AGENT_DESCRIPTION ??
      "Autonomous AI agent — discovers services, negotiates payment, and verifies results.",
    image: process.env.HUNTER_AGENT_IMAGE,
    trustModels: parseCsv(process.env.HUNTER_TRUST_MODELS, ["reputation", "crypto-economic"]),
    onchain: {
      enabled: parseBoolean(process.env.HUNTER_REGISTER_ONCHAIN, false),
      registryAddress: process.env.IDENTITY_REGISTRY_ADDRESS,
      agentUri: process.env.HUNTER_AGENT_URI ?? `${publicEndpoint}/identity`,
      wallet: {
        enabled: parseBoolean(process.env.HUNTER_SET_AGENT_WALLET_ONCHAIN, false),
        address:
          normalizeAddress(process.env.HUNTER_AGENT_WALLET_ADDRESS) ??
          normalizeAddress(process.env.IDENTITY_AGENT_WALLET_ADDRESS) ??
          hunterSignerAddress,
        signerPrivateKey:
          normalizePrivateKey(process.env.HUNTER_AGENT_WALLET_SIGNER_PRIVATE_KEY) ??
          normalizePrivateKey(process.env.IDENTITY_AGENT_WALLET_SIGNER_PRIVATE_KEY),
        deadlineSeconds: mustNumber("IDENTITY_SET_WALLET_DEADLINE_SECONDS", 300),
        signature: {
          domainName: firstNonEmpty(
            process.env.IDENTITY_SET_WALLET_DOMAIN_NAME,
            "ERC-8004 IdentityRegistry"
          )!,
          domainVersion: firstNonEmpty(process.env.IDENTITY_SET_WALLET_DOMAIN_VERSION, "1.1")!,
          typeName: firstNonEmpty(process.env.IDENTITY_SET_WALLET_TYPE_NAME, "SetAgentWallet")!,
          includeOwner: parseBoolean(process.env.IDENTITY_SET_WALLET_INCLUDE_OWNER, false),
          allowLegacyFallback: parseBoolean(process.env.IDENTITY_SET_WALLET_ALLOW_LEGACY_FALLBACK, true)
        }
      }
    }
  },
  reputation: {
    onchain: {
      enabled: parseBoolean(process.env.HUNTER_SUBMIT_ONCHAIN_FEEDBACK, false),
      registryAddress: process.env.REPUTATION_REGISTRY_ADDRESS,
      tag1: process.env.HUNTER_FEEDBACK_TAG1 ?? "quality",
      tag2: process.env.HUNTER_FEEDBACK_TAG2 ?? "delivery"
    }
  }
};
