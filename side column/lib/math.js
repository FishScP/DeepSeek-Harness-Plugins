/**
 * 纯函数模块：价格表、费用计算、百分比与数字处理。
 * 无任何 cordis / DSH 依赖，供 lib/index.js、bin/dsh-usage.js 与单元测试直接引用。
 *
 * 价格单位：元 / 每百万 tokens。
 * 默认价格取自 DeepSeek 官方定价页（V3.2 档），并可在插件设置中覆盖；
 * 官方价格以 https://api-docs.deepseek.com/zh-cn/quick_start/pricing/ 为准。
 */

export const DEFAULT_PRICING = {
  // deepseek-chat：输入(缓存命中) ¥0.2/M，输入(缓存未命中) ¥2/M，输出 ¥3/M
  chat: { hit: 0.2, miss: 2, output: 3 },
  // deepseek-reasoner：输入(缓存命中) ¥0.5/M，输入(缓存未命中) ¥4/M，输出 ¥16/M
  reasoner: { hit: 0.5, miss: 4, output: 16 },
};

/** 按模型名判定价格档：reasoner/r1 归推理档，其余归 chat 档。 */
export function modelTier(modelName) {
  if (typeof modelName !== "string" || modelName.length === 0) return "chat";
  return /reasoner|(^|[^a-z])r1([^a-z]|$)/i.test(modelName) ? "reasoner" : "chat";
}

/**
 * 解析某模型的价格（元 / 每百万 tokens）。
 * @param modelName 模型名；为空时按 chat 档。
 * @param overrides 按模型全名的覆盖表 { "<model>": { hit, miss, output } }。
 */
export function resolvePrice(modelName, overrides = {}) {
  if (typeof modelName === "string" && modelName.length > 0) {
    const exact = overrides[modelName];
    if (exact !== undefined && exact !== null && typeof exact === "object") {
      const hit = toNumber(exact.hit);
      const miss = toNumber(exact.miss);
      const output = toNumber(exact.output);
      if (hit !== null && miss !== null && output !== null) return { hit, miss, output };
    }
  }
  return { ...DEFAULT_PRICING[modelTier(modelName)] };
}

/**
 * 按 DSH TokenUsage 计算费用（元）。
 * 口径对齐 @deepseek-ai/dsh-llm 的说明：inputTokens 为未缓存输入，
 * cacheReadTokens 为缓存命中（DeepSeek 的 prompt_cache_hit_tokens），
 * cacheWriteTokens 通常为 0（DeepSeek 无缓存写入计费档，按未命中档计）。
 * 计费输入 = inputTokens + cacheReadTokens + cacheWriteTokens。
 *
 * 返回三类金额明细：{ hit, miss, output, total }，供三段占比条使用。
 */
export function usageCostBreakdown(usage, price) {
  const inputTokens = pos(usage?.inputTokens);
  const cacheReadTokens = pos(usage?.cacheReadTokens);
  const cacheWriteTokens = pos(usage?.cacheWriteTokens);
  const outputTokens = pos(usage?.outputTokens);
  const missTokens = inputTokens + cacheWriteTokens;
  const hitTokens = cacheReadTokens;
  const hit = (hitTokens * price.hit) / 1e6;
  const miss = (missTokens * price.miss) / 1e6;
  const output = (outputTokens * price.output) / 1e6;
  return { hit, miss, output, total: hit + miss + output };
}

export function usageCost(usage, price) {
  return usageCostBreakdown(usage, price).total;
}

/**
 * 输入侧缓存命中率（0-100）：命中 tokens ÷（命中 + 未命中）。
 * 无输入 tokens 时返回 null。
 */
export function cacheHitRate(hitTokens, missTokens) {
  const hit = pos(hitTokens);
  const miss = pos(missTokens);
  const denom = hit + miss;
  if (denom <= 0) return null;
  return clampPct((hit / denom) * 100);
}

/**
 * 可用余额百分比（0-100）。分母 = 赠金 + 充值（即账户历史入账总额）。
 * 分母不可用（<=0 或非有限数）时返回 null。
 */
export function balancePercent(total, granted, toppedUp) {
  const denom = granted + toppedUp;
  if (!Number.isFinite(denom) || denom <= 0 || !Number.isFinite(total)) return null;
  return clampPct((total / denom) * 100);
}

/**
 * 本会话消耗占比（0-100）。分母 = 会话开始余额 + 本会话消耗。
 * 任一输入不可用时返回 null。
 */
export function sessionPercent(sessionCost, sessionStartBalance) {
  if (!Number.isFinite(sessionCost) || sessionCost < 0) return null;
  if (!Number.isFinite(sessionStartBalance) || sessionStartBalance < 0) return null;
  const denom = sessionStartBalance + sessionCost;
  if (denom <= 0) return null;
  return clampPct((sessionCost / denom) * 100);
}

/** 余额百分比的颜色分级（供 UI 使用）。 */
export function percentLevel(pct) {
  if (pct === null || !Number.isFinite(pct)) return "none";
  if (pct >= 60) return "ok";
  if (pct >= 25) return "warn";
  return "low";
}

/** 金额格式化：CNY 用 ¥，其余币种前置代码；2 位小数（小金额升到 4 位）；不可用时返回 "--.--"。 */
export function formatMoney(value, currency = "CNY") {
  if (!Number.isFinite(value)) return "--.--";
  const abs = Math.abs(value);
  const digits = abs > 0 && abs < 0.01 ? 4 : 2;
  const prefix = currency === "CNY" ? "¥" : currency + " ";
  return prefix + value.toFixed(digits);
}

/** tokens 数量的紧凑格式：1234 → "1.2k"，1234567 → "1.2M"；不可用时返回 "--"。 */
export function formatTokens(value) {
  if (!Number.isFinite(value) || value < 0) return "--";
  if (value < 1000) return String(value);
  if (value < 1e6) return trimZero((value / 1e3).toFixed(1)) + "k";
  return trimZero((value / 1e6).toFixed(2)) + "M";
}

/** 时长的紧凑格式：500 → "500ms"，1500 → "1.5s"，65000 → "1m 05s"；不可用时返回 "--"。 */
export function formatDuration(ms) {
  if (!Number.isFinite(ms) || ms < 0) return "--";
  if (ms < 1000) return Math.round(ms) + "ms";
  const totalSeconds = ms / 1000;
  if (totalSeconds < 60) return trimZero(totalSeconds.toFixed(1)) + "s";
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = Math.round(totalSeconds - minutes * 60);
  return minutes + "m " + String(seconds).padStart(2, "0") + "s";
}

function trimZero(text) {
  return text.replace(/\.0+$/, "").replace(/(\.\d*[1-9])0+$/, "$1");
}

function pos(value) {
  return typeof value === "number" && Number.isFinite(value) && value >= 0 ? value : 0;
}

function toNumber(value) {
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) && n >= 0 ? n : null;
}

function clampPct(value) {
  return Math.max(0, Math.min(100, value));
}
