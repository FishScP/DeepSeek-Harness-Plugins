/**
 * ci-control - client half（静态沉淀版）。
 *
 * 在对话工具行右端（conversation.input.right）提供「注入模式」下拉：
 *   - 仅当会话实际运行「锚定标准（上下文注入）」预设时显示（remote isActive 判定）；
 *   - 五档：每 5 轮 / 每 11 轮 / 每 15 轮 / 每次压缩后（含晋升后，默认）/ 不注入；
 *   - 选择即写 $DSH_HOME/.context-injector.json，下一次注入生效。
 * Bundle contract: served at /plugins/ci-control/client.js, only shell seed
 * words may be required (react). Remote calls via ctx.remote.$mount + remote.ciControl.
 */
window.__ModuleLoader__.load({
	id: "ci-control",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
		Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
		let react = require("react");

		const identity = (value) => value;
		const codec = (symbol) => ({ mode: "strict", typeSymbol: symbol, schema: { parse: identity } });

		const CONTRIBUTION = {
			package: "ci-control",
			descriptors: [
				{
					id: "ci-control#ciControl/isActive",
					service: "ciControl",
					namespace: "ciControl",
					method: "isActive",
					invocation: { kind: "direct" },
					parameters: [
						{ name: "sessionId", wire: "sessionId", source: "json", codec: codec("ci-control#sessionId") }
					],
					result: codec("ci-control#Active")
				},
				{
					id: "ci-control#ciControl/getConfig",
					service: "ciControl",
					namespace: "ciControl",
					method: "getConfig",
					invocation: { kind: "direct" },
					parameters: [],
					result: codec("ci-control#Config")
				},
				{
					id: "ci-control#ciControl/setConfig",
					service: "ciControl",
					namespace: "ciControl",
					method: "setConfig",
					invocation: { kind: "direct" },
					parameters: [
						{ name: "mode", wire: "mode", source: "json", codec: codec("ci-control#mode") },
						{ name: "interval", wire: "interval", source: "json", acceptsUndefined: true, codec: codec("ci-control#interval") }
					],
					result: codec("ci-control#SetResult")
				}
			]
		};

		const inject = ["slots", "remote"];

		const wrapStyle = { display: "flex", alignItems: "center", gap: "4px", fontSize: "12px" };
		const selectStyle = {
			padding: "1px 4px", borderRadius: "4px", fontSize: "12px",
			background: "transparent", color: "inherit",
			border: "1px solid rgba(128,128,128,0.35)", maxWidth: "150px"
		};

		/** Map a config to a select key; unsupported turns intervals fall back to the default option. */
		const modeKey = (cfg) => {
			if (cfg === null || typeof cfg !== "object") return "compaction";
			if (cfg.mode === "compaction") return "compaction";
			if (cfg.mode === "off") return "off";
			if (cfg.mode === "turns") {
				if (cfg.interval === 5) return "turns5";
				if (cfg.interval === 11) return "turns11";
				if (cfg.interval === 15) return "turns15";
				return "turns5";
			}
			return "compaction";
		};

		/** Map a select key back to a remote config payload. */
		const keyToConfig = (key) => {
			if (key === "turns5") return { mode: "turns", interval: 5 };
			if (key === "turns11") return { mode: "turns", interval: 11 };
			if (key === "turns15") return { mode: "turns", interval: 15 };
			if (key === "off") return { mode: "off" };
			return { mode: "compaction" };
		};

		function apply(ctx) {
			const slots = ctx.get("slots");
			if (slots === undefined) return;
			const mount = ctx.remote.$mount(CONTRIBUTION);
			const callRemote = async (method, ...args) => {
				await mount;
				const remote = ctx.get("remote.ciControl");
				if (remote === undefined) throw new Error("remote.ciControl 尚未挂载");
				const result = await remote[method](...args);
				// Remote 调用返回 { ok, value } 包装：业务结果在 value 中（同 usage-column 的口径）。
				if (!result || !result.ok) throw new Error("ciControl." + method + " failed");
				return result.value;
			};

			slots.inject("conversation.input.right", () => slots.register(
				{ name: "conversation.input.right", id: "ci-interval", order: 40 },
				(props) => {
					const [active, setActive] = react.useState(false);
					const [value, setValue] = react.useState(null);
					react.useEffect(() => {
						let alive = true;
						let delay = 2000;
						let retries = 0;
						const MAX_RETRIES = 12;
						const cleanups = [];
						// 重启后 host/会话 header/连接存在就绪窗口：sessionId 未就绪、调用失败、
						// isActive 返回 false（header 未就绪）都按递增间隔有限重试；
						// connection/reset（连接重建）时重置计数并立即复查。成功即停。
						const scheduleRetry = () => {
							if (!alive || retries >= MAX_RETRIES) return;
							retries += 1;
							const id = window.setTimeout(check, delay);
							cleanups.push(() => window.clearTimeout(id));
							delay = Math.min(delay * 2, 30000);
						};
						const check = () => {
							const sid = props && props.sessionId;
							if (typeof sid !== "string") { scheduleRetry(); return; }
							callRemote("isActive", sid).then((r) => {
								if (!alive) return;
								if (!r || !r.active) { scheduleRetry(); return; }
								setActive(true);
								return callRemote("getConfig").then((g) => {
									if (alive) setValue(modeKey(g));
								});
							}).catch(() => { scheduleRetry(); });
						};
						check();
						const offReset = typeof ctx.on === "function" ? ctx.on("connection/reset", () => { if (!alive) return; retries = 0; check(); }) : void 0;
						return () => {
							alive = false;
							cleanups.forEach((fn) => fn());
							if (typeof offReset === "function") offReset();
						};
					}, [props && props.sessionId]);
					if (!active) return null;
					const onChange = (event) => {
						const key = event.target.value;
						setValue(key);
						const cfg = keyToConfig(key);
						callRemote("setConfig", cfg.mode, cfg.interval === undefined ? undefined : cfg.interval).catch(() => {});
					};
					const options = [
						["compaction", "每次压缩后（含晋升后）"],
						["turns5", "每 5 轮"],
						["turns11", "每 11 轮"],
						["turns15", "每 15 轮"],
						["off", "不注入"]
					];
					return react.createElement("div", {
						style: wrapStyle,
						title: "上下文注入模式（一轮=一条指令或一次模型回复；仅「锚定标准（上下文注入）」预设显示；下一次注入生效）"
					},
						react.createElement("span", null, "注入模式"),
						react.createElement("select", { value: value === null ? "compaction" : String(value), onChange, style: selectStyle },
							options.map((pair) => react.createElement("option", { key: pair[0], value: pair[0] }, pair[1]))
						)
					);
				}
			));
		}

		exports.apply = apply;
		exports.inject = inject;
		return module.exports;
	}
});
