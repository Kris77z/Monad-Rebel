import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { CommanderBudget } from "@rebel/shared";
import { runCommanderHunter } from "./commander-flow.js";
import type { SingleHunterRunResult } from "./run-types.js";

function mockSingleResult(input: {
  amountWei: string;
  content: string;
  taskType?: string;
  serviceId?: string;
}): SingleHunterRunResult {
  const taskType = input.taskType ?? "content-generation";
  const serviceId = input.serviceId ?? "writer-v1";
  return {
    goal: "mock-goal",
    mode: "scripted",
    service: {
      id: serviceId,
      name: serviceId,
      description: "mock",
      endpoint: "http://localhost/mock",
      taskType,
      skills: [taskType],
      price: input.amountWei,
      currency: "MON",
      network: "monad-testnet",
      provider: "mock"
    },
    quote: {
      x402Version: 2,
      resource: {
        url: "http://localhost/mock",
        description: "mock"
      },
      accepts: [
        {
          scheme: "native-transfer",
          network: "monad-testnet",
          amount: input.amountWei,
          asset: "native",
          payTo: "0x0000000000000000000000000000000000000001",
          maxTimeoutSeconds: 60
        }
      ],
      paymentContext: {
        requestHash: "0xrequest",
        taskType,
        timestamp: Date.now()
      }
    },
    paymentTx: "0xtx",
    execution: {
      result: input.content,
      receipt: {
        requestHash: "0xrequest",
        resultHash: "0xresult",
        provider: "mock",
        timestamp: Date.now(),
        signature: "0xsig"
      },
      payment: {
        status: "payment-completed",
        transaction: "0xtx",
        network: "monad-testnet"
      }
    },
    receiptVerified: true,
    evaluation: {
      score: 8,
      summary: "ok"
    },
    finalMessage: "mock complete"
  };
}

function mockBudget(overrides: Partial<CommanderBudget> = {}): CommanderBudget {
  return {
    maxTotalWei: "100",
    maxPerPhaseWei: "100",
    maxPhases: 6,
    spentWei: "0",
    phaseCount: 0,
    ...overrides
  };
}

describe("runCommanderHunter regression", () => {
  it("stops further hiring when budget is exceeded", async () => {
    const events: Array<{ type: string; data?: unknown }> = [];
    const toolOutputs: unknown[] = [];
    const result = await runCommanderHunter(
      "test mission",
      {
        onEvent: (event) => {
          events.push({ type: event.type, data: event.data });
        }
      },
      {
        llm: {
          provider: "openai",
          apiKey: "test-key",
          model: "test-model"
        },
        createMissionId: () => "mission-budget",
        buildBudget: () => mockBudget({ maxTotalWei: "10", maxPerPhaseWei: "100" }),
        executePhase: async () => mockSingleResult({ amountWei: "12", content: "phase-1" }),
        runScriptedHunter: async () => {
          throw new Error("runScriptedHunter should not be called");
        },
        runPlanner: async ({ hireAgentSpec }) => {
          toolOutputs.push(await hireAgentSpec.execute({ goal: "phase one" }));
          toolOutputs.push(await hireAgentSpec.execute({ goal: "phase two" }));
          return "planner finished";
        }
      }
    );

    assert.equal(result.mode, "commander");
    assert.equal(result.phases.length, 1);
    assert.equal(result.phases[0].success, true);
    assert.equal(result.budget.spentWei, "12");
    assert.equal(result.budget.phaseCount, 1);

    const secondTool = toolOutputs[1] as { blocked?: boolean; reason?: string };
    assert.equal(secondTool.blocked, true);
    assert.match(secondTool.reason ?? "", /Total spend reached|Total budget exhausted/);

    const phaseStartedCount = events.filter((event) => event.type === "phase_started").length;
    assert.equal(phaseStartedCount, 1);
  });

  it("keeps running after a failed phase and returns successful latest result", async () => {
    const calls: string[] = [];
    const result = await runCommanderHunter(
      "test mission",
      {},
      {
        llm: {
          provider: "openai",
          apiKey: "test-key",
          model: "test-model"
        },
        createMissionId: () => "mission-fail-continue",
        buildBudget: () => mockBudget(),
        executePhase: async (goal) => {
          calls.push(goal);
          if (calls.length === 1) {
            throw new Error("phase-1-failed");
          }
          return mockSingleResult({ amountWei: "5", content: "phase-2-success", serviceId: "auditor-v1" });
        },
        runScriptedHunter: async () => {
          throw new Error("runScriptedHunter should not be called");
        },
        runPlanner: async ({ hireAgentSpec }) => {
          await hireAgentSpec.execute({ goal: "first attempt" });
          await hireAgentSpec.execute({ goal: "second attempt" });
          return "planner finished";
        }
      }
    );

    assert.equal(result.mode, "commander");
    assert.equal(result.phases.length, 2);
    assert.equal(result.phases[0].success, false);
    assert.match(result.phases[0].error ?? "", /phase-1-failed/);
    assert.equal(result.phases[1].success, true);
    assert.equal(result.execution.result, "phase-2-success");
    assert.equal(result.service.id, "auditor-v1");
  });

  it("falls back to a single phase when planner does not hire any agent", async () => {
    const phaseGoals: string[] = [];
    const events: string[] = [];
    const result = await runCommanderHunter(
      "fallback mission",
      {
        onEvent: (event) => {
          events.push(event.type);
        }
      },
      {
        llm: {
          provider: "openai",
          apiKey: "test-key",
          model: "test-model"
        },
        createMissionId: () => "mission-fallback",
        buildBudget: () => mockBudget(),
        executePhase: async (goal) => {
          phaseGoals.push(goal);
          return mockSingleResult({ amountWei: "7", content: "fallback-result", serviceId: "writer-v1" });
        },
        runScriptedHunter: async () => {
          throw new Error("runScriptedHunter should not be called");
        },
        runPlanner: async () => "planner decided no tool"
      }
    );

    assert.equal(result.mode, "commander");
    assert.equal(result.phases.length, 1);
    assert.equal(result.phases[0].phase.name, "Fallback Phase");
    assert.equal(result.execution.result, "fallback-result");
    assert.equal(phaseGoals[0], "fallback mission");
    assert.ok(events.includes("phase_started"));
    assert.ok(events.includes("phase_completed"));
  });

  it("marks timed-out phases as failed and allows retry to continue", async () => {
    let callCount = 0;
    const result = await runCommanderHunter(
      "timeout mission",
      {},
      {
        llm: {
          provider: "openai",
          apiKey: "test-key",
          model: "test-model"
        },
        createMissionId: () => "mission-timeout-retry",
        buildBudget: () => mockBudget(),
        phaseTimeoutMs: 20,
        executePhase: async () => {
          callCount += 1;
          if (callCount === 1) {
            await new Promise((resolve) => setTimeout(resolve, 50));
            return mockSingleResult({ amountWei: "4", content: "late-phase-result" });
          }
          return mockSingleResult({ amountWei: "6", content: "retry-success", serviceId: "auditor-v1" });
        },
        runScriptedHunter: async () => {
          throw new Error("runScriptedHunter should not be called");
        },
        runPlanner: async ({ hireAgentSpec }) => {
          await hireAgentSpec.execute({ goal: "scan token risk" });
          await hireAgentSpec.execute({ goal: "scan token risk" });
          return "planner finished";
        }
      }
    );

    assert.equal(result.mode, "commander");
    assert.equal(result.phases.length, 2);
    assert.equal(result.phases[0].success, false);
    assert.match(result.phases[0].error ?? "", /timed out/i);
    assert.equal(result.phases[1].success, true);
    assert.equal(result.execution.result, "retry-success");
    assert.equal(result.service.id, "auditor-v1");
  });

  it("stops further hiring when run signal is interrupted", async () => {
    const controller = new AbortController();
    const toolOutputs: unknown[] = [];
    const result = await runCommanderHunter(
      "interrupt mission",
      {
        signal: controller.signal
      },
      {
        llm: {
          provider: "openai",
          apiKey: "test-key",
          model: "test-model"
        },
        createMissionId: () => "mission-interrupt",
        buildBudget: () => mockBudget(),
        executePhase: async () => mockSingleResult({ amountWei: "5", content: "phase-1-success" }),
        runScriptedHunter: async () => {
          throw new Error("runScriptedHunter should not be called");
        },
        runPlanner: async ({ hireAgentSpec }) => {
          toolOutputs.push(await hireAgentSpec.execute({ goal: "first phase" }));
          controller.abort("manual_stop");
          toolOutputs.push(await hireAgentSpec.execute({ goal: "second phase" }));
          return "planner finished";
        }
      }
    );

    const secondTool = toolOutputs[1] as { blocked?: boolean; reason?: string };
    assert.equal(secondTool.blocked, true);
    assert.match(secondTool.reason ?? "", /interrupted/i);

    assert.equal(result.mode, "commander");
    assert.equal(result.phases.length, 1);
    assert.equal(result.phases[0].success, true);
    assert.match(result.finalMessage, /interrupted/i);
  });

  it("throws interruption error when aborted before any phase starts", async () => {
    const controller = new AbortController();
    controller.abort("manual_stop");

    await assert.rejects(
      runCommanderHunter(
        "abort mission",
        {
          signal: controller.signal
        },
        {
          llm: {
            provider: "openai",
            apiKey: "test-key",
            model: "test-model"
          },
          createMissionId: () => "mission-interrupt-early",
          buildBudget: () => mockBudget(),
          executePhase: async () => mockSingleResult({ amountWei: "5", content: "should-not-run" }),
          runScriptedHunter: async () => {
            throw new Error("runScriptedHunter should not be called");
          },
          runPlanner: async () => {
            throw new Error("runPlanner should not be called");
          }
        }
      ),
      /COMMANDER_INTERRUPTED|interrupted/i
    );
  });
});
