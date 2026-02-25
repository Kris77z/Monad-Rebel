import type { ServiceInfo } from "@rebel/shared";

function normalizeEndpoint(endpoint: string): string {
  return endpoint.endsWith("/") ? endpoint.slice(0, -1) : endpoint;
}

export async function fetchServiceIdentity(input: {
  service: ServiceInfo;
}): Promise<{
  agentId?: string;
  onchainAgentTokenId?: string;
}> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 1200);
  try {
    const response = await fetch(`${normalizeEndpoint(input.service.endpoint)}/identity`, {
      signal: controller.signal
    });
    if (!response.ok) {
      return {};
    }
    const payload = (await response.json()) as
      | {
          identity?: { agentId?: string };
          onchain?: { agentTokenId?: string };
        }
      | undefined;
    return {
      agentId: payload?.identity?.agentId,
      onchainAgentTokenId: payload?.onchain?.agentTokenId
    };
  } catch {
    return {};
  } finally {
    clearTimeout(timeout);
  }
}

