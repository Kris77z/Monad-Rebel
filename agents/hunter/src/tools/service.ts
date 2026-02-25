import type {
  ErrorResponse,
  ExecuteSuccessResponse,
  PaymentRequiredResponse,
  ServiceInfo
} from "@rebel/shared";
import { HunterError } from "../errors.js";

interface RequestServiceInput {
  service: ServiceInfo;
  taskType: string;
  taskInput: string;
}

interface RequestServiceWithFallbackInput {
  services: ServiceInfo[];
  taskType: string;
  taskInput: string;
}

function normalizeEndpoint(endpoint: string): string {
  return endpoint.endsWith("/") ? endpoint.slice(0, -1) : endpoint;
}

async function parseErrorPayload(response: Response): Promise<ErrorResponse | undefined> {
  try {
    const payload = (await response.json()) as ErrorResponse;
    return payload;
  } catch {
    return undefined;
  }
}

export async function requestServiceQuote(
  input: RequestServiceInput
): Promise<PaymentRequiredResponse> {
  const response = await fetch(`${normalizeEndpoint(input.service.endpoint)}/execute`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      taskType: input.taskType,
      taskInput: input.taskInput
    })
  });

  if (response.status !== 402) {
    const errorPayload = await parseErrorPayload(response);
    throw new HunterError(
      response.status,
      errorPayload?.code ?? "QUOTE_REQUEST_FAILED",
      errorPayload?.message ?? `Expected 402 response, got ${response.status}`,
      errorPayload?.details
    );
  }

  return (await response.json()) as PaymentRequiredResponse;
}

export async function requestServiceQuoteWithFallback(
  input: RequestServiceWithFallbackInput
): Promise<{
  service: ServiceInfo;
  quote: PaymentRequiredResponse;
  attempts: Array<{ serviceId: string; ok: boolean; error?: string }>;
}> {
  const attempts: Array<{ serviceId: string; ok: boolean; error?: string }> = [];
  let lastError: unknown;

  for (const service of input.services) {
    try {
      const quote = await requestServiceQuote({
        service,
        taskType: input.taskType,
        taskInput: input.taskInput
      });
      attempts.push({ serviceId: service.id, ok: true });
      return {
        service,
        quote,
        attempts
      };
    } catch (error) {
      attempts.push({
        serviceId: service.id,
        ok: false,
        error: error instanceof Error ? error.message : String(error)
      });
      lastError = error;
    }
  }

  if (lastError instanceof Error) {
    throw lastError;
  }
  throw new HunterError(502, "QUOTE_REQUEST_FAILED", "No service responded with a valid quote");
}

export async function submitPaymentAndGetResult(input: {
  service: ServiceInfo;
  paymentTx: string;
  taskType: string;
  taskInput: string;
  timestamp: number;
}): Promise<ExecuteSuccessResponse> {
  const response = await fetch(`${normalizeEndpoint(input.service.endpoint)}/execute`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      paymentTx: input.paymentTx,
      taskType: input.taskType,
      taskInput: input.taskInput,
      timestamp: input.timestamp
    })
  });

  if (!response.ok) {
    const errorPayload = await parseErrorPayload(response);
    throw new HunterError(
      response.status,
      errorPayload?.code ?? "PAYMENT_SUBMIT_FAILED",
      errorPayload?.message ?? `submit_payment failed with ${response.status}`,
      errorPayload?.details
    );
  }

  return (await response.json()) as ExecuteSuccessResponse;
}
