# Frontend Integration Checklist（前端对接清单）

## 1. 目标与范围

本清单用于前端实现以下能力：

- 任务发起与 SSE 实时执行展示（Mission Timeline）
- `My Agent / Mission Timeline / Agent Mesh` 三栏数据对接
- Onboarding（创建 Agent）前端实现与后端现状对齐

说明：

- 当前后端已具备完整执行闭环、身份查询、动态发现、反馈与链上扩展。
- 当前阶段已支持 Onboarding 提交到 Registry（`POST /agents/register`，Level 1 内存态）。

---

## 2. 前端环境变量

在前端 `.env.local`（或对应环境）配置：

```env
NEXT_PUBLIC_HUNTER_URL=http://localhost:3002
NEXT_PUBLIC_WRITER_URL=http://localhost:3001
NEXT_PUBLIC_REGISTRY_URL=http://localhost:3003
```

建议封装：

```ts
export const apiBase = {
  hunter: process.env.NEXT_PUBLIC_HUNTER_URL ?? "http://localhost:3002",
  writer: process.env.NEXT_PUBLIC_WRITER_URL ?? "http://localhost:3001",
  registry: process.env.NEXT_PUBLIC_REGISTRY_URL ?? "http://localhost:3003"
};
```

---

## 3. 核心接口契约

## 3.1 发起任务（SSE）

- `GET {HUNTER_URL}/run/stream?goal=...`
- `POST {HUNTER_URL}/run/stream`，body: `{ goal: string }`

SSE 事件类型：

- `ready`
- `trace`
- `done`
- `error`

`trace` 事件统一结构：

```ts
interface AgentEvent {
  type: string;
  at: string; // ISO 时间
  data?: unknown;
}
```

`done` 事件结构（核心字段）：

```ts
interface HunterRunResult {
  goal: string;
  mode: "scripted" | "react";
  service: {
    id: string;
    name: string;
    endpoint: string;
    price: string;
    taskType?: string;
    skills?: string[];
  };
  paymentTx: string;
  execution: {
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
  };
  receiptVerified: boolean;
  evaluation: { score: number; summary: string };
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
}
```

## 3.2 身份与状态

- `GET {HUNTER_URL}/identity`
- `GET {WRITER_URL}/identity`

用途：

- `My Agent` 面板身份展示
- On-chain 状态、wallet binding 状态展示

## 3.3 Registry 服务

- `GET {REGISTRY_URL}/services`

用途：

- Agent Mesh 面板扩展数据源（非必须，可与 trace 合并）

---

## 4. Timeline 事件映射

推荐映射表：

| Phase | 事件 |
|:--|:--|
| `thinking` | `run_started`, `llm_response` |
| `discovery` | `services_discovered` |
| `decision` | `service_selected` |
| `payment` | `quote_received`, `payment_state` |
| `execution` | `tool_call/tool_result` 且 `tool === "submit_payment"` |
| `verification` | `receipt_verified`, `evaluation_completed`, `feedback_submitted` |
| `complete` | `run_completed` |
| `error` | `run_failed` / SSE `error` |

补充：

- `service_selected` 可能包含 `fallbackFrom` 与 `attempts`，可用于显示多 Provider 回退路径。
- `payment_state` 关键状态：`payment-required` / `payment-submitted` / `payment-completed`。

---

## 5. 三栏数据绑定清单

## 5.1 My Agent（左栏）

建议数据来源：

- 任务目标：`run_started.data.goal`
- 状态：运行状态 + 最近关键 trace（payment/verification）
- 交易哈希：`done.paymentTx` 或 `payment_state.data.txHash`
- 身份信息：`GET /identity`

## 5.2 Mission Timeline（中栏）

建议数据来源：

- 主来源：SSE `trace`
- 完成态详情：SSE `done`
- 错误态：SSE `error` + `run_failed`

## 5.3 Agent Mesh（右栏）

建议数据来源：

- 首选：`services_discovered.data.serviceIds` + `service_selected`
- 可选增强：`GET {REGISTRY_URL}/services`
- 回退可视化：`service_selected.data.attempts`

---

## 6. Onboarding 设计（当前实现 + 后续增强）

当前后端现状：

- 已有 `GET /identity` 展示能力
- 已有 `POST {REGISTRY_URL}/agents/register`（Level 1：内存态注册）
- Hunter/Writer 暂无专门 `POST /identity` 写入接口

因此建议分两步：

1. 完成 Onboarding 表单、钱包连接、预览，并提交到 Registry（已完成）
2. 后续补齐持久化存储与链上注册联动

## 6.1 字段定义（建议）

```ts
type AgentRole = "hunter" | "writer";

interface AgentOnboardingForm {
  role: AgentRole;
  name: string;
  description: string;
  image?: string;
  trustModels: string[]; // 如 ["reputation", "crypto-economic"]
  endpoint?: string;
}

interface ConnectedWallet {
  address: string;
  chainId?: number;
  connector?: string; // MetaMask / Rabby / WalletConnect
}
```

## 6.2 前端状态模型（建议）

```ts
type OnboardingStep = "connect_wallet" | "fill_profile" | "review" | "complete";

interface OnboardingState {
  step: OnboardingStep;
  wallet?: ConnectedWallet;
  form: AgentOnboardingForm;
  submitting: boolean;
  error?: string;
}
```

## 6.3 当前提交 payload（Registry `/agents/register`）

```ts
interface RegisterAgentPayload {
  name: string;
  description: string;
  image?: string;
  walletAddress: string;
  trustModels: string[];
  capabilities: Array<{
    type: "mcp" | "a2a" | "oasf";
    endpoint?: string;
    skills?: string[];
    tools?: string[];
  }>;
}
```

## 6.4 预留扩展 payload（持久化/链上版）

```ts
interface CreateAgentPayload {
  role: "hunter" | "writer";
  walletAddress: string;
  identity: {
    name: string;
    description: string;
    image?: string;
    trustModels: string[];
  };
  capabilities?: {
    endpoint?: string;
    skills?: string[];
    tools?: string[];
  };
}
```

---

## 7. 联调步骤

1. 启动后端服务：`npm run dev:agents`
2. 启动前端：`npm run dev:frontend`
3. 从前端发起一次 mission
4. 检查 Timeline 是否完整覆盖 phase
5. 检查完成态是否展示：
   - `paymentTx`
   - `receiptVerified`
   - `evaluation.score`
6. 检查错误态（断网/无可用服务）是否可见且可重试

---

## 8. 验收标准

- 可从前端发起 mission 并实时看到执行过程
- 三栏数据一致，不出现“完成但中间为空”的断层
- 回退场景可观察（存在 `attempts` / `fallbackFrom` 时有展示）
- 结果卡片可看到链上交易与验签结果
- Onboarding UI 可独立完成流程并成功提交 Registry 注册

---

## 9. 常见坑位

- Next.js rewrite 可能导致 SSE 缓冲，优先直连 Hunter SSE 地址
- `service_selected` 字段可能是 `id`，不要只读 `serviceId`
- `payment_state` 是多次事件，UI 要做状态覆盖而非只取首条
- `done` 到达前也可能已有 `run_failed`，要避免双重终态渲染
