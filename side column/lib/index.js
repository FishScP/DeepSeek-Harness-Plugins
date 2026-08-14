import { z } from "zod";
import { TypertRemoteService } from "@deepseek-ai/dsh-typert-protocol";
import { credentialRef } from "@deepseek-ai/dsh-credentials";
import { balancePercent, cacheHitRate, resolvePrice, sessionPercent, usageCostBreakdown } from "./math.js";
import { EMPTY_USAGE, EMPTY_STATS, foldSession } from "./fold.js";

/**
 * dsh-usage-column - host half.
 *
 * 用量数据双通道（v0.3）：
 *   1) 日志折叠：sessionQuery.readSession 读持久化事件折叠（若日志记录 usage）；
 *   2) 实时监听：apply 时监听 session/event 的 assistant/message，把 usage 累计并
 *      持久化到 settings 命名空间 "usage-column.liveUsage"（网关运行期间必然生效，
 *      重启后从持久化恢复）。
 *   快照取「日志折叠有步骤数据」时用日志，否则用实时累计。
 *   余额走官方公开接口 GET https://api.deepseek.com/user/balance，
 *   API Key 通过 credentials 服务解析 DEEPSEEK_API_KEY（逐次解析，不缓存）。
 *   上下文窗口：llm.resolveModelInfo(context.contextWindow) 优先，
 *   缺省 settings contextWindow（1M）；已用 = tokenMeter 会话表面 tokens。
 *   会话基线（开始余额）与价格覆盖表持久化在 settings 命名空间
 *   "usage-column"，缺失时降级为进程内存。
 */

export const name = "usage-column";
export const inject = ["typert", "sessions"];

// ── wire schemas（zod v4）────────────────────────────────────────────────────

const priceSchema = z.object({ hit: z.number().nonnegative(), miss: z.number().nonnegative(), output: z.number().nonnegative() }).strict();
const pricingMapSchema = z.record(z.string(), priceSchema);

const costSchema = z.object({
  hit: z.number().nonnegative(),
  miss: z.number().nonnegative(),
  output: z.number().nonnegative(),
  total: z.number().nonnegative()
}).strict();

const usageViewSchema = z.object({
  inputTokens: z.number().int().nonnegative(),      // 缓存未命中
  cacheReadTokens: z.number().int().nonnegative(),  // 缓存命中
  cacheWriteTokens: z.number().int().nonnegative(),
  outputTokens: z.number().int().nonnegative(),
  reasoningTokens: z.number().int().nonnegative(),
  steps: z.number().int().nonnegative()
}).strict();

const statsViewSchema = z.object({
  turns: z.number().int().nonnegative(),
  steps: z.number().int().nonnegative(),
  llmMs: z.number().nonnegative(),
  toolMs: z.number().nonnegative(),
  ttftMs: z.number().nonnegative(),
  ttftSteps: z.number().int().nonnegative(),
  decodeMs: z.number().nonnegative(),
  decodeTokens: z.number().int().nonnegative()
}).strict();

const contextViewSchema = z.object({
  window: z.number().int().positive(),
  used: z.number().int().nonnegative(),
  remaining: z.number().int().nonnegative(),
  approximate: z.boolean()
}).strict();

const debugViewSchema = z.object({
  sessionFound: z.boolean(),
  events: z.number().int().nonnegative(),
  steps: z.number().int().nonnegative(),
  liveSteps: z.number().int().nonnegative()
}).strict();

const balanceViewSchema = z.object({
  ok: z.boolean(),
  currency: z.string(),
  total: z.number(),
  granted: z.number(),
  toppedUp: z.number(),
  usablePercent: z.number().nullable(),
  error: z.string().nullable(),
  source: z.string().nullable()
}).strict();

const snapshotViewSchema = z.object({
  version: z.string(),
  sessionId: z.string().nullable(),
  model: z.string().nullable(),
  balance: balanceViewSchema,
  usage: usageViewSchema,
  cost: costSchema,
  priceUsed: priceSchema.nullable(),
  stats: statsViewSchema,
  context: contextViewSchema.nullable(),
  hitRate: z.number().nullable(),
  tokenPerSec: z.number().nullable(),
  baseline: z.number().nullable(),
  sessionPercent: z.number().nullable(),
  asOfSeq: z.number().int(),
  at: z.number().int(),
  debug: debugViewSchema
}).strict();

const okResultSchema = z.object({ ok: z.boolean() }).strict();

// ── settings schema ──────────────────────────────────────────────────────────

const liveUsageSchema = z.object({
  inputTokens: z.number().int().nonnegative(),
  cacheReadTokens: z.number().int().nonnegative(),
  cacheWriteTokens: z.number().int().nonnegative(),
  outputTokens: z.number().int().nonnegative(),
  reasoningTokens: z.number().int().nonnegative(),
  steps: z.number().int().nonnegative(),
  at: z.number().int()
}).strict();

const settingsSchema = z.object({
  pricingOverrides: z.record(z.string(), priceSchema).default({}),
  baselines: z.record(z.string(), z.object({ balance: z.number(), at: z.number().int() }).strict()).default({}),
  contextWindow: z.number().int().positive().default(1_000_000),
  liveUsage: z.record(z.string(), liveUsageSchema).default({})
});

// ── typert manifest ──────────────────────────────────────────────────────────

const MANIFEST = {
  package: "dsh-usage-column",
  face: "host",
  schemas: [],
  invocations: [
    {
      id: "dsh-usage-column#usageColumn/snapshot",
      service: "usageColumn",
      namespace: "usageColumn",
      method: "snapshot",
      invocation: { kind: "direct" },
      parameters: [
        { name: "sessionId", wire: "sessionId", source: "json", acceptsUndefined: true, codec: { mode: "strict", typeSymbol: "dsh-usage-column#sessionId", schema: z.string() } }
      ],
      result: { mode: "strict", typeSymbol: "dsh-usage-column#Snapshot", schema: snapshotViewSchema }
    },
    {
      id: "dsh-usage-column#usageColumn/balance",
      service: "usageColumn",
      namespace: "usageColumn",
      method: "balance",
      invocation: { kind: "direct" },
      parameters: [],
      result: { mode: "strict", typeSymbol: "dsh-usage-column#Balance", schema: balanceViewSchema }
    },
    {
      id: "dsh-usage-column#usageColumn/setPricing",
      service: "usageColumn",
      namespace: "usageColumn",
      method: "setPricing",
      invocation: { kind: "direct" },
      parameters: [
        { name: "pricing", wire: "pricing", source: "json", codec: { mode: "strict", typeSymbol: "dsh-usage-column#PricingMap", schema: pricingMapSchema } }
      ],
      result: { mode: "strict", typeSymbol: "dsh-usage-column#Ok", schema: okResultSchema }
    },
    {
      id: "dsh-usage-column#usageColumn/resetBaseline",
      service: "usageColumn",
      namespace: "usageColumn",
      method: "resetBaseline",
      invocation: { kind: "direct" },
      parameters: [
        { name: "sessionId", wire: "sessionId", source: "json", codec: { mode: "strict", typeSymbol: "dsh-usage-column#sessionId", schema: z.string() } }
      ],
      result: { mode: "strict", typeSymbol: "dsh-usage-column#Ok", schema: okResultSchema }
    }
  ],
  model: { services: [], events: [], objects: [] }
};

const BALANCE_URL = "https://api.deepseek.com/user/balance";
const BALANCE_CACHE_MS = 60_000;
const BALANCE_TIMEOUT_MS = 10_000;
const MODEL_INFO_TIMEOUT_MS = 3_000;
const FOLD_CACHE_MS = 10_000;
const DEFAULT_CONTEXT_WINDOW = 1_000_000;
/** 插件版本号：面板头部会显示该值，用于确认网关已加载最新主机代码。 */
const PLUGIN_VERSION = "0.5.0";

/** 远程服务实例：注册 "usageColumn" cordis 服务，网关按 manifest 分发端点。 */
class UsageColumnGateway extends TypertRemoteService {
  constructor(ctx) {
    super(ctx, "usageColumn");
    this._balanceCache = null;   // { at, value }
    this._memBaselines = new Map();
    this._memPricing = {};
    this._foldCache = new Map(); // sessionId -> { at, usage, stats, events }
    this._liveUsage = null;      // sessionId -> totals（懒初始化：内存优先，settings 恢复）
    this._liveSaveTimer = null;
    this._settingsScope = undefined; // undefined=未初始化, null=不可用
  }

  // ── 实时用量：监听 session/event 累计并持久化（网关运行期间必然生效）──────

  liveUsageMap() {
    if (this._liveUsage !== null) return this._liveUsage;
    const scope = this.settingsScope();
    const stored = scope === null ? undefined : scope.get().liveUsage;
    this._liveUsage = new Map();
    if (stored !== undefined && typeof stored === "object") {
      for (const [sid, value] of Object.entries(stored)) {
        if (value !== null && typeof value === "object" && typeof value.steps === "number") {
          this._liveUsage.set(sid, {
            inputTokens: pos(value.inputTokens),
            cacheReadTokens: pos(value.cacheReadTokens),
            cacheWriteTokens: pos(value.cacheWriteTokens),
            outputTokens: pos(value.outputTokens),
            reasoningTokens: pos(value.reasoningTokens),
            steps: pos(value.steps),
            at: pos(value.at)
          });
        }
      }
    }
    return this._liveUsage;
  }

  recordLiveUsage(sessionId, event) {
    if (sessionId === undefined || sessionId === null) return;
    const usage = event?.data?.usage;
    if (typeof usage !== "object" || usage === null) return;
    const inputTokens = pos(usage.inputTokens);
    const cacheReadTokens = pos(usage.cacheReadTokens);
    const cacheWriteTokens = pos(usage.cacheWriteTokens);
    const outputTokens = pos(usage.outputTokens);
    const reasoningTokens = pos(usage.reasoningTokens);
    if (inputTokens + cacheReadTokens + cacheWriteTokens + outputTokens + reasoningTokens === 0) return;
    const map = this.liveUsageMap();
    const prev = map.get(sessionId) ?? { inputTokens: 0, cacheReadTokens: 0, cacheWriteTokens: 0, outputTokens: 0, reasoningTokens: 0, steps: 0, at: 0 };
    map.set(sessionId, {
      inputTokens: prev.inputTokens + inputTokens,
      cacheReadTokens: prev.cacheReadTokens + cacheReadTokens,
      cacheWriteTokens: prev.cacheWriteTokens + cacheWriteTokens,
      outputTokens: prev.outputTokens + outputTokens,
      reasoningTokens: prev.reasoningTokens + reasoningTokens,
      steps: prev.steps + 1,
      at: Date.now()
    });
    // 防抖持久化（写 settings 文件）
    if (this._liveSaveTimer !== null) return;
    this._liveSaveTimer = setTimeout(() => {
      this._liveSaveTimer = null;
      this.persistLiveUsage();
    }, 1500);
  }

  async persistLiveUsage() {
    const scope = this.settingsScope();
    if (scope === null || this._liveUsage === null) return;
    try {
      const current = scope.get();
      const merged = { ...current.liveUsage };
      for (const [sid, value] of this._liveUsage) merged[sid] = { ...value };
      await scope.update({ liveUsage: merged });
    } catch {
      // 持久化失败仅影响重启后恢复，不影响运行时统计
    }
  }

  liveUsageOf(sessionId) {
    const value = this.liveUsageMap().get(sessionId);
    if (value === undefined) return { ...EMPTY_USAGE, at: 0 };
    return {
      inputTokens: value.inputTokens,
      cacheReadTokens: value.cacheReadTokens,
      cacheWriteTokens: value.cacheWriteTokens,
      outputTokens: value.outputTokens,
      reasoningTokens: value.reasoningTokens,
      steps: value.steps
    };
  }

  // ── settings（可选能力，缺失时全部降级为进程内存）────────────────────────

  settingsScope() {
    if (this._settingsScope !== undefined) return this._settingsScope;
    const settings = this.ctx.get("settings");
    if (settings === undefined) {
      this._settingsScope = null;
      return null;
    }
    try {
      this._settingsScope = settings.register("usage-column", settingsSchema, { applies: "live" });
    } catch {
      this._settingsScope = null;
    }
    return this._settingsScope;
  }

  pricingOverrides() {
    const scope = this.settingsScope();
    if (scope === null) return this._memPricing;
    const value = scope.get();
    return value.pricingOverrides ?? {};
  }

  settingsContextWindow() {
    const scope = this.settingsScope();
    if (scope === null) return DEFAULT_CONTEXT_WINDOW;
    const value = scope.get().contextWindow;
    return typeof value === "number" && Number.isFinite(value) && value > 0 ? value : DEFAULT_CONTEXT_WINDOW;
  }

  async persistBaseline(sessionId, balance) {
    this._memBaselines.set(sessionId, balance);
    const scope = this.settingsScope();
    if (scope === null) return;
    try {
      const current = scope.get();
      await scope.update({ baselines: { ...current.baselines, [sessionId]: { balance, at: Date.now() } } });
    } catch {
      // settings 写入失败时保留内存基线，不影响本次统计
    }
  }

  // ── 余额：官方公开接口，API Key 逐次解析 ───────────────────────────────────

  async fetchBalance() {
    const now = Date.now();
    if (this._balanceCache !== null && now - this._balanceCache.at < BALANCE_CACHE_MS) {
      return this._balanceCache.value;
    }
    let apiKey;
    let source = null;
    const credentials = this.ctx.get("credentials");
    if (credentials !== undefined) {
      try {
        const hit = await credentials.resolve(credentialRef("DEEPSEEK_API_KEY"));
        if (hit !== undefined && typeof hit.value === "string" && hit.value.length > 0) {
          apiKey = hit.value;
          source = hit.source;
        }
      } catch {
        // 解析失败走环境变量兜底
      }
    }
    if (apiKey === undefined && typeof process !== "undefined" && process.env !== undefined) {
      const env = process.env.DEEPSEEK_API_KEY;
      if (typeof env === "string" && env.length > 0) {
        apiKey = env;
        source = "env";
      }
    }
    if (apiKey === undefined) {
      return { ok: false, currency: "CNY", total: 0, granted: 0, toppedUp: 0, usablePercent: null, error: "missing-key", source: null };
    }
    try {
      const res = await fetch(BALANCE_URL, {
        headers: { authorization: "Bearer " + apiKey },
        signal: AbortSignal.timeout(BALANCE_TIMEOUT_MS)
      });
      if (!res.ok) {
        return { ok: false, currency: "CNY", total: 0, granted: 0, toppedUp: 0, usablePercent: null, error: "http-" + res.status, source };
      }
      const body = await res.json();
      const info = Array.isArray(body?.balance_infos) ? body.balance_infos[0] : undefined;
      const total = num(info?.total_balance);
      const granted = num(info?.granted_balance);
      const toppedUp = num(info?.topped_up_balance);
      const value = {
        ok: body?.is_available !== false,
        currency: typeof info?.currency === "string" && info.currency.length > 0 ? info.currency : "CNY",
        total,
        granted,
        toppedUp,
        usablePercent: balancePercent(total, granted, toppedUp),
        error: null,
        source
      };
      this._balanceCache = { at: now, value };
      return value;
    } catch (error) {
      return {
        ok: false,
        currency: "CNY",
        total: 0,
        granted: 0,
        toppedUp: 0,
        usablePercent: null,
        error: "fetch-failed: " + (error instanceof Error ? error.message : String(error)),
        source
      };
    }
  }

  // ── 会话数据：持久化日志直读 + 折叠（不依赖内存投影，重启后历史完整）──────

  async foldedFor(sessionId) {
    const cached = this._foldCache.get(sessionId);
    if (cached !== undefined && Date.now() - cached.at < FOLD_CACHE_MS) {
      return cached;
    }
    const empty = { usage: { ...EMPTY_USAGE }, stats: { ...EMPTY_STATS }, events: 0, lastRequest: null };
    const query = this.ctx.get("sessionQuery");
    if (query === undefined || typeof query.readSession !== "function") {
      this._foldCache.set(sessionId, { at: Date.now(), ...empty });
      return empty;
    }
    try {
      const snapshot = await query.readSession(sessionId);
      const events = Array.isArray(snapshot?.events) ? snapshot.events : [];
      const folded = foldSession(events);
      const out = { usage: folded.usage, stats: folded.stats, events: events.length, lastRequest: folded.lastRequest };
      this._foldCache.set(sessionId, { at: Date.now(), ...out });
      return out;
    } catch {
      this._foldCache.set(sessionId, { at: Date.now(), ...empty });
      return empty;
    }
  }

  currentSelection() {
    const service = this.ctx.get("agentDefaultModel");
    if (service === undefined) return { model: null, provider: null };
    try {
      const selection = service.currentSelection();
      return {
        model: typeof selection?.model === "string" ? selection.model : null,
        provider: typeof selection?.provider === "string" ? selection.provider : null
      };
    } catch {
      return { model: null, provider: null };
    }
  }

  /**
   * 上下文窗口：优先按「最后一次对话请求」的真实模型解析（v0.5），
   * 其次当前模型选择，再次设置默认 1M。
   * 已用优先级（对齐官方口径）：
   *   ① 日志中最后一次对话级模型请求的实测输入（计费 prompt_tokens 口径）；
   *   ② tokenMeter 会话表面估算（live 会话）；
   *   ③ 历史总量近似（末选，UI 标注 ≈）。
   */
  async contextOf(session, provider, model, usage, lastRequest) {
    let used = null;
    let approximate = false;
    if (lastRequest !== null && lastRequest !== undefined && typeof lastRequest.input === "number" && lastRequest.input > 0) {
      used = Math.round(lastRequest.input);
    } else {
      const tokenMeter = this.ctx.get("tokenMeter");
      if (tokenMeter !== undefined && session !== undefined) {
        try {
          const measure = tokenMeter.measure(session);
          const surface = measure?.surfaceTokens;
          if (typeof surface === "number" && Number.isFinite(surface) && surface >= 0) used = Math.round(surface);
        } catch {
          // 计量不可用时走兜底
        }
      }
      if (used === null && usage !== undefined && typeof usage === "object") {
        const total = pos(usage.inputTokens) + pos(usage.cacheReadTokens) + pos(usage.outputTokens);
        if (total > 0) {
          used = Math.round(total);
          approximate = true;
        }
      }
    }
    if (used === null) return null;
    let windowSize = this.settingsContextWindow();
    const llm = this.ctx.get("llm");
    // 请求真实模型优先（assistant/message.source），其次当前模型选择
    const requestProvider = lastRequest?.provider ?? provider;
    const requestModel = lastRequest?.model ?? model;
    if (llm !== undefined && typeof requestProvider === "string" && typeof requestModel === "string") {
      try {
        const info = await llm.resolveModelInfo(requestProvider, requestModel, AbortSignal.timeout(MODEL_INFO_TIMEOUT_MS));
        const context = info?.context?.contextWindow;
        if (typeof context === "number" && Number.isFinite(context) && context > 0) windowSize = Math.round(context);
      } catch {
        // 拿不到官方窗口时用设置默认值
      }
    }
    return { window: windowSize, used, remaining: Math.max(0, windowSize - used), approximate };
  }

  // ── 远程方法 ───────────────────────────────────────────────────────────────

  async balance() {
    return this.fetchBalance();
  }

  async snapshot(sessionId) {
    const balance = await this.fetchBalance();
    const session = sessionId === undefined ? undefined : this.ctx.sessions.get(sessionId);

    let usage = { ...EMPTY_USAGE };
    let stats = { ...EMPTY_STATS };
    let events = 0;
    let sessionFound = session !== undefined;
    let liveSteps = 0;
    let lastRequest = null;
    if (sessionId !== undefined && typeof sessionId === "string") {
      const folded = await this.foldedFor(sessionId);
      events = folded.events;
      lastRequest = folded.lastRequest;
      if (folded.usage.steps > 0) {
        // 日志记录过 usage：以日志折叠为准（含历史）
        usage = folded.usage;
        stats = folded.stats;
      } else {
        // 日志无 usage：回退实时监听累计（网关运行期间必然生效）
        const live = this.liveUsageOf(sessionId);
        liveSteps = live.steps;
        usage = live;
        stats = folded.stats;
      }
    }

    const { model, provider } = this.currentSelection();
    const priceUsed = resolvePrice(model ?? "", this.pricingOverrides());
    const cost = usageCostBreakdown(usage, priceUsed);
    const hitRate = cacheHitRate(usage.cacheReadTokens, usage.inputTokens);
    const tokenPerSec = stats.decodeMs > 0 && stats.decodeTokens > 0
      ? (stats.decodeTokens / stats.decodeMs) * 1000
      : null;

    let context = null;
    if (sessionId !== undefined && typeof sessionId === "string") {
      context = await this.contextOf(session, provider, model, usage, lastRequest);
    }

    let baseline = null;
    let sessionPercentValue = null;
    if (sessionId !== undefined && balance.ok && Number.isFinite(balance.total)) {
      const key = sessionId;
      const stored = this._memBaselines.get(key);
      if (stored !== undefined) {
        baseline = stored;
      } else {
        const scope = this.settingsScope();
        const persisted = scope === null ? undefined : scope.get().baselines[key];
        baseline = persisted !== undefined && typeof persisted.balance === "number" ? persisted.balance : balance.total;
        if (persisted === undefined || typeof persisted.balance !== "number") {
          await this.persistBaseline(key, balance.total);
        }
        this._memBaselines.set(key, baseline);
      }
      sessionPercentValue = sessionPercent(cost.total, baseline);
    }

    return {
      version: PLUGIN_VERSION,
      sessionId: sessionId ?? null,
      model,
      balance,
      usage,
      cost,
      priceUsed,
      stats,
      context,
      hitRate,
      tokenPerSec,
      baseline,
      sessionPercent: sessionPercentValue,
      asOfSeq: events - 1,
      at: Date.now(),
      debug: { sessionFound, events, steps: usage.steps, liveSteps }
    };
  }

  async setPricing(pricing) {
    const clean = {};
    for (const [modelName, value] of Object.entries(pricing ?? {})) {
      if (value === null || typeof value !== "object") continue;
      const hit = num(value.hit);
      const miss = num(value.miss);
      const output = num(value.output);
      if (!Number.isFinite(hit) || !Number.isFinite(miss) || !Number.isFinite(output)) continue;
      clean[modelName] = { hit, miss, output };
    }
    this._memPricing = clean;
    const scope = this.settingsScope();
    if (scope !== null) {
      try {
        await scope.update({ pricingOverrides: clean });
      } catch {
        // settings 写入失败时保留内存覆盖表
      }
    }
    this._balanceCache = null;
    return { ok: true };
  }

  async resetBaseline(sessionId) {
    if (sessionId === undefined || sessionId.length === 0) return { ok: false };
    this._memBaselines.delete(sessionId);
    const scope = this.settingsScope();
    if (scope !== null) {
      try {
        const current = scope.get();
        const baselines = { ...current.baselines };
        delete baselines[sessionId];
        await scope.update({ baselines });
      } catch {
        // 忽略持久化失败
      }
    }
    return { ok: true };
  }
}

function num(value) {
  const n = typeof value === "number" ? value : typeof value === "string" ? Number(value) : NaN;
  return Number.isFinite(n) ? n : 0;
}

export function apply(ctx) {
  const gateway = new UsageColumnGateway(ctx);
  ctx.on("session/event", (session, event) => {
    gateway.recordLiveUsage(session?.id, event);
  });
  ctx.effect(() => ctx.typert.register(MANIFEST), "usage-column: typert manifest");
}
