import { z } from "zod";
import { TypertRemoteService } from "@deepseek-ai/dsh-typert-protocol";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";

/**
 * ci-control - host half（静态沉淀版）。
 *
 * 为「锚定标准（上下文注入）」预设的 context-injector 提供频次读写：
 *   - isActive(sessionId)：会话实际运行的 preset 是否为 anchored-standard-ci；
 *   - getInterval()：读 $DSH_HOME/.context-injector.json 的 interval（0=关闭，1..10）；
 *   - setInterval(n)：校验并写入该文件（下一次注入即生效，无需重启）。
 * 文件读取失败一律返回 null/error，绝不抛错。
 */

export const name = "ci-control";
export const inject = ["typert", "sessions"];

const TARGET_PRESET = "anchored-standard-ci";

// ── wire schemas（zod v4，与 usage-column 同构）──────────────────────────────

const activeResultSchema = z.object({ active: z.boolean() }).strict();
const intervalResultSchema = z.object({ interval: z.number().int().nullable() }).strict();
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
      id: "ci-control#ciControl/getInterval",
      service: "ciControl",
      namespace: "ciControl",
      method: "getInterval",
      invocation: { kind: "direct" },
      parameters: [],
      result: { mode: "strict", typeSymbol: "ci-control#Interval", schema: intervalResultSchema }
    },
    {
      id: "ci-control#ciControl/setInterval",
      service: "ciControl",
      namespace: "ciControl",
      method: "setInterval",
      invocation: { kind: "direct" },
      parameters: [
        { name: "interval", wire: "interval", source: "json", codec: { mode: "strict", typeSymbol: "ci-control#interval", schema: z.number().int() } }
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

  /** 读取频次覆盖文件；缺失/非法返回 null。 */
  async getInterval() {
    if (this._file === null) return { interval: null };
    try {
      const parsed = JSON.parse(readFileSync(this._file, "utf8"));
      const v = parsed !== null && typeof parsed === "object" && typeof parsed.interval === "number" ? parsed.interval : null;
      return { interval: Number.isInteger(v) && v >= 0 && v <= 10 ? v : null };
    } catch {
      return { interval: null };
    }
  }

  /** 校验并写入频次；非法输入或写入失败返回 { ok:false, error }。 */
  async setInterval(interval) {
    if (!Number.isInteger(interval) || interval < 0 || interval > 10) {
      return { ok: false, error: "invalid interval (must be integer 0..10)" };
    }
    if (this._file === null) return { ok: false, error: "no DSH_HOME" };
    try {
      if (this._dshHome !== null) mkdirSync(this._dshHome, { recursive: true });
      writeFileSync(this._file, JSON.stringify({ interval }), "utf8");
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
