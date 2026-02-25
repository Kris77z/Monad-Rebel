import type { ServiceInfo } from "@rebel/shared";

function normalizeEndpoint(endpoint: string): string {
  return endpoint.endsWith("/") ? endpoint.slice(0, -1) : endpoint;
}

async function fetchServiceReputation(service: ServiceInfo): Promise<number | undefined> {
  if (service.reputation) {
    const rep = service.reputation;
    let normalized = rep.score * 20;
    if (rep.trend === "down") {
      normalized -= 8;
    } else if (rep.trend === "up") {
      normalized += 3;
    }
    // Exploration bonus for sparse samples; avoids overfitting to incumbents.
    if (rep.count < 3) {
      normalized = Math.max(normalized, 55);
    }
    return Math.max(0, Math.min(100, Number(normalized.toFixed(2))));
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 1200);
  try {
    const response = await fetch(`${normalizeEndpoint(service.endpoint)}/reputation`, {
      signal: controller.signal
    });
    if (!response.ok) {
      return undefined;
    }
    const payload = (await response.json()) as { average?: unknown } | undefined;
    const average = payload?.average;
    if (typeof average !== "number" || !Number.isFinite(average)) {
      return undefined;
    }
    return average;
  } catch {
    return undefined;
  } finally {
    clearTimeout(timeout);
  }
}

export async function getServiceReputationMap(services: ServiceInfo[]): Promise<Map<string, number>> {
  const scores = await Promise.all(services.map((item) => fetchServiceReputation(item)));
  const map = new Map<string, number>();
  for (let index = 0; index < services.length; index += 1) {
    const score = scores[index];
    if (typeof score === "number") {
      map.set(services[index].id, score);
    }
  }
  return map;
}
