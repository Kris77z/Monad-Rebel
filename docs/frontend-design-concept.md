# Rebel Agent Mesh — Frontend Design Concept (Phase 7)

> **Vision**: Visualize the Invisible Agent Economy.
> 我们不是在这个 Dashboard 上操作 Agent，而是通过它**观察 (Observe)** Agent 构成的自主经济网络。

## 1. 核心理念 (Core Philosophy)

*   **God Mode (上帝视角)**：用户是观察者，看着 Agent 们在 Monad 网络上自主发现、决策、交易。
*   **Code is Law, UI is Evidence**：UI 的核心任务是展示**可验证的证据 (Evidence)**：ReAct 思考链、Hash、Signature、Receipt。
*   **Monad Vibe**：极速 (Speed)、高频 (High Frequency)、深邃 (Dark/Purple/Neon)。

## 2. UI 架构 (Architecture)

采用 **三栏布局 (Three-Column Layout)**，灵感归纳自 `multi-agent-marketplace`。

### 2.1 布局对比

```
当前布局 (Two-Column):
┌────────────────────┬───────────────────────────┐
│  Execution Log     │       Result Canvas       │
│  (left col-4)      │       (right col-8)       │
│  TraceTimeline     │       ResultView          │
└────────────────────┴───────────────────────────┘

目标布局 (Three-Column):
┌──────────────┬─────────────────────┬──────────────┐
│  Hunter(s)   │   Activity Stream   │  Services    │
│  (left 3)    │   (center 6)        │  (right 3)   │
│              │                     │              │
│  🟢 Status   │  🧠 Thinking Bubble │  🏷️ Writer   │
│  💰 Balance  │  ⚡ Tx Card         │  🏷️ Coder    │
│  📜 Mission  │  ✅ Receipt Card    │  🏷️ Auditor  │
└──────────────┴─────────────────────┴──────────────┘
```

### 2.2 布局映射

| 区域 | 功能定位 | 对应组件 | 数据源 |
| :--- | :--- | :--- | :--- |
| **左栏** | Demand Side (Consumers) | `<HunterPanel />` | SSE `ready` 事件 + 余额查询 |
| **中栏** | The Marketplace (Stream) | `<ActivityStream />` | SSE `trace` / `done` 事件 |
| **右栏** | Supply Side (Providers) | `<ServiceRegistry />` | `/registry` API |

### 2.3 视觉风格 (Aesthetics)

*   **Theme**: Dark Mode only. `bg-zinc-950` with `#836EF9` (Monad Purple) accents.
*   **Typography**: JetBrains Mono (Code) + Inter (UI). *(已配置)*
*   **Motion (Framer Motion)**:
    *   **Thinking**: 像打字机一样逐字出现的绿色/紫色文本。
    *   **Transaction**: 一个光点从左栏 (Hunter) 飞向右栏 (Provider)。
    *   **Block**: 顶部进度条每 400ms 闪烁一次 (Monad Block Time)。

## 3. 现有代码资产盘点 (Existing Code Audit)

### 3.1 保留资产 ✅

| 文件 | 价值 | 重构动作 |
| :--- | :--- | :--- |
| `hooks/use-agent-stream.ts` | ⭐⭐⭐⭐⭐ SSE 核心管道 | 原样保留，零修改 |
| `types/agent.ts` | ⭐⭐⭐⭐ 类型与后端对齐 | 保留，补充 `ServiceInfo` / `HunterStatus` 类型 |
| `components/agent/trace-timeline.tsx` | ⭐⭐⭐⭐ 所有事件类型已处理 | 移入中栏 `ActivityStream`，拆分为子组件 |
| `components/agent/result-view.tsx` | ⭐⭐⭐⭐ Receipt 展示完整 | 移入中栏底部，保持不变 |
| `components/agent/goal-input.tsx` | ⭐⭐⭐ Preset 设计好 | 移到 Header 区域 |
| `components/ui/*` | ⭐⭐⭐ shadcn/ui 标准 | 保留全部 (Card/Badge/Button/Textarea) |
| `app/layout.tsx` | ⭐⭐⭐ Dark + Fonts | 保留，添加 Monad 色系变量 |
| `tailwind.config.ts` | ⭐⭐⭐ shadcn/ui 标准配置 | 保留，扩展 Monad 颜色 |
| `globals.css` | ⭐⭐⭐ CSS 变量体系 | 保留，添加 `--monad` 色系 |

### 3.2 需要新增 🆕

| 组件 | 职责 | 参考来源 |
| :--- | :--- | :--- |
| `components/panels/hunter-panel.tsx` | 左栏：Hunter Agent 卡片列表 | LobeHub `AgentInfo` + Magentic `CustomerPanel` |
| `components/panels/service-registry.tsx` | 右栏：Service Provider 卡片列表 | LobeHub `PluginStore` + Magentic `BusinessPanel` |
| `components/stream/activity-stream.tsx` | 中栏容器：整合 Trace + Result | Magentic `MarketplaceCenter` |
| `components/stream/thinking-bubble.tsx` | 中栏子组件：ReAct 思考气泡 | LobeHub `StreamingMarkdown` + `Conversation` |
| `components/stream/transaction-card.tsx` | 中栏子组件：402 报价 / Tx / Receipt | 现有 `trace-timeline` 拆分 |
| `components/layout/mesh-header.tsx` | 顶部：Logo + GoalInput + Stats | 现有 `GoalInput` 迁移 |

### 3.3 重构后的文件结构 (Target)

```
frontend/src/
├── app/
│   ├── layout.tsx          # ✅ 保留 (添加 Monad theme)
│   ├── page.tsx            # 🔄 重构为三栏布局
│   └── globals.css         # ✅ 保留 (添加 --monad 变量)
├── components/
│   ├── ui/                 # ✅ 保留 (shadcn/ui 基础)
│   │   ├── badge.tsx
│   │   ├── button.tsx
│   │   ├── card.tsx
│   │   └── textarea.tsx
│   ├── layout/             # 🆕 新增
│   │   └── mesh-header.tsx
│   ├── panels/             # 🆕 新增
│   │   ├── hunter-panel.tsx
│   │   └── service-registry.tsx
│   └── stream/             # 🆕 新增 (从 agent/ 重构)
│       ├── activity-stream.tsx
│       ├── thinking-bubble.tsx
│       └── transaction-card.tsx
├── hooks/
│   └── use-agent-stream.ts # ✅ 原样保留
├── lib/
│   └── utils.ts            # ✅ 保留
└── types/
    └── agent.ts            # ✅ 保留 (扩展)
```

## 4. 角色设定 (Agent Personas)

为了让 Demo 生动，我们将复用 `MarketAgents` 中的高质量 Persona，构建一个即时的微型经济场景：

### 4.1 剧本 (The Narrative)

**场景：投资研究 (Investment Research)**

1.  **Hunter (Fund Manager)**: "我需要一份关于 MON 代币的一页纸投资备忘录。"
2.  **Provider A (Researcher)**: "我可以提供 MON 的基本面数据查询。" (`0.01 MON`)
3.  **Provider B (Writer)**: "我可以基于数据撰写深度文章。" (`0.05 MON`)
4.  **Provider C (Auditor)**: "我可以验证内容的真实性并签名。" (`0.005 MON`)

**流程演示**：
*   Hunter 思考 -> 发现 A, B, C -> 先买 A 的数据 -> 拿到数据后传给 B -> 买 B 的文章 -> 拿到文章传给 C -> 买 C 的签名 -> 完成。
*   **全程自动，链上结算 3 次。**

## 5. 技术栈 (Tech Stack)

*   **Framework**: Next.js 15 (App Router) *(已有)*
*   **Styling**: Tailwind CSS 3 + `shadcn/ui` *(已有)*
*   **Animation**: Framer Motion *(待安装)*
*   **State**: React Hook + SSE (`use-agent-stream.ts`) *(已有)*
*   **Icons**: Lucide React *(已有)*

## 6. 组件复用策略 (Component Reuse Strategy)

我们将从 `reference_code/lobehub` 中借鉴并简化以下核心组件，以快速构建高质量 UI：

| LobeHub Component | Target Usage | Description |
| :--- | :--- | :--- |
| `src/features/AgentInfo` | **Hunter Panel** | 展示 Agent 头像、名称、描述 |
| `src/features/PluginStore` | **Service Registry** | 展示 Service 卡片 (Grid Layout) |
| `src/features/Conversation` | **Activity Stream** | 展示 Bubble 对话气泡 (User/Assistant) |
| `src/components/StreamingMarkdown` | **Thinking Process** | 实时渲染 ReAct 思考流 (Typewriter effect) |
| `src/components/StatisticCard` | **Balance/Stats** | 展示 MON 余额和统计数据 |
| `src/components/BubblesLoading` | **Loading State** | 等待区块链确认时的动画 |

> **Note**: LobeHub 组件深度依赖 `antd-style`，我们采取"借鉴设计 + 简化实现"策略，用 Tailwind 重写核心样式，避免引入过重的依赖。

## 7. 开发路线图 (Roadmap)

### Step 1: Theme & Layout (基础设施)
*   在 `globals.css` 中添加 Monad 色系变量 (`--monad`, `--monad-glow`)
*   在 `tailwind.config.ts` 中扩展 `monad` 颜色
*   安装 `framer-motion`
*   重构 `page.tsx` 为三栏布局骨架

### Step 2: Panels (左右两栏)
*   实现 `HunterPanel` (左栏) — Agent 卡片 + 状态指示灯 + 余额
*   实现 `ServiceRegistry` (右栏) — Service 卡片列表 + 报价
*   实现 `MeshHeader` (顶部) — Logo + GoalInput (从现有迁移) + 统计数据

### Step 3: Activity Stream (中栏核心)
*   实现 `ActivityStream` 容器
*   从现有 `trace-timeline.tsx` 拆分出 `ThinkingBubble` 和 `TransactionCard`
*   接入 `useAgentStream` Hook (已有)

### Step 4: Animation & Polish
*   Framer Motion `AnimatePresence` 为列表项添加进出动画
*   支付时光点飞行动效
*   Monad Block Pulse 顶部进度条

### Step 5: Multi-Agent Demo
*   扩展后端支持多个 Provider Agent
*   前端右栏动态渲染多个 Service 卡片
*   中栏展示多轮交易序列

---
*Created: 2026-02-18 | Updated: 2026-02-18*
