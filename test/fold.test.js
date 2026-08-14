import test from "node:test";
import assert from "node:assert/strict";
import { EMPTY_USAGE, EMPTY_STATS, isTokenDelta, foldUsage, foldStats, foldSession } from "../lib/fold.js";

const msg = (turn, step, usage, time = 1000) => ({
  type: "assistant/message",
  time,
  data: { turn, step, message: { role: "assistant", content: [] }, usage }
});

test("foldUsage 累计命中/未命中/输出/推理并计数步骤", () => {
  const events = [
    msg(0, 0, { inputTokens: 2000, cacheReadTokens: 8000, outputTokens: 500, reasoningTokens: 100 }),
    msg(0, 1, { inputTokens: 100, cacheReadTokens: 0, outputTokens: 50 }),
    msg(1, 0, {}) // 无 usage 不计
  ];
  const usage = foldUsage(events);
  assert.equal(usage.inputTokens, 2100);
  assert.equal(usage.cacheReadTokens, 8000);
  assert.equal(usage.outputTokens, 550);
  assert.equal(usage.reasoningTokens, 100);
  assert.equal(usage.steps, 2);
});

test("foldUsage 对非数组/无 usage 事件返回零值", () => {
  assert.deepEqual(foldUsage(undefined), EMPTY_USAGE);
  assert.deepEqual(foldUsage([{ type: "user/message", data: {} }]), EMPTY_USAGE);
  assert.deepEqual(foldUsage([{ type: "assistant/message", data: {} }]), EMPTY_USAGE);
});

test("foldStats 累计 LLM/工具/ttft/解码统计", () => {
  const events = [
    { type: "step/start", time: 0, data: { turn: 0, step: 0 } },
    { type: "assistant/chunk", time: 100, data: { turn: 0, step: 0, chunk: { type: "text-delta", text: "你" } } },
    msg(0, 0, { outputTokens: 300 }, 2000),
    { type: "tool/call", time: 2000, data: { turn: 0, step: 1, callId: "c1", name: "read" } },
    { type: "tool/result", time: 3500, data: { turn: 0, step: 1, message: { source: { callId: "c1" } } } },
    { type: "step/end", time: 3500, data: { turn: 0, step: 1 } },
    { type: "step/start", time: 4000, data: { turn: 1, step: 0 } },
    { type: "step/end", time: 4500, data: { turn: 1, step: 0 } }
  ];
  const stats = foldStats(events);
  assert.equal(stats.llmMs, 2000);          // step0 start(0) → message(2000)
  assert.equal(stats.ttftMs, 100);           // start(0) → first chunk(100)
  assert.equal(stats.ttftSteps, 1);
  assert.equal(stats.decodeMs, 1900);        // first chunk(100) → message(2000)
  assert.equal(stats.decodeTokens, 300);
  assert.equal(stats.toolMs, 1500);          // call(2000) → result(3500)
  assert.equal(stats.turns, 2);
  assert.equal(stats.steps, 2);
});

test("foldStats 忽略空 delta 的 assistant/chunk", () => {
  const events = [
    { type: "step/start", time: 0, data: { turn: 0, step: 0 } },
    { type: "assistant/chunk", time: 100, data: { turn: 0, step: 0, chunk: { type: "text-delta", text: "" } } },
    { type: "assistant/chunk", time: 200, data: { turn: 0, step: 0, chunk: { type: "text-delta", text: "好" } } },
    msg(0, 0, { outputTokens: 10 }, 1000)
  ];
  const stats = foldStats(events);
  assert.equal(stats.ttftMs, 200); // 首个非空 delta
  assert.equal(stats.decodeMs, 800);
});

test("foldStats 对非数组返回零值", () => {
  assert.deepEqual(foldStats(undefined), EMPTY_STATS);
  assert.deepEqual(foldStats([]), EMPTY_STATS);
});

test("foldSession 组合折叠", () => {
  const events = [msg(0, 0, { inputTokens: 5, outputTokens: 7 })];
  const { usage, stats } = foldSession(events);
  assert.equal(usage.inputTokens, 5);
  assert.equal(usage.outputTokens, 7);
  assert.equal(stats.llmMs, 0); // 无 step/start 时不产生时长
});

test("foldSession 组合折叠", () => {
  const events = [msg(0, 0, { inputTokens: 5, outputTokens: 7 })];
  const { usage, stats } = foldSession(events);
  assert.equal(usage.inputTokens, 5);
  assert.equal(usage.outputTokens, 7);
  assert.equal(stats.llmMs, 0); // 无 step/start 时不产生时长
});

test("foldSession 记录最后一次请求的实测输入（计费 prompt_tokens 口径）", () => {
  const events = [
    msg(0, 0, { inputTokens: 100, cacheReadTokens: 900, outputTokens: 50 }, 1000),
    msg(1, 0, { inputTokens: 200, cacheReadTokens: 800, outputTokens: 60 }, 2000),
    { type: "user/message", time: 3000, data: {} }
  ];
  const { lastRequest } = foldSession(events);
  assert.equal(lastRequest.input, 1000); // 200 + 800
  assert.equal(lastRequest.at, 2000);
});

test("foldSession 无 usage 事件时 lastRequest 为 null", () => {
  assert.equal(foldSession([]).lastRequest, null);
  assert.equal(foldSession([{ type: "user/message", data: {} }]).lastRequest, null);
  assert.equal(foldSession([msg(0, 0, undefined)]).lastRequest, null);
});

test("isTokenDelta 语义", () => {
  assert.equal(isTokenDelta({ type: "text-delta", text: "a" }), true);
  assert.equal(isTokenDelta({ type: "text-delta", text: "" }), false);
  assert.equal(isTokenDelta({ type: "reasoning-delta", text: "r" }), true);
  assert.equal(isTokenDelta({ type: "tool-call-delta", name: "read" }), true);
  assert.equal(isTokenDelta({ type: "tool-call-delta", argumentsDelta: "{}", name: undefined }), true);
  assert.equal(isTokenDelta({ type: "heartbeat" }), false);
  assert.equal(isTokenDelta(undefined), false);
});
