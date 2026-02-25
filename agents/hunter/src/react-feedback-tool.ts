import { z } from "zod";
import { giveFeedbackTool } from "./tools/feedback.js";
import type { HunterRuntimeState, ReactToolSpec } from "./react-tool-catalog.js";

const feedbackSchema = z.object({
  agentId: z.string(),
  value: z.number().min(0).max(100),
  tags: z.array(z.string()).optional(),
  text: z.string().optional(),
  onchainAgentTokenId: z.string().optional(),
  endpoint: z.string().optional(),
  serviceId: z.string().optional(),
  missionId: z.string().optional(),
  taskType: z.string().optional()
});

export function createGiveFeedbackTool(state: HunterRuntimeState): ReactToolSpec {
  return {
    description: "Submit post-trade feedback for a service provider",
    schema: feedbackSchema,
    jsonSchema: {
      type: "object",
      properties: {
        agentId: { type: "string" },
        value: { type: "number", minimum: 0, maximum: 100 },
        tags: {
          type: "array",
          items: { type: "string" }
        },
        text: { type: "string" },
        onchainAgentTokenId: { type: "string" },
        endpoint: { type: "string" },
        serviceId: { type: "string" },
        missionId: { type: "string" },
        taskType: { type: "string" }
      },
      required: ["agentId", "value"],
      additionalProperties: false
    },
    execute: async (args) => {
      const parsed = feedbackSchema.parse(args);
      const feedback = await giveFeedbackTool({
        ...parsed,
        serviceId: parsed.serviceId ?? state.service?.id,
        missionId: parsed.missionId ?? state.missionId,
        taskType: parsed.taskType ?? state.quote?.paymentContext.taskType
      });
      state.feedback = {
        agentId: feedback.agentId,
        value: feedback.value,
        reviewer: feedback.reviewer
      };
      return feedback;
    }
  };
}
