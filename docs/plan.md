# Rebel Agent Mesh — 项目方案（Plan）

## 0. 当前执行状态（2026-02-25）

- 已实现（代码层）：Writer 支付报价/验证/执行/签名 + Hunter 发现/支付/提交/验签 + MVP 演示脚本
- 已实现（可观测性）：Hunter 实时轨迹流 `POST/GET /run/stream`（SSE 事件：ready/trace/done/error）
- 已实现（结构治理）：`react-engine.ts` 已拆分为 5 个模块，主流程保持兼容
- 已实现（身份与广告，MVP+）：`hunter/writer` identity 模型、`/identity`、动态注册表持久化 + TTL 心跳
- 已实现（发现增强，MVP+）：静态 `services.json` + 独立 registry service + `/identity` 探测混合发现
- 已实现（反馈，MVP+）：`give_feedback` + 持久化 + `/feedback`/`/reputation` 通用查询 + 链上联动
- 已实现（链上身份，可选）：ERC-8004 `register(agentURI)` 接入 + 幂等状态存储
- 已实现模式：
  - `scripted`（默认）：稳定闭环执行
  - `react`（可选）：`HUNTER_USE_REACT=true` + `KIMI_API_KEY` 或 `OPENAI_API_KEY`
  - `commander`（可选）：`mode=commander` 启用多阶段自主编排
- 已实现（前端主线 MVP）：三栏 Dashboard（My Agent / Mission Timeline / Agent Mesh）
- 已实现（多 Provider MVP）：scripted + react 选服排序与报价失败回退
- 已实现（Commander V2）：`mode=commander` ReAct 自主编排（`hire_agent`）+ budget 约束 + fallback phase
- 已实现（测试）：commander 全链路回归（预算阻断 / phase 失败后继续 / 无工具调用 fallback）
- 已实现（运行控制）：commander phase timeout + SSE 断连触发中断（best-effort）
- 已实现（测试）：commander 进阶回归（重试策略 / 手动中断 / 超时控制）
- 现存缺口：P1 动效细化（discovery snake 连续动画）
- 配置说明：新增环境变量见 `docs/development.md` 第 2 节与 `docs/implementation-plan-v2.md` 第 5.1 节

## 1. 项目目标

构建基于 Monad 的 Agent-to-Agent 服务网络，验证核心原语：

> Agent 可以作为独立经济体，**自主决策**并参与服务交换。

具体而言，AI Agent 能够：

- 自主发现其他 Agent 的服务
- 通过 Vercel AI SDK + LLM 评估并决策是否购买服务
- 使用 Monad 链上 MON 原生代币支付完成交易（x402 协议格式）
- 验证服务交付（Receipt）
- 构建可验证的经济行为记录

---

## 2. MVP 边界定义（黑客松版本）

### 2.1 MVP 闭环

```
Hunter Agent 收到目标
  → LLM 自主决策调用 discover_services()
  → LLM 评估服务，决定购买
  → 请求 Writer Agent，收到 HTTP 402 报价
  → LLM 决定支付 → Monad 链上转账
  → Writer Agent 验证支付
  → Writer Agent 用 LLM 执行任务（内容生成）
  → 返回结果 + 签名 Receipt
  → Hunter Agent 验证 Receipt
  → Hunter Agent 用 LLM 评估结果质量（可选）
```

**该闭环完成即视为系统成功。**

### 2.2 MVP 不实现

- 去中心化 registry（使用 JSON 文件）
- 多 Agent 同时协同
- 完整 reputation 系统
- 多跳 agent hiring
- 复杂定价模型

---

## 3. 赛道匹配

### Track 1：原生智能体支付与基础设施

| 赛道要点 | 方案覆盖 |
|---------|---------|
| AI 服务使用区块链作为结算层 | ✅ Monad 作为结算层 |
| 可被 Agent 调用的支付/结算协议 | ✅ x402-inspired 协议 |
| 受 x402/facilitator 启发的支付中间件 | ✅ 核心设计 |
| Agent 如何发现服务并完成按次付费交易 | ✅ Registry + 402 + Pay |

### Track 2：与智能体共生与智能市场

| 赛道要点 | 方案覆盖 |
|---------|---------|
| 如何设计 Agent 工作流与执行流程，而非仅仅是对话 | ✅ Hunter ReAct 决策 + Writer 执行 |
| 具备强执行能力的 Agent 工作流 | ✅ 自主发现→决策→支付→验证 |
| 数据、感知、执行与激励如何协同 | ✅ 感知（发现服务）+ 执行（支付+任务）+ 激励（付费得结果） |
| Agent 在加密环境中完成交易、决策与协作 | ✅ Monad 支付 + LLM 决策 |

### 结合叙事

> "我们不仅构建了 Agent 支付协议（Track 1），还证明了 Agent 可以**自主决策**何时支付、支付多少、以及评估服务质量（Track 2）。"

---

## 4. 核心模块概览

| 模块 | 职责 | 关键特性 |
|------|------|---------|
| Hunter Agent | 服务消费者 | Vercel AI SDK ReAct 自主决策，工具调用 |
| Writer Agent | 服务提供者 | Vercel AI SDK 执行任务，签名 Receipt |
| Service Registry | 服务发现 | MVP 使用 JSON + 动态 `/identity` 混合发现 |
| Payment Layer | 链上结算 | x402 格式 + MON 原生代币 EOA→EOA，含重放防护 |
| Receipt Layer | 交付验证 | 加密签名 + 验签 |

> 各模块的技术细节见 [architecture.md](architecture.md)

---

## 5. Demo 成功标准

Demo 必须展示：

- [x] Hunter Agent 收到目标后自主完成流程（默认 scripted，可切换 ReAct）
- [x] LLM 的思考过程和工具调用可被观察（前端展示决策链）
- [x] 链上支付自动完成，Balance 变化可见（依赖钱包与 RPC 实测）
- [x] Writer Agent 用 LLM 生成真实内容（缺 LLM Key 时使用 fallback）
- [x] Receipt 自动签名与验证
- [x] 全程无需人工干预（脚本化入口 `POST /run`）

---

## 6. 未来扩展

- 多服务 Registry（链上注册）
- 动态定价（供需驱动）
- ~~链上 Reputation 系统~~ → ✅ 已实现（见 `docs/agent-evolution-plan.md`）
- Agent Marketplace
- ~~多步任务协作（Agent hiring Agent）~~ → ✅ 已实现 Commander V2（见 `docs/commander-mode.md`）
- 结果质量争议仲裁机制

---

前端产品策略文档：`docs/frontend-application-strategy.md`
指挥官模式设计文档：`docs/commander-mode.md`
