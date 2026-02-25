import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

export interface OnchainIdentityRecord {
  key: string;
  role: "hunter" | "writer";
  registryAddress: string;
  chainId: number;
  walletAddress: string;
  agentUri: string;
  txHash: string;
  agentTokenId?: string;
  registeredAt: number;
  agentWalletAddress?: string;
  agentWalletSetTxHash?: string;
  agentWalletSetAt?: number;
  agentWalletSetDeadline?: number;
  agentWalletSignatureProfileId?: string;
}

interface OnchainIdentityStore {
  records: OnchainIdentityRecord[];
}

const onchainIdentityStorePath = path.resolve(
  process.env.INIT_CWD ?? process.cwd(),
  process.env.ONCHAIN_IDENTITY_STORE_PATH ?? "./registry/onchain-identity-store.json"
);

async function readStore(): Promise<OnchainIdentityStore> {
  try {
    const content = await readFile(onchainIdentityStorePath, "utf8");
    const parsed = JSON.parse(content) as OnchainIdentityStore;
    if (!Array.isArray(parsed.records)) {
      return { records: [] };
    }
    return parsed;
  } catch (error) {
    const asNodeError = error as NodeJS.ErrnoException;
    if (asNodeError.code === "ENOENT") {
      return { records: [] };
    }
    throw error;
  }
}

async function writeStore(store: OnchainIdentityStore): Promise<void> {
  await mkdir(path.dirname(onchainIdentityStorePath), { recursive: true });
  await writeFile(onchainIdentityStorePath, JSON.stringify(store, null, 2), "utf8");
}

export async function getOnchainIdentityRecord(key: string): Promise<OnchainIdentityRecord | undefined> {
  const store = await readStore();
  return store.records.find((item) => item.key === key);
}

export async function upsertOnchainIdentityRecord(record: OnchainIdentityRecord): Promise<void> {
  const store = await readStore();
  const filtered = store.records.filter((item) => item.key !== record.key);
  filtered.push(record);
  await writeStore({ records: filtered });
}
