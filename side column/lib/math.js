/**
 * 纯函数模块：价格表、费用计算、百分比与数字处理。
 * 无任何 cordis / DSH 依赖，供 lib/index.js、bin/dsh-usage.js 与单元测试直接引用。
 *
 * 价格单位：元 / 每百万 tokens。
 * v4 系列价格按模型细分，并分空闲/高峰两档（高峰 = 空闲 × 2）：
 *   高峰时段 = 北京时间 9:00–12:00 与 14:00–18:00，其余为空闲时段。
 * 官方价格以 https://api-docs.deepseek.com/zh-cn/quick_start/pricing/ 为准，
 * 并可在插件设置中覆盖。
 */

/** V4 系列价格（元/百万 tokens，按模型 + 时段档）。 */
export const PRICING_BY_MODEL = {
  "deepseek-v4-flash": {
    offpeak: { hit: 0.05, miss: 1.5, output: 4.5 },
    peak: { hit: 0.1, miss: 3, output: 9 }
  },
  "deepseek-v4-pro": {
    offpeak: { hit: 0.15, miss: 4.5, output: 13.5 },
    peak: { hit: 0.3, miss: 9, output: 27 }
  }
};

/** 其他模型的兜底价格（chat / reasoner 两档，单档价）。 */
export const LEGACY_PRICING = {
  // deepseek-chat：输入(缓存命中) ¥0.2/M，输入(缓存未命中) ¥2/M，输出 ¥3/M
  chat: { hit: 0.2, miss: 2, output: 3 },
  // deepseek-reasoner：输入(缓存命中) ¥0.5/M，输入(缓存未命中) ¥4/M，输出 ¥16/M
  reasoner: { hit: 0.5, miss: 4, output: 16 },
};

/** 兼容别名。 */
export const DEFAULT_PRICING = LEGACY_PRICING;

/** 按模型名判定价格档：reasoner/r1 归推理档，其余归 chat 档。 */
export function modelTier(modelName) {
  if (typeof modelName !== "string" || modelName.length === 0) return "chat";
  return /reasoner|(^|[^a-z])r1([^a-z]|$)/i.test(modelName) ? "reasoner" : "chat";
}

/**
 * 按模型名匹配 V4 系列价格表；非 V4 系列返回 null。
 * @param modelName 如 "deepseek-v4-flash" / "deepseek-v4-pro-0813"。
 */
export function modelPricing(modelName) {
  if (typeof modelName !== "string" || modelName.length === 0) return null;
  const name = modelName.toLowerCase();
  if (name.includes("v4-pro")) return PRICING_BY_MODEL["deepseek-v4-pro"];
  if (name.includes("v4-flash") || name.includes("v4")) return PRICING_BY_MODEL["deepseek-v4-flash"];
  return null;
}

/**
 * 当前计费时段档（按北京时间）：9:00–12:00 与 14:00–18:00 为高峰，其余空闲。
 * @param now 默认当前时间；用 UTC+8 换算，不依赖服务器时区。
 */
export function currentTier(now = new Date()) {
  const beijingHour = (now.getUTCHours() + 8) % 24;
  const inPeak = (beijingHour >= 9 && beijingHour < 12) || (beijingHour >= 14 && beijingHour < 18);
  return inPeak ? "peak" : "offpeak";
}

/**
 * 解析某模型的价格（元 / 每百万 tokens）。
 * @param modelName 模型名；为空时按 chat 档。
 * @param tier 计费时段档："offpeak" | "peak"（V4 系列双档；非 V4 系列忽略）。
 * @param overrides 按模型全名的覆盖表 { "<model>": { hit, miss, output } }（单档，优先于内置表）。
 */
export function resolvePrice(modelName, tier = "offpeak", overrides = {}) {
  if (typeof modelName === "string" && modelName.length > 0) {
    const exact = overrides[modelName];
    if (exact !== undefined && exact !== null && typeof exact === "object") {
      const hit = toNumber(exact.hit);
      const miss = toNumber(exact.miss);
      const output = toNumber(exact.output);
      if (hit !== null && miss !== null && output !== null) return { hit, miss, output };
    }
  }
  const byModel = modelPricing(modelName);
  if (byModel !== null) return { ...byModel[tier === "peak" ? "peak" : "offpeak"] };
  return { ...LEGACY_PRICING[modelTier(modelName)] };
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
