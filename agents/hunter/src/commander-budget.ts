import {
  DEFAULT_LANGUAGE_CODE,
  localizeByLocale,
  type CommanderBudget,
  type LanguageCode
} from "@rebel/shared";
import { HunterError } from "./errors.js";

const DEFAULT_MAX_PHASES = 6;
const DEFAULT_MAX_TOTAL_WEI = "60000000000000000";
const DEFAULT_MAX_PER_PHASE_WEI = "20000000000000000";

function parsePositiveInt(raw: string | undefined, fallback: number): number {
  if (!raw || raw.trim().length === 0) {
    return fallback;
  }
  const parsed = Number(raw);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    return fallback;
  }
  return parsed;
}

function parseWei(raw: string | undefined, fallback: string): string {
  if (!raw || raw.trim().length === 0) {
    return fallback;
  }
  const trimmed = raw.trim();
  return /^\d+$/.test(trimmed) ? trimmed : fallback;
}

export function asWei(value: string): bigint {
  if (!/^\d+$/.test(value)) {
    throw new HunterError(500, "COMMANDER_INVALID_WEI", `Invalid wei amount: ${value}`);
  }
  return BigInt(value);
}

export function addWei(a: string, b: string): string {
  return (asWei(a) + asWei(b)).toString();
}

export function formatCommanderMon(wei: string): string {
  const amount = asWei(wei);
  const base = 10n ** 18n;
  const whole = amount / base;
  const frac = amount % base;
  if (frac === 0n) {
    return whole.toString();
  }
  const fracText = frac.toString().padStart(18, "0").replace(/0+$/, "");
  return `${whole.toString()}.${fracText.slice(0, 4)}`;
}

export function buildCommanderBudget(env: NodeJS.ProcessEnv = process.env): CommanderBudget {
  return {
    maxTotalWei: parseWei(env.COMMANDER_MAX_TOTAL_WEI, DEFAULT_MAX_TOTAL_WEI),
    maxPerPhaseWei: parseWei(env.COMMANDER_MAX_PER_PHASE_WEI, DEFAULT_MAX_PER_PHASE_WEI),
    maxPhases: parsePositiveInt(env.COMMANDER_MAX_PHASES, DEFAULT_MAX_PHASES),
    spentWei: "0",
    phaseCount: 0
  };
}

export function getCommanderBudgetBlockReason(input: {
  budget: CommanderBudget;
  stopReason?: string;
  locale?: LanguageCode;
}): string | null {
  const { budget, stopReason, locale = DEFAULT_LANGUAGE_CODE } = input;
  if (stopReason) {
    return stopReason;
  }
  if (budget.phaseCount >= budget.maxPhases) {
    return localizeByLocale(locale, {
      en: `Phase limit reached (${budget.maxPhases}).`,
      zh: `已达到阶段上限（${budget.maxPhases}）。`
    });
  }
  if (asWei(budget.spentWei) >= asWei(budget.maxTotalWei)) {
    return localizeByLocale(locale, {
      en: `Total budget exhausted (${formatCommanderMon(budget.maxTotalWei)} MON).`,
      zh: `总预算已耗尽（${formatCommanderMon(budget.maxTotalWei)} MON）。`
    });
  }
  return null;
}

export function applyCommanderPhaseSpend(input: {
  budget: CommanderBudget;
  phaseSpentWei: string;
  stopReason?: string;
  locale?: LanguageCode;
}): { budget: CommanderBudget; stopReason?: string } {
  const { budget, phaseSpentWei, stopReason, locale = DEFAULT_LANGUAGE_CODE } = input;
  const nextBudget: CommanderBudget = {
    ...budget,
    phaseCount: budget.phaseCount + 1,
    spentWei: addWei(budget.spentWei, phaseSpentWei)
  };

  if (stopReason) {
    return { budget: nextBudget, stopReason };
  }
  if (asWei(phaseSpentWei) > asWei(nextBudget.maxPerPhaseWei)) {
    return {
      budget: nextBudget,
      stopReason: localizeByLocale(locale, {
        en: `Phase spend ${formatCommanderMon(phaseSpentWei)} MON exceeds per-phase limit ${formatCommanderMon(
          nextBudget.maxPerPhaseWei
        )} MON.`,
        zh: `单阶段花费 ${formatCommanderMon(phaseSpentWei)} MON 超过单阶段上限 ${formatCommanderMon(
          nextBudget.maxPerPhaseWei
        )} MON。`
      })
    };
  }
  if (asWei(nextBudget.spentWei) >= asWei(nextBudget.maxTotalWei)) {
    return {
      budget: nextBudget,
      stopReason: localizeByLocale(locale, {
        en: `Total spend reached ${formatCommanderMon(nextBudget.spentWei)} MON (limit ${formatCommanderMon(
          nextBudget.maxTotalWei
        )} MON).`,
        zh: `总花费已达到 ${formatCommanderMon(nextBudget.spentWei)} MON（上限 ${formatCommanderMon(
          nextBudget.maxTotalWei
        )} MON）。`
      })
    };
  }
  return { budget: nextBudget };
}
