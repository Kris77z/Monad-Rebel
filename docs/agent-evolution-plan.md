# Agent 自主进化系统（执行记录）

> 更新时间：2026-02-24
>
> 本文档已从“规划”切换为“落地记录”，用于同步当前代码状态与验证结果。

## 目标

让 Agent 从“固定流程执行器”升级为：
- 支持多技能服务（writer / auditor / defi analyst）
- 能按任务动态选择 `taskType`
- 具备任务反思与长期记忆（experience + insights）
- 前端可视化不同类型 Agent

## 当前架构（已落地）

```text
Hunter (ReAct + Memory)
    │
    ├── Memory Layer (JSON files)
    │   ├── agents/hunter/memory/experience.json
    │   └── agents/hunter/memory/insights.json
    │
    ├── Skill Definitions (filesystem)
    │   ├── agents/services/writer
    │   ├── agents/services/auditor
    │   └── agents/services/defi-analyst
    │
    └── Writer Runtime (single process, multi-skill routing)
        └── POST /execute (taskType -> dynamic skill loader)
```

## 已完成项

### 1) Skill 定义层

- 新增：
  - `agents/services/writer/prompt.md`
  - `agents/services/writer/config.json`
  - `agents/services/auditor/prompt.md`
  - `agents/services/auditor/config.json`
  - `agents/services/defi-analyst/prompt.md`
  - `agents/services/defi-analyst/config.json`
- 每个 skill `config.json` 包含：
  - `id` / `taskTypes` / `skills`
  - `priceWei`
  - `output`（`text` 或 `json`）

### 2) Writer 改造为通用 Skill 执行器

- 新增 `agents/writer/src/skill-loader.ts`：
  - 动态扫描并加载 `agents/services/*/prompt.md + config.json`
  - 基于 `taskType` / alias 解析 skill
- 更新 `agents/writer/src/executor.ts`：
  - 使用 skill prompt 替换硬编码 system prompt
  - 支持 JSON 输出校验与 fallback
- 更新 `agents/writer/src/routes.ts`：
  - `/execute` 按 skill 解析 canonical `taskType`
  - 402 报价金额按 skill 的 `priceWei` 返回

### 3) Registry 扩展

- 更新静态注册表：`registry/services.json`
  - 新增 `writer-v1` / `auditor-v1` / `defi-analyst-v1`
  - 增加 `taskType` 与 `skills`
- 扩展共享类型：`shared/src/types.ts`
  - `ServiceInfo` 增加可选字段：`taskType?: string`、`skills?: string[]`
- 修复动态服务存储：`shared/src/dynamic-service-store.ts`
  - 允许同一 agent 发布多个 service（按 `agentId + service.id` 去重）

### 4) Hunter 记忆系统

- 新增 `agents/hunter/src/memory.ts`
  - 经验读写：`experience.json`
  - 洞察聚合：`insights.json`
  - 任务前 memory prompt 注入
- 新增 `agents/hunter/src/tools/reflect.ts`
  - 将任务结果 + 评分总结为 lesson
  - 写入经验并更新洞察

### 5) Hunter Tools / ReAct 流程更新

- 新增或重写：
  - `agents/hunter/src/react-tool-catalog.ts`
  - `agents/hunter/src/react-engine.ts`
- 关键行为变化：
  - `request_service` 支持动态 `taskType`（可由 goal 推断，也可显式传入）
  - 新增 `reflect` 工具
  - 任务结束时若未显式 reflect，会自动补充写入记忆
- 更新 prompt 注入：
  - `agents/hunter/src/prompts.ts` 增加 `buildHunterSystemPrompt(memoryContext)`

### 6) 前端适配（多类型 Agent）

- 更新：
  - `frontend/src/components/panels/agent-mesh-panel.tsx`
  - `frontend/src/components/timeline/discovery-snake.tsx`
  - `frontend/src/components/timeline/mission-timeline.tsx`
  - `frontend/src/types/agent.ts`
- UI 变化：
  - Writer / Auditor / Analyst 使用不同标识与颜色
  - Discovery snake 支持多类型“食物”显示

## 额外同步（本轮）

- 修复前端 ESLint 配置链路：
  - `frontend/eslint.config.mjs`
  - 使用 `FlatCompat` 加载 `next/core-web-vitals` 与 `next/typescript`
  - 修复插件解析路径问题（`resolvePluginsRelativeTo`）
- 顺手修复若干 lint/type 错误（`any`、空接口、unknown 访问）：
  - `frontend/src/hooks/use-agent-stream.ts`
  - `frontend/src/components/agent/trace-timeline.tsx`
  - `frontend/src/components/ui/textarea.tsx`
  - `frontend/src/components/timeline/discovery-snake.tsx`
  - `frontend/src/types/agent.ts`

## 验证结果

### 自动化验证（已执行）

1. `npm run typecheck`
   - 结果：通过（hunter / registry / writer）
2. `npm run build --workspace @rebel/frontend`
   - 结果：通过（存在 2 条非阻塞 warning，均为 `@next/next/no-img-element`）

### 手工验证（待继续）

1. 提交 DeFi 任务，确认选择 `defi-analyst-v1`
2. 连续执行两次任务，确认第二次 prompt 包含第一轮经验
3. 在 dashboard 确认 mesh 与 snake 对多类型 Agent 的可视化

## 7) Skill 扩展（已完成）

- 新增 5 个真实 Skill（`agents/services/` 下），共 8 个 Agent：
  - `writer-v1` — AI Content Writer
  - `auditor-v1` — Smart Contract Auditor
  - `defi-analyst-v1` — DeFi Protocol Analyzer
  - `tx-decoder-v1` — Transaction Decoder
  - `gas-optimizer-v1` — Gas Optimizer
  - `token-scanner-v1` — Token Risk Scanner
  - `abi-reader-v1` — ABI Reader & Explainer
  - `yield-finder-v1` — Yield Strategy Finder
- 新增 `frontend/src/hooks/use-registry-services.ts`：从 Registry API 拉取全量服务
- 更新 `agent-mesh-panel.tsx`：合并 Registry 数据 + 事件数据，始终显示完整 Agent 网络
- 更新 `goal-input.tsx`：8 个快捷指令覆盖所有 Agent 类型
- 修复 `WRITER_AGENT_ID` 空字符串导致 Registry 注册 400 的 bug

---

## 8) Agent 声誉调节机制（已完成）

### 核心理念

让 Agent 之间形成**市场竞争**：质量好 → 评分高 → 被更多 Hunter 选择 → 更多收入；质量差 → 评分低 → 被市场淘汰。Hunter 通过 reputation + 记忆双重参考做出选择。

### 闭环流程

```text
Hunter 完成任务
    ↓
1. evaluate_result → 打分 (0-100)
    ↓
2. POST /services/{id}/feedback → 提交到 Registry
    ↓
3. Registry 聚合评分
   - 加权平均（近期权重更高）
   - 时间衰减（老评分逐步失效）
   - 最低样本量阈值（< 3 次使用不显示评分）
    ↓
4. GET /services 返回 reputation 字段
    ↓
5. Hunter discover 时参考 reputation
   - ReAct prompt 注入："优先选 reputation > 3.5 且性价比高的服务"
   - memory 补充个人经验："上次用 auditor-v1 质量差"
    ↓
6. 前端 mesh.net 实时显示 reputation 变化
```

### 数据结构

**Registry 侧 — ServiceReputation**

```json
{
  "serviceId": "auditor-v1",
  "reputation": {
    "score": 3.2,
    "count": 7,
    "trend": "down",
    "recentScores": [40, 35, 60, 25, 50],
    "lastUsedAt": 1708000000
  }
}
```

**Feedback 提交格式**

```json
{
  "serviceId": "auditor-v1",
  "hunterId": "10143:0x...",
  "missionId": "m-007",
  "score": 40,
  "taskType": "smart-contract-audit",
  "comment": "Output missed reentrancy in withdraw function"
}
```

### Hunter 选择逻辑

Hunter 的 ReAct system prompt 中注入以下策略：

```
服务选择策略（按优先级）：
1. reputation.score > 3.5 且 trend != "down" 的服务优先
2. 性价比 = reputation.score / price，越高越好
3. 你自己的 memory 中对该服务的历史评分
4. 如果所有服务 reputation 都低，选最便宜的尝试
5. 从未使用过的服务给予 exploration bonus（鼓励探索）
```

### 实现步骤

| 步骤 | 内容 | 位置 | 状态 |
|:--|:--|:--|:--|
| 8a | Registry 新增 `POST /services/:id/feedback` | `agents/registry/src/index.ts` | ✅ |
| 8b | Registry 新增声誉聚合逻辑 | `shared/src/service-reputation.ts` | ✅ |
| 8c | `GET /services` 返回值增加 `reputation` 字段 | `shared/src/types.ts` + `agents/registry/src/index.ts` | ✅ |
| 8d | Hunter `give_feedback` 工具改为同时提交到 Registry | `agents/hunter/src/tools/feedback.ts` | ✅ |
| 8e | Hunter discover 后的 prompt 注入 reputation 数据 | `agents/hunter/src/prompts.ts` + `agents/hunter/src/react-engine.ts` | ✅ |
| 8f | 前端 mesh.net 显示动态 reputation（替代硬编码值） | `frontend/src/components/panels/agent-mesh-panel.tsx` | ✅ |

## 备注

- 原文档中 `services.json` 路径为 `agents/registry/services.json`，实际生效路径为 `registry/services.json`。
- Writer 目前是"单进程动态技能路由"，而非独立多进程 provider；对外行为等价为多技能服务。
- Reputation 系统 MVP 用 JSON 文件存储；后续可迁移到链上（Monad 合约存储评分，不可篡改）。
