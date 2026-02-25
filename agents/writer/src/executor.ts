import { createOpenAI } from "@ai-sdk/openai";
import { generateText } from "ai";
import { WriterError } from "./errors.js";
import { writerConfig } from "./config.js";
import { resolveSkillForTaskType, type LoadedSkill } from "./skill-loader.js";

function stripMarkdownFence(value: string): string {
  const trimmed = value.trim();
  if (!trimmed.startsWith("```")) {
    return trimmed;
  }
  const withoutStart = trimmed.replace(/^```[a-zA-Z0-9_-]*\n?/, "");
  return withoutStart.replace(/\n?```$/, "").trim();
}

function normalizeSkillOutput(skill: LoadedSkill, output: string): string {
  const normalized = output.trim();
  if (skill.config.output.type !== "json") {
    return normalized;
  }

  const candidate = stripMarkdownFence(normalized);
  let parsed: unknown;
  try {
    parsed = JSON.parse(candidate);
  } catch {
    throw new WriterError(502, "INVALID_SKILL_OUTPUT", `Skill ${skill.config.id} must return valid JSON`);
  }
  return JSON.stringify(parsed, null, 2);
}

function buildFallbackResult(
  input: { taskType: string; taskInput: string },
  skill: LoadedSkill,
  reason: string
): string {
  if (skill.config.output.type === "json") {
    return JSON.stringify(
      {
        vulnerabilities: [],
        fallback: {
          taskType: skill.canonicalTaskType,
          serviceId: skill.config.id,
          reason
        }
      },
      null,
      2
    );
  }

  return [
    `Service: ${skill.config.id}`,
    `TaskType: ${skill.canonicalTaskType}`,
    `Fallback reason: ${reason}`,
    `Task: ${input.taskInput.trim()}`,
    "",
    skill.config.fallback?.summary ??
    "Monad is a high-performance EVM-compatible L1 focused on low-latency execution and high throughput."
  ].join("\n");
}

export async function executeTask(input: {
  taskType: string;
  taskInput: string;
}): Promise<string> {
  const normalizedTask = input.taskInput.trim();
  if (!normalizedTask) {
    throw new WriterError(400, "INVALID_PAYLOAD", "taskInput is required");
  }
  const skill = resolveSkillForTaskType(input.taskType);
  const normalizedTaskType = skill.canonicalTaskType;

  if (writerConfig.llm.provider === "none" || !writerConfig.llm.apiKey) {
    return buildFallbackResult(
      {
        taskType: normalizedTaskType,
        taskInput: normalizedTask
      },
      skill,
      "No LLM API key configured (KIMI_API_KEY / OPENAI_API_KEY)"
    );
  }

  try {
    const provider = createOpenAI({
      apiKey: writerConfig.llm.apiKey,
      baseURL: writerConfig.llm.baseURL,
      name: writerConfig.llm.provider,
      compatibility: "compatible"
    });

    const { text } = await generateText({
      model: provider.chat(writerConfig.llm.model),
      system: skill.prompt,
      prompt: `Task type: ${normalizedTaskType}\nTask input: ${normalizedTask}`,
      // Kimi models only accept temperature=1; override any skill-level config
      temperature:
        writerConfig.llm.provider === "kimi" ? 1 : (skill.config.llm?.temperature ?? undefined)
    });
    return normalizeSkillOutput(skill, text);
  } catch (error) {
    // Keep local MVP flow unblocked when model call fails (e.g., invalid key / rate limits).
    return buildFallbackResult(
      {
        taskType: normalizedTaskType,
        taskInput: normalizedTask
      },
      skill,
      error instanceof Error ? error.message : String(error)
    );
  }
}
