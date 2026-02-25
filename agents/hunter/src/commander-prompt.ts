import { createOpenAI } from "@ai-sdk/openai";
import { generateText } from "ai";
import type { CommanderPhase, HunterServiceTaskType } from "@rebel/shared";
import { hunterConfig } from "./config.js";

const SERVICE_TYPES: HunterServiceTaskType[] = [
  "content-generation",
  "smart-contract-audit",
  "defi-analysis",
  "gas-optimization",
  "token-scan",
  "tx-decode",
  "abi-interact",
  "yield-search"
];

const SERVICE_TYPE_SET = new Set<string>(SERVICE_TYPES);

export const COMMANDER_DECOMPOSE_PROMPT = `
You are a mission commander for the Rebel Agent Mesh.

Break the following mission into 2-4 sequential sub-tasks.
Each sub-task will be handled by a specialized AI service agent.

Available service types:
- content-generation: Writing articles, reports, analyses
- smart-contract-audit: Solidity security auditing
- defi-analysis: DeFi protocol and token analysis
- gas-optimization: Solidity gas usage optimization
- token-scan: Token contract risk scanning
- tx-decode: Transaction decoding and explanation
- abi-interact: Smart contract ABI reading
- yield-search: DeFi yield strategy finding

Rules:
1. Maximum 4 phases (keep missions efficient)
2. Each phase should ideally use a DIFFERENT service type
3. Later phases may reference results from earlier ones
4. Order matters: put foundational analysis before synthesis
5. If the mission is simple enough for 1 agent, return just 1 phase

Output JSON only. Prefer this schema:
[{"name":"Short Label","taskType":"service-type","goal":"Detailed goal"}]
`.trim();

function parseJsonPayload(raw: string): unknown {
  const trimmed = raw.trim();
  const withoutFence = trimmed
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/, "");
  try {
    return JSON.parse(withoutFence);
  } catch {
    const start = withoutFence.indexOf("[");
    const end = withoutFence.lastIndexOf("]");
    if (start >= 0 && end > start) {
      try {
        return JSON.parse(withoutFence.slice(start, end + 1));
      } catch {
        return [];
      }
    }
    return [];
  }
}

function normalizeTaskType(raw: unknown): HunterServiceTaskType | undefined {
  if (typeof raw !== "string") {
    return undefined;
  }
  return SERVICE_TYPE_SET.has(raw) ? (raw as HunterServiceTaskType) : undefined;
}

function normalizePhases(raw: unknown): CommanderPhase[] {
  const list = Array.isArray(raw)
    ? raw
    : raw && typeof raw === "object" && Array.isArray((raw as Record<string, unknown>).phases)
      ? ((raw as Record<string, unknown>).phases as unknown[])
      : [];

  const phases: CommanderPhase[] = [];
  for (const [index, item] of list.entries()) {
    if (!item || typeof item !== "object") {
      continue;
    }
    const asRecord = item as Record<string, unknown>;
    const taskType = normalizeTaskType(asRecord.taskType);
    const goal = typeof asRecord.goal === "string" ? asRecord.goal.trim() : "";
    if (!taskType || goal.length === 0) {
      continue;
    }
    const name =
      typeof asRecord.name === "string" && asRecord.name.trim().length > 0
        ? asRecord.name.trim()
        : `Phase ${index + 1}`;
    phases.push({
      name,
      taskType,
      goal
    });
  }

  return phases.slice(0, 4);
}

export async function decomposeMission(goal: string): Promise<CommanderPhase[]> {
  if (hunterConfig.llm.provider === "none" || !hunterConfig.llm.apiKey) {
    return [];
  }

  try {
    const provider = createOpenAI({
      apiKey: hunterConfig.llm.apiKey,
      baseURL: hunterConfig.llm.baseURL,
      name: hunterConfig.llm.provider,
      compatibility: "compatible"
    });

    const response = await generateText({
      model: provider.chat(hunterConfig.llm.model),
      system: COMMANDER_DECOMPOSE_PROMPT,
      prompt: `Mission:\n${goal}`,
      temperature: hunterConfig.llm.provider === "kimi" ? 1 : 0.2
    });

    return normalizePhases(parseJsonPayload(response.text));
  } catch {
    return [];
  }
}
