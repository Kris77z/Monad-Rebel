import { randomUUID } from "node:crypto";
import type {
  HunterServiceTaskType,
  NativeTransferAccept,
  PaymentRequiredResponse,
  ServiceInfo
} from "@rebel/shared";
import { HunterError } from "./errors.js";
import { checkBalanceTool, makePaymentTool } from "./tools/payment.js";
import {
  requestServiceQuoteWithFallback,
  submitPaymentAndGetResult
} from "./tools/service.js";
import { evaluateResultTool, verifyReceiptTool } from "./tools/verify.js";
import { discoverServices } from "./tools/discover.js";
import { getServiceReputationMap } from "./tools/reputation.js";
import { submitAutoFeedback } from "./feedback-autopilot.js";
import { emitTrace, type HunterRunOptions } from "./trace-emitter.js";
import type { SingleHunterRunResult } from "./run-types.js";
import { reflectAndStoreExperience } from "./tools/reflect.js";
import { hunterLog, hunterWarn, hunterError, hunterDebug } from "./logger.js";

const TASK_TYPE_PATTERNS: Array<{ taskType: HunterServiceTaskType; patterns: RegExp[] }> = [
  {
    taskType: "smart-contract-audit",
    patterns: [/audit/i, /security/i, /vulnerability/i, /solidity/i, /reentrancy/i, /审计/, /漏洞/]
  },
  {
    taskType: "defi-analysis",
    patterns: [/defi/i, /tvl/i, /yield/i, /protocol/i, /liquidity/i, /收益/, /流动性/, /借贷/]
  },
  {
    taskType: "content-generation",
    patterns: [/write/i, /content/i, /article/i, /tweet/i, /analysis/i, /文案/, /写作/, /总结/]
  }
];

export function inferTaskTypeFromGoal(goal: string): HunterServiceTaskType | undefined {
  for (const item of TASK_TYPE_PATTERNS) {
    if (item.patterns.some((pattern) => pattern.test(goal))) {
      return item.taskType;
    }
  }
  return undefined;
}

export function filterServicesByTaskType(services: ServiceInfo[], taskType?: string): ServiceInfo[] {
  if (!taskType) {
    return services;
  }
  const matched = services.filter((item) => !item.taskType || item.taskType === taskType);
  return matched.length > 0 ? matched : services;
}

export function chooseCheapestService(services: ServiceInfo[]): ServiceInfo {
  const sorted = [...services].sort((a, b) => {
    const priceA = BigInt(a.price);
    const priceB = BigInt(b.price);
    if (priceA === priceB) {
      return 0;
    }
    return priceA < priceB ? -1 : 1;
  });
  const selected = sorted[0];
  if (!selected) {
    throw new HunterError(404, "NO_SERVICE_AVAILABLE", "No service found in registry");
  }
  return selected;
}

function computePriceScore(price: bigint, min: bigint, max: bigint): number {
  if (max === min) {
    return 1;
  }
  const numerator = max - price;
  const denominator = max - min;
  return Number((numerator * 10000n) / denominator) / 10000;
}

export async function chooseBestService(services: ServiceInfo[]): Promise<ServiceInfo> {
  const cheapest = chooseCheapestService(services);
  const reputationMap = await getServiceReputationMap(services);

  const prices = services.map((item) => BigInt(item.price));
  const minPrice = prices.reduce((min, value) => (value < min ? value : min), prices[0]);
  const maxPrice = prices.reduce((max, value) => (value > max ? value : max), prices[0]);

  let best = cheapest;
  let bestScore = -1;
  for (const service of services) {
    const reputation = reputationMap.get(service.id) ?? 0;
    const priceScore = computePriceScore(BigInt(service.price), minPrice, maxPrice);
    const reputationScore = Math.max(0, Math.min(100, reputation)) / 100;
    const score = reputationScore * 0.7 + priceScore * 0.3;
    if (score > bestScore) {
      best = service;
      bestScore = score;
      continue;
    }
    if (score === bestScore && BigInt(service.price) < BigInt(best.price)) {
      best = service;
    }
  }
  return best;
}

export async function rankServicesByPreference(services: ServiceInfo[]): Promise<ServiceInfo[]> {
  const reputationMap = await getServiceReputationMap(services);
  const prices = services.map((item) => BigInt(item.price));
  const minPrice = prices.reduce((min, value) => (value < min ? value : min), prices[0]);
  const maxPrice = prices.reduce((max, value) => (value > max ? value : max), prices[0]);

  return [...services].sort((a, b) => {
    const aRep = Math.max(0, Math.min(100, reputationMap.get(a.id) ?? 0)) / 100;
    const bRep = Math.max(0, Math.min(100, reputationMap.get(b.id) ?? 0)) / 100;
    const aScore = aRep * 0.7 + computePriceScore(BigInt(a.price), minPrice, maxPrice) * 0.3;
    const bScore = bRep * 0.7 + computePriceScore(BigInt(b.price), minPrice, maxPrice) * 0.3;
    if (aScore === bScore) {
      const aPrice = BigInt(a.price);
      const bPrice = BigInt(b.price);
      if (aPrice === bPrice) {
        return 0;
      }
      return aPrice < bPrice ? -1 : 1;
    }
    return aScore > bScore ? -1 : 1;
  });
}

/** Build a human-readable reason for selecting a specific service */
async function buildSelectionReason(
  selected: ServiceInfo,
  candidates: ServiceInfo[],
): Promise<{ reason: string; reputationPct: number; priceRank: number; totalCandidates: number }> {
  const reputationMap = await getServiceReputationMap(candidates);
  const reputationPct = Math.round(reputationMap.get(selected.id) ?? 0);
  const sorted = [...candidates].sort((a, b) => {
    const pa = BigInt(a.price);
    const pb = BigInt(b.price);
    return pa < pb ? -1 : pa > pb ? 1 : 0;
  });
  const priceRank = sorted.findIndex((s) => s.id === selected.id) + 1;
  const totalCandidates = candidates.length;

  const parts: string[] = [];
  if (reputationPct > 0) parts.push(`reputation ${reputationPct}%`);
  if (priceRank <= 2) parts.push(`cheapest${priceRank === 1 ? '' : ' #2'}`);
  else parts.push(`price rank #${priceRank}/${totalCandidates}`);

  return {
    reason: parts.length > 0 ? `Selected: ${parts.join(', ')}` : 'Selected by default',
    reputationPct,
    priceRank,
    totalCandidates,
  };
}

export function pickNativeTransferAccept(quote: PaymentRequiredResponse): NativeTransferAccept {
  const accept = quote.accepts.find((item) => item.scheme === "native-transfer");
  if (!accept) {
    throw new HunterError(422, "UNSUPPORTED_PAYMENT_SCHEME", "No native-transfer quote found");
  }
  return accept;
}

export interface ExecutePhaseOptions {
  preferredTaskType?: HunterServiceTaskType;
  missionId?: string;
  emitLifecycleEvents?: boolean;
}

export async function executePhase(
  goal: string,
  options: HunterRunOptions = {},
  executeOptions: ExecutePhaseOptions = {}
): Promise<SingleHunterRunResult> {
  const missionId = executeOptions.missionId ?? randomUUID();
  const emitLifecycleEvents = executeOptions.emitLifecycleEvents ?? true;

  hunterLog(`--- executePhase start --- mission=${missionId}`);
  hunterLog(`goal: "${goal.slice(0, 120)}${goal.length > 120 ? '...' : ''}"`);
  if (executeOptions.preferredTaskType) {
    hunterLog(`preferredTaskType: ${executeOptions.preferredTaskType}`);
  }

  if (emitLifecycleEvents) {
    emitTrace(options, "run_started", {
      mode: "scripted",
      goal,
      preferredTaskType: executeOptions.preferredTaskType
    });
  }

  const services = await discoverServices();
  hunterLog(`discover: found ${services.length} services [${services.map(s => s.id).join(', ')}]`);
  const inferredTaskType = inferTaskTypeFromGoal(goal);
  const taskTypeHint = executeOptions.preferredTaskType ?? inferredTaskType;
  const filteredServices = filterServicesByTaskType(services, taskTypeHint);
  emitTrace(options, "services_discovered", {
    count: services.length,
    serviceIds: services.map((service) => service.id),
    inferredTaskType,
    preferredTaskType: executeOptions.preferredTaskType,
    eligibleServiceIds: filteredServices.map((service) => service.id),
    services: services.map((service) => ({
      id: service.id,
      name: service.name,
      taskType: service.taskType,
      price: service.price,
      reputation: service.reputation
    }))
  });

  const serviceCandidates = await rankServicesByPreference(filteredServices);
  const service = serviceCandidates[0] ?? (await chooseBestService(filteredServices));
  const taskType = service.taskType ?? taskTypeHint ?? "content-generation";
  const selectionInfo = await buildSelectionReason(service, filteredServices);
  emitTrace(options, "service_selected", {
    id: service.id,
    price: service.price,
    endpoint: service.endpoint,
    taskType,
    reason: selectionInfo.reason,
    reputationPct: selectionInfo.reputationPct,
    priceRank: selectionInfo.priceRank,
    totalCandidates: selectionInfo.totalCandidates,
  });
  hunterLog(`select: ${service.id} (${taskType}) price=${service.price} — ${selectionInfo.reason}`);

  const quoteRequest = await requestServiceQuoteWithFallback({
    services: serviceCandidates,
    taskType,
    taskInput: goal
  });
  const selectedService = quoteRequest.service;
  if (selectedService.id !== service.id) {
    const fallbackInfo = await buildSelectionReason(selectedService, filteredServices);
    emitTrace(options, "service_selected", {
      id: selectedService.id,
      price: selectedService.price,
      endpoint: selectedService.endpoint,
      taskType: selectedService.taskType ?? taskType,
      fallbackFrom: service.id,
      attempts: quoteRequest.attempts,
      reason: fallbackInfo.reason,
      reputationPct: fallbackInfo.reputationPct,
      priceRank: fallbackInfo.priceRank,
      totalCandidates: fallbackInfo.totalCandidates,
    });
  }
  const quote = quoteRequest.quote;
  const accept = pickNativeTransferAccept(quote);
  hunterLog(`quote: amount=${accept.amount} wei, payTo=${accept.payTo}, network=${accept.network}`);
  hunterDebug(`quote requestHash=${quote.paymentContext.requestHash}`);
  emitTrace(options, "quote_received", {
    requestHash: quote.paymentContext.requestHash,
    amount: accept.amount,
    payTo: accept.payTo,
    network: accept.network
  });
  emitTrace(options, "payment_state", {
    status: "payment-required",
    requestHash: quote.paymentContext.requestHash,
    amount: accept.amount,
    payTo: accept.payTo,
    network: accept.network
  });

  await checkBalanceTool();
  hunterLog(`payment: sending ${accept.amount} wei to ${accept.payTo}...`);
  const payment = await makePaymentTool(accept);
  hunterLog(`payment: submitted tx=${payment.txHash}`);
  emitTrace(options, "payment_state", {
    status: "payment-submitted",
    txHash: payment.txHash
  });

  hunterLog(`execute: submitting payment proof to ${selectedService.id}...`);
  const execution = await submitPaymentAndGetResult({
    service: selectedService,
    paymentTx: payment.txHash,
    taskType: quote.paymentContext.taskType,
    taskInput: goal,
    timestamp: quote.paymentContext.timestamp
  });
  hunterLog(`execute: result received (${execution.result.length} chars), payment=${execution.payment.status}`);
  hunterDebug(`execute: result preview: "${execution.result.slice(0, 200)}..."`);
  emitTrace(options, "payment_state", {
    status: execution.payment.status,
    txHash: execution.payment.transaction,
    network: execution.payment.network
  });

  const receiptCheck = verifyReceiptTool(execution.receipt);
  emitTrace(options, "receipt_verified", {
    isValid: receiptCheck.isValid,
    provider: execution.receipt.provider,
    requestHash: execution.receipt.requestHash
  });
  if (!receiptCheck.isValid) {
    hunterError(`verify: receipt INVALID for ${execution.receipt.requestHash}`);
    throw new HunterError(422, "RECEIPT_INVALID", "Receipt signature verification failed");
  }
  hunterLog(`verify: receipt valid ✓`);
  const evaluation = evaluateResultTool(execution.result);
  hunterLog(`evaluate: score=${evaluation.score}/10 summary="${evaluation.summary}"`);
  emitTrace(options, "evaluation_completed", evaluation);

  try {
    const feedback = await submitAutoFeedback({
      service: selectedService,
      evaluation,
      missionId,
      taskType: quote.paymentContext.taskType
    });
    emitTrace(options, "feedback_submitted", feedback);
    hunterLog(`feedback: submitted for ${selectedService.id} (score=${evaluation.score})`);
  } catch (err) {
    hunterWarn(`feedback: submission failed (best-effort) — ${err instanceof Error ? err.message : String(err)}`);
  }
  const reflection = await reflectAndStoreExperience({
    missionId,
    goal,
    serviceUsed: selectedService.id,
    taskType: quote.paymentContext.taskType,
    score: evaluation.score,
    result: execution.result,
    evaluationSummary: evaluation.summary
  });
  emitTrace(options, "tool_result", {
    tool: "reflect",
    result: {
      missionId: reflection.missionId,
      taskType: reflection.taskType,
      score: reflection.score,
      lesson: reflection.lesson
    }
  });

  const runResult: SingleHunterRunResult = {
    goal,
    mode: "scripted",
    service: selectedService,
    quote,
    paymentTx: payment.txHash,
    execution,
    receiptVerified: receiptCheck.isValid,
    evaluation,
    reflection,
    finalMessage: "Scripted flow completed successfully."
  };
  if (emitLifecycleEvents) {
    emitTrace(options, "run_completed", {
      mode: runResult.mode,
      receiptVerified: runResult.receiptVerified,
      score: runResult.evaluation.score
    });
  }
  hunterLog(`--- executePhase done --- score=${evaluation.score}/10 service=${selectedService.id}`);
  return runResult;
}

export async function runScriptedHunter(
  goal: string,
  options: HunterRunOptions = {}
): Promise<SingleHunterRunResult> {
  return executePhase(goal, options, {
    emitLifecycleEvents: true
  });
}
