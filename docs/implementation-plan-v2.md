# Rebel Agent Mesh — Implementation Plan v2

> **基于**: agent-economy-vision.md + frontend-design-concept.md + agent0-py (ERC-8004) + awesome-agentic-economy
> **确认日期**: 2026-02-25

## 0. 推进进度（更新于 2026-02-25）

- `① react-engine 拆分`：已完成第一轮，已拆分为 `react-engine / react-tools / kimi-loop / trace-emitter / scripted-flow`
- `② Agent Identity`：MVP + 可选链上注册已落地（含幂等与本地状态持久化）
- `④ Feedback 系统`：MVP+ 已落地（持久化、通用查询 API、选服加权信号、可选链上反馈）
- `⑤ Dynamic Discovery`：MVP+ 已落地（独立 registry service + 动态注册持久化 + TTL 心跳 + 探测 fallback）
- `③ Mission Timeline`：MVP 已落地（阶段卡片聚合 + 三栏改版 + 结果闭环展示）
- `⑥ Multi-Provider`：MVP 已落地（scripted + react 报价回退、尝试轨迹可观测）
- `⑧ Commander V2`：已落地（ReAct 自主编排 + budget 约束 + fallback phase）
- `⑨ Commander 回归测试`：已落地（预算阻断 / phase 失败后继续 / 无工具调用 fallback）

## 1. 总览：当前状态 vs 目标状态

### 1.1 已实现 ✅

| 模块 | 能力 | 对应 Layer |
|:---|:---|:---|
| Discovery | 从 `services.json` 读取服务列表 | Layer 2 |
| Communication | Hunter → Writer HTTP 调用 | Layer 3 |
| Payment | x402 Native Transfer (MON) + Mock 模式 | Layer 4 |
| Verification | Receipt 签名 + 验证 | Layer 1 |
| ReAct Engine | LLM 驱动自主决策 (Kimi + OpenAI) | 引擎 |
| SSE Streaming | 实时 Trace 推送给前端 | 桥梁 |
| Agent Identity (MVP) | Agent 身份模型 + `writer /identity` | Layer 1/2 |
| Feedback (MVP) | 评分数据结构 + Hunter 反馈工具 | Layer 1 |
| Dynamic Discovery (MVP) | 静态注册表 + 动态 Identity 探测 | Layer 2 |
| Frontend (Landing) | 营销页 Landing Page | 展示 |
| Frontend (Dashboard) | 三栏阶段化面板（My Agent / Timeline / Mesh） | 展示 |
| Commander Mode V2 | `mode=commander` ReAct 自主编排 + budget | 编排 |
| Commander Regression | commander 全链路回归测试 | 质量保障 |

### 1.2 目标增量

| 优先级 | 模块 | 能力 | 状态 | 参考来源 |
|:---|:---|:---|:---|:---|
| **Tier 1** | Agent Identity | ERC-8004 链上注册 | ✅ MVP+ 已完成（含可选 `setAgentWallet`） | agent0-py `RegistrationFile` |
| **Tier 1** | Capability Advertising | Agent 声明自己的能力 | ✅ MVP+ 已完成（跨进程+TTL+独立 registry service） | agent0-py `agent.setMCP()` |
| **Tier 1** | Feedback/Reputation | 交易后评分、信誉积累 | ✅ MVP+ 已完成（持久化+查询+加权+链上联动） | agent0-py `feedback_manager` |
| **Tier 1** | Frontend UX | 阶段化 Timeline + 动画 | ✅ MVP+ 已完成（Timeline/My Agent/Mesh/Onboarding/钱包集成） | frontend-ux-flow.md |
| **Tier 1** | Commander Orchestration | 多阶段自主编排（`hire_agent` + budget） | ✅ 已完成（含 fallback） | docs/commander-mode.md |
| **Tier 2** | Dynamic Discovery | 替代静态 JSON Registry | ✅ 混合发现+动态注册+独立 registry 已完成 | agent0-py `searchAgents()` |
| **Tier 2** | Multi-Provider | 多 Agent 流水线 | ✅ MVP 已完成（优选排序 + 报价失败回退） | agent-economy-vision 剧本 |
| **Tier 2** | Commander Testing | 全链路回归覆盖 | ✅ 已完成（3 条核心场景） | `commander-flow.test.ts` |

## 2. 后端实施计划

### 2.1 Agent Identity (ERC-8004 注册)

**目标**: Agent 不再是匿名的，拥有链上身份

**参照**: `reference_code/agent0-py/agent0_sdk/core/models.py` → `RegistrationFile`

**需要实现**:

```
shared/src/
├── types.ts           → 扩展 AgentIdentity 类型
└── agent-registry.ts  → Agent 注册/查询逻辑 (新增)

agents/
├── hunter/src/
│   ├── identity.ts    → Hunter 的 ERC-8004 身份 (新增)
│   └── config.ts      → 添加 identity 配置项
└── writer/src/
    ├── identity.ts    → Writer 的 ERC-8004 身份 (新增)
    └── config.ts      → 添加 identity 配置项
```

**进度更新（2026-02-18）**:

- ✅ `shared/src/types.ts` 已扩展 `AgentIdentity` / `AgentCapability`
- ✅ `shared/src/agent-registry.ts` 已新增（内存注册/查询）
- ✅ `agents/hunter/src/identity.ts`、`agents/writer/src/identity.ts` 已新增
- ✅ `agents/hunter/src/config.ts`、`agents/writer/src/config.ts` 已增加 identity 配置项
- ✅ 可选 ERC-8004 链上注册流程已接入（启动注册）
- ✅ 链上注册结果已做本地持久化 + 幂等跳过重复注册
- ✅ `setAgentWallet` 签名流程已接入（可配置域参数 + 新旧签名域兼容回退）

**数据模型** (参照 agent0-py `RegistrationFile`):

```typescript
interface AgentIdentity {
  agentId: string;           // "chainId:tokenId"
  name: string;
  description: string;
  image?: string;
  walletAddress: string;
  capabilities: AgentCapability[];
  trustModels: string[];     // ["reputation", "crypto-economic"]
  active: boolean;
  registeredAt: number;
}

interface AgentCapability {
  type: "mcp" | "a2a" | "oasf";
  endpoint?: string;
  skills?: string[];
  tools?: string[];
}
```

### 2.2 Capability Advertising (能力广告)

**目标**: Writer 声明 "我能做什么"，Hunter 根据需求搜索

**当前**: Writer 是硬编码在 `services.json` 中的静态条目
**目标**: Writer 启动时自动注册自己的 capabilities

```
registry/
├── services.json         → 保留作为 fallback
└── dynamic-registry.ts   → 内存级动态注册 (新增, MVP，可选重构)

agents/writer/src/
└── advertise.ts          → 启动时向 Registry 注册能力 (新增)
```

**进度更新（2026-02-18）**:

- ✅ `agents/writer/src/advertise.ts` 已新增，并在 writer 启动时执行
- ✅ `agents/writer/src/index.ts` 已新增 `GET /identity`，对外声明 capability + service
- ✅ Hunter 发现逻辑已接入动态探测（优先读取 writer 广告，静态 registry 兜底）
- ✅ 动态注册表已升级为文件持久化（跨进程）
- ✅ 已增加心跳 + TTL 机制（自动过期）
- ✅ 独立 `registry service` 已拆出（`@rebel/registry`）

### 2.3 Feedback / Reputation (信誉系统)

**目标**: Hunter 完成交易后可以对 Writer 评分

**参照**: `reference_code/agent0-py/agent0_sdk/core/feedback_manager.py`

```
shared/src/
└── types.ts              → 添加 Feedback 类型

agents/hunter/src/
└── tools/feedback.ts     → giveFeedback 工具 (新增)
```

**数据模型**:

```typescript
interface AgentFeedback {
  agentId: string;
  reviewer: string;         // reviewer wallet address
  value: number;            // 0-100
  tags: string[];
  text?: string;
  timestamp: number;
}
```

**进度更新（2026-02-18）**:

- ✅ `shared/src/types.ts` 已增加 `AgentFeedback`
- ✅ `shared/src/agent-registry.ts` 已提供 feedback 存储与 reputation 聚合
- ✅ `agents/hunter/src/tools/feedback.ts` 已新增 `giveFeedback` 工具
- ✅ ReAct 工具集中已新增 `give_feedback`，并发射 `feedback_submitted` trace 事件
- ✅ 已接入反馈持久化（文件存储）
- ✅ 已提供 `/feedback` 与 `/reputation` 通用查询 API
- ✅ Hunter 默认选服已接入 reputation + 价格加权
- ✅ 已接入可选链上 reputation contract 联动（Hunter 写入，Writer 读取 summary）

### 2.4 代码重构: react-engine.ts 拆分

**问题**: `agents/hunter/src/react-engine.ts` 有 768 行，严重超出 200 行指标

**拆分计划**:

```
agents/hunter/src/
├── react-engine.ts       → 主入口 + 编排 (~150 行)
├── react-tools.ts        → Tool 定义 (~120 行) (新增)
├── kimi-loop.ts          → Kimi 特有 ReAct Loop (~120 行) (新增)
├── trace-emitter.ts      → Trace 发射 + 辅助函数 (~60 行) (新增)
└── scripted-flow.ts      → Scripted 模式流程 (~80 行) (新增)
```

**进度更新（2026-02-18）**:

- ✅ 已完成拆分并通过 typecheck
- ✅ 当前行数：`react-engine.ts` 156、`kimi-loop.ts` 206、`trace-emitter.ts` 37、`scripted-flow.ts` 163
- ✅ `react-tools.ts` 已薄封装，拆为 `react-tool-catalog.ts` 194 + `react-tool-executor.ts` 88

### 2.5 Commander V2（ReAct 指挥模式）

**目标**: 将 commander 从静态计划改为 ReAct 自主循环，并通过预算/步数限制约束成本与风险

**进度更新（2026-02-25）**:

- ✅ `agents/hunter/src/commander-flow.ts` 已重构为 `hire_agent` 驱动的 ReAct 循环
- ✅ `agents/hunter/src/commander-budget.ts` 已拆分预算规则（`maxPhases` / `maxPerPhaseWei` / `maxTotalWei`）
- ✅ `agents/hunter/src/run-types.ts` 与 `shared/src/types.ts` 已补充 `CommanderBudget` 回传
- ✅ `agents/hunter/src/commander-flow.test.ts` 已覆盖进阶回归场景（预算阻断 / 失败后继续 / fallback / 超时 / 重试 / 中断）
- ✅ fallback phase 已接入（planner 未调用工具时仍执行一次任务）
- ✅ phase 超时控制 + 用户中断能力已接入（SSE 断连触发 signal 中断，best-effort）

## 3. 前端实施计划

### 3.1 三栏布局升级

**布局**: 保持三栏 (3 + 6 + 3)

| 栏 | 新职责 | 关键变化 |
|:---|:---|:---|
| 左栏 | "My Agent" 面板 | 从 "Hunter 列表" → "我的 Agent 状态" |
| 中栏 | Mission Timeline | 从 "事件列表" → "阶段卡片时间线" |
| 右栏 | Agent Mesh | 从 "静态 Registry" → "实时 Agent 网络" |

### 3.2 核心组件清单

**需要新增/重构的组件**:

```
frontend/src/components/
├── onboarding/                    # 🆕 Agent 创建流程
│   ├── create-agent-form.tsx      # Agent 注册表单
│   └── wallet-connect.tsx         # 钱包连接
├── panels/
│   ├── my-agent-panel.tsx         # 🔄 重构: 从 hunter-panel → my-agent
│   └── agent-mesh-panel.tsx       # 🔄 重构: 从 service-registry → agent mesh
├── timeline/                      # 🆕 阶段化时间线
│   ├── mission-timeline.tsx       # 时间线容器
│   ├── phase-thinking.tsx         # 🧠 思考阶段卡片
│   ├── phase-discovery.tsx        # 🔍 发现阶段卡片
│   ├── phase-payment.tsx          # 💰 支付阶段卡片
│   └── phase-complete.tsx         # 🏁 闭环完成卡片
└── shared/                        # 🆕 共享组件
    ├── agent-avatar.tsx           # Agent 头像 + 状态脉冲
    ├── tx-hash-badge.tsx          # Tx Hash 可复制徽章
    └── monad-balance.tsx          # MON 余额 + 数字动画
```

### 3.3 实施顺序

```
Step 1: 安装 framer-motion + 配置 Monad 色系
  └── globals.css + tailwind.config.ts 更新

Step 2: My Agent Panel (左栏重构)
  └── Agent 头像 + 状态 + 余额 + 任务

Step 3: Mission Timeline (中栏核心)
  └── Phase 卡片: Thinking → Discovery → Payment → Complete
  └── 接入 useAgentStream Hook (已有)

Step 4: Agent Mesh Panel (右栏重构)
  └── 动态 Agent 列表 + 选中高亮

Step 5: Agent Onboarding (创建流程)
  └── 轻量入口 → ERC-8004 注册

Step 6: Animation & Polish
  └── 打字机 + 弹入 + 进度条 + 脉冲 + Block Pulse
```

**进度更新（2026-02-19）**:

- ✅ `frontend/src/components/panels/my-agent-panel.tsx` 已落地（含真实 Identity + 错误态展示）
- ✅ `frontend/src/components/timeline/mission-timeline.tsx` 已落地并按 SSE Phase 聚合（已拆分 phase-utils / phase-summary）
- ✅ `frontend/src/components/panels/agent-mesh-panel.tsx` 已落地并接入选中/回退状态
- ✅ `frontend/src/app/dashboard/page.tsx` 已切换到三栏新布局（My Agent / Mission Timeline / Agent Mesh）
- ✅ `frontend/src/components/onboarding/create-agent-form.tsx` 已落地（4 步流程 + 真实钱包连接）
- ✅ `frontend/src/hooks/use-wallet.ts` 已落地（@web3-onboard + WalletConnect v2 + injected）
- ✅ `frontend/src/hooks/use-agent-identity.ts` 已落地（分离 hunterError / writerError）
- ✅ Registry `POST /agents/register` + `GET /agents` 已落地（Level 1 内存存储）

## 4. SSE 事件 → Phase 映射规则

前端需要将原始 SSE 事件聚合为 Phase:

```typescript
const EVENT_TO_PHASE: Record<string, Phase> = {
  // Phase: THINKING
  "run_started":          "thinking",
  "llm_response":         "thinking",

  // Phase: DISCOVERY
  "services_discovered":  "discovery",
  "service_selected":     "discovery",

  // Phase: DECISION (可合并到 DISCOVERY)
  "tool_call":            "decision",   // 当 tool="evaluate_service"
  "tool_result":          "decision",

  // Phase: PAYMENT
  "quote_received":       "payment",
  "payment_state":        "payment",

  // Phase: EXECUTION (可合并到 PAYMENT)
  // submit_payment 的 tool_call/tool_result

  // Phase: VERIFICATION
  "receipt_verified":     "verification",
  "evaluation_completed": "verification",
  "feedback_submitted":   "verification",

  // Phase: COMPLETE
  "run_completed":        "complete",
  "run_failed":           "error",
};
```

## 5. 技术栈确认

| 层 | 技术 | 状态 |
|:---|:---|:---|
| Frontend Framework | Next.js 15 (App Router) | ✅ 已有 |
| Styling | Tailwind CSS 3 + shadcn/ui | ✅ 已有 |
| Animation | Motion (Framer runtime) | ✅ 已有（`motion`） |
| State | React Hook + SSE | ✅ 已有 |
| Backend Runtime | Node.js + Express + TypeScript | ✅ 已有 |
| AI SDK | Vercel AI SDK (@ai-sdk/openai) | ✅ 已有 |
| Blockchain | Monad Testnet (EVM) + ethers.js | ✅ 已有 |
| Agent Identity | ERC-8004 标准 | 🆕 参照 agent0-py |
| Payment Protocol | x402 Native Transfer | ✅ 已有 |

### 5.1 新增环境变量（后端）

| 变量 | 作用 |
|:---|:---|
| `REGISTRY_PORT` / `REGISTRY_SERVICE_URL` | 独立 Registry Service 端口与访问地址 |
| `DYNAMIC_REGISTRY_PATH` | 动态服务注册表持久化路径 |
| `WRITER_ADVERTISE_INTERVAL_MS` / `WRITER_ADVERTISE_TTL_SECONDS` | Writer 广告心跳周期与服务过期时间 |
| `FEEDBACK_STORE_PATH` | 本地反馈持久化文件路径 |
| `HUNTER_SUBMIT_ONCHAIN_FEEDBACK` | 是否启用 Hunter 链上反馈写入 |
| `WRITER_READ_ONCHAIN_REPUTATION` | 是否启用 Writer 链上声誉读取 |
| `IDENTITY_REGISTRY_ADDRESS` | ERC-8004 IdentityRegistry 合约地址 |
| `HUNTER_SET_AGENT_WALLET_ONCHAIN` / `WRITER_SET_AGENT_WALLET_ONCHAIN` | 是否在注册后执行 `setAgentWallet` |
| `HUNTER_AGENT_WALLET_ADDRESS` / `WRITER_AGENT_WALLET_ADDRESS` | `setAgentWallet` 目标地址（默认使用 Agent 所有者钱包） |
| `HUNTER_AGENT_WALLET_SIGNER_PRIVATE_KEY` / `WRITER_AGENT_WALLET_SIGNER_PRIVATE_KEY` | 目标钱包签名私钥（目标钱包不等于所有者钱包时必填） |
| `IDENTITY_SET_WALLET_*` | EIP-712 签名域/类型配置（deadline/domain/version/type/includeOwner/legacyFallback） |
| `REPUTATION_REGISTRY_ADDRESS` | ERC-8004 ReputationRegistry 合约地址 |
| `ONCHAIN_IDENTITY_STORE_PATH` | 链上注册状态（tx/agentId）本地持久化路径 |
| `COMMANDER_MAX_PHASES` | commander 模式最大 phase 数（防无限循环） |
| `COMMANDER_PHASE_TIMEOUT_MS` | commander 单个 phase 超时阈值（毫秒） |
| `COMMANDER_MAX_PER_PHASE_WEI` | commander 单个 phase 预算上限 |
| `COMMANDER_MAX_TOTAL_WEI` | commander 全任务预算上限 |

## 6. 执行优先级矩阵

```
        高价值
          │
    ┌─────┤─────────────────┐
    │     │                 │
    │  Tier 1:              │
    │  ① react-engine 拆分  │   ← 技术债清理
    │  ② Agent Identity     │   ← 后端核心
    │  ③ Mission Timeline   │   ← 前端核心
    │  ④ Feedback 系统      │   ← 闭环关键
低难度──┤                 │──高难度
    │     │                 │
    │  Tier 2:              │
    │  ⑤ Dynamic Discovery  │
    │  ⑥ Multi-Provider     │
    │  ⑦ Agent Onboarding   │
    │     │                 │
    └─────┤─────────────────┘
          │
        低价值
```

**推荐执行顺序**: ① → ② → ③ → ④ → ⑤ → ⑥ → ⑦

**当前状态（2026-02-25）**:

- ✅ ① react-engine 拆分（首轮完成）
- ✅ ② Agent Identity（MVP+ 完成，含可选 `setAgentWallet`）
- ✅ ③ Mission Timeline（MVP 完成）
- ✅ ④ Feedback 系统（MVP+ 完成）
- ✅ ⑤ Dynamic Discovery（混合+动态注册+registry service 完成）
- ✅ ⑥ Multi-Provider（MVP 完成）
- ✅ ⑦ Agent Onboarding（Level 1 完成：钱包连接 + 表单 + Registry API）
- ✅ ⑧ Commander V2（ReAct 自主编排 + budget + fallback）
- ✅ ⑨ Commander 回归测试（预算阻断 / phase 失败后继续 / 无工具调用 fallback）

---
*Created: 2026-02-18 | Updated: 2026-02-25 | Based on: team discussion + reference project analysis*
