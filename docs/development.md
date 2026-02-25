# Rebel Agent Mesh — 开发指南（Development）

## 0. 当前进度快照（2026-02-25）

- 已完成代码落地：Phase 1 ~ Phase 6（含 Hunter scripted + 可选 ReAct 模式）
- 已完成后端增强：独立 Registry Service、动态注册 TTL 心跳、反馈持久化/查询 API
- 已完成可选链上增强：ERC-8004 Identity 注册（幂等）+ Reputation 联动（Hunter 写入 / Writer 读取）
- 已完成前端主线 MVP：三栏 Dashboard（My Agent / Mission Timeline / Agent Mesh）
- 已完成 Agent Onboarding MVP：前端流程 + Registry `POST /agents/register` 对接（Level 1 内存态）
- 已完成 Agent Evolution：多 Skill 服务路由（Writer/Auditor/DeFi）+ Hunter 记忆系统（reflect + experience/insights）
- 已完成前端多类型可视化：Agent Mesh / Discovery Snake 支持按 `taskType` 区分
- 已完成 Hunter Memory 可视化：`/api/hunter/profile` 聚合 + 左栏 Memory Profile（stats / skills / preferred agents / insights）+ SWR 跨运行缓存/可选周期刷新 + feedback 辅助评分融合
- 已完成 Commander V2 核心：ReAct 自主编排（`hire_agent`）+ budget 约束 + fallback phase
- 已完成 Commander 回归测试：预算阻断、phase 失败后继续、无工具调用 fallback
- 已完成 Commander 进阶控制：phase timeout + SSE 断连触发手动中断（best-effort）
- 已完成 Commander 进阶回归：重试策略、手动中断、超时控制
- 已修复 frontend ESLint 配置链路（FlatCompat + plugin resolve）
- 后续增强：Onboarding 持久化存储与链上注册联动
- 当前仓库可用验证脚本：
  - `scripts/verify-phase1.sh`：验证 Writer 返回 402 报价
  - `scripts/verify-mvp.sh`：触发 Hunter 完整闭环
- 已完成本地链路验证：`verify-mvp.sh` 返回 HTTP 200，覆盖支付、执行、Receipt 验签闭环
- 兼容模式：未配置有效私钥时，Hunter/Writer 会自动切换到 `mock` 支付模式，便于本地先跑通流程和日志
- 前端构建现状：`npm run build --workspace @rebel/frontend` 可通过；剩余 2 条 `no-img-element` 非阻塞 warning

## 1. 技术选型明细

| 类别 | 技术 | npm 包 | 说明 |
|------|------|--------|------|
| 运行时 | Node.js (v20+) | — | TypeScript 全栈 |
| 后端框架 | Express | `express` | 成熟稳定的 HTTP 框架 |
| 前端框架 | Next.js + React | `next`, `react` | App Router |
| UI 组件 | shadcn/ui | `@radix-ui/*` | 基于 Radix + Tailwind |
| AI/LLM | Vercel AI SDK | `ai`, `@ai-sdk/openai` | generateText + tools + maxSteps |
| 区块链 | ethers.js v6 | `ethers` | Monad EVM 交互 |
| 包管理 | npm | — | Monorepo（workspaces） |
| 并行启动 | concurrently | `concurrently` | 并行启动多进程 |

### 参考代码索引

| 目录 | 来源 | 用途 |
|------|------|------|
| `reference_code/x402/` | Coinbase x402 SDK | 协议格式、Express 中间件参考 |
| `reference_code/a2a-x402/` | Google A2A x402 Extension | 状态机、数据结构规范 |
| `reference_code/ai/` | Vercel AI SDK | Agent 工具调用、generateText |
| `reference_code/monad-testnetbot/` | Monad 交互示例 | ethers.js 连接 Monad |
| `reference_code/x402/examples/typescript/servers/express/` | x402 Express 服务端 | Writer Agent 参考 |
| `reference_code/x402/examples/typescript/clients/fetch/` | x402 Fetch 客户端 | Hunter Agent 参考 |

---

## 2. 环境配置

### `.env.example`

```env
# === Monad Testnet ===
MONAD_RPC_URL=https://testnet-rpc.monad.xyz
CHAIN_ID=10143

# === Hunter Agent ===
HUNTER_PRIVATE_KEY=0x...
HUNTER_PORT=3002
HUNTER_USE_REACT=false
COMMANDER_MAX_PHASES=6
COMMANDER_PHASE_TIMEOUT_MS=45000
COMMANDER_MAX_PER_PHASE_WEI=20000000000000000
COMMANDER_MAX_TOTAL_WEI=60000000000000000
HUNTER_PUBLIC_ENDPOINT=http://localhost:3002
HUNTER_AGENT_ID=
HUNTER_AGENT_NAME=Rebel Hunter
HUNTER_AGENT_DESCRIPTION=
HUNTER_AGENT_IMAGE=
HUNTER_TRUST_MODELS=reputation,crypto-economic
DYNAMIC_AGENT_ENDPOINTS=http://localhost:3001
HUNTER_REGISTER_ONCHAIN=false
HUNTER_AGENT_URI=
HUNTER_SET_AGENT_WALLET_ONCHAIN=false
HUNTER_AGENT_WALLET_ADDRESS=
HUNTER_AGENT_WALLET_SIGNER_PRIVATE_KEY=
HUNTER_SUBMIT_ONCHAIN_FEEDBACK=false
HUNTER_FEEDBACK_TAG1=quality
HUNTER_FEEDBACK_TAG2=delivery

# === Writer Agent ===
WRITER_PRIVATE_KEY=0x...
WRITER_ADDRESS=0x...
WRITER_PORT=3001
WRITER_SKIP_PAYMENT_VERIFICATION=false
WRITER_PUBLIC_ENDPOINT=http://localhost:3001
WRITER_SERVICE_ID=writer-v1
WRITER_SERVICE_NAME=AI Content Writer
WRITER_SERVICE_DESCRIPTION=
WRITER_AGENT_ID=
WRITER_AGENT_NAME=Rebel Writer
WRITER_AGENT_DESCRIPTION=
WRITER_AGENT_IMAGE=
WRITER_TRUST_MODELS=reputation,crypto-economic
WRITER_REGISTER_ONCHAIN=false
WRITER_AGENT_URI=
WRITER_SET_AGENT_WALLET_ONCHAIN=false
WRITER_AGENT_WALLET_ADDRESS=
WRITER_AGENT_WALLET_SIGNER_PRIVATE_KEY=
WRITER_ADVERTISE_INTERVAL_MS=30000
WRITER_ADVERTISE_TTL_SECONDS=120
WRITER_READ_ONCHAIN_REPUTATION=false

# === Frontend ===
FRONTEND_PORT=3000

# === Payment ===
PRICE_WEI=10000000000000000
PAYMENT_TIMEOUT_SECONDS=60

# === LLM (Vercel AI SDK / OpenAI-compatible) ===
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-4o-mini
OPENAI_BASE_URL=

# Kimi (Moonshot) - OpenAI-compatible
KIMI_API_KEY=
KIMI_MODEL=kimi-k2.5
KIMI_BASE_URL=https://api.moonshot.cn/v1

# === Registry ===
REGISTRY_PORT=3003
REGISTRY_SERVICE_URL=http://localhost:3003
REGISTRY_PATH=./registry/services.json
DYNAMIC_REGISTRY_PATH=./registry/dynamic-services.json
FEEDBACK_STORE_PATH=./registry/feedback-store.json
SERVICE_FEEDBACK_STORE_PATH=./registry/service-feedback-store.json
IDENTITY_REGISTRY_ADDRESS=
REPUTATION_REGISTRY_ADDRESS=
ONCHAIN_IDENTITY_STORE_PATH=./registry/onchain-identity-store.json
IDENTITY_AGENT_WALLET_ADDRESS=
IDENTITY_AGENT_WALLET_SIGNER_PRIVATE_KEY=
IDENTITY_SET_WALLET_DEADLINE_SECONDS=300
IDENTITY_SET_WALLET_DOMAIN_NAME=ERC-8004 IdentityRegistry
IDENTITY_SET_WALLET_DOMAIN_VERSION=1.1
IDENTITY_SET_WALLET_TYPE_NAME=SetAgentWallet
IDENTITY_SET_WALLET_INCLUDE_OWNER=false
IDENTITY_SET_WALLET_ALLOW_LEGACY_FALLBACK=true
```

### 前置准备

1. 准备 2 个 Monad testnet 钱包（Hunter + Writer）
2. 在 `https://faucet.monad.xyz` 为 Hunter 钱包领取测试 MON
3. 至少配置一个 LLM Key：
   - OpenAI：`OPENAI_API_KEY`
   - Kimi：`KIMI_API_KEY`（优先于 OpenAI）
4. 可选配置模型名：`KIMI_MODEL` / `OPENAI_MODEL`

---

## 3. 启动方式

### 开发模式（默认：仅 Agent）

```bash
npm run dev
# 等同于：
# npm run dev:agents
# concurrently "npm run dev:registry" "npm run dev:writer" "npm run dev:hunter"
```

终端效果：
```
[registry] ✅ Registry Service running on :3003
[writer] ✅ Writer Agent running on :3001
[hunter] ✅ Hunter Agent running on :3002
```

### 前端单独启动

```bash
npm run dev:frontend
```

终端效果：
```
[web]    ✅ Frontend running on :3000
```

### 全量联调（Agent + Frontend）

```bash
npm run dev:all
# concurrently "npm run dev:registry" "npm run dev:writer" "npm run dev:hunter" "npm run dev:frontend"
```

### 演示模式

```bash
npm run demo
# 调用 Hunter /run 触发完整闭环（需先启动服务）
```

### 测试

```bash
# Hunter 测试（包含 commander 全链路回归）
npm run test --workspace @rebel/hunter
```

### 实时轨迹流（SSE）

```bash
# POST（推荐，支持较长 goal）
curl -N -X POST http://localhost:3002/run/stream \
  -H "Content-Type: application/json" \
  -d '{"goal":"Write a concise Monad analysis focused on throughput and UX."}'

# GET（便于 EventSource）
curl -N "http://localhost:3002/run/stream?goal=Write%20a%20concise%20Monad%20analysis"
```

事件类型：
- `ready`：连接就绪
- `trace`：过程事件（工具调用、支付状态、验签、评估等）
- `done`：最终结果（与 `/run` 返回结构一致）
- `error`：失败信息（`ErrorResponse`）

前端接入契约见：`docs/frontend-streaming.md`
前端产品策略见：`docs/frontend-application-strategy.md`
闭环流程图见：`docs/run-flow-graph.md`

---

## 4. 开发阶段

### Phase 1 — Writer Agent Server + x402 格式

**目标**：Writer 能暴露 HTTP 服务并返回 x402 格式的 402 报价

- [x] 初始化 Express + TypeScript 项目
- [x] 实现 `POST /execute` 端点
- [x] 无 paymentTx 时返回 HTTP 402 + x402 PaymentRequired 格式
- [x] 实现 requestHash 计算
- [x] 参考 `reference_code/x402/examples/typescript/servers/express/`

**验证**：curl 请求 `/execute`，收到 x402 格式的 402 响应

---

### Phase 2 — Writer LLM 集成（Vercel AI SDK）

**目标**：Writer 能用 Vercel AI SDK 执行 AI 任务

- [x] 安装 `ai` + `@ai-sdk/openai`（已写入 `package.json`）
- [x] 实现 `executeTask()` 调用 `generateText()` 生成内容（含无 Key fallback）
- [x] 实现 Receipt 签名（ethers.js signMessage）
- [x] 参考 `reference_code/ai/packages/ai/` 核心 API

**验证**：手动发请求（跳过支付），确认 LLM 返回内容 + Receipt

---

### Phase 3 — Hunter Agent Client

**目标**：Hunter 能发现服务并请求报价

- [x] 创建 Service Registry JSON 文件
- [x] 实现 `discover_services` 工具函数
- [x] 实现 `request_service` 工具函数
- [x] 解析 x402 PaymentRequired 响应
- [x] 验证 Hunter → Writer 通信（本地实测完成）

**验证**：Hunter 能读取 Registry 并向 Writer 发请求

---

### Phase 4 — Monad 支付集成

**目标**：Hunter 能在 Monad 上发起 MON 原生代币转账

- [x] 配置 Monad testnet provider（RPC: `https://testnet-rpc.monad.xyz`）
- [x] 实现 `check_balance` 工具函数
- [x] 实现 `make_payment` 工具函数（EOA→EOA sendTransaction）
- [x] 实现 `submit_payment` 工具函数
- [x] 参考 `reference_code/monad-testnetbot/` 的链交互方式

**验证**：Hunter 能发 MON 交易，Writer 能收到 txHash

---

### Phase 5 — 支付验证 + 重放防护

**目标**：Writer 能验证 MON 支付并防止重放

- [x] 实现 native-transfer 验证（tx.to, tx.value, receipt.status）
- [x] 实现重放防护（pending + used tx 集合）
- [x] 串联完整流程：支付 → 验证 → 执行 → 返回
- [x] 参考 a2a-x402 规范的错误码体系

**验证**：完整支付→执行闭环 + 重复 txHash 被拒绝（409）

---

### Phase 6 — Hunter ReAct Engine（Vercel AI SDK）

**目标**：Hunter 从脚本化升级为 ReAct 自主决策 Agent

- [x] 定义所有工具的 Vercel AI SDK tool schema
- [x] 使用 `generateText` + `tools` + `maxSteps` 实现 ReAct
- [x] 编写 Hunter System Prompt
- [x] 实现 `evaluate_service` 工具函数
- [x] 实现 `verify_receipt` 工具函数
- [x] 实现 `evaluate_result` 工具函数（可选）
- [x] Kimi 纯 ReAct 路径：保留 `reasoning_content` 的 tool-call 多轮消息，不再自动降级 scripted
- [x] 实现实时轨迹流 `POST/GET /run/stream`（SSE）

**验证**：给 Hunter 一个目标，观察它自主完成整个流程

---

### Phase 7 — Frontend Dashboard

**目标**：可视化展示 Agent 行为

- [x] 初始化 Next.js + shadcn 项目
- [x] 展示 Agent 决策链（Mission Timeline Phase 聚合）
- [x] 展示 x402 支付状态流转
- [x] 展示 Monad 交易详情（结果卡片跳转 monadscan）
- [x] 展示 Receipt 验证状态
- [x] 展示钱包余额变化（MVP 级本地展示）
- [x] Agent Onboarding（创建/注册流程，Level 1：Registry 内存态）

**验证**：打开 Dashboard 可观察完整闭环执行过程

---

## 5. 项目结构规划

```
monad-rebel/
├── agents/
│   ├── hunter/
│   │   ├── index.ts          # 入口
│   │   ├── react-engine.ts   # Vercel AI SDK ReAct 循环
│   │   ├── tools/            # 工具函数
│   │   │   ├── discover.ts
│   │   │   ├── payment.ts
│   │   │   ├── service.ts
│   │   │   └── verify.ts
│   │   ├── prompts.ts        # System Prompt
│   │   └── wallet.ts         # 钱包操作
│   └── writer/
│       ├── index.ts          # 入口（Express server）
│       ├── routes.ts         # API 路由
│       ├── executor.ts       # Vercel AI SDK 任务执行
│       ├── payment.ts        # 支付验证 + 重放防护
│       └── receipt.ts        # Receipt 签名
├── frontend/                 # Next.js Dashboard（My Agent / Mission Timeline / Agent Mesh）
├── shared/
│   ├── types.ts              # 共享类型（x402 数据结构等）
│   └── utils.ts              # 共享工具函数
├── registry/
│   └── services.json         # 服务注册表
├── scripts/
│   ├── demo.ts               # 调用 Hunter /run 的演示脚本
│   ├── verify-phase1.sh      # 验证 Writer 402 报价
│   └── verify-mvp.sh         # 验证 Hunter 闭环
├── docs/
├── reference_code/           # 参考代码（不纳入构建）
├── .env.example
├── package.json
└── README.md
```
