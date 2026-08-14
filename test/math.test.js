import test from "node:test";
import assert from "node:assert/strict";
import {
  DEFAULT_PRICING,
  modelTier,
  resolvePrice,
  usageCost,
  usageCostBreakdown,
  cacheHitRate,
  balancePercent,
  sessionPercent,
  percentLevel,
  formatMoney,
  formatTokens,
  formatDuration
} from "../lib/math.js";

test("modelTier 将 reasoner/r1 归入推理档，其余归 chat 档", () => {
  assert.equal(modelTier("deepseek-reasoner"), "reasoner");
  assert.equal(modelTier("deepseek-r1-0528"), "reasoner");
  assert.equal(modelTier("deepseek-chat"), "chat");
  assert.equal(modelTier("deepseek-v4-pro"), "chat");
  assert.equal(modelTier(""), "chat");
  assert.equal(modelTier(undefined), "chat");
});

test("resolvePrice 默认按档返回官方价格", () => {
  assert.deepEqual(resolvePrice("deepseek-chat"), DEFAULT_PRICING.chat);
  assert.deepEqual(resolvePrice("deepseek-reasoner"), DEFAULT_PRICING.reasoner);
});

test("resolvePrice 支持按模型全名覆盖", () => {
  const overrides = { "deepseek-chat": { hit: 1, miss: 2, output: 3 } };
  assert.deepEqual(resolvePrice("deepseek-chat", overrides), { hit: 1, miss: 2, output: 3 });
  assert.deepEqual(resolvePrice("deepseek-reasoner", overrides), DEFAULT_PRICING.reasoner);
});

test("resolvePrice 忽略非法覆盖值", () => {
  const overrides = { "deepseek-chat": { hit: -1, miss: "x", output: 3 } };
  assert.deepEqual(resolvePrice("deepseek-chat", overrides), DEFAULT_PRICING.chat);
});

test("usageCost 按命中/未命中/输出三段计费", () => {
  const price = { hit: 0.2, miss: 2, output: 3 };
  // 2M 未命中输入 + 1M 命中输入 + 0.5M 输出
  const usage = { inputTokens: 2_000_000, cacheReadTokens: 1_000_000, outputTokens: 500_000 };
  const expected = (2_000_000 * 2 + 1_000_000 * 0.2 + 500_000 * 3) / 1e6;
  assert.ok(Math.abs(usageCost(usage, price) - expected) < 1e-9);
  // cacheWrite 按未命中档计
  const withWrite = { ...usage, cacheWriteTokens: 100_000 };
  const expectedWrite = expected + (100_000 * 2) / 1e6;
  assert.ok(Math.abs(usageCost(withWrite, price) - expectedWrite) < 1e-9);
});

test("usageCost 对空/非法 usage 返回 0", () => {
  assert.equal(usageCost(undefined, DEFAULT_PRICING.chat), 0);
  assert.equal(usageCost({}, DEFAULT_PRICING.chat), 0);
  assert.equal(usageCost({ inputTokens: "x", outputTokens: -5 }, DEFAULT_PRICING.chat), 0);
});

test("usageCostBreakdown 拆出命中/未命中/输出三段金额且合计一致", () => {
  const price = { hit: 0.2, miss: 2, output: 3 };
  const usage = { inputTokens: 2_000_000, cacheReadTokens: 1_000_000, cacheWriteTokens: 100_000, outputTokens: 500_000 };
  const parts = usageCostBreakdown(usage, price);
  const expectHit = (1_000_000 * 0.2) / 1e6;
  const expectMiss = ((2_000_000 + 100_000) * 2) / 1e6;
  const expectOutput = (500_000 * 3) / 1e6;
  assert.ok(Math.abs(parts.hit - expectHit) < 1e-9);
  assert.ok(Math.abs(parts.miss - expectMiss) < 1e-9);
  assert.ok(Math.abs(parts.output - expectOutput) < 1e-9);
  assert.ok(Math.abs(parts.total - (parts.hit + parts.miss + parts.output)) < 1e-9);
  assert.ok(Math.abs(parts.total - usageCost(usage, price)) < 1e-9);
});

test("cacheHitRate 计算输入缓存命中率", () => {
  assert.ok(Math.abs(cacheHitRate(1_000_000, 2_000_000) - 100 / 3) < 1e-9);
  assert.equal(cacheHitRate(0, 100), 0);
  assert.equal(cacheHitRate(100, 0), 100);
  assert.equal(cacheHitRate(0, 0), null);
  assert.equal(cacheHitRate(undefined, undefined), null);
});

test("balancePercent 计算可用百分比并钳制在 0-100", () => {
  assert.equal(balancePercent(110, 10, 100), 100);
  assert.equal(balancePercent(55, 10, 100), 50);
  assert.equal(balancePercent(0, 10, 100), 0);
  assert.equal(balancePercent(50, 0, 0), null);      // 分母不可用
  assert.equal(balancePercent(NaN, 10, 100), null);  // 总额不可用
});

test("sessionPercent 计算本会话消耗占比", () => {
  // 开始余额 100，消耗 10 → 10/(100+10)
  assert.ok(Math.abs(sessionPercent(10, 100) - (10 / 110) * 100) < 1e-9);
  assert.equal(sessionPercent(0, 100), 0);
  assert.equal(sessionPercent(-1, 100), null);
  assert.equal(sessionPercent(10, -1), null);
});

test("percentLevel 颜色分级", () => {
  assert.equal(percentLevel(80), "ok");
  assert.equal(percentLevel(60), "ok");
  assert.equal(percentLevel(59.9), "warn");
  assert.equal(percentLevel(25), "warn");
  assert.equal(percentLevel(24.9), "low");
  assert.equal(percentLevel(null), "none");
});

test("formatMoney 币种前缀与小数位", () => {
  assert.equal(formatMoney(110), "¥110.00");
  assert.equal(formatMoney(0.001), "¥0.0010");
  assert.equal(formatMoney(1.5, "USD"), "USD 1.50");
  assert.equal(formatMoney(NaN), "—");
});

test("formatTokens 紧凑格式", () => {
  assert.equal(formatTokens(0), "0");
  assert.equal(formatTokens(999), "999");
  assert.equal(formatTokens(1234), "1.2k");
  assert.equal(formatTokens(1_234_567), "1.23M");
  assert.equal(formatTokens(NaN), "—");
});

test("formatDuration 时长紧凑格式", () => {
  assert.equal(formatDuration(500), "500ms");
  assert.equal(formatDuration(1500), "1.5s");
  assert.equal(formatDuration(65000), "1m 05s");
  assert.equal(formatDuration(NaN), "—");
});
