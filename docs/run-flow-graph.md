# Rebel Agent Mesh — Run Flow Graph

## 0. 双层系统总览（Architecture 风格）

```text
                    ┌──────────────────────────────────────────┐
                    │               User Intent                 │
                    │      "Write a concise Monad analysis"    │
                    └─────────────────────┬────────────────────┘
                                          │
                                          ▼
┌────────────────────────────────────────────────────────────────────────────┐
│                         Application Layer (Default UI)                     │
│                                                                            │
│  ┌───────────────┐   run/stream   ┌─────────────────────────────────────┐  │
│  │   Frontend    │ <────────────> │            Hunter Agent             │  │
│  │ Task Workspace│                │ ReAct Planner + Tools Orchestrator  │  │
│  │ Result Canvas │                │ discover/evaluate/pay/verify/eval   │  │
│  └───────────────┘                └──────────────────┬──────────────────┘  │
└───────────────────────────────────────────────────────┼────────────────────┘
                                                        │ tool calls
                                                        ▼
┌────────────────────────────────────────────────────────────────────────────┐
│                         Infrastructure Layer (Proof UI)                    │
│                                                                            │
│  ┌──────────────────────┐       tx/payment        ┌──────────────────────┐ │
│  │     Writer Agent     │ <─────────────────────> │   Monad Testnet      │ │
│  │ x402 Quote + Execute │                         │   eip155:10143       │ │
│  │ Receipt Signer       │                         │   settlement layer    │ │
│  └───────────┬──────────┘                         └───────────┬──────────┘ │
│              │ receipt + status                              │ tx proof    │
│              └──────────────────────────┬────────────────────┘             │
│                                         ▼                                  │
│                          Proof Chain (for UI drawer)                       │
│             requestHash -> paymentTx -> receipt.signature -> verified       │
└────────────────────────────────────────────────────────────────────────────┘
```

这个图的阅读方式：

1. 上半部分是用户实际使用的应用层（输入目标、看进度、拿结果）。
2. 下半部分是可信结算与可验证交付的基础设施层（支付与证明）。
3. 前端默认聚焦应用层，按需展开基础设施证明链。

## 1. End-to-End Sequence (Application + Infra)

```mermaid
sequenceDiagram
  autonumber
  participant U as User
  participant F as Frontend
  participant H as Hunter
  participant W as Writer
  participant M as Monad

  U->>F: 输入 goal, 点击 Run
  F->>H: GET /run/stream?goal=...
  H-->>F: SSE ready { mode, goal }
  H-->>F: trace run_started

  H->>H: discover_services / evaluate_service
  H-->>F: trace services_discovered / service_selected

  H->>W: POST /execute (无 paymentTx)
  W-->>H: 402 quote { requestHash, amount, payTo }
  H-->>F: trace quote_received
  H-->>F: trace payment_state(payment-required)

  H->>M: sendTransaction(MON)
  M-->>H: txHash + receipt
  H-->>F: trace payment_state(payment-submitted)

  H->>W: POST /execute (paymentTx, taskInput, timestamp)
  W->>M: 校验 tx.to / tx.value / receipt.status
  W->>W: LLM execute + receipt sign
  W-->>H: 200 { result, receipt, payment }
  H-->>F: trace payment_state(payment-completed)

  H->>H: verify_receipt / evaluate_result
  H-->>F: trace receipt_verified / evaluation_completed
  H-->>F: trace run_completed
  H-->>F: SSE done (HunterRunResult)
  F-->>U: 展示结果 + 可验证证明
```

## 2. Frontend State Machine

```mermaid
stateDiagram-v2
  [*] --> Idle
  Idle --> Running: run_started
  Running --> Quoted: quote_received
  Quoted --> Paying: payment_state=payment-required
  Paying --> Settling: payment_state=payment-submitted
  Settling --> Delivered: payment_state=payment-completed
  Delivered --> Verified: receipt_verified(isValid=true)
  Verified --> Completed: done

  Running --> Failed: error / run_failed
  Quoted --> Failed: error / run_failed
  Paying --> Failed: error / run_failed
  Settling --> Failed: error / run_failed
  Delivered --> Failed: error / run_failed
  Verified --> Failed: error / run_failed
  Failed --> [*]
  Completed --> [*]
```

## 3. Proof Chain Graph

```mermaid
graph TD
  A[goal]
  B[quote.paymentContext.requestHash]
  C[paymentTx on Monad]
  D[execution.receipt.requestHash]
  E[execution.receipt.resultHash]
  F[execution.receipt.signature]
  G[receiptVerified=true]

  A --> B
  B --> C
  C --> D
  D --> F
  E --> F
  F --> G
```

说明：

1. 应用层主价值：`goal -> result -> actionability`。
2. Infra 主价值：`requestHash -> paymentTx -> signature -> verified`。
3. 前端默认先展示应用层结果，证明链放在可展开的 Proof 面板中。
