import { buildCaip2Network, type AgentIdentity, type ServiceInfo } from "@rebel/shared";
import { writerConfig } from "./config.js";
import {
  getSkillPriceWei,
  listLoadedSkills,
  resolveSkillForTaskType,
  type LoadedSkill
} from "./skill-loader.js";

const writerRegisteredAt = Math.floor(Date.now() / 1000);

function toServiceInfo(skill: LoadedSkill): ServiceInfo {
  return {
    id: skill.config.id,
    name: skill.config.name,
    description: skill.config.description ?? `Task execution service for ${skill.canonicalTaskType}`,
    endpoint: writerConfig.publicEndpoint,
    taskType: skill.canonicalTaskType,
    skills: [...skill.config.skills],
    price: getSkillPriceWei(skill, writerConfig.priceWei),
    currency: "MON",
    network: buildCaip2Network(writerConfig.chainId),
    provider: writerConfig.writerAddress
  };
}

export function getWriterIdentity(): AgentIdentity {
  const skills = listLoadedSkills();
  const capabilitySkills = [
    ...new Set([
      ...skills.flatMap((item) => item.config.taskTypes),
      ...skills.flatMap((item) => item.config.skills),
      "x402-paywall"
    ])
  ];

  return {
    agentId: writerConfig.identity.agentId ?? `${writerConfig.chainId}:${writerConfig.writerAddress.toLowerCase()}`,
    name: writerConfig.identity.name,
    description: writerConfig.identity.description,
    image: writerConfig.identity.image,
    walletAddress: writerConfig.writerAddress,
    capabilities: [
      {
        type: "a2a",
        endpoint: `${writerConfig.publicEndpoint}/execute`,
        skills: capabilitySkills
      },
      {
        type: "mcp",
        endpoint: `${writerConfig.publicEndpoint}/execute`,
        tools: ["quote", "execute", "receipt-sign", "skill-routing"]
      }
    ],
    trustModels: writerConfig.identity.trustModels,
    active: true,
    registeredAt: writerRegisteredAt
  };
}

export function getWriterServicesInfo(): ServiceInfo[] {
  return listLoadedSkills().map((skill) => toServiceInfo(skill));
}

export function getWriterServiceInfo(): ServiceInfo {
  const primary = resolveSkillForTaskType("content-generation");
  return toServiceInfo(primary);
}
