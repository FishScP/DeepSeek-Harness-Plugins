/**
 * 纯函数：会话事件折叠（usage + stats）。无任何包依赖，供主机半部与单元测试引用。
 *
 * usage：累计 assistant/message 事件的 TokenUsage（输入未命中/命中、输出、推理）。
 * stats：对齐 @deepseek-ai/dsh-session-stats 的折叠语义——
 *   llmMs = step/start → assistant/message；ttft = step/start → 首个 token delta；
 *   decode = 首 token → message（仅当该步骤上报输出 tokens）；
 *   toolMs = tool/call → tool/result（按 callId 配对）；turns/steps 按 step/end 计。
 */

export const EMPTY_USAGE = Object.freeze({
  inputTokens: 0,
  cacheReadTokens: 0,
  cacheWriteTokens: 0,
  outputTokens: 0,
  reasoningTokens: 0,
  steps: 0
});

export const EMPTY_STATS = Object.freeze({
  turns: 0,
  steps: 0,
  llmMs: 0,
  toolMs: 0,
  ttftMs: 0,
  ttftSteps: 0,
  decodeMs: 0,
  decodeTokens: 0
});

/** 是否携带可见模型输出（与 dsh-llm/message.isTokenDelta 语义一致）。 */
export function isTokenDelta(chunk) {
  if (typeof chunk !== "object" || chunk === null) return false;
  switch (chunk.type) {
    case "text-delta":
    case "reasoning-delta":
      return typeof chunk.text === "string" && chunk.text !== "";
    case "tool-call-delta":
      return (typeof chunk.argumentsDelta === "string" && chunk.argumentsDelta !== "") || chunk.name !== undefined;
    default:
      return false;
  }
}

function pos(value) {
  return typeof value === "number" && Number.isFinite(value) && value >= 0 ? value : 0;
}

/** 折叠全部事件中的模型用量。 */
export function foldUsage(events) {
  const out = { ...EMPTY_USAGE };
  if (!Array.isArray(events)) return out;
  for (const event of events) {
    if (event === null || typeof event !== "object" || event.type !== "assistant/message") continue;
    const usage = event.data?.usage;
    if (typeof usage !== "object" || usage === null) continue;
    const inputTokens = pos(usage.inputTokens);
    const cacheReadTokens = pos(usage.cacheReadTokens);
    const cacheWriteTokens = pos(usage.cacheWriteTokens);
    const outputTokens = pos(usage.outputTokens);
    const reasoningTokens = pos(usage.reasoningTokens);
    if (inputTokens + cacheReadTokens + cacheWriteTokens + outputTokens + reasoningTokens === 0) continue;
    out.inputTokens += inputTokens;
    out.cacheReadTokens += cacheReadTokens;
    out.cacheWriteTokens += cacheWriteTokens;
    out.outputTokens += outputTokens;
    out.reasoningTokens += reasoningTokens;
    out.steps += 1;
  }
  return out;
}

/** 折叠全部事件的运行统计（对齐 dsh-session-stats 投影语义）。 */
export function foldStats(events) {
  const out = { ...EMPTY_STATS };
  if (!Array.isArray(events)) return out;
  let lastTurn = null;
  let openStep = null; // { turn, step, startTime, firstTokenTime }
  const pendingCalls = new Map();
  for (const event of events) {
    if (event === null || typeof event !== "object") continue;
    const time = typeof event.time === "number" ? event.time : 0;
    switch (event.type) {
      case "step/start": {
        const data = event.data ?? {};
        openStep = { turn: data.turn, step: data.step, startTime: time, firstTokenTime: null };
        break;
      }
      case "assistant/chunk": {
        if (openStep === null || openStep.turn !== event.data?.turn || openStep.step !== event.data?.step) break;
        if (openStep.firstTokenTime !== null || !isTokenDelta(event.data?.chunk)) break;
        openStep = { ...openStep, firstTokenTime: time };
        break;
      }
      case "assistant/message": {
        if (openStep === null || openStep.turn !== event.data?.turn || openStep.step !== event.data?.step) break;
        out.llmMs += Math.max(0, time - openStep.startTime);
        if (openStep.firstTokenTime !== null) {
          out.ttftMs += Math.max(0, openStep.firstTokenTime - openStep.startTime);
          out.ttftSteps += 1;
          const usage = event.data?.usage;
          const outputTokens = typeof usage?.outputTokens === "number" && usage.outputTokens >= 0 ? usage.outputTokens : null;
          if (outputTokens !== null) {
            out.decodeMs += Math.max(0, time - openStep.firstTokenTime);
            out.decodeTokens += outputTokens;
          }
        }
        openStep = null;
        break;
      }
      case "tool/call": {
        if (typeof event.data?.callId === "string") pendingCalls.set(event.data.callId, time);
        break;
      }
      case "tool/result": {
        const callId = event.data?.message?.source?.callId;
        if (typeof callId === "string" && pendingCalls.has(callId)) {
          out.toolMs += Math.max(0, time - pendingCalls.get(callId));
          pendingCalls.delete(callId);
        }
        break;
      }
      case "step/end": {
        if (event.data?.turn !== undefined) {
          out.turns = lastTurn === event.data.turn ? out.turns : out.turns + 1;
          lastTurn = event.data.turn;
          out.steps += 1;
        }
        openStep = null;
        break;
      }
      case "turn/end":
        pendingCalls.clear();
        break;
    }
  }
  return out;
}

/**
 * 一次折叠出 usage + stats + lastRequest。
 * lastRequest：最后一次带 usage 的模型请求的实测输入
 * （inputTokens + cacheReadTokens + cacheWriteTokens，即 DeepSeek 计费
 *  prompt_tokens 口径）与事件时间；无此类事件时为 null。
 */
export function foldSession(events) {
  const usage = foldUsage(events);
  const stats = foldStats(events);
  let lastRequest = null;
  if (Array.isArray(events)) {
    for (const event of events) {
      if (event === null || typeof event !== "object" || event.type !== "assistant/message") continue;
      const usageOf = event.data?.usage;
      if (typeof usageOf !== "object" || usageOf === null) continue;
      const input = pos(usageOf.inputTokens) + pos(usageOf.cacheReadTokens) + pos(usageOf.cacheWriteTokens);
      if (input + pos(usageOf.outputTokens) <= 0) continue;
      lastRequest = { input, at: typeof event.time === "number" ? event.time : 0 };
    }
  }
  return { usage, stats, lastRequest };
}
