import { hunterConfig } from "./config.js";
import { HunterError } from "./errors.js";
import {
  executeReactToolWithTrace,
  type HunterRuntimeState,
  type ReactToolSpec
} from "./react-tools.js";
import { emitTrace, type HunterRunOptions } from "./trace-emitter.js";

interface KimiToolCall {
  id: string;
  type: "function";
  function: {
    name: string;
    arguments: string;
  };
}

type KimiMessage =
  | { role: "system" | "user"; content: string }
  | {
      role: "assistant";
      content: string;
      tool_calls?: KimiToolCall[];
      reasoning_content?: string;
    }
  | { role: "tool"; tool_call_id: string; name: string; content: string };

function safeStringify(value: unknown): string {
  try {
    const text = JSON.stringify(value);
    return text ?? "null";
  } catch {
    return String(value);
  }
}

function parseToolArgs(raw: string | undefined, name: string): unknown {
  if (!raw || raw.trim() === "") {
    return {};
  }
  try {
    return JSON.parse(raw);
  } catch {
    throw new HunterError(400, "TOOL_ARGS_INVALID", `Tool ${name} arguments are not valid JSON`);
  }
}

function getErrorMessage(payload: unknown): string {
  if (!payload || typeof payload !== "object") {
    return "Unknown provider error";
  }
  const asRecord = payload as Record<string, unknown>;
  const err = asRecord.error;
  if (err && typeof err === "object" && "message" in err && typeof err.message === "string") {
    return err.message;
  }
  if ("message" in asRecord && typeof asRecord.message === "string") {
    return asRecord.message;
  }
  return "Unknown provider error";
}

export async function runKimiReactLoop(
  goal: string,
  tools: Record<string, ReactToolSpec>,
  state: HunterRuntimeState,
  options: HunterRunOptions,
  systemPrompt: string
): Promise<string> {
  if (!hunterConfig.llm.apiKey) {
    throw new HunterError(500, "LLM_KEY_MISSING", "KIMI_API_KEY is required for Kimi ReAct mode");
  }

  const baseURL = (hunterConfig.llm.baseURL ?? "https://api.moonshot.cn/v1").replace(/\/$/, "");
  const endpoint = `${baseURL}/chat/completions`;
  const messages: KimiMessage[] = [
    { role: "system", content: systemPrompt },
    { role: "user", content: goal }
  ];
  const toolList = Object.entries(tools).map(([name, spec]) => ({
    type: "function" as const,
    function: {
      name,
      description: spec.description,
      parameters: spec.jsonSchema
    }
  }));

  for (let step = 0; step < 12; step += 1) {
    let response: Response;
    try {
      response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${hunterConfig.llm.apiKey}`
        },
        body: JSON.stringify({
          model: hunterConfig.llm.model,
          messages,
          tools: toolList,
          tool_choice: "auto",
          temperature: 1
        })
      });
    } catch (error) {
      const detail =
        error instanceof Error && "cause" in error
          ? (error as Error & { cause?: unknown }).cause
          : undefined;
      throw new HunterError(
        502,
        "LLM_EXECUTION_FAILED",
        `Kimi request failed: ${error instanceof Error ? error.message : String(error)}`,
        detail
      );
    }

    const payload = (await response.json()) as
      | {
          choices?: Array<{
            message?: {
              content?: string | null;
              tool_calls?: KimiToolCall[];
              reasoning_content?: string;
            };
          }>;
          error?: { message?: string };
        }
      | undefined;

    if (!response.ok) {
      throw new HunterError(
        502,
        "LLM_EXECUTION_FAILED",
        `Kimi API error (${response.status}): ${getErrorMessage(payload)}`,
        payload
      );
    }

    const message = payload?.choices?.[0]?.message;
    if (!message) {
      throw new HunterError(502, "LLM_EXECUTION_FAILED", "Kimi API returned empty choices");
    }

    const toolCalls = Array.isArray(message.tool_calls) ? message.tool_calls : [];
    emitTrace(options, "llm_response", {
      step: step + 1,
      toolCalls: toolCalls.length,
      hasText: typeof message.content === "string" && message.content.trim().length > 0
    });

    if (toolCalls.length === 0) {
      const finalText = typeof message.content === "string" ? message.content.trim() : "";
      messages.push({
        role: "assistant",
        content: typeof message.content === "string" ? message.content : "",
        ...(typeof message.reasoning_content === "string"
          ? { reasoning_content: message.reasoning_content }
          : {})
      });
      return finalText || "ReAct flow completed successfully.";
    }

    // Kimi requires reasoning_content to be preserved in assistant tool-call turns
    // when thinking mode is enabled. We keep it in the conversation state to avoid
    // protocol-level incompatibilities and keep the flow pure ReAct.
    messages.push({
      role: "assistant",
      content: typeof message.content === "string" ? message.content : "",
      tool_calls: toolCalls,
      reasoning_content:
        typeof message.reasoning_content === "string" ? message.reasoning_content : ""
    });

    for (const call of toolCalls) {
      if (call.type !== "function") {
        throw new HunterError(400, "UNSUPPORTED_TOOL_CALL", `Unsupported tool call type: ${call.type}`);
      }
      const toolName = call.function?.name;
      if (!toolName || !tools[toolName]) {
        throw new HunterError(400, "UNKNOWN_TOOL", `Unknown tool: ${toolName ?? "undefined"}`);
      }
      const args = parseToolArgs(call.function?.arguments, toolName);
      const parsed = tools[toolName].schema.parse(args);
      const result = await executeReactToolWithTrace({
        toolName,
        args: parsed,
        tools,
        state,
        options
      });

      messages.push({
        role: "tool",
        tool_call_id: call.id,
        name: toolName,
        content: safeStringify(result)
      });
    }
  }

  throw new HunterError(500, "REACT_INCOMPLETE", "ReAct flow exceeded max steps without completion");
}
