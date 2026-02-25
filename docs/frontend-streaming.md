# Rebel Agent Mesh — Frontend Streaming Contract

## 1. 目标

本文件定义前端接入 Hunter 实时轨迹流（SSE）的契约，供 Phase 7 Dashboard 直接使用。

后端入口：

- `POST /run/stream`
- `GET /run/stream?goal=...`

## 2. SSE 事件协议

SSE 事件名固定为：

1. `ready`
2. `trace`
3. `done`
4. `error`

### 2.1 `ready`

```json
{
  "mode": "react",
  "goal": "Write a concise Monad analysis focused on throughput and UX."
}
```

### 2.2 `trace`

```json
{
  "type": "tool_call",
  "at": "2026-02-17T06:04:39.968Z",
  "data": {
    "tool": "discover_services",
    "args": {}
  }
}
```

`trace.type` 枚举（与 `shared/src/types.ts` 对齐）：

- `run_started`
- `services_discovered`
- `service_selected`
- `quote_received`
- `payment_state`
- `tool_call`
- `tool_result`
- `receipt_verified`
- `evaluation_completed`
- `feedback_submitted`
- `llm_response`
- `run_completed`
- `run_failed`

### 2.3 `done`

`done` payload 与 `POST /run` 的响应结构一致（`HunterRunResult`）。

关键新增字段（2026-02-24）：

- `service.taskType?: string`
- `service.skills?: string[]`
- `reflection?: { missionId, taskType, score, lesson, ... }`

### 2.4 `error`

`error` payload 为：

```json
{
  "code": "STRING",
  "message": "STRING",
  "details": {}
}
```

## 3. 前端渲染映射建议

建议将 `trace` 事件映射到三个视图区块：

1. 时间线（Timeline）：
- 展示 `run_started -> ... -> run_completed`
- 每个节点显示 `type` + `at` + 关键字段

2. 支付状态卡（Payment State）：
- 使用 `payment_state.status` 更新状态
- 状态顺序：`payment-required` -> `payment-submitted` -> `payment-completed`

3. 工具调用面板（Tools）：
- `tool_call`：显示工具名与入参
- `tool_result`：显示工具输出摘要（后端已做裁剪，避免过大）

## 4. 客户端接入示例

### 4.1 GET + EventSource（浏览器原生）

```ts
const goal = encodeURIComponent("Write a concise Monad analysis focused on throughput and UX.");
const es = new EventSource(`http://localhost:3002/run/stream?goal=${goal}`);

es.addEventListener("ready", (e) => {
  const payload = JSON.parse((e as MessageEvent).data);
  console.log("ready", payload);
});

es.addEventListener("trace", (e) => {
  const payload = JSON.parse((e as MessageEvent).data);
  console.log("trace", payload);
});

es.addEventListener("done", (e) => {
  const payload = JSON.parse((e as MessageEvent).data);
  console.log("done", payload);
  es.close();
});

es.addEventListener("error", (e) => {
  console.error("stream error", e);
  es.close();
});
```

### 4.2 POST（需要自定义 SSE 解析）

推荐前端优先使用 `GET + EventSource`；如果必须 POST，请使用支持 `fetch` 流式解析的方案（如手写 reader）。

## 5. 终态判断

前端收到以下任一事件后，当前 run 结束：

1. `done`
2. `error`

并应关闭流连接，释放订阅。

## 6. 注意事项

1. 连接期间后端会发送心跳注释 `: ping`，前端可忽略。
2. `trace.data` 为动态对象，前端应做类型守卫，不要假设字段始终存在。
3. 目前 `trace` 事件顺序在单次 run 内是有序追加；前端仍建议按 `at` 排序兜底。
