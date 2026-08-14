window.__ModuleLoader__.load({
	id: "dsh-usage-column",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
		Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
		// Bundle contract: this file is served by the host at
		// /plugins/dsh-usage-column/client.js and must only require
		// the shell seed words.
		let react = require("react");

		// ── styles ────────────────────────────────────────────────────────────
		// 布局：右侧 = 一体化分栏（主界面让出宽度，侧栏贴右缘全高）；
		//       左侧 = 覆盖 DSH 自带左侧栏（shell.overlay 层 z=20 高于侧栏）。
		// 颜色：绿=成功/命中/赠金，蓝=业务/输出/充值，橙=警告/未命中。
		const css = [
			".ucc-panel{position:fixed;top:0;bottom:0;width:300px;display:flex;flex-direction:column;pointer-events:auto;background:var(--dsw-alias-bg-layer-3);overflow:hidden;z-index:1;font-size:13px;line-height:20px;color:var(--dsw-alias-label-primary);animation:ucc-slide .22s ease}",
			".ucc-panel[data-side=right]{right:0;border-left:1px solid var(--dsw-alias-border-l1);box-shadow:-8px 0 24px rgb(0 0 0/8%)}",
			".ucc-panel[data-side=left]{left:0;border-right:1px solid var(--dsw-alias-border-l1);box-shadow:8px 0 24px rgb(0 0 0/8%)}",
			"@keyframes ucc-slide{from{transform:translateX(var(--ucc-from,16px))}to{transform:none}}",
			"body:has(.ucc-panel[data-side=right]) #root{width:calc(100% - 300px)}",
			"@media (max-width:820px){body:has(.ucc-panel[data-side=right]) #root{width:100%}}",
			".ucc-head{display:flex;align-items:center;gap:6px;padding:10px 10px 10px 14px;border-bottom:1px solid var(--dsw-alias-border-l2);flex:none}",
			".ucc-title{flex:1;min-width:0;font-weight:600;font-size:13px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;display:inline-flex;align-items:center;gap:6px}",
			".ucc-ver{font-size:10px;line-height:14px;color:var(--dsw-alias-label-tertiary);background:var(--dsw-alias-bg-layer-1);border:1px solid var(--dsw-alias-border-l2);border-radius:5px;padding:0 4px;flex:none;font-variant-numeric:tabular-nums}",
			".ucc-iconBtn{width:26px;height:26px;display:inline-flex;align-items:center;justify-content:center;color:var(--dsw-alias-label-secondary);background:transparent;border:1px solid transparent;border-radius:7px;cursor:pointer;font:inherit;padding:0;flex:none}",
			".ucc-iconBtn:hover{background:var(--dsw-alias-interactive-bg-hover-solid);color:var(--dsw-alias-label-primary)}",
			".ucc-iconBtn:focus-visible{outline:2px solid var(--dsw-alias-state-business-primary);outline-offset:1px}",
			".ucc-body{flex:1;min-height:0;overflow-y:auto;padding:12px;display:flex;flex-direction:column;gap:10px}",
			".ucc-card{border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-layer-1);border-radius:10px;padding:12px}",
			".ucc-card h3{margin:0 0 8px;font-size:12px;font-weight:600;line-height:18px;color:var(--dsw-alias-label-secondary);display:flex;align-items:center;gap:6px}",
			".ucc-badge{font-size:10px;line-height:16px;color:var(--dsw-alias-label-tertiary);background:var(--dsw-alias-bg-layer-3);border:1px solid var(--dsw-alias-border-l2);border-radius:5px;padding:0 5px;font-variant-numeric:tabular-nums}",
			".ucc-big{font-size:24px;font-weight:700;line-height:32px;font-variant-numeric:tabular-nums;margin:2px 0 6px}",
			".ucc-rows{display:flex;flex-direction:column;gap:2px;margin-bottom:8px}",
			".ucc-row{display:flex;align-items:baseline;justify-content:space-between;gap:10px;font-variant-numeric:tabular-nums}",
			".ucc-row dt{color:var(--dsw-alias-label-tertiary);font-size:12px;line-height:18px;flex:none;display:inline-flex;align-items:center;gap:6px}",
			".ucc-row dd{margin:0;text-align:right;min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}",
			".ucc-row dd.ucc-value{color:var(--dsw-alias-label-primary)}",
			".ucc-swatch{width:8px;height:8px;border-radius:2px;display:inline-block;flex:none}",
			".ucc-swatch-green{background:var(--dsw-alias-state-success-primary)}",
			".ucc-swatch-blue{background:var(--dsw-alias-state-business-primary)}",
			".ucc-swatch-orange{background:#d9a514}",
			".ucc-metrics{display:grid;grid-template-columns:1fr 1fr;gap:4px 12px;margin-bottom:8px}",
			".ucc-metric{display:flex;flex-direction:column;gap:0;min-width:0}",
			".ucc-metric span{color:var(--dsw-alias-label-tertiary);font-size:11px;line-height:16px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}",
			".ucc-metric b{font-variant-numeric:tabular-nums;font-weight:600;font-size:13px;line-height:20px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}",
			".ucc-cost{font-size:18px;font-weight:700;line-height:26px;font-variant-numeric:tabular-nums}",
			".ucc-tier{color:var(--dsw-alias-label-tertiary);font-size:11px;line-height:16px;margin-top:2px;word-break:break-all}",
			".ucc-barWrap{display:flex;align-items:center;gap:8px;margin-top:8px}",
			".ucc-bar{flex:1;height:8px;border-radius:999px;background:var(--dsw-alias-interactive-bg-hover-solid);overflow:hidden}",
			".ucc-barFill{height:100%;border-radius:999px;transition:width .45s ease,background-color .45s ease}",
			".ucc-barFill-ok{background:linear-gradient(90deg,var(--dsw-alias-state-success-primary),color-mix(in srgb,var(--dsw-alias-state-success-primary) 55%,transparent))}",
			".ucc-barFill-warn{background:linear-gradient(90deg,#d9a514,color-mix(in srgb,#d9a514 55%,transparent))}",
			".ucc-barFill-low{background:linear-gradient(90deg,var(--dsw-alias-state-error-primary),color-mix(in srgb,var(--dsw-alias-state-error-primary) 55%,transparent))}",
			".ucc-barStack{display:flex;gap:1px}",
			".ucc-barSeg{height:100%;min-width:2px}",
			".ucc-barSeg-green{background:var(--dsw-alias-state-success-primary)}",
			".ucc-barSeg-blue{background:var(--dsw-alias-state-business-primary)}",
			".ucc-barSeg-orange{background:#d9a514}",
			".ucc-barSeg-gray{background:var(--dsw-alias-label-tertiary)}",
			".ucc-barLabel{flex:none;min-width:44px;text-align:right;font-variant-numeric:tabular-nums;font-size:12px;color:var(--dsw-alias-label-secondary)}",
			".ucc-status{color:var(--dsw-alias-label-tertiary);font-size:13px;line-height:20px;margin:0}",
			".ucc-failure{color:var(--dsw-alias-state-error-primary);display:flex;align-items:center;gap:10px;margin:0}",
			".ucc-failure button{border:1px solid var(--dsw-alias-border-l2);color:var(--dsw-alias-label-primary);font:inherit;cursor:pointer;background:transparent;border-radius:6px;padding:3px 10px}",
			".ucc-note{color:var(--dsw-alias-label-tertiary);font-size:11px;line-height:16px;margin:0;padding:0 2px}",
			".ucc-debug{color:var(--dsw-alias-label-tertiary);font-size:10px;line-height:14px;margin:0;padding:0 2px;font-family:var(--ds-font-family-code,ui-monospace,Menlo,Consolas,monospace);word-break:break-all}",
			".ucc-miniBtn{font:inherit;font-size:11px;line-height:16px;color:var(--dsw-alias-label-secondary);background:transparent;border:1px solid var(--dsw-alias-border-l2);border-radius:6px;padding:1px 8px;cursor:pointer}",
			".ucc-miniBtn:hover{background:var(--dsw-alias-interactive-bg-hover-solid)}",
			".ucc-updated{color:var(--dsw-alias-label-tertiary);font-size:11px;line-height:16px;font-variant-numeric:tabular-nums}",
			".ucc-context{display:flex;flex-direction:column;gap:4px;margin-top:8px}",
			".ucc-contextHead{display:flex;align-items:baseline;justify-content:space-between;gap:8px}",
			".ucc-contextTag{font-size:10px;line-height:14px;color:var(--dsw-alias-label-secondary);background:var(--dsw-alias-bg-layer-3);border:1px solid var(--dsw-alias-border-l2);border-radius:5px;padding:0 5px;flex:none}",
			".ucc-contextPct{font-size:12px;line-height:18px;color:var(--dsw-alias-label-primary);font-variant-numeric:tabular-nums}",
			".ucc-contextRemain{font-size:11px;line-height:16px;color:var(--dsw-alias-label-tertiary);font-variant-numeric:tabular-nums}",
			".ucc-contextBar{width:100%;height:8px;border-radius:999px;background:var(--dsw-alias-interactive-bg-hover-solid);overflow:hidden;flex:none}",
			// 入口按钮：与外壳"设置"按钮（ui-settings-general TriggerContent）逐项对齐
			".ucc-trigger{box-sizing:border-box;cursor:pointer;width:calc(100% + 8px);height:34px;color:var(--dsw-alias-label-primary);background:transparent;border:none;border-radius:12px;flex:none;align-items:center;gap:8px;margin:4px -4px;padding:6px 2px 6px 10px;font-family:inherit;font-size:14px;line-height:22px;display:flex;overflow:hidden}",
			".ucc-trigger:hover{background:var(--dsw-alias-interactive-bg-hover)}",
			".ucc-trigger[data-rail=true]{border-radius:50%;justify-content:center;gap:0;width:36px;height:36px;margin:8px 0 10px;padding:0}",
			".ucc-triggerLabel{white-space:nowrap;overflow:hidden}",
			// 通用设置行（对齐 settings.general.item 现有行的风格：描边分隔、16px 上下内边距）
			".ucc-genRow{border-bottom:1px solid var(--dsw-alias-border-l2);align-items:center;gap:8px;padding:16px 0;display:flex}",
			".ucc-genRowText{flex-direction:column;flex:1;gap:4px;min-width:0;padding-right:48px;display:flex}",
			".ucc-genTitle{color:var(--dsw-alias-label-primary);font-size:14px;font-weight:400;line-height:22px}",
			".ucc-genDesc{color:var(--dsw-alias-label-tertiary);font-size:12px;font-weight:400;line-height:18px}",
			".ucc-genSwitch{box-sizing:border-box;width:36px;height:20px;flex:none;cursor:pointer;background:var(--dsw-alias-interactive-bg-hover-solid);border:none;border-radius:999px;padding:0;position:relative;transition:background-color .2s ease}",
			".ucc-genSwitch[data-on=true]{background:var(--dsw-alias-state-business-primary)}",
			".ucc-genSwitchThumb{box-sizing:border-box;position:absolute;top:2px;left:2px;width:16px;height:16px;border-radius:50%;background:#fff;box-shadow:0 1px 2px rgb(0 0 0/20%);transition:transform .2s ease}",
			".ucc-genSwitch[data-on=true] .ucc-genSwitchThumb{transform:translateX(16px)}",
			".ucc-genSwitch:focus-visible{outline:2px solid var(--dsw-alias-state-business-primary);outline-offset:2px}",
			"@media (prefers-reduced-motion:reduce){.ucc-panel{animation:none}.ucc-barFill{transition:none}}",
		].join("\n");

		const cssTagId = "dsh-usage-column/usageColumn.css";
		if (typeof document !== "undefined" && document.querySelector("style[data-plugin-css=" + JSON.stringify(cssTagId) + "]") === null) {
			const tag = document.createElement("style");
			tag.dataset.plugin = "dsh-usage-column";
			tag.dataset.pluginCss = cssTagId;
			tag.textContent = css;
			document.head.appendChild(tag);
		}

		// ── 数字格式化（与主机 math.js 口径一致；bundle 内不引外部模块）─────────
		// 数据不可用时返回占位串（-- / --.--），配合降级渲染使用。
		function formatMoney(value, currency) {
			if (!Number.isFinite(value)) return "--.--";
			const abs = Math.abs(value);
			const digits = abs > 0 && abs < 0.01 ? 4 : 2;
			const prefix = currency === "CNY" ? "¥" : currency + " ";
			return prefix + value.toFixed(digits);
		}
		function formatTokens(value) {
			if (!Number.isFinite(value) || value < 0) return "--";
			if (value < 1000) return String(value);
			if (value < 1e6) return trimZero((value / 1e3).toFixed(1)) + "k";
			return trimZero((value / 1e6).toFixed(2)) + "M";
		}
		/** 上下文窗口量：1_000_000 → "1.0M"，1234 → "1.2K"。 */
		function formatWindow(value) {
			if (!Number.isFinite(value) || value < 0) return "--";
			if (value < 1000) return String(value);
			if (value < 1e6) return trimZero((value / 1e3).toFixed(1)) + "K";
			const m = value / 1e6;
			return (Number.isInteger(m) ? m.toFixed(1) : trimZero(m.toFixed(2))) + "M";
		}
		function formatDuration(ms) {
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
		function percentLevel(pct) {
			if (pct === null || pct === undefined || !Number.isFinite(pct)) return "none";
			if (pct >= 60) return "ok";
			if (pct >= 25) return "warn";
			return "low";
		}
		function clampPct(value) {
			return Math.max(0, Math.min(100, value));
		}
		function formatTime(at) {
			if (!Number.isFinite(at) || at <= 0) return "--:--:--";
			const d = new Date(at);
			const pad = (n) => String(n).padStart(2, "0");
			return pad(d.getHours()) + ":" + pad(d.getMinutes()) + ":" + pad(d.getSeconds());
		}
		function sharePct(value, total) {
			if (!Number.isFinite(value) || !Number.isFinite(total) || total <= 0) return 0;
			return (value / total) * 100;
		}

		// ── locale ────────────────────────────────────────────────────────────
		const NS = "usageColumn";

		const zh = {
			nav: "用量侧栏",
			panelTitle: "用量侧栏",
			generalTitle: "侧边使用信息栏",
			generalDesc: "在界面左侧或右侧显示余额、会话用量与上下文窗口",
			close: "关闭",
			refresh: "刷新",
			switchSide: "切换侧栏到另一侧",
			loading: "正在读取用量…",
			retry: "重试",
			error: "暂时无法读取用量数据。",
			degraded: "数据暂不可用，自动重试中…",
			balanceTitle: "账户余额",
			available: "可用余额",
			granted: "赠金余额",
			toppedUp: "充值余额",
			usablePercent: "可用百分比",
			usedShare: "已消耗",
			balanceShare: "余额构成",
			missingKey: "未配置 DEEPSEEK_API_KEY：请在设置中配置凭证后刷新。",
			apiError: "余额接口暂时不可用，仅展示本地会话统计。",
			sessionTitle: "本会话消耗",
			inputMiss: "输入 · 缓存未命中",
			inputHit: "输入 · 缓存命中",
			output: "输出",
			reasoning: "推理",
			steps: "模型步骤",
			llmTime: "LLM 运行时间",
			toolTime: "工具调用时间",
			tokenRate: "输出速率",
			hitRate: "缓存命中率",
			cost: "费用估算",
			priceTier: "计价档",
			perMillion: "元/百万",
			hitCost: "命中金额",
			missCost: "未命中金额",
			outputCost: "输出金额",
			costShare: "金额占比",
			contextTitle: "上下文窗口",
			contextTag: "上下文",
			contextRemain: "剩余",
			contextUnit: "上下文",
			usedPct: "已使用",
			baseline: "开始余额",
			resetBaseline: "重置基线",
			sessionPct: "消耗占比",
			noSession: "打开一个会话后即可统计该会话的用量。",
			updatedAt: "更新于",
			priceNote: "费用按内置官方价格表估算，可在设置中覆盖；实际扣费以官方账单为准。",
			sourceCredential: "凭证来源"
		};

		const en = {
			nav: "Usage Column",
			panelTitle: "Usage Column",
			generalTitle: "Usage side column",
			generalDesc: "Show balance, session usage and context window on either side of the UI",
			close: "Close",
			refresh: "Refresh",
			switchSide: "Switch panel to the other side",
			loading: "Reading usage…",
			retry: "Retry",
			error: "Usage data is temporarily unavailable.",
			degraded: "Data temporarily unavailable, retrying…",
			balanceTitle: "Account Balance",
			available: "Available",
			granted: "Granted",
			toppedUp: "Topped up",
			usablePercent: "Usable percent",
			usedShare: "Used",
			balanceShare: "Balance composition",
			missingKey: "DEEPSEEK_API_KEY is not configured. Configure the credential and refresh.",
			apiError: "The balance API is unavailable; only local session stats are shown.",
			sessionTitle: "This Session",
			inputMiss: "Input · cache miss",
			inputHit: "Input · cache hit",
			output: "Output",
			reasoning: "Reasoning",
			steps: "Model steps",
			llmTime: "LLM time",
			toolTime: "Tool time",
			tokenRate: "Output rate",
			hitRate: "Cache hit rate",
			cost: "Estimated cost",
			priceTier: "Rate tier",
			perMillion: "per 1M",
			hitCost: "Hit cost",
			missCost: "Miss cost",
			outputCost: "Output cost",
			costShare: "Cost share",
			contextTitle: "Context Window",
			contextTag: "Context",
			contextRemain: "left",
			contextUnit: "context",
			usedPct: "used",
			baseline: "Balance at start",
			resetBaseline: "Reset baseline",
			sessionPct: "Cost share",
			noSession: "Open a session to track its usage.",
			updatedAt: "Updated",
			priceNote: "Cost is estimated from the built-in official price table (overridable in settings); the official bill prevails.",
			sourceCredential: "Credential source"
		};

		// ── remote contribution ───────────────────────────────────────────────
		// 手写 codec：客户端边界只要求 parse()，服务端 manifest 负责严格校验。
		const identity = (value) => value;
		const codec = (symbol) => ({ mode: "strict", typeSymbol: symbol, schema: { parse: identity } });

		const CONTRIBUTION = {
			package: "dsh-usage-column",
			descriptors: [
				{
					id: "dsh-usage-column#usageColumn/snapshot",
					service: "usageColumn",
					namespace: "usageColumn",
					method: "snapshot",
					invocation: { kind: "direct" },
					parameters: [
						{ name: "sessionId", wire: "sessionId", source: "json", acceptsUndefined: true, codec: codec("dsh-usage-column#sessionId") }
					],
					result: codec("dsh-usage-column#Snapshot")
				},
				{
					id: "dsh-usage-column#usageColumn/balance",
					service: "usageColumn",
					namespace: "usageColumn",
					method: "balance",
					invocation: { kind: "direct" },
					parameters: [],
					result: codec("dsh-usage-column#Balance")
				},
				{
					id: "dsh-usage-column#usageColumn/setPricing",
					service: "usageColumn",
					namespace: "usageColumn",
					method: "setPricing",
					invocation: { kind: "direct" },
					parameters: [
						{ name: "pricing", wire: "pricing", source: "json", codec: codec("dsh-usage-column#PricingMap") }
					],
					result: codec("dsh-usage-column#Ok")
				},
				{
					id: "dsh-usage-column#usageColumn/resetBaseline",
					service: "usageColumn",
					namespace: "usageColumn",
					method: "resetBaseline",
					invocation: { kind: "direct" },
					parameters: [
						{ name: "sessionId", wire: "sessionId", source: "json", codec: codec("dsh-usage-column#sessionId") }
					],
					result: codec("dsh-usage-column#Ok")
				}
			]
		};

		// ── 占位快照：数据不可用（error）时渲染同构卡片结构，数值全部为占位 ──
		const PLACEHOLDER_SNAP = {
			version: null,
			sessionId: "placeholder",
			model: null,
			at: 0,
			balance: { ok: true, currency: "CNY", total: NaN, granted: NaN, toppedUp: NaN, usablePercent: null, error: null, source: null },
			usage: { inputTokens: NaN, cacheReadTokens: NaN, cacheWriteTokens: NaN, outputTokens: NaN, reasoningTokens: NaN, steps: NaN },
			cost: { hit: NaN, miss: NaN, output: NaN, total: NaN },
			priceUsed: null,
			stats: { turns: NaN, steps: NaN, llmMs: NaN, toolMs: NaN, ttftMs: NaN, ttftSteps: NaN, decodeMs: NaN, decodeTokens: NaN },
			context: null,
			hitRate: null,
			tokenPerSec: null,
			baseline: NaN,
			sessionPercent: null,
			asOfSeq: -1,
			debug: null
		};

		// ── 共享开合状态（侧栏按钮与面板之间）─────────────────────────────────
		const panelStore = {
			open: false,
			side: typeof window !== "undefined" && window.localStorage ? (() => {
				try {
					return window.localStorage.getItem("dsh-usage-column.side") === "left" ? "left" : "right";
				} catch {
					return "right";
				}
			})() : "right",
			listeners: new Set(),
			subscribe(fn) {
				this.listeners.add(fn);
				return () => {
					this.listeners.delete(fn);
				};
			},
			getOpen() {
				return this.open;
			},
			setOpen(value) {
				this.open = value;
				for (const fn of [...this.listeners]) fn();
			},
			getSide() {
				return this.side;
			},
			setSide(value) {
				this.side = value;
				if (typeof window !== "undefined" && window.localStorage) {
					try {
						window.localStorage.setItem("dsh-usage-column.side", value);
					} catch {
						// 隐私模式等场景写入失败可忽略
					}
				}
				for (const fn of [...this.listeners]) fn();
			}
		};

		function usePanelOpen() {
			return react.useSyncExternalStore(
				panelStore.subscribe.bind(panelStore),
				panelStore.getOpen.bind(panelStore),
				() => false
			);
		}

		// ── 功能总开关（设置 > 通用设置），localStorage 持久化，默认开启 ───────
		const enabledStore = {
			enabled: typeof window !== "undefined" && window.localStorage ? (() => {
				try {
					const raw = window.localStorage.getItem("dsh-usage-column.enabled");
					return raw === null ? true : raw !== "0";
				} catch {
					return true;
				}
			})() : true,
			listeners: new Set(),
			subscribe(fn) {
				this.listeners.add(fn);
				return () => {
					this.listeners.delete(fn);
				};
			},
			getEnabled() {
				return this.enabled;
			},
			setEnabled(value) {
				this.enabled = value;
				if (typeof window !== "undefined" && window.localStorage) {
					try {
						window.localStorage.setItem("dsh-usage-column.enabled", value ? "1" : "0");
					} catch {
						// 隐私模式等场景写入失败可忽略
					}
				}
				if (!value) panelStore.setOpen(false);
				for (const fn of [...this.listeners]) fn();
			}
		};

		function usePanelEnabled() {
			return react.useSyncExternalStore(
				enabledStore.subscribe.bind(enabledStore),
				enabledStore.getEnabled.bind(enabledStore),
				() => true
			);
		}

		function usePanelSide() {
			return react.useSyncExternalStore(
				panelStore.subscribe.bind(panelStore),
				panelStore.getSide.bind(panelStore),
				() => "right"
			);
		}

		// ── 小组件 ─────────────────────────────────────────────────────────────
		function Icon(props) {
			const paths = {
				refresh: ["M13.5 8A5.5 5.5 0 1 1 8 2.5", "M13.5 2.5v3h-3", "M8 13.5a5.5 5.5 0 0 1-1.8-.33", "M5.5 12.5a5.5 5.5 0 0 1-1-3.5"],
				side: ["M9 2.5h3v11h-3z", "M5 4.5h4v7H5z", "M7 4.5v-2M7 11.5v2"],
				close: ["M4.5 4.5l7 7", "M11.5 4.5l-7 7"],
				// 柱状图（用量/统计）：与外壳 16px Outline 图标同描边风格
				chart: ["M2.5 13.5h11", "M4 12.5V8.5", "M8 12.5V5", "M12 12.5v-2.8"]
			}[props.kind];
			return react.createElement("svg", {
				width: "16",
				height: "16",
				viewBox: "0 0 16 16",
				fill: "none",
				"aria-hidden": "true",
				children: paths.map((d, index) => react.createElement("path", {
					key: index,
					d,
					stroke: "currentColor",
					strokeWidth: 1.6,
					strokeLinecap: "round",
					strokeLinejoin: "round"
				}))
			});
		}

		/** 单段百分比条；caption 为空时显示百分比数字；dangerWhenHigh 用于"占用越高越危险"。 */
		function PctBar(props) {
			const raw = props.pct;
			const pct = raw === null || raw === undefined ? null : clampPct(raw);
			const level = pct === null ? "none" : props.dangerWhenHigh === true
				? (pct >= 60 ? "low" : pct >= 25 ? "warn" : "ok")
				: percentLevel(pct);
			const caption = props.caption !== undefined && props.caption !== null
				? props.caption
				: (pct === null ? "—" : pct.toFixed(1) + "%");
			return react.createElement(
				"div",
				{ className: "ucc-barWrap" },
				react.createElement(
					"div",
					{
						className: "ucc-bar",
						role: "progressbar",
						"aria-label": props.label,
						"aria-valuenow": pct === null ? undefined : Math.round(pct),
						"aria-valuemin": 0,
						"aria-valuemax": 100
					},
					react.createElement("div", {
						className: "ucc-barFill ucc-barFill-" + level,
						style: { width: (pct === null ? 0 : pct) + "%" }
					})
				),
				react.createElement("span", { className: "ucc-barLabel" }, caption)
			);
		}

		/** 多段占比条（堆叠）：segments = [{ value, className, title }]。 */
		function StackBar(props) {
			const total = props.segments.reduce((sum, seg) => sum + Math.max(0, seg.value), 0);
			const visible = props.segments.filter((seg) => seg.value > 0);
			return react.createElement(
				"div",
				{ className: "ucc-barWrap" },
				react.createElement(
					"div",
					{ className: "ucc-bar ucc-barStack", role: "img", "aria-label": props.label, title: props.label },
					total > 0 ? visible.map((seg, index) => react.createElement("div", {
						key: index,
						className: "ucc-barSeg " + seg.className,
						title: seg.title,
						style: { width: sharePct(seg.value, total) + "%" }
					})) : null
				),
				props.caption !== undefined && props.caption !== null ? react.createElement("span", { className: "ucc-barLabel" }, props.caption) : null
			);
		}

		function Swatch(props) {
			return react.createElement("span", { className: "ucc-swatch " + props.color, "aria-hidden": "true" });
		}

		function Row(props) {
			return react.createElement(
				"div",
				{ className: "ucc-row" },
				react.createElement("dt", null, props.swatch !== undefined ? react.createElement(Swatch, { color: props.swatch }) : null, props.label),
				react.createElement("dd", { className: "ucc-value", title: String(props.value) }, props.value)
			);
		}

		function Metric(props) {
			return react.createElement(
				"div",
				{ className: "ucc-metric" },
				react.createElement("span", null, props.label),
				react.createElement("b", { title: String(props.value) }, props.value)
			);
		}

		// ── 错误边界：面板渲染/effect 崩溃时显示错误而非让席位停用消失 ────────
		class PanelBoundary extends react.Component {
			constructor(props) {
				super(props);
				this.state = { error: null };
			}
			static getDerivedStateFromError(error) {
				return { error };
			}
			componentDidCatch(error, info) {
				try {
					console.error("[dsh-usage-column] 面板渲染失败:", error, info);
				} catch {
					// 控制台不可用时忽略
				}
			}
			render() {
				if (this.state.error !== null) {
					return react.createElement(
						"div",
						{ className: "ucc-panel", "data-side": "right", role: "alert" },
						react.createElement(
							"div",
							{ className: "ucc-head" },
							react.createElement("span", { className: "ucc-title" }, "[dsh-usage-column] 渲染失败")
						),
						react.createElement(
							"div",
							{ className: "ucc-body" },
							react.createElement("p", { className: "ucc-failure" },
								String(this.state.error && this.state.error.message ? this.state.error.message : this.state.error)),
							react.createElement("button", { type: "button", className: "ucc-miniBtn", onClick: () => this.setState({ error: null }) }, "重试")
						)
					);
				}
				return this.props.children;
			}
		}

		/** 上下文窗口条：「上下文」标记 + 「xx% 已使用」+ 已使用进度条 + 「剩余 xxK 上下文」。 */
		function ContextBar(props) {
			const { t, used, windowSize, remaining, approximate } = props;
			const pct = windowSize > 0 ? sharePct(used, windowSize) : null;
			const level = pct === null ? "none" : pct >= 60 ? "low" : pct >= 25 ? "warn" : "ok";
			return react.createElement(
				"div",
				{ className: "ucc-context" },
				react.createElement(
					"div",
					{ className: "ucc-contextHead" },
					react.createElement("span", { className: "ucc-contextTag" }, t("contextTag")),
					react.createElement("span", { className: "ucc-contextPct" },
						pct === null ? "—" : (approximate === true ? "≈" : "") + pct.toFixed(0) + "% " + t("usedPct"))
				),
				react.createElement(
					"div",
					{
						className: "ucc-contextBar",
						role: "progressbar",
						"aria-label": t("contextTitle"),
						"aria-valuenow": pct === null ? undefined : Math.round(pct),
						"aria-valuemin": 0,
						"aria-valuemax": 100
					},
					react.createElement("div", { className: "ucc-barFill ucc-barFill-" + level, style: { width: (pct === null ? 0 : pct) + "%" } })
				),
				react.createElement("span", { className: "ucc-contextRemain" },
					t("contextRemain") + " " + formatWindow(remaining) + " " + t("contextUnit"))
			);
		}

		// ── 面板 ───────────────────────────────────────────────────────────────
		function UsagePanel(props) {
			const { t, currentSessionId, callRemote } = props;
			const side = usePanelSide();
			const [state, setState] = react.useState({ status: "loading" });
			const [request, setRequest] = react.useState(0);

			react.useEffect(() => {
				let cancelled = false;
				const load = () => {
					Promise.resolve().then(() => {
						// 会话读取放入 promise 链：任何同步异常都变成拒绝，不会让 effect 崩溃卸载
						const sessionId = currentSessionId();
						return callRemote("snapshot", sessionId);
					}).then((snap) => {
						if (cancelled) return;
						if (snap === null || typeof snap !== "object") throw new Error("bad snapshot");
						setState({ status: "ready", snap });
					}, (error) => {
						if (cancelled) return;
						setState({ status: "error", message: String(error && error.message ? error.message : error) });
					});
				};
				load();
				const timer = window.setInterval(load, 30000);
				return () => {
					cancelled = true;
					window.clearInterval(timer);
				};
			}, [request]);

			const refresh = () => setRequest((value) => value + 1);

			const resetBaseline = () => {
				Promise.resolve().then(() => {
					const sessionId = currentSessionId();
					if (sessionId === undefined) return null;
					return callRemote("resetBaseline", sessionId);
				}).then(() => {
					refresh();
				}, () => {
					// 重置失败保持现状
				});
			};

			const renderBody = () => {
				if (state.status === "loading") {
					return react.createElement("p", { className: "ucc-status" }, t("loading"));
				}
				// 数据不可用（error）时渲染占位卡片结构（全部数值为占位串），
				// 数据到位后由 30s 轮询自动同步为真实值，不再显示错误横幅。
				const degraded = state.status === "error";
				const snap = degraded ? PLACEHOLDER_SNAP : state.snap;
				const balance = snap.balance;
				const usage = snap.usage;
				const hasSession = snap.sessionId !== null && snap.sessionId !== undefined;
				const currency = balance.currency;

				// ── 余额卡：可用余额 + 赠金/充值构成堆叠条 + 可用百分比条 ──
				let balanceCard;
				if (!balance.ok) {
					balanceCard = react.createElement(
						"section",
						{ className: "ucc-card" },
						react.createElement("h3", null, t("balanceTitle"), react.createElement("span", { className: "ucc-badge" }, currency)),
						react.createElement("p", { className: "ucc-status" },
							balance.error === "missing-key" ? t("missingKey") : t("apiError") + "（" + balance.error + "）")
					);
				} else {
					const shareTotal = balance.granted + balance.toppedUp;
					const usedPart = Math.max(0, shareTotal - balance.total);
					balanceCard = react.createElement(
						"section",
						{ className: "ucc-card" },
						react.createElement("h3", null, t("balanceTitle"), react.createElement("span", { className: "ucc-badge" }, currency)),
						react.createElement("div", { className: "ucc-big" }, formatMoney(balance.total, currency)),
						react.createElement(
							"dl",
							{ className: "ucc-rows" },
							react.createElement(Row, { label: t("granted"), value: formatMoney(balance.granted, currency), swatch: "ucc-swatch-green" }),
							react.createElement(Row, { label: t("toppedUp"), value: formatMoney(balance.toppedUp, currency), swatch: "ucc-swatch-blue" }),
							balance.source !== null && balance.source !== undefined ? react.createElement(Row, { label: t("sourceCredential"), value: balance.source }) : null
						),
						// 合成条：赠金(绿) + 充值(蓝) = 可用部分，已耗(灰)；0% 段自动呈现为细线；
						// 无文字标注，横条只表示粗略大小
						react.createElement(StackBar, {
							label: t("usablePercent"),
							segments: [
								{ value: balance.granted, className: "ucc-barSeg-green", title: t("granted") },
								{ value: balance.toppedUp, className: "ucc-barSeg-blue", title: t("toppedUp") },
								{ value: usedPart, className: "ucc-barSeg-gray", title: t("usedShare") }
							]
						})
					);
				}

				// ── 会话卡：tokens 明细 + 运行指标 + 费用三段 + 上下文窗口条 ──
				let sessionCard;
				if (!hasSession) {
					sessionCard = react.createElement("p", { className: "ucc-status" }, t("noSession"));
				} else {
					const stats = snap.stats;
					const cost = snap.cost;
					const context = snap.context;
					const costTotal = (cost && cost.total) || 0;
					const costSegments = cost ? [
						{ value: cost.hit || 0, className: "ucc-barSeg-green", title: t("hitCost") },
						{ value: cost.miss || 0, className: "ucc-barSeg-orange", title: t("missCost") },
						{ value: cost.output || 0, className: "ucc-barSeg-blue", title: t("outputCost") }
					] : [];

					const tokenRate = snap.tokenPerSec !== null && snap.tokenPerSec !== undefined
						? (snap.tokenPerSec < 10 ? snap.tokenPerSec.toFixed(1) : String(Math.round(snap.tokenPerSec))) + " t/s"
						: "--";
					const hitRateText = snap.hitRate !== null && snap.hitRate !== undefined ? snap.hitRate.toFixed(1) + "%" : "--";

					sessionCard = react.createElement(
						"section",
						{ className: "ucc-card" },
						react.createElement("h3", null, t("sessionTitle")),
						react.createElement(
							"dl",
							{ className: "ucc-rows" },
							react.createElement(Row, { label: t("inputMiss"), value: formatTokens(usage.inputTokens) }),
							react.createElement(Row, { label: t("inputHit"), value: formatTokens(usage.cacheReadTokens) }),
							react.createElement(Row, { label: t("output"), value: formatTokens(usage.outputTokens) }),
							usage.reasoningTokens > 0 ? react.createElement(Row, { label: t("reasoning"), value: formatTokens(usage.reasoningTokens) }) : null,
							react.createElement(Row, { label: t("steps"), value: Number.isFinite(usage.steps) ? String(usage.steps) : "--" })
						),
						stats != null ? react.createElement(
							"div",
							{ className: "ucc-metrics" },
							react.createElement(Metric, { label: t("llmTime"), value: formatDuration(stats.llmMs) }),
							react.createElement(Metric, { label: t("toolTime"), value: formatDuration(stats.toolMs) }),
							react.createElement(Metric, { label: t("tokenRate"), value: tokenRate }),
							react.createElement(Metric, { label: t("hitRate"), value: hitRateText })
						) : null,
						react.createElement("div", { className: "ucc-cost" }, formatMoney(costTotal, currency)),
						react.createElement(
							"dl",
							{ className: "ucc-rows" },
							react.createElement(Row, { label: t("hitCost"), value: formatMoney(cost && cost.hit, currency), swatch: "ucc-swatch-green" }),
							react.createElement(Row, { label: t("missCost"), value: formatMoney(cost && cost.miss, currency), swatch: "ucc-swatch-orange" }),
							react.createElement(Row, { label: t("outputCost"), value: formatMoney(cost && cost.output, currency), swatch: "ucc-swatch-blue" })
						),
						// 金额占比条：不写百分比文字，仅用三段相对比例粗略表示
						react.createElement(StackBar, {
							label: t("costShare"),
							segments: costSegments
						}),
						context != null ? react.createElement(ContextBar, {
							t,
							used: context.used,
							windowSize: context.window,
							remaining: context.remaining,
							approximate: context.approximate === true
						}) : null,
						snap.priceUsed != null ? react.createElement("p", { className: "ucc-tier" },
							t("priceTier") + "：" + (snap.model ?? "—") + " · 命中 " + snap.priceUsed.hit +
							" / 未命中 " + snap.priceUsed.miss + " / 输出 " + snap.priceUsed.output + " " + t("perMillion")) : null,
						react.createElement(
							"div",
							{ className: "ucc-row", style: { marginTop: 8 } },
							react.createElement("span", { className: "ucc-updated" },
								snap.baseline != null ? t("baseline") + " " + formatMoney(snap.baseline, currency) + " · " : "",
								t("updatedAt") + " " + formatTime(snap.at)),
							react.createElement("button", { type: "button", className: "ucc-miniBtn", onClick: resetBaseline }, t("resetBaseline"))
						)
					);
				}

				return react.createElement(
					react.Fragment,
					null,
					balanceCard,
					sessionCard,
					react.createElement("p", { className: "ucc-note" }, degraded ? t("degraded") : t("priceNote"))
				);
			};

			return react.createElement(
				"div",
				{
					className: "ucc-panel",
					"data-side": side,
					style: { "--ucc-from": side === "right" ? "16px" : "-16px" },
					role: "complementary",
					"aria-label": t("panelTitle")
				},
				react.createElement(
					"div",
					{ className: "ucc-head" },
					react.createElement("span", { className: "ucc-title" },
						t("panelTitle"),
						state.status === "ready" && state.snap.version != null
							? react.createElement("span", { className: "ucc-ver" }, "v" + state.snap.version)
							: null),
					react.createElement("button", { type: "button", className: "ucc-iconBtn", title: t("refresh"), "aria-label": t("refresh"), onClick: refresh },
						react.createElement(Icon, { kind: "refresh" })),
					react.createElement("button", {
						type: "button",
						className: "ucc-iconBtn",
						title: t("switchSide"),
						"aria-label": t("switchSide"),
						onClick: () => panelStore.setSide(side === "right" ? "left" : "right")
					}, react.createElement(Icon, { kind: "side" })),
					react.createElement("button", {
						type: "button",
						className: "ucc-iconBtn",
						title: t("close"),
						"aria-label": t("close"),
						onClick: () => panelStore.setOpen(false)
					}, react.createElement(Icon, { kind: "close" }))
				),
				react.createElement("div", { className: "ucc-body" }, renderBody())
			);
		}

		// ── 通用设置开关行（settings.general.item）─────────────────────────────
		function SettingsRow(props) {
			const { t } = props;
			const enabled = usePanelEnabled();
			return react.createElement(
				"div",
				{ className: "ucc-genRow" },
				react.createElement(
					"div",
					{ className: "ucc-genRowText" },
					react.createElement("div", { className: "ucc-genTitle" }, t("generalTitle")),
					react.createElement("div", { className: "ucc-genDesc" }, t("generalDesc"))
				),
				react.createElement(
					"button",
					{
						type: "button",
						role: "switch",
						className: "ucc-genSwitch",
						"data-on": enabled ? "true" : undefined,
						"aria-checked": enabled,
						"aria-label": t("generalTitle"),
						onClick: () => enabledStore.setEnabled(!enabled)
					},
					react.createElement("span", { className: "ucc-genSwitchThumb", "aria-hidden": "true" })
				)
			);
		}

		// ── 侧栏入口按钮（sidebar.footer.action）───────────────────────────────
		// 展开（wide）时显示「图标 + 文字」，折叠（rail）时只保留图标；总开关关闭时隐藏。
		function SidebarAction(props) {
			const { t } = props;
			const open = usePanelOpen();
			const enabled = usePanelEnabled();
			const wide = props.wide !== false;
			if (!enabled) return null;
			return react.createElement(
				"button",
				{
					className: "ucc-trigger",
					"data-rail": wide ? undefined : "true",
					title: t("panelTitle"),
					"aria-pressed": open,
					"aria-label": t("generalTitle"),
					onClick: () => panelStore.setOpen(!open)
				},
				react.createElement(Icon, { kind: "chart" }),
				wide ? react.createElement("span", { className: "ucc-triggerLabel" }, t("generalTitle")) : null
			);
		}

		// ── 覆盖层面板（shell.overlay）────────────────────────────────────────
		function OverlayPanel(props) {
			const { t, currentSessionId, callRemote } = props;
			const open = usePanelOpen();
			const enabled = usePanelEnabled();
			react.useEffect(() => {
				if (!open || !enabled) return;
				const onKey = (event) => {
					if (event.key === "Escape") panelStore.setOpen(false);
				};
				window.addEventListener("keydown", onKey);
				return () => window.removeEventListener("keydown", onKey);
			}, [open, enabled]);
			if (!enabled || !open) return null;
			return react.createElement(UsagePanel, { t, currentSessionId, callRemote });
		}

		// ── cordis 插件体 ─────────────────────────────────────────────────────
		const inject = ["slots", "locale", "remote", "sessions"];

		function apply(ctx) {
			// 字典注册（生命周期随插件 fiber）
			ctx.effect(() => ctx.locale.register(NS, { zh, en }), "ui-usage-column: dictionaries");

			const t = ctx.locale.bind(NS);
			// 挂载远程贡献；所有远程调用都等待挂载完成后再取命名空间服务。
			const mount = ctx.remote.$mount(CONTRIBUTION);
			const currentSessionId = () => {
				try {
					const sessions = ctx.get("sessions");
					const info = sessions === undefined || sessions === null ? undefined : sessions.currentProvideInfo?.getSnapshot?.();
					return info === undefined || info === null ? undefined : info.sessionId;
				} catch {
					return undefined;
				}
			};
			const callRemote = async (method, ...args) => {
				await mount;
				const remote = ctx.get("remote.usageColumn");
				if (remote === undefined) throw new Error("remote.usageColumn 尚未挂载");
				const result = await remote[method](...args);
				if (!result.ok) throw new Error("usageColumn." + method + " failed: " + result.error.code + ": " + result.error.message);
				return result.value;
			};

			ctx.slots.inject("sidebar.footer.action", () => ctx.slots.register({
				name: "sidebar.footer.action",
				id: "usage-column",
				order: 90,
				label: () => t("nav")
			}, (props) => react.createElement(SidebarAction, { t, wide: props.wide })));

			ctx.slots.inject("settings.general.item", () => ctx.slots.register({
				name: "settings.general.item",
				id: "usage-column",
				order: 30,
				label: () => t("generalTitle")
			}, (props) => react.createElement(SettingsRow, { t })));

			ctx.slots.inject("shell.overlay", () => ctx.slots.register({
				name: "shell.overlay",
				id: "usage-column-panel",
				order: 90,
				label: () => t("panelTitle")
			}, (props) => react.createElement(PanelBoundary, null,
				react.createElement(OverlayPanel, { t, currentSessionId, callRemote })
			)));
		}

		// 内部导出：供诊断与测试使用，不影响插件运行
		exports.NS = NS;
		exports.apply = apply;
		exports.inject = inject;
		exports.panelStore = panelStore;
		exports.enabledStore = enabledStore;
		exports.UsagePanel = UsagePanel;
		exports.SidebarAction = SidebarAction;
		exports.SettingsRow = SettingsRow;
		exports.OverlayPanel = OverlayPanel;
		exports.PctBar = PctBar;
		exports.StackBar = StackBar;
		exports.formatMoney = formatMoney;
		exports.formatTokens = formatTokens;
		exports.formatWindow = formatWindow;
		exports.formatDuration = formatDuration;
		return module.exports;
	}
});
