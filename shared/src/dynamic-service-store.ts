import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import type { ServiceInfo } from "./types.js";

interface DynamicServiceEntry {
  agentId: string;
  service: ServiceInfo;
  updatedAt: number;
  expiresAt: number;
}

interface DynamicServiceStore {
  services: DynamicServiceEntry[];
}

const dynamicRegistryPath = path.resolve(
  process.env.INIT_CWD ?? process.cwd(),
  process.env.DYNAMIC_REGISTRY_PATH ?? "./registry/dynamic-services.json"
);

async function readDynamicStore(): Promise<DynamicServiceStore> {
  try {
    const content = await readFile(dynamicRegistryPath, "utf8");
    const parsed = JSON.parse(content) as DynamicServiceStore;
    if (!Array.isArray(parsed.services)) {
      return { services: [] };
    }
    return { services: parsed.services };
  } catch (error) {
    const asNodeError = error as NodeJS.ErrnoException;
    if (asNodeError.code === "ENOENT") {
      return { services: [] };
    }
    throw error;
  }
}

async function writeDynamicStore(payload: DynamicServiceStore): Promise<void> {
  await mkdir(path.dirname(dynamicRegistryPath), { recursive: true });
  await writeFile(dynamicRegistryPath, JSON.stringify(payload, null, 2), "utf8");
}

export async function registerDynamicService(input: {
  agentId: string;
  service: ServiceInfo;
  ttlSeconds?: number;
}): Promise<void> {
  const store = await readDynamicStore();
  const ttlSeconds = input.ttlSeconds ?? 120;
  const now = Math.floor(Date.now() / 1000);
  const nextEntry: DynamicServiceEntry = {
    agentId: input.agentId,
    service: input.service,
    updatedAt: now,
    expiresAt: now + ttlSeconds
  };
  const filtered = store.services.filter(
    (item) => !(item.agentId === input.agentId && item.service.id === input.service.id)
  );
  filtered.push(nextEntry);
  await writeDynamicStore({ services: filtered });
}

export async function listDynamicServices(): Promise<ServiceInfo[]> {
  const store = await readDynamicStore();
  const now = Math.floor(Date.now() / 1000);
  const active = store.services.filter((item) => item.expiresAt >= now);
  if (active.length !== store.services.length) {
    await writeDynamicStore({ services: active });
  }
  return active.map((item) => item.service);
}
