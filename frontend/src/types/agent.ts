/**
 * Agent types aligned with Hunter backend (react-engine.ts)
 * 
 * The `done` SSE event sends a HunterRunResult which nests actual content
 * inside `execution.result`, not at the top level.
 */

export interface AgentEvent {
  type: string;
  at: string;
  data?: unknown;
}

export type RunRequestMode = 'single' | 'commander';

export type ServiceTaskType =
  | 'content-generation'
  | 'smart-contract-audit'
  | 'defi-analysis'
  | 'gas-optimization'
  | 'token-scan'
  | 'tx-decode'
  | 'abi-interact'
  | 'yield-search';

/** Matches ExecuteSuccessResponse from backend */
export interface ExecutionResult {
  result: string;
  receipt: {
    requestHash: string;
    resultHash: string;
    provider: string;
    timestamp: number;
    signature: string;
  };
  payment: {
    status: string;
    transaction: string;
    network: string;
  };
}

export interface CommanderPhase {
  name: string;
  taskType: ServiceTaskType;
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

/**
 * Matches HunterRunResult from agents/hunter/src/react-engine.ts
 * This is the payload of the SSE `done` event.
 */
export interface HunterRunResult {
  goal: string;
  mode: 'scripted' | 'react' | 'commander';
  service: {
    id: string;
    name: string;
    endpoint: string;
    price: string;
    taskType?: string;
    skills?: string[];
    reputation?: {
      score: number;
      count: number;
      trend: 'up' | 'down' | 'stable';
      recentScores: number[];
      lastUsedAt: number;
      qualified: boolean;
    };
  };
  quote: Record<string, unknown>;
  paymentTx: string;
  execution: ExecutionResult;
  receiptVerified: boolean;
  evaluation: {
    score: number;
    summary: string;
  };
  reflection?: {
    missionId: string;
    goal: string;
    serviceUsed: string;
    taskType: string;
    score: number;
    lesson: string;
    timestamp: number;
  };
  finalMessage: string;
  phases?: CommanderPhaseResult[];
  budget?: CommanderBudget;
}

export type PaymentStatus =
  | 'payment-required'
  | 'payment-submitted'
  | 'payment-completed'
  | 'payment-rejected'
  | 'payment-failed';
