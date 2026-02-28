export type LanguageCode = "zh-CN" | "en-US";

export const DEFAULT_LANGUAGE_CODE: LanguageCode = "en-US";

export interface PaymentContext {
  requestHash: string;
  taskType: string;
  timestamp: number;
}

export interface ErrorResponse {
  code: string;
  message: string;
  details?: unknown;
}

export interface NativeTransferAccept {
  scheme: "native-transfer";
  network: string;
  amount: string;
  asset: "native";
  payTo: string;
  maxTimeoutSeconds: number;
}

export interface PaymentRequiredResponse {
  x402Version: 2;
  resource: {
    url: string;
    description: string;
  };
  accepts: NativeTransferAccept[];
  paymentContext: PaymentContext;
}

export interface ExecuteRequest {
  taskType?: string;
  taskInput?: string;
  timestamp?: number;
  paymentTx?: string;
  locale?: LanguageCode;
}

export interface HunterRunRequest {
  goal?: string;
  mode?: HunterRunRequestMode;
  locale?: LanguageCode;
}

export interface Receipt {
  requestHash: string;
  resultHash: string;
  provider: string;
  timestamp: number;
  signature: string;
}

export interface PaymentCompleted {
  status: "payment-completed";
  transaction: string;
  network: string;
}

export interface ExecuteSuccessResponse {
  result: string;
  receipt: Receipt;
  payment: PaymentCompleted;
}

export type ServiceReputationTrend = "up" | "down" | "stable";

export interface ServiceReputation {
  score: number;
  count: number;
  trend: ServiceReputationTrend;
  recentScores: number[];
  lastUsedAt: number;
  qualified: boolean;
}

export interface ServiceInfo {
  id: string;
  name: string;
  description: string;
  endpoint: string;
  taskType?: string;
  skills?: string[];
  reputation?: ServiceReputation;
  price: string;
  currency: "MON";
  network: string;
  provider: string;
}

export interface ServiceRegistry {
  services: ServiceInfo[];
}

export interface AgentCapability {
  type: "mcp" | "a2a" | "oasf";
  endpoint?: string;
  skills?: string[];
  tools?: string[];
}

export interface AgentIdentity {
  agentId: string;
  name: string;
  description: string;
  image?: string;
  walletAddress: string;
  capabilities: AgentCapability[];
  trustModels: string[];
  active: boolean;
  registeredAt: number;
}

export interface AgentFeedback {
  agentId: string;
  reviewer: string;
  value: number;
  tags: string[];
  text?: string;
  timestamp: number;
}

export type HunterRunRequestMode = "single" | "commander";

export type HunterServiceTaskType =
  | "content-generation"
  | "smart-contract-audit"
  | "defi-analysis"
  | "gas-optimization"
  | "token-scan"
  | "tx-decode"
  | "abi-interact"
  | "yield-search";

export interface CommanderPhase {
  name: string;
  taskType: HunterServiceTaskType;
  goal: string;
}

export interface CommanderPhaseResult {
  index: number;
  phase: CommanderPhase;
  success: boolean;
  content: string;
  error?: string;
}

export interface CommanderBudget {
  maxTotalWei: string;
  maxPerPhaseWei: string;
  maxPhases: number;
  spentWei: string;
  phaseCount: number;
}

export type HunterTraceEventType =
  | "run_started"
  | "mission_decomposed"
  | "phase_started"
  | "phase_completed"
  | "services_discovered"
  | "service_selected"
  | "quote_received"
  | "payment_state"
  | "execution_started"
  | "execution_heartbeat"
  | "tool_call"
  | "tool_result"
  | "receipt_verified"
  | "evaluation_completed"
  | "feedback_submitted"
  | "llm_response"
  | "run_completed"
  | "run_failed";

export interface HunterTraceEvent {
  type: HunterTraceEventType;
  at: string;
  data?: unknown;
}
