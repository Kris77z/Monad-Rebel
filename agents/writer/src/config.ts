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

function parseBoolean(raw: string | undefined, fallback: boolean): boolean {
  if (raw === undefined) {
    return fallback;
  }
  return raw === "true";
}

function normalizePrivateKey(raw: string | undefined): string | undefined {
  if (!raw || raw.trim() === "" || raw === "0x...") {
    return undefined;
  }
  try {
    // ethers validates both format and value domain.
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

function firstNonEmpty(...values: Array<string | undefined>): string | undefined {
  for (const value of values) {
    if (value && value.trim() !== "") {
      return value;
    }
  }
  return undefined;
}

const explicitPrivateKey = normalizePrivateKey(process.env.WRITER_PRIVATE_KEY);
const explicitAddress = normalizeAddress(process.env.WRITER_ADDRESS);
const devWallet = ethers.Wallet.createRandom();
const mockMode = !explicitPrivateKey;
const kimiApiKey = normalizeApiKey(process.env.KIMI_API_KEY);
const openaiApiKey = normalizeApiKey(process.env.OPENAI_API_KEY);
const llmProvider = kimiApiKey ? "kimi" : openaiApiKey ? "openai" : "none";
const port = mustNumber("WRITER_PORT", 3001);
const publicEndpoint = process.env.WRITER_PUBLIC_ENDPOINT ?? `http://localhost:${port}`;
const registryServiceUrl = process.env.REGISTRY_SERVICE_URL ?? "http://localhost:3003";

const writerAddress = mockMode ? devWallet.address : new ethers.Wallet(explicitPrivateKey!).address;
const writerPrivateKey = mockMode ? devWallet.privateKey : explicitPrivateKey!;

if (!explicitPrivateKey && explicitAddress && explicitAddress !== writerAddress) {
  console.warn(
    `[writer] WRITER_ADDRESS (${explicitAddress}) is ignored in mock mode; using ${writerAddress}`
  );
}

export const writerConfig = {
  port,
  chainId: mustNumber("CHAIN_ID", 10143),
  rpcUrl: process.env.MONAD_RPC_URL ?? "https://testnet-rpc.monad.xyz",
  priceWei: process.env.PRICE_WEI ?? "10000000000000000",
  paymentTimeoutSeconds: mustNumber("PAYMENT_TIMEOUT_SECONDS", 60),
  writerAddress,
  writerPrivateKey,
  llm: {
    provider: llmProvider,
    apiKey: llmProvider === "kimi" ? kimiApiKey : llmProvider === "openai" ? openaiApiKey : undefined,
    model: llmProvider === "kimi" ? process.env.KIMI_MODEL ?? "kimi-k2.5" : process.env.OPENAI_MODEL ?? "gpt-4o-mini",
    baseURL:
      llmProvider === "kimi"
        ? process.env.KIMI_BASE_URL ?? "https://api.moonshot.cn/v1"
        : process.env.OPENAI_BASE_URL
  },
  isMockMode: mockMode,
  skipPaymentVerification: mockMode
    ? true
    : parseBoolean(process.env.WRITER_SKIP_PAYMENT_VERIFICATION, false),
  publicEndpoint,
  service: {
    id: process.env.WRITER_SERVICE_ID ?? "writer-v1",
    name: process.env.WRITER_SERVICE_NAME ?? "AI Content Writer",
    description:
      process.env.WRITER_SERVICE_DESCRIPTION ??
      "Generate articles, tweets, and analysis using AI"
  },
  discovery: {
    serviceUrl: registryServiceUrl,
    heartbeatIntervalMs: mustNumber("WRITER_ADVERTISE_INTERVAL_MS", 30000),
    ttlSeconds: mustNumber("WRITER_ADVERTISE_TTL_SECONDS", 120)
  },
  identity: {
    agentId: process.env.WRITER_AGENT_ID?.trim() || undefined,
    name: process.env.WRITER_AGENT_NAME ?? "Agora Writer",
    description:
      process.env.WRITER_AGENT_DESCRIPTION ??
      "Autonomous writer agent that sells paid content generation services.",
    image: process.env.WRITER_AGENT_IMAGE,
    trustModels: parseCsv(process.env.WRITER_TRUST_MODELS, ["reputation", "crypto-economic"]),
    onchain: {
      enabled: parseBoolean(process.env.WRITER_REGISTER_ONCHAIN, false),
      registryAddress: process.env.IDENTITY_REGISTRY_ADDRESS,
      agentUri: process.env.WRITER_AGENT_URI ?? `${publicEndpoint}/identity`,
      wallet: {
        enabled: parseBoolean(process.env.WRITER_SET_AGENT_WALLET_ONCHAIN, false),
        address:
          normalizeAddress(process.env.WRITER_AGENT_WALLET_ADDRESS) ??
          normalizeAddress(process.env.IDENTITY_AGENT_WALLET_ADDRESS) ??
          writerAddress,
        signerPrivateKey:
          normalizePrivateKey(process.env.WRITER_AGENT_WALLET_SIGNER_PRIVATE_KEY) ??
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
      enabled: parseBoolean(process.env.WRITER_READ_ONCHAIN_REPUTATION, false),
      registryAddress: process.env.REPUTATION_REGISTRY_ADDRESS
    }
  }
};
