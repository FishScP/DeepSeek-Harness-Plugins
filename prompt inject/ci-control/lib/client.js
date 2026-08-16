/**
 * ci-control - client half（静态沉淀版）。
 *
 * 在对话工具行右端（conversation.input.right）提供「注入频次」下拉：
 *   - 仅当会话实际运行「锚定标准（上下文注入）」预设时显示（remote isActive 判定）；
 *   - 选项：每轮(1)/隔一轮(2)/隔两轮(3)/隔三轮(4)/关闭(0)，选择即写频次文件，下一次请求生效。
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
					id: "ci-control#ciControl/getInterval",
					service: "ciControl",
					namespace: "ciControl",
					method: "getInterval",
					invocation: { kind: "direct" },
					parameters: [],
					result: codec("ci-control#Interval")
				},
				{
					id: "ci-control#ciControl/setInterval",
					service: "ciControl",
					namespace: "ciControl",
					method: "setInterval",
					invocation: { kind: "direct" },
					parameters: [
						{ name: "interval", wire: "interval", source: "json", codec: codec("ci-control#interval") }
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
			border: "1px solid rgba(128,128,128,0.35)", maxWidth: "104px"
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
						// 重启后 host/会话 header/连接存在就绪窗口：以下三种情形都按递增间隔
						// 有限重试，覆盖「新建 CI 会话瞬间 isActive 返回 false」的窗口：
						//   1) sessionId 未就绪；2) 调用失败；3) isActive 返回 false（header 未就绪）。
						// connection/reset（连接重建）时重置计数并立即复查。成功即停。
						const scheduleRetry = () => {
							if (!alive || retries >= MAX_RETRIES) return;
							retries += 1;
							console.log("[ci-interval] retry " + retries + " in " + delay + "ms");
							const id = window.setTimeout(check, delay);
							cleanups.push(() => window.clearTimeout(id));
							delay = Math.min(delay * 2, 30000);
						};
						const check = () => {
							const sid = props && props.sessionId;
							if (typeof sid !== "string") {
								console.log("[ci-interval] sessionId not ready");
								scheduleRetry();
								return;
							}
							callRemote("isActive", sid).then((r) => {
								if (!alive) return;
								if (!r || !r.active) {
									console.log("[ci-interval] isActive false (header not ready?)");
									scheduleRetry();
									return;
								}
								console.log("[ci-interval] active, loading interval");
								setActive(true);
								return callRemote("getInterval").then((g) => {
									if (alive && g && typeof g.interval === "number") setValue(g.interval);
								});
							}).catch((e) => {
								console.log("[ci-interval] isActive error: " + String((e && e.message) || e));
								scheduleRetry();
							});
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
						const v = Number(event.target.value);
						setValue(v);
						callRemote("setInterval", v).catch(() => {});
					};
					const options = [
						[1, "每轮"],
						[2, "隔一轮"],
						[3, "隔两轮"],
						[4, "隔三轮"],
						[0, "关闭"]
					];
					return react.createElement("div", {
						style: wrapStyle,
						title: "上下文注入频次（按对话轮次计；仅「锚定标准（上下文注入）」预设显示；下一次请求生效）"
					},
						react.createElement("span", null, "注入频次"),
						react.createElement("select", { value: value === null ? "" : String(value), onChange, style: selectStyle },
							value === null ? react.createElement("option", { value: "", disabled: true }, "…") : null,
							options.map((pair) => react.createElement("option", { key: pair[0], value: String(pair[0]) }, pair[1]))
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
