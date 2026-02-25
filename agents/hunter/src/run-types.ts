import type {
  CommanderBudget,
  CommanderPhaseResult,
  ExecuteSuccessResponse,
  PaymentRequiredResponse,
  ServiceInfo
} from "@rebel/shared";
import type { Experience } from "./memory.js";

interface BaseHunterRunResult {
  goal: string;
  service: ServiceInfo;
  quote: PaymentRequiredResponse;
  paymentTx: string;
  execution: ExecuteSuccessResponse;
  receiptVerified: boolean;
  evaluation: {
    score: number;
    summary: string;
  };
  reflection?: Experience;
  finalMessage: string;
}

export interface SingleHunterRunResult extends BaseHunterRunResult {
  mode: "scripted" | "react";
}

export interface CommanderHunterRunResult extends BaseHunterRunResult {
  mode: "commander";
  phases: CommanderPhaseResult[];
  budget: CommanderBudget;
}

export type HunterRunResult = SingleHunterRunResult | CommanderHunterRunResult;
