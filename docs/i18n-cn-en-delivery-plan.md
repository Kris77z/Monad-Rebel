# Rebel Agent Mesh 中英双语落地方案（含 Agent 返回语言一致）

## 1. 目标与范围

### 1.1 目标

- 支持 `zh-CN` 与 `en-US` 两种语言。
- 前端 UI、时间数字格式、页面元信息支持中英切换。
- Hunter 与 Writer（含各 skill）返回内容语言与用户选择一致。
- 保持现有协议与数据结构兼容，老客户端不传语言参数也可正常运行。

### 1.2 本期范围（In Scope）

- `frontend`：文案国际化、语言切换、格式化本地化、请求透传语言。
- `agents/hunter`：接收语言参数并在任务编排、总结、错误信息中遵循目标语言。
- `agents/writer`：接收语言参数并约束模型输出语言。
- `agents/services/*/prompt.md`：保持技能语义不变，补充“输出语言由 runtime 指定”的约束。
- `shared`：补充语言类型与请求字段定义。

### 1.3 非范围（Out of Scope）

- 多于两种语言（如日语、韩语）。
- 文案管理平台接入（Crowdin/Lokalise）。
- 基于地区的定价、法务条款多版本。

## 2. 现状与改造必要性

当前项目主要问题：

- 前端无 i18n 基础设施，文案以硬编码为主。
- 时间/数字存在固定英文格式（如 `en-US`）。
- Hunter `/run` 与 Writer `/execute` 请求未携带语言上下文。
- skill prompt 默认英文语境，JSON/text 输出无统一语言约束。

结论：如果要做到“UI 和 Agent 输出语言一致”，必须做全链路改造，而不是只改前端文案。

## 3. 方案决策

### 3.1 语言标识

- 统一使用 BCP-47 子集：`zh-CN`、`en-US`。
- 共享类型新增：
  - `type LanguageCode = "zh-CN" | "en-US"`
  - `DEFAULT_LANGUAGE = "en-US"`

### 3.2 前端 i18n 技术方案

- 采用 `next-intl`（适配 Next.js App Router）。
- 路由采用 `/{locale}` 形式（如 `/zh/dashboard`, `/en/dashboard`）。
- 增加语言切换器，切换后保留当前页面路径和查询参数。
- `messages` 拆分为：
  - `frontend/messages/en-US.json`
  - `frontend/messages/zh-CN.json`

### 3.3 后端语言透传策略

- Frontend 调用 Hunter：
  - `/run`、`/run/stream` 增加 `locale` 参数（body 与 query 均支持）。
- Hunter 调用 Writer：
  - `/execute` 请求体增加 `locale` 字段。
- 默认回退：未传 `locale` 一律按 `en-US` 处理。

### 3.4 Agent 输出语言控制策略

- Hunter:
  - System Prompt 增加硬约束：最终 `finalMessage`、phase 总结使用目标语言。
  - Commander 模式下分解说明和结论也需遵循 `locale`。
- Writer:
  - 运行时在 prompt 前置注入语言指令，而不是复制两套 skill prompt。
  - 对 `output.type=json` 的 skill，要求：
    - JSON key 不变（英文、稳定 schema）
    - JSON value 的自然语言字段按 `locale` 输出。

## 4. 详细改造清单

### 4.1 shared（类型与协议）

- 文件：`shared/src/types.ts`
- 变更：
  - 新增 `LanguageCode` 类型。
  - `ExecuteRequest` 增加 `locale?: LanguageCode`。
  - 新增 `HunterRunRequest`（包含 `goal`, `mode`, `locale`）。
  - `HunterTraceEvent.data` 中建议补充可选 `locale`（用于前端调试与审计）。

### 4.2 frontend（UI + 本地化格式）

- 新增：
  - `frontend/src/i18n/request.ts`
  - `frontend/src/i18n/routing.ts`
  - `frontend/messages/en-US.json`
  - `frontend/messages/zh-CN.json`
  - `frontend/middleware.ts`（locale 检测/重定向）
- 改造：
  - `src/app/layout.tsx`：`lang` 动态化，metadata 本地化。
  - `src/components/**`：文本改为 `t("...")`。
  - `timeAgo`、`toLocaleTimeString`、`toLocaleString("en-US")` 改为基于当前 locale。
  - `use-agent-stream.ts`：发起 `/run/stream` 时附加 `locale`。
  - `onboarding` 与 `dashboard` 全文案迁移字典。

### 4.3 hunter（语言接入与传播）

- 文件：
  - `agents/hunter/src/index.ts`
  - `agents/hunter/src/react-engine.ts`
  - `agents/hunter/src/scripted-flow.ts`
  - `agents/hunter/src/commander-flow.ts`
  - `agents/hunter/src/prompts.ts`
  - `agents/hunter/src/tools/service.ts`
- 变更：
  - 解析请求中的 `locale`（query/body），注入 run context。
  - `run_started` / `ready` 事件包含 `locale`。
  - Prompt 注入语言约束（中文或英文）。
  - 调 Writer `/execute` 时透传 `locale`。
  - `finalMessage`、fallback 文案按 locale 输出。

### 4.4 writer（输出语言与 JSON 约束）

- 文件：
  - `agents/writer/src/routes.ts`
  - `agents/writer/src/executor.ts`
  - `agents/writer/src/skill-loader.ts`（可选，若需要将语言注入抽象为 helper）
- 变更：
  - 解析 `locale`，默认 `en-US`。
  - `generateText` prompt 追加语言指令。
  - fallback 输出（无 key 或调用失败）按 locale 生成。
  - JSON 技能结果校验保持不变，仅语言内容字段变化。

### 4.5 skill prompts（统一规范）

- 文件：`agents/services/*/prompt.md`
- 变更：
  - 追加统一说明：
    - “Respect runtime locale instruction.”
    - “For JSON outputs, keep schema keys stable.”
  - 不改技能本体能力描述，不拆分双语文件。

## 5. 实施阶段与工时

### 5.1 总工时（1 名工程师）

- 预估：`7-12 人天`
- 建议排期：`2 周`（含联调、回归、修复缓冲）

### 5.2 分阶段

1. Phase A（1-2 人天）
- 语言类型、请求字段、默认回退策略落地。
- Hunter/Writer 接口兼容改造。

2. Phase B（2-3 人天）
- 前端 i18n 基础设施（next-intl、路由、messages、语言切换）。
- Landing + Onboarding + Dashboard 主链路文本迁移。

3. Phase C（2-3 人天）
- Hunter prompt/commander/scripted 全链路语言一致。
- Writer runtime 语言控制与 JSON 输出约束。

4. Phase D（2-4 人天）
- 回归测试、SSE 流验证、异常文案验证、修复。
- 文档更新（README + 开发指南 + API 约定）。

## 6. 验收标准（DoD）

### 6.1 用户可见层

- 切换至中文后：
  - 页面标题、按钮、提示、状态文案均为中文。
  - 时间/数字格式符合中文习惯。
- 切换至英文后同理。

### 6.2 Agent 输出层

- 中文界面下发起任务：
  - Hunter `finalMessage` 为中文。
  - Writer `execution.result` 为中文（JSON 结构键不变）。
- 英文界面同理。

### 6.3 协议兼容

- 不传 `locale` 时，行为与当前版本兼容（默认英文）。
- SSE 不中断、状态机事件类型不变化。

### 6.4 稳定性

- `npm run typecheck` 通过。
- 关键路径手测通过：
  - Onboarding
  - Dashboard 运行任务（single + commander）
  - 历史记录、错误态、断链态

## 7. 风险与对策

1. 风险：模型不严格遵循输出语言  
对策：在 system+user 两层都注入语言约束；增加后处理检查（如检测中文字符比例/英文词比例）并重试 1 次。

2. 风险：JSON 技能输出被翻译导致 schema 破坏  
对策：明确“只翻译 value，不改 key”；继续使用现有 JSON parse 校验。

3. 风险：文案迁移遗漏导致中英混杂  
对策：增加 lint 规则或脚本扫描硬编码文本（仅白名单文件可含硬编码）。

4. 风险：SSE query 新增参数导致兼容问题  
对策：参数可选 + 默认值回退；保留当前 mode/goal 解析逻辑。

## 8. 交付物清单

- 新增中英文词典文件与 i18n 配置。
- Hunter/Writer 语言透传实现。
- Skill prompt 语言约束补充。
- 回归测试记录与验收 checklist。
- 文档更新：
  - 本文档
  - `README.md`（新增 i18n 使用说明）
  - `docs/development.md`（新增多语言开发约束）

## 9. 建议的下一步执行顺序

1. 先做 `shared + hunter + writer` 的协议字段打通（不改 UI）。
2. 再做 `frontend` 文案迁移和 locale 路由。
3. 最后做 prompt 收敛、回归测试和文档补齐。

---

本方案默认目标是“中英双语一致性优先”，即 UI 语言与 Agent 输出语言始终对齐；若后续需要“UI 语言与任务输出语言可分离”，可在此基础上追加 `outputLocale` 字段，成本约再增加 1-2 人天。
