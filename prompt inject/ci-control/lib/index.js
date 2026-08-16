import { z } from "zod";
import { TypertRemoteService } from "@deepseek-ai/dsh-typert-protocol";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";

/**
 * ci-control - host half（静态沉淀版）。
 *
 * 为「锚定标准（上下文注入）」预设的 context-injector 提供注入模式读写：
 *   - isActive(sessionId)：会话实际运行的 preset 是否为 anchored-standard-ci；
 *   - getConfig()：读 $DSH_HOME/.context-injector.json 的 { mode, interval }；
 *   - setConfig({ mode, interval? })：校验并写入（下一次注入即生效，无需重启）。
 * 模式：turns（每 interval 条消息）/ compaction（晋升后+每次压缩后）/ off（关闭）。
 * 文件读取失败一律返回 null/error，绝不抛错。
 */

export const name = "ci-control";
export const inject = ["typert", "sessions"];

const TARGET_PRESET = "anchored-standard-ci";
const MODES = ["turns", "compaction", "off"];

// ── wire schemas（zod v4，与 usage-column 同构）──────────────────────────────

const activeResultSchema = z.object({ active: z.boolean() }).strict();
const configResultSchema = z.object({
  mode: z.string().nullable(),
  interval: z.number().int().nullable()
}).strict();
const setResultSchema = z.object({ ok: z.boolean(), error: z.string().nullable() }).strict();

// ── typert manifest ──────────────────────────────────────────────────────────

const MANIFEST = {
  package: "ci-control",
  face: "host",
  schemas: [],
  invocations: [
    {
      id: "ci-control#ciControl/isActive",
      service: "ciControl",
      namespace: "ciControl",
      method: "isActive",
      invocation: { kind: "direct" },
      parameters: [
        { name: "sessionId", wire: "sessionId", source: "json", codec: { mode: "strict", typeSymbol: "ci-control#sessionId", schema: z.string() } }
      ],
      result: { mode: "strict", typeSymbol: "ci-control#Active", schema: activeResultSchema }
    },
    {
      id: "ci-control#ciControl/getConfig",
      service: "ciControl",
      namespace: "ciControl",
      method: "getConfig",
      invocation: { kind: "direct" },
      parameters: [],
      result: { mode: "strict", typeSymbol: "ci-control#Config", schema: configResultSchema }
    },
    {
      id: "ci-control#ciControl/setConfig",
      service: "ciControl",
      namespace: "ciControl",
      method: "setConfig",
      invocation: { kind: "direct" },
      parameters: [
        { name: "mode", wire: "mode", source: "json", codec: { mode: "strict", typeSymbol: "ci-control#mode", schema: z.string() } },
        { name: "interval", wire: "interval", source: "json", acceptsUndefined: true, codec: { mode: "strict", typeSymbol: "ci-control#interval", schema: z.number().int().nullable() } }
      ],
      result: { mode: "strict", typeSymbol: "ci-control#SetResult", schema: setResultSchema }
    }
  ],
  model: { services: [], events: [], objects: [] }
};

/** 远程服务实例：注册 "ciControl" cordis 服务，网关按 manifest 分发端点。 */
class CiControlGateway extends TypertRemoteService {
  constructor(ctx) {
    super(ctx, "ciControl");
    const env = typeof process !== "undefined" && process.env !== undefined ? process.env : {};
    this._dshHome = typeof env.DSH_HOME === "string" && env.DSH_HOME.length > 0
      ? env.DSH_HOME
      : (typeof env.USERPROFILE === "string" && env.USERPROFILE.length > 0 ? env.USERPROFILE + "\\.dsh" : null);
    this._file = this._dshHome === null ? null : this._dshHome + "\\.context-injector.json";
  }

  /** 仅当会话实际运行「锚定标准（上下文注入）」预设时返回 active。 */
  async isActive(sessionId) {
    const sessions = this.ctx.get("sessions");
    const session = sessions === undefined ? undefined : sessions.get(sessionId);
    if (session === undefined) return { active: false };
    let preset;
    const events = session.events;
    if (Array.isArray(events)) {
      for (const e of events) {
        if (e !== null && typeof e === "object" && e.type === "agent-preset/selected") {
          preset = e.data !== null && typeof e.data === "object" ? e.data.agentPreset : undefined;
        }
      }
    }
    if (preset === undefined) {
      const header = session.header;
      if (header !== null && typeof header === "object") preset = header.agentPreset;
    }
    return { active: preset === TARGET_PRESET };
  }

  /** 读取注入模式文件；缺失/非法返回 null 字段（client 回退预设默认）。 */
  async getConfig() {
    if (this._file === null) return { mode: null, interval: null };
    try {
      const parsed = JSON.parse(readFileSync(this._file, "utf8"));
      if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) return { mode: null, interval: null };
      const mode = typeof parsed.mode === "string" && MODES.includes(parsed.mode) ? parsed.mode : null;
      const interval = typeof parsed.interval === "number" && Number.isInteger(parsed.interval) ? parsed.interval : null;
      if (mode === null) {
        // Legacy { interval }: turns mode (0 = off).
        if (interval === 0) return { mode: "off", interval: null };
        if (interval !== null && interval >= 1 && interval <= 100) return { mode: "turns", interval };
        return { mode: null, interval: null };
      }
      if (mode === "turns") {
        if (interval === null || interval < 1 || interval > 100) return { mode: null, interval: null };
        return { mode, interval };
      }
      return { mode, interval: null };
    } catch {
      return { mode: null, interval: null };
    }
  }

  /** 校验并写入注入模式；非法输入或写入失败返回 { ok:false, error }。 */
  async setConfig(mode, interval) {
    if (typeof mode !== "string" || !MODES.includes(mode)) {
      return { ok: false, error: "invalid mode (must be turns | compaction | off)" };
    }
    if (mode === "turns") {
      if (typeof interval !== "number" || !Number.isInteger(interval) || interval < 1 || interval > 100) {
        return { ok: false, error: "turns mode requires interval integer 1..100" };
      }
    }
    if (this._file === null) return { ok: false, error: "no DSH_HOME" };
    try {
      if (this._dshHome !== null) mkdirSync(this._dshHome, { recursive: true });
      const payload = mode === "turns" ? { mode, interval } : { mode };
      writeFileSync(this._file, JSON.stringify(payload), "utf8");
      return { ok: true, error: null };
    } catch (error) {
      return { ok: false, error: String((error && error.message) || error) };
    }
  }
}

export function apply(ctx) {
  const gateway = new CiControlGateway(ctx);
  ctx.effect(() => ctx.typert.register(MANIFEST), "ci-control: typert manifest");
}
