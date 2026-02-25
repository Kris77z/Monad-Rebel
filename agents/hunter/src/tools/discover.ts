import { readFile } from "node:fs/promises";
import { listDynamicServices as listDynamicServicesFromStore, type ServiceInfo, type ServiceRegistry } from "@rebel/shared";
import { hunterConfig } from "../config.js";
import { HunterError } from "../errors.js";

function normalizeEndpoint(endpoint: string): string {
  return endpoint.endsWith("/") ? endpoint.slice(0, -1) : endpoint;
}

function mergeServices(primary: ServiceInfo[], secondary: ServiceInfo[]): ServiceInfo[] {
  const byId = new Map<string, ServiceInfo>();
  for (const item of secondary) {
    byId.set(item.id, item);
  }
  for (const item of primary) {
    const existing = byId.get(item.id);
    if (!existing) {
      byId.set(item.id, item);
      continue;
    }
    byId.set(item.id, {
      ...existing,
      ...item,
      taskType: item.taskType ?? existing.taskType,
      skills: item.skills ?? existing.skills,
      reputation: item.reputation ?? existing.reputation
    });
  }
  return [...byId.values()];
}

async function fetchAdvertisedService(endpoint: string): Promise<ServiceInfo | undefined> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 1500);
  try {
    const response = await fetch(`${normalizeEndpoint(endpoint)}/identity`, {
      signal: controller.signal
    });
    if (!response.ok) {
      return undefined;
    }
    const payload = (await response.json()) as { service?: ServiceInfo } | undefined;
    const service = payload?.service;
    if (!service || typeof service !== "object") {
      return undefined;
    }
    return service;
  } catch {
    return undefined;
  } finally {
    clearTimeout(timeout);
  }
}

async function discoverAdvertisedServices(staticServices: ServiceInfo[]): Promise<ServiceInfo[]> {
  let dynamicStoreServices: ServiceInfo[] = [];
  try {
    dynamicStoreServices = await listDynamicServicesFromStore();
  } catch {
    dynamicStoreServices = [];
  }

  let registryServiceServices: ServiceInfo[] = [];
  try {
    const response = await fetch(`${normalizeEndpoint(hunterConfig.registryServiceUrl)}/services`);
    if (response.ok) {
      const payload = (await response.json()) as { services?: ServiceInfo[] } | undefined;
      if (Array.isArray(payload?.services)) {
        registryServiceServices = payload.services;
      }
    }
  } catch {
    registryServiceServices = [];
  }

  const staticEndpoints = staticServices.map((item) => item.endpoint);
  const dynamicEndpoints = dynamicStoreServices.map((item) => item.endpoint);
  const registryEndpoints = registryServiceServices.map((item) => item.endpoint);
  const endpointCandidates = [
    ...new Set([
      ...hunterConfig.discoveryEndpoints,
      ...staticEndpoints,
      ...dynamicEndpoints,
      ...registryEndpoints
    ])
  ];
  if (endpointCandidates.length === 0) {
    return mergeServices(registryServiceServices, dynamicStoreServices);
  }

  const advertised = await Promise.all(endpointCandidates.map((endpoint) => fetchAdvertisedService(endpoint)));
  const remoteServices = advertised.filter((item): item is ServiceInfo => Boolean(item));
  return mergeServices(remoteServices, mergeServices(registryServiceServices, dynamicStoreServices));
}

export async function discoverServices(): Promise<ServiceInfo[]> {
  let content: string;
  try {
    content = await readFile(hunterConfig.registryPath, "utf8");
  } catch (error) {
    throw new HunterError(500, "REGISTRY_READ_FAILED", "Failed to read service registry", {
      path: hunterConfig.registryPath,
      cause: error instanceof Error ? error.message : String(error)
    });
  }

  let parsed: ServiceRegistry;
  try {
    parsed = JSON.parse(content) as ServiceRegistry;
  } catch (error) {
    throw new HunterError(500, "REGISTRY_INVALID_JSON", "Service registry JSON is invalid", {
      cause: error instanceof Error ? error.message : String(error)
    });
  }

  if (!Array.isArray(parsed.services)) {
    throw new HunterError(500, "REGISTRY_INVALID_FORMAT", "Service registry must contain services[]");
  }

  const advertised = await discoverAdvertisedServices(parsed.services);
  return mergeServices(advertised, parsed.services);
}
