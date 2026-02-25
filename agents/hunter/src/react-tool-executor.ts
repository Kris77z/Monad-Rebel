import { HunterError } from "./errors.js";
import { pickNativeTransferAccept } from "./scripted-flow.js";
import { emitTrace, toToolSummary, type HunterRunOptions } from "./trace-emitter.js";
import type { HunterRuntimeState, ReactToolSpec } from "./react-tool-catalog.js";

export async function executeReactToolWithTrace(input: {
  toolName: string;
  args: unknown;
  tools: Record<string, ReactToolSpec>;
  state: HunterRuntimeState;
  options?: HunterRunOptions;
}): Promise<unknown> {
  const { toolName, args, tools, state, options } = input;
  const toolSpec = tools[toolName];
  if (!toolSpec) {
    throw new HunterError(400, "UNKNOWN_TOOL", `Unknown tool: ${toolName}`);
  }

  emitTrace(options, "tool_call", { tool: toolName, args });
  const result = await toolSpec.execute(args);
  emitTrace(options, "tool_result", { tool: toolName, result: toToolSummary(toolName, result) });

  if (toolName === "discover_services") {
    emitTrace(options, "services_discovered", {
      count: state.services.length,
      serviceIds: state.services.map((service) => service.id),
      services: state.services.map((service) => ({
        id: service.id,
        name: service.name,
        taskType: service.taskType,
        price: service.price,
        reputation: service.reputation
      }))
    });
  }

  if (toolName === "evaluate_service" && state.service) {
    emitTrace(options, "service_selected", {
      id: state.service.id,
      price: state.service.price,
      endpoint: state.service.endpoint,
      taskType: state.service.taskType
    });
  }

  if (toolName === "request_service" && state.quote && state.service) {
    const attempts = state.quoteAttempts ?? [];
    const initialCandidate = attempts[0]?.serviceId;
    emitTrace(options, "service_selected", {
      id: state.service.id,
      price: state.service.price,
      endpoint: state.service.endpoint,
      taskType: state.quote.paymentContext.taskType,
      attempts,
      ...(initialCandidate && initialCandidate !== state.service.id
        ? { fallbackFrom: initialCandidate }
        : {})
    });

    const accept = pickNativeTransferAccept(state.quote);
    emitTrace(options, "quote_received", {
      requestHash: state.quote.paymentContext.requestHash,
      amount: accept.amount,
      payTo: accept.payTo,
      network: accept.network
    });
    emitTrace(options, "payment_state", {
      status: "payment-required",
      requestHash: state.quote.paymentContext.requestHash,
      amount: accept.amount,
      payTo: accept.payTo,
      network: accept.network
    });
  }

  if (toolName === "make_payment" && state.paymentTx) {
    emitTrace(options, "payment_state", {
      status: "payment-submitted",
      txHash: state.paymentTx
    });
  }

  if (toolName === "submit_payment" && state.execution) {
    emitTrace(options, "payment_state", {
      status: state.execution.payment.status,
      txHash: state.execution.payment.transaction,
      network: state.execution.payment.network
    });
  }

  if (toolName === "verify_receipt" && state.execution) {
    emitTrace(options, "receipt_verified", {
      isValid: Boolean(state.receiptVerified),
      provider: state.execution.receipt.provider,
      requestHash: state.execution.receipt.requestHash
    });
  }

  if (toolName === "evaluate_result" && state.evaluation) {
    emitTrace(options, "evaluation_completed", state.evaluation);
  }

  if (toolName === "give_feedback" && state.feedback) {
    emitTrace(options, "feedback_submitted", state.feedback);
  }

  return result;
}
