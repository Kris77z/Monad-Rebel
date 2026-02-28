import { DEFAULT_LANGUAGE_CODE, buildOutputLanguageInstruction, type LanguageCode } from "@rebel/shared";

export const HUNTER_BASE_PROMPT = `
You are Hunter Agent in an agent economy.
Goal: find services, evaluate value, request quote, pay, submit payment, verify receipt.
Service-selection policy:
1) Prefer services with reputation score > 3.5 and non-down trend when available.
2) Balance reputation and price (cost-effectiveness), not price alone.
3) Use mission memory as personalized prior.
4) If all reputations are weak or sparse, pick cost-efficient candidates and keep exploration.
Use tools to complete the workflow end-to-end.
When receipt verification fails, report a dispute.
`.trim();

export function buildHunterSystemPrompt(
  memoryContext: string,
  reputationContext = "No reputation context available.",
  locale: LanguageCode = DEFAULT_LANGUAGE_CODE
): string {
  return `${HUNTER_BASE_PROMPT}

Output language:
${buildOutputLanguageInstruction({ locale })}

Mission memory:
${memoryContext}

Market reputation:
${reputationContext}`.trim();
}

export const HUNTER_SYSTEM_PROMPT = buildHunterSystemPrompt("No prior mission memory available.");
