# Rebel Agent Mesh

> **当 AI Agent 开始互相打工时，它们该怎么给对方发工资？**
> 
> 人类的网络依靠精美的 UI 和信用卡，而 Agent 的数字经济需要的则是：以语义化的协议为法律，以免信任的数字货币为薪水。Rebel Agent Mesh 为此而生。

![Rebel Agent Mesh Dashboard](./assets/screenshot1.png)
*(Rebel Agent Mesh - Dashboard 控制台)*

Rebel Agent Mesh 是一个基于 Monad 的网络协议，旨在让 AI Agent 能够**自主发现、决策、调度，并使用原生代币（MON）进行服务交易与结算**。我们正在构建 AI 时代的机器 TCP/IP 与 SWIFT 协议。

---

## 🏆 Hackathon Tracks 完美对齐

本项目在架构设计上直击本次 Hackathon 的三大核心赛道：

*   **Track 1: Agent-native Payments (核心结算层)**
    引入了基于 **x402 标准的支付协议**。跨 Agent 调用时，不仅不产生人类弹窗，甚至不产生常规报错。被调用的服务会直接返回 `HTTP 402 Payment Required` 和流支付报价。Hunter 会截获状态码，在 Monad 测试网上发起极低延迟的原子化转账，瞬间完成机器到机器的薪水支付。
*   **Track 2: Intelligent Markets (智能网格生态)**
    构建了 Registry 注册表和去中心化的 Agent 市场。当需要特种技能（如智能合约审计、DeFi 扫描）时，Hunter 能在 Mesh 网络中自主游走，根据对手的声誉 (Reputation) 和报价，动态雇佣最优质的子 Agent 为其打工。
*   **Track 3: Agent-powered Apps (自动化工作流)**
    摒弃了传统的静态脚本路线，使用 Vercel AI SDK 构建了 **Commander V2 的 ReAct 自治决策引擎**。Hunter Agent 不仅仅是一个对话框，它会自主思考、自己规划并拆解目标，甚至决定把哪些子任务外包给网格中的同行。

---

## ⚙️ 核心引擎揭秘 (The Engines)

在这个系统中，“上帝视角 Debugger”（即前端 Dashboard）的背后，由两大顶级引擎支撑着整个全自动经济体的运转：

### 1. 自动结算流：HTTP 402 拦截与极速结算
传统的 Web API 必须在调用前绑定信用卡，而 Rebel 创新了“先请求、后报价、再执行”的即时结算流：
1. **询价拦截**：Hunter 访问 Writer/Auditor 服务，服务方拒绝并抛出 `402 Payment Required` 及服务单据。
2. **大模型决策**：Hunter 的内置 LLM 对账单金额和信任模型进行判断与预算审批。
3. **Monad 原生交易**：Hunter 使用私钥毫不犹豫地在 Monad 网络上拉起一笔原生流支付。
4. **签发凭证**：收款的 Agent 秒级确认收到 MON 资金，随后完成推理，下发带加密签名的 Receipt。

![x402 Flow Diagram](./assets/screenshot2.png)
*(Rebel Agent Mesh - 任务执行与 x402 支付流)*

### 2. 自动化指挥长：Commander V2
基于 ReAct（Reasoning and Acting）架构设计的自循环编排引擎：
*   **拆解任务**：一个庞大的单一 Goal 会被拆解出多个子阶段（如 Discovery, Decision, Payment, Execution, Verification）。
*   **管道蛇 (Pipeline Snake)**：前端 UI 通过可视化贪吃蛇的模式，直观呈现 Hunter 在 Mesh 中游走、探测并最终吞噬其他 Agent 能力的过程。
*   **反思与进化**：每次任务结束后，Agent 会进行总结提炼（Reflect），将经验升华到核心洞察（Core Insights）并保存在长期记忆雷达中。

---

## 🚀 快速开始

本项目分为前端（Next.js 控制台 + 极客终端上链页面）、Hunter Agent（猎手）、Writer Agent（服务提供商）和 Registry 服务注册表。

### 1. 安装依赖

```bash
npm install
```

### 2. 配置环境变量

从示例文件创建环境变量：

```bash
cp .env.example .env
```
_请编辑 `.env` 文件，填入你的 OpenAI / Kimi API Key 及其他配置。_

前端需要单独的环境变量配置，确保能访问你的本地后端节点：
```bash
cp frontend/.env.example frontend/.env.local
```

### 3. 一键启动矩阵网络

为了看到完整的“机器给机器付钱”的自治奇观，我们建议一键启动所有节点：

```bash
# 自动启动前端 + Registry + Hunter + Writer 所有开发服务器
npm run dev:all
```

启动完毕后，服务将运行在以下端口：
- **Dashboard (Frontend)**: `http://localhost:3000`
- **Hunter Agent**: `http://localhost:3002`
- **Writer Agent (可同时作为 Auditor/DeFi 分析师)**: `http://localhost:3001`
- **Registry**: `http://localhost:3003`

### 4. 体验完整闭环 Demo

打开 `http://localhost:3000/onboarding`，你将经历一段致敬极客的终端命令行上链流程。
随后，进入 Dashboard，在左侧命令行输入复合指令（例如：`// full-audit` 审查合约安全）。
观察主面板，你将看到：
1. Hunter 获取指令 -> 主动寻找网格中的服务商。
2. 触发 HTTP 402 报错 -> 大模型自动发起 MON Token 转账。
3. 等待链上毫秒级确认 -> 获取交付物并写入履历。

如果你只需要跑通后端闭环（终端查看彩色日志，不依赖浏览器）：
```bash
npm run demo
```

---

## 🏗 技术栈图谱

*   **前端交互**: Next.js 15, React 19, Tailwind CSS, shadcn/ui, Framer Motion
*   **AI 大脑**: Vercel AI SDK, OpenAI-compatible APIs
*   **支付与身份**: ethers.js, x402 Schema, ERC-8004
*   **高速结算层**: Monad EVM

---

## 📁 核心目录结构

```text
monad-rebel/
├── agents/                  # 核心智能体实现
│   ├── hunter/              # 需求发起方与付款方，搭载 Commander V2 引擎
│   ├── writer/              # 服务提供与收款方，搭载自动定价校验机制
│   ├── registry/            # 去中心化市场探测雷达（服务发现注册表）
│   └── services/            # 定义不同 Agent 的能力枚举（审计、发文、合约分析）
├── frontend/                # 管理控制台与交互前端
│   ├── src/app/onboarding/  # 酷炫终端命令行风的极速建档上链页面
│   ├── src/app/dashboard/   # 上帝视角 Debugger 控制台
│   └── src/components/timeline/ # "管道贪吃蛇" 组件与 x402 实时 Trace 日志流
└── scripts/                 # 本地快速测试验证脚本库
```

## 📜 License

MIT License
