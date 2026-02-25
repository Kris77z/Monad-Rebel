# Commander Mode — 指挥官模式设计文档

> Rebel Agent 从"单任务执行者"进化为"自主任务编排者"
>
> 实施状态（2026-02-25）：V2 ReAct 自主编排已落地（含 budget、超时/中断控制与回归测试）；P1 动效细化待补充

---

## 1. 背景与动机

### 1.1 当前状态

MVP 已完成单任务闭环：

```
User Goal → Discover → Select → Pay → Execute → Verify → Done
```

8 个 Skill Agent 已注册，Reputation 系统已上线。但每次只能调用 **1 个** Agent 完成 **1 件事**。

### 1.2 问题

真实世界的任务往往是复合的：

- "分析这个 token 合约的安全性和投资价值" → 需要 Scanner + Analyst + Writer
- "优化这个合约的 gas 消耗并审计安全性" → 需要 Gas Optimizer + Auditor
- "解码这笔交易并评估涉及的 DeFi 协议风险" → 需要 Tx Decoder + DeFi Analyst

单任务模式无法处理这类需求。

### 1.3 灵感来源

参考 [awesome-claude-code-subagents](https://github.com/VoltAgent/awesome-claude-code-subagents) 的 Meta & Orchestration 模式：

| 概念 | Claude Subagents | Rebel Agent Mesh |
|:--|:--|:--|
| 主 Agent | Claude Code | Rebel Agent（指挥官） |
| Sub Agent | 127+ `.md` 定义的 subagent | 8 个 Skill Agent（`prompt.md` + `config.json`） |
| 协调层 | `multi-agent-coordinator` | `commander-flow.ts` |
| **关键差异** | 免费调用 | **每次调用 = 链上支付 + 验证 + 声誉反馈** |

**我们的独特价值：不只是 Agent 协作，是 Agent 之间的经济协作。**

---

## 2. 核心设计

### 2.1 指挥官模式流程

```
User Mission (复合目标)
       │
       ▼
┌──────────────────────────────────────┐
│ ReAct Loop                           │
│ THINK: 判断是否需要下一步             │
│ ACT: 调用 hire_agent(goal, type?)    │
│ OBSERVE: phase 结果 + budget 消耗      │
│ THINK: 继续 / 停止                    │
└──────────────────────────────────────┘
       │
       ├─ 继续：进入下一轮 hire_agent
       └─ 停止：输出综合结论（done）
```

### 2.2 设计原则

1. **ReAct 自主决策**：不预先固定 phase 列表，由 LLM 按工具调用动态追加
2. **最大复用**：每次 `hire_agent` 内部仍复用 `executePhase`，不重写支付执行链路
3. **费用可控**：`maxPhases`、`maxPerPhaseWei`、`maxTotalWei` 三重硬约束
4. **优雅降级**：若 planner 未调用工具，自动执行一次 fallback phase
5. **向后兼容**：`/run` 与 `/run/stream` 仍用 `mode=commander` 启用

---

## 3. 具体示例

### 示例 1：Token 安全 + 投资分析

**用户输入：** "分析 Monad 上这个 token 合约，评估安全性和投资价值"

**一次可能的 ReAct 规划输出（示例）：**

```json
{
  "phases": [
    {
      "name": "Security Scan",
      "taskType": "token-scan",
      "goal": "Scan this token contract for security risks: hidden mints, blacklists, proxy patterns"
    },
    {
      "name": "DeFi Analysis",
      "taskType": "defi-analysis",
      "goal": "Analyze the investment value of this token, considering TVL, liquidity, and market position"
    },
    {
      "name": "Comprehensive Report",
      "taskType": "content-generation",
      "goal": "Write a comprehensive report combining security findings and investment analysis"
    }
  ]
}
```

**执行流程：**

```
Phase 1: token-scanner → 安全报告（risk score: 35/100）
    ↓ context
Phase 2: defi-analyst → 投资分析（参考安全报告）
    ↓ context
Phase 3: writer → 综合报告（合并所有结果）
```

### 示例 2：合约优化

**用户输入：** "优化这个 Solidity 合约的 gas 消耗，然后审计修改后的安全性"

```json
{
  "phases": [
    {
      "name": "Gas Optimization",
      "taskType": "gas-optimization",
      "goal": "Analyze and optimize gas usage: storage packing, loop optimization, assembly shortcuts"
    },
    {
      "name": "Security Audit",
      "taskType": "smart-contract-audit",
      "goal": "Audit the optimized contract for security vulnerabilities introduced by gas optimizations"
    }
  ]
}
```

---

## 4. 后端实现（当前）

### 4.1 核心文件

```
agents/hunter/src/commander-flow.ts        ← ReAct 指挥循环（hire_agent）
agents/hunter/src/commander-budget.ts      ← budget 计算与阻断规则
agents/hunter/src/run-types.ts             ← commander 结果（含 budget）
agents/hunter/src/index.ts                 ← SSE 断连中断（AbortSignal）
agents/hunter/src/trace-emitter.ts         ← run options（onEvent + signal）
agents/hunter/src/commander-budget.test.ts ← budget 单元测试
agents/hunter/src/commander-flow.test.ts   ← commander 全链路回归测试
```

### 4.2 关联修改

```
agents/hunter/src/scripted-flow.ts  ← `executePhase` 作为子任务执行器
agents/hunter/src/index.ts          ← /run 与 /run/stream 支持 requestMode + stream disconnect abort
agents/hunter/src/react-engine.ts   ← runHunter 路由 commander 请求
shared/src/types.ts                 ← 新增 `CommanderBudget` 类型
```

### 4.3 核心逻辑

#### `commander-flow.ts`（ReAct 伪代码）

```typescript
const hireAgent = tool({
  parameters: { goal, name?, preferredType? },
  execute: async ({ goal, ...meta }) => {
    // budget 检查
    // interrupt(signal) 检查
    // emit phase_started
    // run executePhase(goal + context) with timeout
    // emit phase_completed
    // 更新 spentWei / phaseCount
  }
});

const finalText = await generateText({
  prompt: missionGoal,
  tools: { hire_agent: hireAgent },
  maxSteps: 12
});

if (noPhaseExecuted) {
  // fallback phase
}
```

> 当前实现说明：
>
> - `runCommanderHunter` 通过 ReAct planner 自主调用 `hire_agent`
> - 每个 `hire_agent` 调用内部复用 `executePhase(..., { emitLifecycleEvents: false })`
> - budget 由 `commander-budget.ts` 统一处理
> - 每个 phase 受 `COMMANDER_PHASE_TIMEOUT_MS` 限制（默认 45000ms）
> - `/run/stream` 连接断开时通过 `AbortSignal` 中断后续 phase（best-effort）
> - planner 不调用工具时会进入单次 fallback phase
> - 最终 `done` payload：`mode=commander`，附带 `phases[] + budget`

### 4.4 SSE 事件扩展

当前 commander 主要事件：

| 事件类型 | 触发时机 | data 结构 |
|:--|:--|:--|
| `mission_decomposed` | commander 初始化 | `{ phases: [], strategy: "react-autonomous", budget, phaseTimeoutMs }` |
| `phase_started` | Phase N 开始 | `{ index, name, taskType, goal }` |
| `phase_completed` | Phase N 完成 | `{ index, name, taskType, content, error? }` |

phase 内部仍会发标准事件：`services_discovered`、`service_selected`、`quote_received`、`payment_state`、`receipt_verified` 等。

### 4.5 API 变更

```http
POST /run
{
  "goal": "分析这个 token 合约的安全性和投资价值",
  "mode": "commander"   // 新增，可选值: "single" | "commander"，默认 "single"
}
```

```http
GET /run/stream?goal=...&mode=commander
```

SSE `ready` 事件当前返回：

```json
{
  "mode": "scripted | react",
  "agentMode": "scripted | react",
  "requestMode": "single | commander",
  "goal": "..."
}
```

补充说明：

- 当 stream 客户端断开连接时，服务端会触发 `AbortController.abort("client_disconnected")`
- commander 收到 signal 后会阻断后续 `hire_agent`，并尽量返回已完成 phase 的结果（若已有成功 phase）

---

## 5. 前端实现计划

### 5.1 Timeline 面板（核心改造）

从线性事件流变为**多阶段进度展示**：

```
─── MISSION ───
"分析这个 token 合约的安全性和投资价值"

┌─ Phase 1/3 ────────────────────────┐
│ 🛡️ Security Scan                   │
│ → token-scanner  [✓ COMPLETED]     │
│ Risk Score: 35/100                  │
└────────────────────────────────────┘
         ↓
┌─ Phase 2/3 ────────────────────────┐
│ 📊 DeFi Analysis             ▸    │
│ → defi-analyst  [◎ RUNNING]        │
└────────────────────────────────────┘
         ↓
┌─ Phase 3/3 ────────────────────────┐
│ ✍️ Final Report                     │
│ → [PENDING]                         │
└────────────────────────────────────┘
```

### 5.2 rebel.agent 面板

status 行增加当前 Phase 进度：

```
STATUS    [◎ Phase 2/3: DeFi Analysis]
SPENT     0.04 MON (累计)
TX_COUNT  2
```

### 5.3 mesh.net 面板

当前 Phase 使用的 Agent 状态变为 `SELECTED`，前序 Phase 用过的变为 `USED`。

### 5.4 需要修改的前端文件

```
frontend/src/types/agent.ts                        ← 新增 Phase 相关类型
frontend/src/components/timeline/mission-timeline.tsx  ← 多阶段展示
frontend/src/components/panels/my-agent-panel.tsx      ← Phase 进度
frontend/src/hooks/use-agent-stream.ts                 ← 解析新事件
frontend/src/components/panels/mesh-helpers.ts         ← 新增 USED 状态
frontend/src/components/panels/agent-mesh-panel.tsx    ← SELECTED/USED 排序
```

---

## 6. 实现步骤与优先级

| 步骤 | 内容 | 文件 | 优先级 | 状态 |
|:--|:--|:--|:--|:--|
| **C1** | ReAct commander 循环（hire_agent） | `hunter/src/commander-flow.ts` | P0 | ✅ 已完成 |
| **C2** | `executePhase` 作为子任务执行器复用 | `hunter/src/scripted-flow.ts` | P0 | ✅ 已完成 |
| **C3** | budget 类型与结果回传 | `shared/src/types.ts` + `hunter/src/run-types.ts` | P0 | ✅ 已完成 |
| **C4** | Timeline 动态 phase 展示 | `mission-timeline.tsx` | P1 | ✅ 已完成 |
| **C5** | rebel.agent phase + budget 面板 | `my-agent-panel.tsx` | P1 | ✅ 已完成 |
| **C6** | discovery snake 跨 phase 连续动画 | `discovery-snake.tsx` | P1 | 🚧 进行中 |
| **C7** | budget 逻辑模块化与单测 | `commander-budget.ts` + `commander-budget.test.ts` | P2 | ✅ 已完成 |
| **C8** | commander 全链路回归测试 | `commander-flow.test.ts` | P2 | ✅ 已完成 |
| **C9** | Phase 超时/手动中断 | `commander-flow.ts` + `index.ts` | P2 | ✅ 已完成 |

---

## 7. 风险控制

| 风险 | 应对策略 |
|:--|:--|
| planner 无限尝试 | `maxPhases` + `maxSteps` 双重上限 |
| 某个 Phase 超时 | `COMMANDER_PHASE_TIMEOUT_MS` + `AbortSignal`（SSE 断连触发） |
| 费用超预期 | `maxPerPhaseWei` + `maxTotalWei` 硬限制（环境变量可调） |
| 前序 Phase 失败影响后续 | 失败会写入 context，LLM 可继续或终止 |
| 向后兼容性 | 默认 mode 为 single，不影响现有逻辑 |

---

## 8. 与 Vision 的对齐

### 对 plan.md 的覆盖

| plan.md 第 6 节 "未来扩展" | 指挥官模式覆盖 |
|:--|:--|
| 多步任务协作（Agent hiring Agent） | ✅ 每个 Phase 是一次 "hiring" |
| Agent Marketplace | ✅ 8 个 Skill Agent = 市场里的商家 |
| 链上 Reputation 系统 | ✅ 已实现，每次 hiring 后给反馈 |

### 对 vision 的呼应

> "Agent 的淘宝" — 语义化接口 + 可验证信誉 + 确定性定价 + 原子化结算

指挥官模式让 Rebel Agent 不再只是"买一个东西"，而是像一个**采购经理**：

1. 分析需求 → 拆解为采购清单
2. 去市场找供应商 → Discover（考虑 Reputation）
3. 谈价付款 → Pay（x402 + MON）
4. 验收 → Verify（Receipt 验签）
5. 评价 → Feedback（声誉更新）
6. 重复直到所有采购完成

**每一步都是链上可验证的经济行为。这就是 Track 2 的核心叙事。**

---

*Created: 2026-02-25*
*Updated: 2026-02-25*
*Status: In Progress — ReAct Commander 已落地（含 budget、超时/中断与回归测试），当前仅 P1 动效细化待补充*
