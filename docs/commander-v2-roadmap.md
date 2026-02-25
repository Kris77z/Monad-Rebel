# Commander V2 路线图

> 从 Plan-then-Execute 到 Autonomous Agent
>
> 创建日期：2026-02-25

---

## 概览

Commander Mode V1 已验证多 Agent 协作流程的可行性。本文档规划三项进化：

| 优先级 | 项目 | 复杂度 | 状态 |
|:--|:--|:--|:--|
| P0 | mission.log 动态文案 | 低 | ✅ 已完成 |
| P1 | 贪吃蛇跨 Phase 连续动画 | 中 | 🚧 进行中（核心动画已落地） |
| P2 | 自主决策 Agent（ReAct Loop） | 高 | ✅ 已完成（后端 ReAct + 超时/中断 + 进阶回归） |

---

## P0：mission.log 动态文案

### 问题

mission.log 部分 phase 的描述是写死的通用文案，没有反映真实事件数据：

- `execution`：始终显示 "Provider returned execution result."
- `complete`：始终显示 "Mission closed with final response."

### 修复方案

每个 phase 的 summary 都应从 SSE events 中提取真实数据：

| Phase | 修复前（写死） | 修复后（动态） |
|:--|:--|:--|
| execution | "Provider returned execution result." | 显示结果前 80 字摘要 |
| complete | "Mission closed with final response." | 显示评分 + 累计花费 |
| verification | 无 receipt 时写死 | 显示 "Awaiting receipt..." |

### 文件

- `frontend/src/components/timeline/phase-summary.ts`

---

## P1：贪吃蛇跨 Phase 连续动画

### 当前问题

每个 Phase 触发 `services_discovered` 事件时，snake 组件完全重新渲染：
- 蛇位置重置到起点
- 所有食物节点重新生成
- 动画从头播放

### 目标效果

```
Phase 1 (discovery):
  蛇从左→右，吃到 auditor-v1 ✓，停下

Phase 1 (execution):
  蛇在当前位置做小范围巡逻动画（idle）

Phase 2 (discovery):
  新的食物节点从右侧追加
  蛇从停下的位置继续 → 吃到 token-scanner-v1 ✓，停下

Phase 2 (execution):
  蛇继续巡逻

...直到所有 Phase 完成
```

### 技术方案

#### 1. 状态持久化

```typescript
// 用 useRef 保存蛇的持久状态
interface SnakePersistentState {
  snake: { x: number; y: number }[];  // 蛇身体
  eatenIds: Set<string>;               // 已吃掉的节点 ID
  currentPhaseIndex: number;            // 当前 phase
  idleMode: boolean;                    // 是否在巡逻
}
```

#### 2. 节点追加而非替换

当新 phase 的 `services_discovered` 事件到达时：
- **不清空**已有食物节点
- 新节点追加到画布右侧
- 已 eaten 的节点保持灰色标记

#### 3. 空闲巡逻

当 phase 进入 negotiation/payment/execution 阶段时：
- 蛇在当前区域做随机移动
- 不吃任何东西
- 画面保持"活着"的感觉

#### 4. Phase 转换

当新 phase 的 `services_discovered` 到达时：
- `idleMode = false`
- 新食物出现
- 蛇开始向新食物移动

### 文件变更

| 文件 | 变更 |
|:--|:--|
| `frontend/src/components/timeline/discovery-snake.tsx` | 重构为持久化状态 |
| `frontend/src/components/timeline/mission-timeline.tsx` | 传递 phaseIndex 给 snake |

---

## P2：自主决策 Agent（ReAct Loop）

### 当前架构（V1：Plan-then-Execute）

```
                    ┌─────────────────────────────┐
                    │  LLM 一次性拆解              │
  User Goal ──────> │  → Phase[] (固定 2-4 步)     │
                    └─────────┬───────────────────┘
                              │
                    ┌─────────▼───────────────────┐
                    │  按顺序执行每个 Phase         │
                    │  Phase 1 → Phase 2 → ...    │
                    │  上下文单向传递               │
                    └─────────────────────────────┘
```

**局限：**
- 不能根据中间结果调整计划
- 不能跳过不必要的步骤
- 不能增加新步骤
- Phase 失败后只能跳过，不能重试或换方案

### 目标架构（V2：ReAct Autonomous Agent）

```
                    ┌──────────────────────────────────┐
                    │         ReAct Control Loop        │
  User Goal ──────> │                                  │
                    │  THINK: 分析当前情况，决定下一步   │
                    │    ↓                              │
                    │  ACT: 调用工具（hire agent / pay） │
                    │    ↓                              │
                    │  OBSERVE: 查看结果                 │
                    │    ↓                              │
                    │  THINK: 结果够了吗？要不要继续？    │──────> 完成
                    │    ↓ (继续)                       │
                    │  ACT: 调用下一个工具               │
                    │    ...                            │
                    └──────────────────────────────────┘
```

### 对比

| 维度 | V1 (Plan-then-Execute) | V2 (ReAct Loop) |
|:--|:--|:--|
| 计划时机 | 开始前一次性规划 | 每步动态决定 |
| 中途调整 | ❌ | ✅ |
| 新增/跳过步骤 | ❌ | ✅ |
| 容错 | Phase 失败跳过 | 重试 / 换方案 / 求助 |
| 成本控制 | ✅ 可预测（max 4 phases） | ⚠️ 需要 budget 机制 |
| LLM 调用次数 | 1 次拆解 + N 次执行 | 每步 1 次决策 + N 次执行 |
| 复杂度 | 低 | 高 |

### 框架选型决策

#### 结论：不引入 LangChain，基于现有 Vercel AI SDK 扩展

| 方案 | 决策 | 理由 |
|:--|:--|:--|
| **LangChain** | ❌ 不采用 | 重复抽象，增加 bundle 和学习成本 |
| **Vercel AI SDK** | ✅ 继续使用 | 已有 ReAct 基础设施，只需加工具 |
| **MCP (Model Context Protocol)** | ⏳ 未来考虑 | 适合分布式 Agent 网络，当前 MVP 过度 |
| **CrewAI / AutoGPT** | ❌ 不采用 | Python 生态，与我们的 TS 栈不匹配 |

#### 已有的 ReAct 基础设施

我们的 `react-engine.ts` 已经实现了 ReAct 循环：

```typescript
// 现有代码 (react-engine.ts L116-131)
const result = await generateText({
  model: provider.chat(hunterConfig.llm.model),
  system: systemPrompt,
  prompt: goal,
  tools,            // ← 多个工具供 LLM 选择
  maxSteps: 12,     // ← 多步循环
  onStepFinish: ... // ← 步骤回调（emit SSE events）
});
```

这与 LangChain 的 AgentExecutor 在功能上等价：

| LangChain 概念 | 我们的对应实现 |
|:--|:--|
| `AgentExecutor` (ReAct loop) | `generateText({ maxSteps })` |
| `@tool` 装饰器 | `tool({ description, parameters, execute })` |
| `BaseChatModel` | `@ai-sdk/openai` provider |
| `ConversationBufferMemory` | `memory.ts` + `reflect.ts` |
| `AgentAction` / `AgentFinish` | `onStepFinish` callbacks |

#### V2 升级路径

从 V1 到 V2 **只需两步**：

**Step 1**：新增 `hire_agent` 工具到现有 tools

```typescript
const hireAgent = tool({
  description: "Hire a specialized agent to perform a sub-task",
  parameters: z.object({
    goal: z.string(),
    preferredType: z.string().optional(),
  }),
  execute: async ({ goal, preferredType }) => {
    return await executePhase(goal, options, {
      preferredTaskType: preferredType,
      emitLifecycleEvents: true,
    });
  }
});
```

**Step 2**：在 system prompt 里增加指导

```
You are an autonomous agent commander.
You can hire specialized agents using the hire_agent tool.
Analyze the mission, decide which sub-tasks to delegate, and
synthesize results. You may hire 1-6 agents based on complexity.
```

LLM 会自主决定：调不调 `hire_agent`、调几次、给什么 goal。**无需额外框架。**

### 实现计划

#### Phase 1：扩展现有 react-engine

当前 `react-engine.ts` 已经有 ReAct 框架（调用 Vercel AI SDK 的 `generateText` + tools）。需要做的是：

1. **新增 `hire_agent` 工具**（见上方代码）

2. **Budget 控制**：

```typescript
interface AgentBudget {
  maxTotalWei: string;      // 最大总预算
  maxPerPhaseWei: string;   // 单步最大
  maxPhases: number;         // 最大步数（防止无限循环）
  spentWei: string;          // 已花费
  phaseCount: number;        // 已执行步数
}
```

3. **停止条件**：
   - Agent 主动判断任务完成
   - 达到预算上限
   - 达到最大步数
   - 用户手动中断

#### Phase 2：前端支持动态 Phase

当前前端假设 phase 列表是静态的（mission_decomposed 一次性确定）。V2 需要：

- Phase 列表是动态追加的
- rebel.agent MISSION 区域实时追加新 phase 卡片
- mission.log 的步骤在每个 phase 内部循环（多次 DISCOVERY → PAYMENT → ...）

#### Phase 3：Memory / Learning

Agent 在决策时参考历史经验：
- 上次用 auditor-v1 评分只有 5/10，这次换一个
- 上次类似任务只用了 2 步就完成了
- 这个 agent 上次超时了，避开

### 风险控制

| 风险 | 缓解措施 |
|:--|:--|
| 无限循环 | maxPhases 硬上限（默认 6） |
| 成本失控 | budget 机制 + 每步超额提示 |
| LLM 幻觉 | 工具结果强校验（receipt verification） |
| 用户失控感 | 前端实时展示决策过程 + 手动中断按钮 |

### 文件变更预估

| 文件 | 变更 |
|:--|:--|
| `agents/hunter/src/react-engine.ts` | 新增 hire_agent 工具 |
| `agents/hunter/src/commander-flow.ts` | 重构为 ReAct loop |
| `shared/src/types.ts` | 新增动态 phase 类型 |
| `frontend/src/components/panels/my-agent-panel.tsx` | 动态 phase 展示 |
| `frontend/src/hooks/use-agent-stream.ts` | 处理动态 phase 事件 |

### 当前落地进展（2026-02-25）

已完成：
- `agents/hunter/src/commander-flow.ts`：从静态拆解改为 ReAct 自主循环，支持 `hire_agent` 工具与 budget 限制
- `agents/hunter/src/run-types.ts`：`commander` 结果新增 `budget` 快照
- `shared/src/types.ts`：新增 `CommanderBudget` 类型
- `frontend/src/components/timeline/phase-summary.ts`：P0 文案动态化（execution/verification/complete）
- `frontend/src/components/timeline/mission-timeline.tsx`：动态 phase 展示 + 动态 snake 节点聚合
- `frontend/src/components/timeline/discovery-snake.tsx`：跨 phase 持久化状态动画（hunt/idle）
- `frontend/src/components/panels/my-agent-panel.tsx`：动态 phase 进度与预算展示
- `.env.example`：新增 commander 预算环境变量示例
- `agents/hunter/src/commander-budget.ts` + `agents/hunter/src/commander-budget.test.ts`：预算逻辑拆分并覆盖单元测试
- `agents/hunter/src/commander-flow.test.ts`：补充 commander 全链路与进阶回归测试（预算阻断 / phase 失败后继续 / 无工具调用 fallback / 超时 / 重试 / 手动中断）
- `agents/hunter/src/index.ts`：SSE 断连触发 `AbortSignal`，中断 commander 后续 phase（best-effort）
- `agents/hunter/src/commander-flow.ts`：增加 `COMMANDER_PHASE_TIMEOUT_MS` 与 phase 级 timeout 控制
- `agents/hunter/package.json`：新增 `npm run test --workspace @rebel/hunter` 可执行测试脚本

待完成：
- P1：为 snake 增加更清晰的 phase 分段视觉与动效细节

---

## 时间线

```
Week 1:  P0 动态文案（✅ 已完成）
Week 1:  P1 贪吃蛇连续动画
Week 2-3: P2 ReAct autonomous agent
```

---

## 参考

- [Vercel AI SDK — Tools & Tool Calling](https://sdk.vercel.ai/docs/ai-sdk-core/tools-and-tool-calling) — 我们的核心框架
- [Vercel AI SDK — Multi-step Calls](https://sdk.vercel.ai/docs/ai-sdk-core/generating-text#multi-step-calls) — ReAct 循环实现
- [LangChain ReAct Agent](https://js.langchain.com/docs/modules/agents/) — 参考设计（未采用）
- [CrewAI Multi-Agent](https://www.crewai.com/) — 参考设计（Python，未采用）
- [MCP Protocol](https://modelcontextprotocol.io/) — 未来分布式 Agent 网络可考虑
- 现有实现：`docs/commander-mode.md`
