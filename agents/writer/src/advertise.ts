import { registerAgentIdentity, registerDynamicService } from "@rebel/shared";
import { writerConfig } from "./config.js";
import { getWriterIdentity, getWriterServicesInfo } from "./identity.js";

function normalizeEndpoint(endpoint: string): string {
  return endpoint.endsWith("/") ? endpoint.slice(0, -1) : endpoint;
}

export async function advertiseWriterCapabilities(input: { silent?: boolean } = {}): Promise<void> {
  const identity = registerAgentIdentity(getWriterIdentity());
  const services = getWriterServicesInfo();

  for (const service of services) {
    await registerDynamicService({
      agentId: identity.agentId,
      service,
      ttlSeconds: writerConfig.discovery.ttlSeconds
    });

    try {
      const response = await fetch(
        `${normalizeEndpoint(writerConfig.discovery.serviceUrl)}/services/register`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            agentId: identity.agentId,
            service,
            ttlSeconds: writerConfig.discovery.ttlSeconds
          })
        }
      );
      if (!response.ok && !input.silent) {
        console.warn(
          `[writer] registry service register failed: service=${service.id} status=${response.status}`
        );
      }
    } catch (error) {
      if (!input.silent) {
        console.warn(
          `[writer] registry service unavailable: ${error instanceof Error ? error.message : String(error)}`
        );
      }
    }
  }

  if (!input.silent) {
    console.log(
      `[writer] capability advertised | agentId=${identity.agentId} | capabilities=${identity.capabilities.length} | services=${services.length}`
    );
  }
}
