# Rebel Agent Mesh

> Agent-to-Agent 服务网络 — 基于 Monad 的自主 AI Agent 经济协议

## 🎯 项目简介

Rebel Agent Mesh 构建了一个让 AI Agent **自主发现、决策、支付、执行、验证**的服务网络。

核心原语：**Agent Service = Priced + Payable + Verifiable**

- **Track 1**：x402-inspired 支付协议，Monad 作为结算层
- **Track 2**：Hunter Agent 采用 ReAct 模式自主决策，具备强执行能力的 Agent 工作流

## 📌 当前能力

### 后端
- ✅ 完整闭环：发现服务 → 报价 → 链上支付 → 执行 → Receipt 验签
- ✅ Agent Identity：ERC-8004 链上注册 + Capability Advertising
- ✅ Feedback/Reputation 系统（持久化 + 链上联动）
- ✅ Dynamic Discovery：独立 Registry Service + TTL 心跳
- ✅ Multi-Provider：优选排序 + 报价失败回退
- ✅ Agent 注册 API：`POST /agents/register` + `GET /agents`
- ✅ Multi-Skill Provider：Writer 运行时按 `taskType` 动态路由（writer / auditor / defi）
- ✅ Hunter Memory：`reflect` 反思 + `experience/insights` 持久化
- ✅ Commander V2：ReAct 自主编排（`mode=commander`）+ budget 约束 + fallback phase
- ✅ Commander 回归测试：预算阻断 / phase 失败后继续 / 无工具调用 fallback
- ✅ Commander 运行控制：phase timeout + SSE 断连触发中断（best-effort）
- ✅ Commander 进阶回归：重试策略 / 手动中断 / 超时控制

### 前端
- ✅ Landing Page：极简营销页
- ✅ Dashboard：三栏布局（My Agent / Mission Timeline / Agent Mesh）
- ✅ Hunter Memory Profile：可视化 Agent 进化（技能雷达 + 经验统计 + 核心洞察）
- ✅ Pipeline Snake：全局流水线贪吃蛇，可视化 Commander 多阶段执行进度
  - 蛇在 Execution 等待期（30-90s）全速追逐 Food
  - 每完成一个 Phase，蛇身增长一节，直观展示"吸收了 N 个 Agent 能力"
- ✅ Commander Assembly Line：左栏精简（仅 Goal + Budget），Phase 卡片全部由中栏 Timeline 承载
- ✅ Onboarding：4 步用户创建 Agent 流程（钱包连接 → 表单 → 审核 → 完成）
- ✅ 钱包集成：@web3-onboard（MetaMask / WalletConnect v2 / Rabby）
- ✅ 真实 Agent Identity + MON 余额展示
- ✅ 多类型 Agent 可视化：Mesh + Pipeline Snake 按 `taskType` 区分
- ✅ Reputation 动态展示：评分条 + 趋势 + 样本量
- ✅ `execution_started` 事件监听：前端识别 Execution 阶段开始

## 🛠 技术选型

| 层级 | 技术 |
|------|------|
| 前端 | Next.js 15 + React 19 + Tailwind CSS + shadcn/ui + Motion |
| 后端（Agent） | TypeScript + Express |
| 区块链交互 | ethers.js（Monad EVM） |
| AI/LLM | Vercel AI SDK + OpenAI-compatible（OpenAI / Kimi） |
| 支付协议 | x402 协议格式 + native-transfer scheme |
| 钱包连接 | @web3-onboard/core + WalletConnect v2 + Injected |
| 包管理 | npm |

## 🚀 快速开始

### 1. 安装依赖

```bash
npm install
```

### 2. 配置环境变量

```bash
cp .env.example .env
# 编辑 .env 填入你的配置
```

前端额外需要 `frontend/.env.local`：
```env
NEXT_PUBLIC_HUNTER_URL=http://localhost:3002
NEXT_PUBLIC_WRITER_URL=http://localhost:3001
NEXT_PUBLIC_REGISTRY_URL=http://localhost:3003
NEXT_PUBLIC_WC_PROJECT_ID=your_walletconnect_project_id
```

### 3. 启动服务

```bash
# 仅启动后端 Agent（Hunter + Writer）
npm run dev

# 仅启动前端
npm run dev:frontend

# 一键启动全部（推荐联调时使用）
npm run dev:all
```

启动后：
- Frontend Dashboard: `http://localhost:3000`
- Writer Agent: `http://localhost:3001`
- Hunter Agent: `http://localhost:3002`
- Registry Service: `http://localhost:3003`

### 4. 运行完整闭环演示

```bash
npm run demo
```

### 5. 快速验证接口

```bash
# 验证 Writer 返回 402 报价
./scripts/verify-phase1.sh

# 验证 Hunter 触发完整闭环
./scripts/verify-mvp.sh

# 运行 Hunter 测试（包含 commander 回归）
npm run test --workspace @rebel/hunter

# 验证 Hunter 实时轨迹流（SSE）
curl -N -X POST http://localhost:3002/run/stream \
  -H "Content-Type: application/json" \
  -d '{"goal":"Write a concise Monad analysis focused on throughput and UX."}'
```

无钱包私钥时，系统会自动进入 `mock` 支付模式（用于本地跑通流程日志）。

## 📁 项目结构

```
monad-rebel/
├── agents/
│   ├── hunter/          # Hunter Agent（服务消费者，ReAct 决策）
│   ├── writer/          # Writer Agent（服务提供者，LLM 执行）
│   ├── registry/        # Registry Service（服务发现 + Agent 注册）
│   └── services/        # Skill 定义（writer / auditor / defi-analyst）
├── frontend/            # Next.js 15 Dashboard + Landing Page
│   ├── src/app/         # Next.js App Router 页面
│   │   ├── page.tsx         # Landing Page
│   │   ├── dashboard/       # Dashboard（三栏布局）
│   │   ├── onboarding/      # Agent 创建流程
│   │   └── api/             # Next.js Route Handlers
│   │       ├── chain-status/    # 链状态
│   │       └── hunter/profile/  # Hunter 记忆档案 API
│   ├── src/components/  # React 组件
│   │   ├── panels/          # 左栏 (MyAgentPanel) + 右栏 (AgentMeshPanel)
│   │   ├── timeline/        # 中栏阶段化时间线 + Pipeline Snake（全局流水线可视化）
│   │   ├── onboarding/      # Onboarding 表单
│   │   └── agent/           # Agent 操作组件（GoalInput / ResultView）
│   ├── src/hooks/       # React Hooks
│   │   ├── use-agent-stream.ts       # SSE 实时事件流
│   │   ├── use-agent-identity.ts     # Agent 身份 + 余额
│   │   ├── use-hunter-profile.ts     # Memory Profile 数据
│   │   ├── use-registry-services.ts  # Registry 全量服务
│   │   ├── use-wallet.ts             # @web3-onboard 钱包连接
│   │   └── use-onboarding.ts         # Onboarding 状态机
│   └── src/lib/         # 工具函数
│       ├── api-config.ts     # API 端点配置
│       └── web3-onboard.ts   # Onboard 初始化
├── shared/              # 共享类型定义与工具函数
├── registry/            # 静态服务注册表（JSON fallback）
├── scripts/             # 启动与演示脚本
└── ...                  # 其他本地辅助文件
```

## 🔗 API 端点

### Hunter Agent (`:3002`)
| 方法 | 路径 | 用途 |
|------|------|------|
| GET | `/identity` | 获取 Hunter 身份 + MON 余额 |
| POST | `/run` | 执行任务（同步） |
| POST | `/run/stream` | 执行任务（SSE 实时流） |

### Writer Agent (`:3001`)
| 方法 | 路径 | 用途 |
|------|------|------|
| GET | `/health` | 健康检查 |
| GET | `/identity` | 获取 Writer 身份信息 |
| POST | `/execute` | 报价 + 支付后执行（统一入口，按 `taskType` 路由 skill） |
| GET | `/feedback` | 查询当前 Writer 反馈 |
| GET | `/feedback/:agentId` | 查询指定 Agent 反馈 |
| GET | `/reputation` | 查询当前 Writer 信誉汇总 |
| GET | `/reputation/:agentId` | 查询指定 Agent 信誉汇总 |

### Registry Service (`:3003`)
| 方法 | 路径 | 用途 |
|------|------|------|
| GET | `/health` | 健康检查 |
| GET | `/services` | 列出已注册服务（含 reputation） |
| POST | `/services/register` | 注册服务（Writer 自动调用） |
| POST | `/services/:id/feedback` | 提交服务评分反馈 |
| GET | `/agents` | 列出已注册 Agent |
| POST | `/agents/register` | 注册 Agent 身份（Onboarding 调用） |

### Frontend API (Next.js, `:3000`)
| 方法 | 路径 | 用途 |
|------|------|------|
| GET | `/api/chain-status` | Monad 链状态轮询 |
| GET | `/api/hunter/profile` | Hunter 记忆档案（stats + skills + insights） |

## 📜 License

MIT
