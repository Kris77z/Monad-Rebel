# Rebel Agent Mesh — 架构设计（Architecture）

## 0. 实现状态（2026-02-17）

- 已落地模块：
  - Writer：`/execute`（402 报价 + 支付验证 + LLM 执行 + Receipt 签名）
  - Hunter：`/run`（服务发现 → 报价 → 支付 → 提交 → 验签）
  - Hunter Trace：`/run/stream`（SSE 实时轨迹）
  - Service Registry：本地 JSON（`registry/services.json`）
- Hunter 运行模式：
  - 默认 `scripted`（稳定闭环）
  - 可选 `react`（`HUNTER_USE_REACT=true` + `KIMI_API_KEY` 或 `OPENAI_API_KEY`）
- 前端仍为占位服务，Phase 7 再切换为 Next.js Dashboard
- 工程清理项：`agents/hunter/src/wallet.ts` 仍有 1 处类型约束未收敛（不影响运行）

## 1. 系统架构总览

```
                    ┌──────────────────┐
                    │ Service Registry │  (JSON file)
                    └────────┬─────────┘
                             │ discover
                             ▼
  ┌─────────────────────────────────────────────┐
  │              Hunter Agent                    │
  │  ┌─────────┐  ┌──────────┐  ┌────────────┐ │
  │  │ ReAct   │  │ Wallet   │  │  Receipt   │ │
  │  │ Engine  │  │ (ethers) │  │  Verifier  │ │
  │  │(AI SDK) │  │          │  │            │ │
  │  └────┬────┘  └────┬─────┘  └────────────┘ │
  └───────┼────────────┼────────────────────────┘
          │ request    │ pay (MON native transfer)
          ▼            ▼
  ┌──────────────┐  ┌─────────────────┐
  │ Writer Agent │  │ Monad Blockchain│
  │ (Express+LLM)│  │  testnet:10143  │
  └──────────────┘  └─────────────────┘
```

---

## 2. 支付协议设计（x402-inspired + native-transfer scheme）

### 2.1 协议定位

我们采用 **x402 协议框架**（数据结构、402 响应格式、状态机），但实现自定义的 `native-transfer` scheme 来支持 **Monad 原生 MON 代币**的 EOA→EOA 转账。

> x402 官方的 `exact` scheme 依赖 EIP-3009（ERC-20 签名授权转账），不支持原生代币。
> 我们扩展了 x402 协议，证明其可扩展性。

### 2.2 支付状态机（参考 a2a-x402 规范）

```
payment-required  →  payment-submitted  →  payment-verified  →  payment-completed
                           ↓                                         ↓
                    payment-rejected                          payment-failed
```

### 2.3 完整时序

```
Hunter                    Writer                  Monad (10143)
  │                         │                       │
  │── POST /execute ───────>│                       │
  │<── 402 PaymentRequired ─│                       │
  │   {x402Version, accepts │                       │
  │    [{scheme:"native-   │                       │
  │      transfer",...}]}   │                       │
  │                         │                       │
  │── sendTransaction(MON)─────────────────────────>│
  │<── txHash ──────────────────────────────────────│
  │                         │                       │
  │── POST /execute ───────>│                       │
  │   {paymentTx: txHash}   │── getTransactionReceipt ──>│
  │                         │<── receipt ───────────│
  │                         │   verify tx...        │
  │                         │   executeTask(LLM)    │
  │<── {result, receipt} ──│                       │
  │                         │                       │
  │   verifyReceipt()       │                       │
```

### 2.4 x402 PaymentRequired 格式

```json
{
  "x402Version": 2,
  "resource": {
    "url": "/execute",
    "description": "AI Content Generation Service"
  },
  "accepts": [{
    "scheme": "native-transfer",
    "network": "eip155:10143",
    "amount": "10000000000000000",
    "asset": "native",
    "payTo": "0xWriterAddress...",
    "maxTimeoutSeconds": 60
  }]
}
```

### 2.5 参考代码

- `reference_code/x402/` — Coinbase 官方 x402 SDK
- `reference_code/a2a-x402/spec/v0.1/spec.md` — A2A x402 支付扩展规范
- `reference_code/x402/examples/typescript/servers/express/` — Express 服务端示例

---

## 3. Hunter Agent 设计（ReAct 模式）

Hunter 是一个 **ReAct Agent**，使用 **Vercel AI SDK** 实现自主决策。

### 3.1 ReAct 核心实现

```typescript
import { generateText } from 'ai';
import { openai } from '@ai-sdk/openai';

const result = await generateText({
  model: openai('gpt-4o-mini'),
  system: HUNTER_SYSTEM_PROMPT,
  prompt: goal,
  tools: hunterTools,
  maxSteps: 10,  // 自动循环，最多 10 步
});
```

Vercel AI SDK 的 `maxSteps` 参数会自动处理 ReAct 循环（工具调用→观察→再决策），省去手动写 while 循环。

Kimi（OpenAI-compatible）在 tool-call + thinking 场景下，要求多轮 assistant 消息保留 `reasoning_content`。
当前实现对 Kimi 使用纯 ReAct chat-completions 循环（保留 `reasoning_content`），不再回退到 scripted。

### 3.2 工具箱（Tools）

| 工具名 | 功能 | 返回值 |
|--------|------|--------|
| `discover_services` | 从 Registry 查询可用服务 | 服务列表 |
| `check_balance` | 查询 Monad 余额 | 余额（MON） |
| `evaluate_service` | 评估服务是否匹配需求 | 评估结论 + 理由 |
| `request_service` | 向 Writer 发请求，获取 402 报价 | PaymentRequired 信息 |
| `make_payment` | 在 Monad 上发起 MON 转账 | txHash |
| `submit_payment` | 提交 txHash 给 Writer，获取结果 | 任务结果 + Receipt |
| `verify_receipt` | 验证 Receipt 签名 | 验证结果 |
| `evaluate_result` | 评估结果质量 | 质量评分 + 分析 |

### 3.3 核心组件

- **ReAct Engine**：Vercel AI SDK `generateText` + `tools` + `maxSteps`
- **Wallet**：ethers.js Wallet，负责签名和发送 MON 转账
- **Service Client**：HTTP 客户端，与 Writer 通信
- **Receipt Verifier**：验证 Writer 签名

### 3.4 参考代码

- `reference_code/ai/` — Vercel AI SDK（`packages/ai` 核心包）
- `reference_code/ai/packages/openai/` — OpenAI Provider

### 3.5 实时轨迹流（SSE）

为了让前端可视化“思考与工具调用链”，Hunter 新增：

- `POST /run/stream`
- `GET /run/stream?goal=...`

事件流协议：

1. `ready`：运行模式与目标
2. `trace`：过程事件（`run_started`、`tool_call`、`tool_result`、`payment_state`、`receipt_verified`、`evaluation_completed` 等）
3. `done`：完整最终结果（同 `/run`）
4. `error`：失败信息

`trace` 事件中的 `payment_state` 对齐支付状态机（`payment-required` → `payment-submitted` → `payment-completed`）。

前端事件消费契约与示例见：`docs/frontend-streaming.md`。

---

## 4. Writer Agent 设计

Writer 是**服务提供者**，暴露 HTTP API，行为确定性。

### 4.1 核心组件

- **HTTP Server**（Express）：暴露 `/execute` 端点
- **Payment Verifier**：验证 Monad 交易 + 重放防护
- **Task Executor**：调 Vercel AI SDK 执行任务（内容生成）
- **Receipt Signer**：用私钥签名 Receipt

### 4.2 API 端点

#### `POST /execute`（无 paymentTx）→ 返回 402 报价

```json
// Response: HTTP 402
{
  "x402Version": 2,
  "resource": { "url": "/execute", "description": "AI Content Generation" },
  "accepts": [{
    "scheme": "native-transfer",
    "network": "eip155:10143",
    "amount": "10000000000000000",
    "asset": "native",
    "payTo": "0xWriter...",
    "maxTimeoutSeconds": 60
  }]
}
```

#### `POST /execute`（有 paymentTx）→ 验证 + 执行 + 返回结果

```json
// Request
{
  "paymentTx": "0xtxhash...",
  "taskInput": "写一篇关于 Monad 的分析"
}

// Response: HTTP 200
{
  "result": "Monad 是一个高性能 EVM 兼容链...",
  "receipt": {
    "requestHash": "0xabc...",
    "resultHash": "0xdef...",
    "provider": "0xWriter...",
    "timestamp": 1708000000,
    "signature": "0xsig..."
  },
  "payment": {
    "status": "payment-completed",
    "transaction": "0xtxhash...",
    "network": "eip155:10143"
  }
}
```

---

## 5. 数据结构定义

### 5.1 requestHash

```typescript
const requestHash = ethers.keccak256(
  ethers.solidityPacked(
    ['string', 'string', 'uint256', 'address'],
    [taskType, taskInput, timestamp, providerAddress]
  )
);
```

### 5.2 Receipt

```typescript
interface Receipt {
  requestHash: string;
  resultHash: string;    // keccak256(result)
  provider: string;      // Writer 地址
  timestamp: number;
  signature: string;     // Writer 私钥签名
}
```

### 5.3 Service Registry（JSON）

```json
{
  "services": [{
    "id": "writer-v1",
    "name": "AI Content Writer",
    "description": "Generate articles, tweets, analysis using AI",
    "endpoint": "http://localhost:3001",
    "price": "10000000000000000",
    "currency": "MON",
    "network": "eip155:10143",
    "provider": "0xWriter..."
  }]
}
```

---

## 6. 安全机制

### 6.1 支付验证（Writer 侧，native-transfer scheme）

```typescript
async function verifyNativeTransfer(txHash: string, expectedPayTo: string, expectedAmount: bigint) {
  // 1. 获取交易 receipt
  const receipt = await provider.getTransactionReceipt(txHash);
  assert(receipt && receipt.status === 1, "Transaction failed or not found");

  // 2. 获取交易详情
  const tx = await provider.getTransaction(txHash);

  // 3. 验证收款地址
  assert(tx.to === expectedPayTo, "Recipient mismatch");

  // 4. 验证金额
  assert(tx.value >= expectedAmount, "Insufficient payment amount");

  // 5. 重放防护
  assert(!usedPaymentTxs.has(txHash), "Payment already used");
  usedPaymentTxs.add(txHash);
}
```

### 6.2 重放防护

```typescript
const usedPaymentTxs = new Set<string>();
// MVP 内存存储，重启后清空（可接受）
```

### 6.3 Receipt 验证（Hunter 侧）

```typescript
const recoveredAddress = ethers.verifyMessage(resultHash, signature);
assert(recoveredAddress === providerAddress);
```

---

## 7. 错误处理

### 7.1 错误码体系（参考 x402 + a2a-x402）

| 状态码 | 含义 |
|--------|------|
| 400 | 请求格式错误（INVALID_PAYLOAD） |
| 402 | 需要支付（PAYMENT_REQUIRED，正常流程） |
| 409 | txHash 已使用（DUPLICATE_NONCE） |
| 422 | 支付金额不足（INVALID_AMOUNT）/ 收款地址不匹配（RECIPIENT_MISMATCH） |
| 500 | 执行失败（SETTLEMENT_FAILED / LLM 调用失败） |

### 7.2 失败策略

| 失败场景 | 处理方式 |
|----------|---------|
| 支付金额不足 | 返回 422 + INVALID_AMOUNT |
| txHash 已使用 | 返回 409 + DUPLICATE_NONCE |
| LLM 调用失败 | 返回 500，Hunter 可选重试 1 次 |
| 网络超时 | 30s 超时，终止流程 |
| Receipt 验签失败 | 标记 disputed，日志记录 |

**核心原则：fail-fast + 日志记录，MVP 不做自动恢复。**

---

## 8. 信任模型

| 信任来源 | 保障方式 |
|----------|---------|
| 支付信任 | Monad 区块链（链上不可篡改） |
| 执行信任 | Writer 签名（Receipt） |
| 验证信任 | 密码学验签（ecrecover） |

---

## 9. Monad 网络配置

| 参数 | 值 |
|------|---|
| 网络名称 | Monad Testnet |
| Chain ID | `10143` |
| CAIP-2 标识 | `eip155:10143` |
| 货币符号 | MON |
| RPC URL | `https://testnet-rpc.monad.xyz` |
| 浏览器 | `https://testnet.monadscan.com` |
| 水龙头 | `https://faucet.monad.xyz` |
| 出块时间 | 400ms |
| 最终性 | ~800ms（2 blocks） |
| Gas 计算 | 按 gas limit 收费（非 gas used） |
