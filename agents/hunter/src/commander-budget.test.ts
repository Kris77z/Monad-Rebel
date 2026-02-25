import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  applyCommanderPhaseSpend,
  buildCommanderBudget,
  getCommanderBudgetBlockReason
} from "./commander-budget.js";

describe("commander-budget", () => {
  it("buildCommanderBudget returns defaults", () => {
    const budget = buildCommanderBudget({});
    assert.equal(budget.maxPhases, 6);
    assert.equal(budget.maxPerPhaseWei, "20000000000000000");
    assert.equal(budget.maxTotalWei, "60000000000000000");
    assert.equal(budget.spentWei, "0");
    assert.equal(budget.phaseCount, 0);
  });

  it("buildCommanderBudget ignores invalid env values", () => {
    const budget = buildCommanderBudget({
      COMMANDER_MAX_PHASES: "0",
      COMMANDER_MAX_PER_PHASE_WEI: "abc",
      COMMANDER_MAX_TOTAL_WEI: "-1"
    });
    assert.equal(budget.maxPhases, 6);
    assert.equal(budget.maxPerPhaseWei, "20000000000000000");
    assert.equal(budget.maxTotalWei, "60000000000000000");
  });

  it("buildCommanderBudget accepts valid env overrides", () => {
    const budget = buildCommanderBudget({
      COMMANDER_MAX_PHASES: "9",
      COMMANDER_MAX_PER_PHASE_WEI: "120",
      COMMANDER_MAX_TOTAL_WEI: "550"
    });
    assert.equal(budget.maxPhases, 9);
    assert.equal(budget.maxPerPhaseWei, "120");
    assert.equal(budget.maxTotalWei, "550");
  });

  it("getCommanderBudgetBlockReason checks phase and total limits", () => {
    assert.equal(
      getCommanderBudgetBlockReason({
        budget: {
          maxPhases: 2,
          phaseCount: 2,
          maxPerPhaseWei: "10",
          maxTotalWei: "100",
          spentWei: "20"
        }
      }),
      "Phase limit reached (2)."
    );
    assert.match(
      getCommanderBudgetBlockReason({
        budget: {
          maxPhases: 5,
          phaseCount: 2,
          maxPerPhaseWei: "10",
          maxTotalWei: "100",
          spentWei: "100"
        }
      }) ?? "",
      /Total budget exhausted/
    );
  });

  it("applyCommanderPhaseSpend increments counters", () => {
    const updated = applyCommanderPhaseSpend({
      budget: {
        maxPhases: 6,
        phaseCount: 1,
        maxPerPhaseWei: "100",
        maxTotalWei: "1000",
        spentWei: "90"
      },
      phaseSpentWei: "10"
    });
    assert.equal(updated.budget.phaseCount, 2);
    assert.equal(updated.budget.spentWei, "100");
    assert.equal(updated.stopReason, undefined);
  });

  it("applyCommanderPhaseSpend flags per-phase and total overrun", () => {
    const perPhase = applyCommanderPhaseSpend({
      budget: {
        maxPhases: 6,
        phaseCount: 0,
        maxPerPhaseWei: "50",
        maxTotalWei: "1000",
        spentWei: "0"
      },
      phaseSpentWei: "80"
    });
    assert.match(perPhase.stopReason ?? "", /per-phase limit/);

    const total = applyCommanderPhaseSpend({
      budget: {
        maxPhases: 6,
        phaseCount: 0,
        maxPerPhaseWei: "100",
        maxTotalWei: "90",
        spentWei: "50"
      },
      phaseSpentWei: "40"
    });
    assert.match(total.stopReason ?? "", /Total spend reached/);
  });
});
