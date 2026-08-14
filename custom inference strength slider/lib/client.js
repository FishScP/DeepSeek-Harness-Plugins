window.__ModuleLoader__.load({
  id: "@deepseek-ai/dsh-client-liang",
  factory: (require) => {
    var module = { exports: {} };
    var exports = module.exports;
    Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
    var react = require("react");

    // ─────────────────────────────────────────────────────────────
    // 样式（移植自原仓库 src/styles.css，作用域化到面板容器）
    // ─────────────────────────────────────────────────────────────
    const css = [
      ".liang-backdrop{position:fixed;inset:0;z-index:9990;background:rgb(12 13 12/62%);display:grid;place-items:center;backdrop-filter:blur(3px)}",
      ".liang-frame{position:relative;width:min(920px,94vw);height:min(92vh,860px);min-height:480px;border-radius:18px;overflow:hidden;box-shadow:0 30px 80px rgb(0 0 0/45%);background:#e8e9e5}",
      ".liang-frame .experience{min-height:100%;height:100%;padding:22px 26px 14px;grid-template-rows:auto minmax(0,1fr) auto auto}",
      ".liang-close{position:absolute;top:14px;right:16px;z-index:20;width:34px;height:34px;border-radius:50%;border:1px solid rgb(255 255 255/28%);background:rgb(0 0 0/32%);color:#fff;font-size:18px;line-height:1;cursor:pointer;display:grid;place-items:center;font-family:inherit}",
      ".liang-close:hover{background:rgb(0 0 0/55%)}",
      ".liang-trigger{display:inline-flex;align-items:center;justify-content:center;cursor:pointer}",
      ".liang-trigger-glyph{font-size:13px;font-weight:700;line-height:1;border-radius:6px;border:1px solid currentColor;padding:3px 6px;opacity:.85}",
      ".liang-trigger:hover .liang-trigger-glyph{opacity:1}",
      ".liang-reasoning{position:relative;z-index:10;display:flex;align-items:center;justify-content:center;gap:8px;margin-top:10px;flex-wrap:wrap}",
      ".liang-reasoning-title{color:var(--muted);font-size:10px;letter-spacing:.12em;font-family:Consolas,monospace}",
      ".liang-effort{border:1px solid color-mix(in srgb,currentColor 30%,transparent);background:transparent;color:var(--muted);border-radius:999px;padding:3px 12px;font-size:11px;cursor:pointer;font-family:inherit;letter-spacing:.06em;transition:color 140ms ease,border-color 140ms ease,background 140ms ease}",
      ".liang-effort:hover:not(:disabled){color:var(--ink);border-color:currentColor}",
      ".liang-effort.is-current{color:#f4f1e8;background:var(--accent);border-color:var(--accent)}",
      ".liang-effort:disabled{opacity:.55;cursor:wait}",
      ".liang-reasoning-error{color:var(--accent);font-size:10px;letter-spacing:.04em}",
      ".liang-model-root{position:relative;min-width:0}",
      ".liang-model-trigger{min-width:0;max-width:220px;height:28px;color:var(--dsw-alias-label-secondary);cursor:pointer;background:transparent;border:none;border-radius:24px;outline:none;display:flex;align-items:center;gap:4px;padding:0 4px 0 8px;font-size:13px;font-weight:500;line-height:20px;font-family:inherit}",
      ".liang-model-trigger:hover:not(:disabled){background:var(--dsw-alias-interactive-bg-hover)}",
      ".liang-model-trigger:focus-visible{box-shadow:0 0 0 2px var(--dsw-alias-border-l3)}",
      ".liang-model-trigger:disabled{color:var(--dsw-alias-label-dimmed);cursor:default}",
      ".liang-model-trigger-label{text-overflow:ellipsis;white-space:nowrap;min-width:0;overflow:hidden}",
      ".liang-model-trigger-effort{color:var(--dsw-alias-label-caption);flex:none}",
      ".liang-model-chevron{color:var(--dsw-alias-label-caption);flex:none;display:inline-flex;transition:transform .12s}",
      ".liang-model-chevron-open{transform:rotate(180deg)}",
      ".liang-model-menu{z-index:20;border:1px solid var(--dsw-alias-border-inverted);background:var(--dsw-specific-menu);width:min(240px,100vw - 32px);max-height:min(360px,100vh - 96px);box-shadow:var(--dsw-shadow-lv3);color:var(--dsw-alias-label-primary);border-radius:12px;display:flex;flex-direction:column;padding:4px;position:absolute;bottom:calc(100% + 8px);right:0;overflow:hidden}",
      ".liang-model-cell{display:flex;align-items:center;gap:8px;width:100%;padding:8px;border:none;background:transparent;color:inherit;border-radius:8px;cursor:pointer;text-align:left;font:inherit;font-size:13px;line-height:20px}",
      ".liang-model-cell:hover{background:var(--dsw-alias-interactive-bg-hover)}",
      ".liang-model-cell-label{flex:none}",
      ".liang-model-cell-value{flex:1;min-width:0;text-align:right;color:var(--dsw-alias-label-secondary);text-overflow:ellipsis;white-space:nowrap;overflow:hidden;font-size:12px}",
      ".liang-model-cell-chevron{flex:none;color:var(--dsw-alias-label-caption);display:inline-flex}",
      ".liang-model-status{color:var(--dsw-alias-label-tertiary);padding:10px;font-size:13px;line-height:20px}",
      ".liang-model-error{background:var(--dsw-alias-interactive-bg-hover-danger);color:var(--dsw-alias-state-error-primary);border-radius:8px;display:flex;justify-content:space-between;align-items:flex-start;gap:8px;margin-bottom:4px;padding:7px 8px;font-size:12px;line-height:18px}",
      ".liang-model-warning{background:var(--dsw-alias-bg-module-platform);color:var(--dsw-alias-state-warn-label);border-radius:8px;padding:7px 8px;font-size:12px;margin-bottom:4px}",
      ".liang-model-retry{color:inherit;font:inherit;cursor:pointer;background:transparent;border:none;flex:none;padding:0;font-weight:600}",
      ".liang-model-groups{overflow:auto;display:flex;flex-direction:column;gap:2px}",
      ".liang-model-group-title{color:var(--dsw-alias-label-tertiary);font-size:11px;padding:6px 8px 2px}",
      ".liang-model-option{display:flex;align-items:center;gap:8px;width:100%;padding:7px 8px;border:none;background:transparent;color:inherit;border-radius:8px;cursor:pointer;text-align:left;font:inherit}",
      ".liang-model-option:hover:not(:disabled){background:var(--dsw-alias-interactive-bg-hover)}",
      ".liang-model-option:disabled{opacity:.6;cursor:default}",
      ".liang-model-option-selected{background:var(--dsw-alias-interactive-bg-active)}",
      ".liang-model-option-copy{flex:1;min-width:0;display:flex;flex-direction:column}",
      ".liang-model-name{font-size:13px;line-height:20px}",
      ".liang-model-desc{font-size:11px;color:var(--dsw-alias-label-caption);text-overflow:ellipsis;white-space:nowrap;overflow:hidden}",
      ".liang-model-check{flex:none;color:var(--dsw-alias-state-success-primary);display:inline-flex}",
      ".liang-toggle-group{border-bottom:1px solid var(--dsw-alias-border-l2);display:flex;align-items:center;justify-content:space-between;gap:16px;padding:16px 0}",
      ".liang-toggle-copy{display:flex;flex-direction:column;gap:4px;min-width:0}",
      ".liang-toggle-title{color:var(--dsw-alias-label-primary);font-size:14px;font-weight:400;line-height:22px}",
      ".liang-toggle-desc{color:var(--dsw-alias-label-tertiary);font-size:12px;line-height:18px}",
      ".liang-switch{box-sizing:border-box;border:none;background:var(--dsw-alias-interactive-bg-hover-solid);cursor:pointer;border-radius:999px;width:36px;height:20px;position:relative;flex:none;transition:background .2s ease;padding:0;margin:0}",
      ".liang-switch-thumb{box-sizing:border-box;position:absolute;top:2px;left:2px;width:16px;height:16px;border-radius:50%;background:#fff;box-shadow:0 1px 2px rgb(0 0 0/20%);transition:transform .2s ease}",
      ".liang-switch.is-on{background:var(--dsw-alias-state-business-primary)}",
      ".liang-switch.is-on .liang-switch-thumb{transform:translateX(16px)}",
      ".liang-switch:focus-visible{outline:2px solid var(--dsw-alias-state-business-primary);outline-offset:2px}",
      ".experience{--strength:0;--stage-progress:0;--ink:#171816;--muted:#70746f;--accent:#b52b24;--gold:#c19a49;--thumb-bg:#e8e9e5;position:relative;isolation:isolate;display:grid;grid-template-rows:auto minmax(0,1fr) auto auto;min-height:100svh;overflow:hidden;padding:30px clamp(22px,4vw,62px) 20px;color:var(--ink);background:radial-gradient(circle at 50% 46%,rgb(255 255 255/65%) 0 18%,transparent 52%),#e8e9e5;transition:color 420ms ease;box-sizing:border-box}",
      ".experience *{box-sizing:border-box}",
      ".experience::before{position:absolute;z-index:-2;inset:0;content:\"\";background:radial-gradient(circle at 50% 45%,#3b2c24 0,#1d1918 34%,#111 74%),#111;opacity:calc(var(--strength)*0.94);transition:opacity 140ms linear}",
      ".experience::after{position:absolute;z-index:5;inset:0;pointer-events:none;content:\"\";background-image:repeating-linear-gradient(0deg,rgb(255 255 255/1.6%) 0 1px,transparent 1px 4px),radial-gradient(circle at 22% 18%,rgb(255 255 255/8%) 0 1px,transparent 1.5px);background-size:auto,7px 7px;mix-blend-mode:soft-light;opacity:.28}",
      ".experience[data-stage=\"4\"],.experience[data-stage=\"5\"]{--ink:#f4f1e8;--muted:#b8b4a9;--thumb-bg:#1a1715}",
      ".experience[data-stage=\"5\"]{--accent:#c19a49}",
      ".experience .masthead{position:relative;z-index:10;display:flex;align-items:flex-start;justify-content:space-between;gap:32px}",
      ".experience .eyebrow{margin:0 0 5px;color:var(--muted);font-family:Consolas,monospace;font-size:10px;letter-spacing:.22em;transition:color 360ms ease}",
      ".experience h1{margin:0;font-family:\"Songti SC\",STSong,SimSun,serif;font-size:clamp(34px,4.5vw,64px);font-weight:800;letter-spacing:-.09em;line-height:.95}",
      ".experience .level-meter{display:grid;min-width:118px;padding-top:3px;border-top:1px solid currentColor;font-family:Consolas,monospace;text-align:right}",
      ".experience .level-meter span{color:var(--muted);font-size:10px;letter-spacing:.16em}",
      ".experience .level-output{margin-top:4px;font-size:clamp(16px,2vw,23px);font-variant-numeric:tabular-nums;letter-spacing:-.04em}",
      ".experience .portrait-zone{position:relative;z-index:1;display:flex;min-height:0;align-items:center;flex-direction:column;justify-content:center;padding-top:4px}",
      ".experience .stage-ghost{position:absolute;z-index:-1;top:44%;left:50%;width:100%;margin:0;color:currentColor;font-family:\"Songti SC\",STSong,SimSun,serif;font-size:clamp(120px,20vw,300px);font-weight:900;letter-spacing:-.16em;line-height:.7;text-align:center;white-space:nowrap;opacity:calc(.035 + var(--strength)*.025);transform:translate(-50%,-50%) scale(calc(.95 + var(--strength)*.08));transform-origin:center;transition:opacity 180ms ease}",
      ".experience .portrait-shell{position:relative;width:min(44vh,480px,80vw);max-width:100%;aspect-ratio:1;filter:drop-shadow(0 28px 38px rgb(18 20 18/12%))}",
      ".experience .portrait-shell::before{position:absolute;z-index:3;inset:0;border:1px solid color-mix(in srgb,currentColor 16%,transparent);content:\"\";pointer-events:none}",
      ".experience .portrait-shell::after{position:absolute;z-index:3;top:50%;right:-13px;left:-13px;height:1px;content:\"\";background:linear-gradient(90deg,currentColor 0 12px,transparent 12px calc(100% - 12px),currentColor calc(100% - 12px));opacity:.42;pointer-events:none}",
      ".experience .portrait-canvas{position:relative;z-index:1;display:block;width:100%;height:100%;background:radial-gradient(circle at 50% 38%,#f7f7f5,#cfd1cf 70%);object-fit:cover}",
      ".experience .evolution-video{position:fixed;top:0;left:-9999px;width:1px;height:1px;pointer-events:none;opacity:0}",
      ".experience .imperial-halo{position:absolute;z-index:0;inset:-9%;border:1px solid rgb(193 154 73/55%);border-radius:50%;background:radial-gradient(circle,transparent 54%,rgb(193 154 73/15%) 54.4% 55.4%,transparent 55.8%),conic-gradient(from 0deg,transparent,rgb(193 154 73/22%),transparent 18%,transparent 32%,rgb(193 154 73/17%),transparent 52%,transparent 74%,rgb(193 154 73/20%),transparent);opacity:0;transform:rotate(calc(var(--strength)*28deg)) scale(.92);transition:opacity 500ms ease,transform 700ms ease}",
      ".experience[data-stage=\"5\"] .imperial-halo{opacity:.8;transform:rotate(calc(var(--strength)*28deg)) scale(1)}",
      ".experience .scan-grid{position:absolute;z-index:2;inset:0;pointer-events:none;background:linear-gradient(90deg,transparent 49.88%,rgb(255 255 255/15%) 50%,transparent 50.12%),linear-gradient(0deg,transparent 49.88%,rgb(255 255 255/11%) 50%,transparent 50.12%);mix-blend-mode:screen;opacity:calc(.15 - var(--strength)*.08)}",
      ".experience .frame-corner{position:absolute;z-index:4;width:19px;height:19px;border-color:currentColor;opacity:.72}",
      ".experience .frame-corner--tl{top:-7px;left:-7px;border-top:2px solid;border-left:2px solid}",
      ".experience .frame-corner--tr{top:-7px;right:-7px;border-top:2px solid;border-right:2px solid}",
      ".experience .frame-corner--bl{bottom:-7px;left:-7px;border-bottom:2px solid;border-left:2px solid}",
      ".experience .frame-corner--br{right:-7px;bottom:-7px;border-right:2px solid;border-bottom:2px solid}",
      ".experience .load-state{position:absolute;z-index:6;inset:0;display:grid;place-items:center;color:#f4f1e8;background:rgb(23 24 22/88%);font-family:Consolas,monospace;font-size:12px;letter-spacing:.08em}",
      ".experience .load-state[hidden]{display:none}",
      ".experience .load-state.is-error{color:#fff1ef;background:rgb(126 30 25/92%)}",
      ".experience .stage-readout{display:grid;grid-template-columns:1fr auto 1fr;width:min(44vh,480px,80vw);align-items:baseline;margin-top:12px}",
      ".experience .stage-readout>span{color:var(--muted);font-family:Consolas,monospace;font-size:9px;letter-spacing:.13em;text-transform:uppercase}",
      ".experience .stage-index{text-align:right}",
      ".experience .stage-name{min-width:3.5em;margin:0;color:currentColor;font-family:\"Songti SC\",STSong,SimSun,serif;font-size:clamp(34px,5vh,52px);font-weight:900;letter-spacing:-.08em;line-height:.9;text-align:center;text-shadow:0 0 calc(var(--strength)*24px) rgb(193 154 73/46%)}",
      ".experience[data-stage=\"5\"] .stage-name{color:#d5b56e}",
      ".experience .control-panel{--rail-inset:13px;position:relative;z-index:10;width:min(760px,100%);margin:6px auto 0}",
      ".experience .range-wrap{position:relative;height:48px}",
      ".experience .tick-track{position:absolute;top:12px;right:var(--rail-inset);left:var(--rail-inset);display:flex;align-items:center;justify-content:space-between;height:24px;pointer-events:none}",
      ".experience .tick{display:block;width:1px;height:7px;justify-self:center;background:currentColor;opacity:.2;transition:height 120ms ease,opacity 120ms ease,background 120ms ease}",
      ".experience .tick:nth-child(6n+1){height:18px;opacity:.5}",
      ".experience .tick.is-active{height:13px;background:var(--accent);opacity:.95}",
      ".experience .tick.is-active:nth-child(6n+1){height:24px}",
      ".experience .strength-slider{position:absolute;inset:0;width:100%;height:48px;margin:0;cursor:ew-resize;appearance:none;background:transparent;touch-action:pan-y}",
      ".experience .strength-slider:disabled{cursor:wait}",
      ".experience .strength-slider::-webkit-slider-runnable-track{height:1px;background:color-mix(in srgb,currentColor 25%,transparent)}",
      ".experience .strength-slider::-webkit-slider-thumb{width:26px;height:26px;margin-top:-13px;border:2px solid currentColor;border-radius:50%;appearance:none;background:radial-gradient(circle,var(--accent) 0 3px,transparent 3.5px),var(--thumb-bg);box-shadow:0 5px 18px rgb(0 0 0/22%)}",
      ".experience .strength-slider::-moz-range-track{height:1px;background:color-mix(in srgb,currentColor 25%,transparent)}",
      ".experience .strength-slider::-moz-range-thumb{width:22px;height:22px;border:2px solid currentColor;border-radius:50%;background:var(--accent);box-shadow:0 5px 18px rgb(0 0 0/22%)}",
      ".experience .strength-slider:focus-visible{outline:2px solid var(--accent);outline-offset:4px}",
      ".experience .stage-markers{display:flex;justify-content:space-between;margin:-2px 0 0;padding:0 var(--rail-inset);list-style:none}",
      ".experience .stage-marker{width:0;color:var(--muted);font-size:11px;letter-spacing:.06em;text-align:center;white-space:nowrap;transform:translateX(-50%);transition:color 140ms ease,transform 140ms ease}",
      ".experience .stage-marker.is-passed{color:color-mix(in srgb,var(--accent) 70%,currentColor)}",
      ".experience .stage-marker.is-current{color:currentColor;font-weight:700;transform:translate(-50%,-2px)}",
      ".experience .drag-hint{margin:10px 0 0;color:var(--muted);font-size:10px;letter-spacing:.12em;text-align:center}",
      ".experience .drag-hint span{display:inline-block;margin:0 6px}",
      ".experience .footer-note{position:relative;z-index:10;display:flex;justify-content:space-between;margin-top:10px;padding-top:10px;border-top:1px solid color-mix(in srgb,currentColor 18%,transparent);color:var(--muted);font-family:Consolas,monospace;font-size:8px;letter-spacing:.12em}",
      "@media (max-width:700px){.liang-frame .experience{padding:16px 12px 12px}.experience .eyebrow{max-width:190px;font-size:8px;line-height:1.4}.experience h1{font-size:clamp(30px,11vw,44px)}.experience .level-meter{min-width:84px}.experience .level-meter span{font-size:8px}.experience .portrait-shell,.experience .stage-readout{width:min(78vw,46vh,400px)}.experience .stage-name{font-size:clamp(30px,9vw,42px)}.experience .stage-marker{font-size:9px;letter-spacing:0}.experience .footer-note{display:none}}",
      "@media (prefers-reduced-motion:reduce){.experience *,.experience *::before,.experience *::after{transition-duration:.01ms!important;animation-duration:.01ms!important;animation-iteration-count:1!important}.experience .imperial-halo{transform:none!important}}",
    ].join("\n");

    const cssTagId = "@deepseek-ai/dsh-client-liang/liang.css";
    if (typeof document !== "undefined" && document.querySelector("style[data-plugin-css=" + JSON.stringify(cssTagId) + "]") === null) {
      const tag = document.createElement("style");
      tag.dataset.plugin = "@deepseek-ai/dsh-client-liang";
      tag.dataset.pluginCss = cssTagId;
      tag.textContent = css;
      document.head.appendChild(tag);
    }

    // ─────────────────────────────────────────────────────────────
    // 分级逻辑（移植自原仓库 src/progression.ts）
    // ─────────────────────────────────────────────────────────────
    const STAGES = ["小难梁", "牢梁", "梁子", "梁圣", "梁神", "梁祖"];
    const MAX_LEVEL = 30;
    const LEVELS_PER_STAGE = 6;
    const VIDEO_FPS = 30;
    const INTERPOLATION_FACTOR = 8;

    function clampPosition(rawPosition) {
      return Math.min(MAX_LEVEL, Math.max(0, rawPosition));
    }

    function getProgression(rawLevel) {
      const level = Math.round(clampPosition(rawLevel));
      const stageIndex = Math.floor(level / LEVELS_PER_STAGE);
      const isFinalStage = stageIndex === STAGES.length - 1;
      const localProgress = isFinalStage
        ? 0
        : (level - stageIndex * LEVELS_PER_STAGE) / LEVELS_PER_STAGE;
      return {
        level,
        stage: STAGES[stageIndex],
        stageIndex,
        fromIndex: stageIndex,
        toIndex: isFinalStage ? stageIndex : stageIndex + 1,
        localProgress,
        strength: level / MAX_LEVEL,
      };
    }

    // 滑块位置 → 推理强度档位（0-9 off / 10-19 high / 20-30 max）
    function positionToEffort(rawPosition) {
      const level = clampPosition(rawPosition);
      if (level <= 9) return "off";
      if (level <= 19) return "high";
      return "max";
    }

    // 档位 → 滑块锚点位置
    function effortAnchor(effort) {
      if (effort === "off") return 0;
      if (effort === "high") return 15;
      return 30;
    }

    // ─────────────────────────────────────────────────────────────
    // 共享开合状态（sidebar 按钮与 overlay 面板之间）
    // ─────────────────────────────────────────────────────────────
    // ─────────────────────────────────────────────────────────────
    // 推理等级：读写当前会话的 reasoningEffort（off | high | max）
    // ─────────────────────────────────────────────────────────────
    const EFFORTS = ["off", "high", "max"];
    const EFFORT_LABELS = { off: "Off", high: "High", max: "Max" };

    // 由 apply 填充的宿主手柄（缺失时推理控件自动隐藏）
    const liangHost = {
      sessionsApi: null,
      sessions: null,
    };

    const liangEffortsApi = {
      read(sessionId) {
        const api = liangHost.sessionsApi;
        if (api === null) return Promise.reject(new Error("no sessions api"));
        return api.models({ sessionId }).then((envelope) => {
          const result = envelope && envelope.result;
          if (!result || !result.ok) throw new Error(result ? result.error.message : "models failed");
          const current = result.value && result.value.current;
          return current ? current.reasoningEffort : undefined;
        });
      },
      write(sessionId, nextEffort) {
        const api = liangHost.sessionsApi;
        if (api === null) return Promise.reject(new Error("no sessions api"));
        return api.models({ sessionId }).then((envelope) => {
          const result = envelope && envelope.result;
          if (!result || !result.ok) throw new Error(result ? result.error.message : "models failed");
          const current = result.value && result.value.current;
          if (!current) throw new Error("no current model selection");
          return api.selectModel({
            sessionId,
            provider: current.provider,
            model: current.model,
            reasoningEffort: nextEffort,
          });
        }).then((envelope) => {
          const result = envelope && envelope.result;
          if (!result || !result.ok) throw new Error(result ? result.error.message : "selectModel failed");
          const selected = result.value && result.value.selected;
          return selected && selected.reasoningEffort !== undefined ? selected.reasoningEffort : nextEffort;
        });
      },
    };

    function currentSessionId() {
      const sessions = liangHost.sessions;
      if (sessions === null || sessions.list === undefined) return undefined;
      return sessions.list.getSnapshot().current;
    }

    const LIANG_ENABLED_KEY = "dsh-client-liang.enabled";
    function readStoredEnabled() {
      try {
        if (typeof window === "undefined" || window.localStorage === undefined) return true;
        const raw = window.localStorage.getItem(LIANG_ENABLED_KEY);
        if (raw === null) return true;
        return raw === "1";
      } catch (_err) {
        return true;
      }
    }

    const liangStore = {
      open: false,
      enabled: readStoredEnabled(),
      listeners: new Set(),
      subscribe(fn) {
        this.listeners.add(fn);
        return () => {
          this.listeners.delete(fn);
        };
      },
      get() {
        return this.open;
      },
      getEnabled() {
        return this.enabled;
      },
      setOpen(value) {
        if (this.open === value) return;
        this.open = value;
        for (const fn of [...this.listeners]) fn();
      },
      setEnabled(value) {
        if (this.enabled === value) return;
        this.enabled = value;
        try {
          if (typeof window !== "undefined" && window.localStorage !== undefined) {
            window.localStorage.setItem(LIANG_ENABLED_KEY, value ? "1" : "0");
          }
        } catch (_err) {
          /* noop */
        }
        for (const fn of [...this.listeners]) fn();
      },
    };

    function useLiangEnabled() {
      return react.useSyncExternalStore(
        liangStore.subscribe.bind(liangStore),
        liangStore.getEnabled.bind(liangStore),
        () => true,
      );
    }

    function useLiangOpen() {
      return react.useSyncExternalStore(
        liangStore.subscribe.bind(liangStore),
        liangStore.get.bind(liangStore),
        () => false,
      );
    }

    // ─────────────────────────────────────────────────────────────
    // 主面板组件（移植自原仓库 src/app.ts + video-renderer.ts）
    // ─────────────────────────────────────────────────────────────
    function LiangPanel(props) {
      const [position, setPosition] = react.useState(0);
      const [videoState, setVideoState] = react.useState("loading"); // loading | ready | error
      const [effortValue, setEffortValue] = react.useState(undefined);
      const [effortBusy, setEffortBusy] = react.useState(false);
      const [effortError, setEffortError] = react.useState(null);
      const videoRef = react.useRef(null);
      const canvasRef = react.useRef(null);
      const committedEffortRef = react.useRef(undefined);
      const writeQueueRef = react.useRef(Promise.resolve());
      const loadedEffortRef = react.useRef(false);
      const state = getProgression(position);

      const drawNow = react.useCallback(() => {
        const video = videoRef.current;
        const canvas = canvasRef.current;
        if (!video || !canvas) return;
        if (video.readyState < 2 /* HAVE_CURRENT_DATA */) return;
        const ratio = Math.min(window.devicePixelRatio || 1, 2);
        const width = Math.round(canvas.clientWidth * ratio);
        const height = Math.round(canvas.clientHeight * ratio);
        if (canvas.width !== width || canvas.height !== height) {
          canvas.width = width;
          canvas.height = height;
        }
        const context = canvas.getContext("2d");
        if (!context) return;
        context.clearRect(0, 0, canvas.width, canvas.height);
        context.imageSmoothingEnabled = true;
        context.imageSmoothingQuality = "high";
        try {
          context.drawImage(video, 0, 0, canvas.width, canvas.height);
        } catch (_err) {
          /* 尚未解码时忽略 */
        }
      }, []);

      react.useEffect(() => {
        const video = videoRef.current;
        if (!video) return;
        const onLoaded = () => {
          setVideoState("ready");
          drawNow();
        };
        const onError = () => {
          setVideoState("error");
        };
        const onSeeked = () => {
          drawNow();
          if (typeof video.requestVideoFrameCallback === "function") {
            video.requestVideoFrameCallback(() => drawNow());
          }
        };
        const onResize = () => drawNow();
        video.addEventListener("loadeddata", onLoaded);
        video.addEventListener("error", onError);
        video.addEventListener("seeked", onSeeked);
        window.addEventListener("resize", onResize);
        video.load();
        return () => {
          video.removeEventListener("loadeddata", onLoaded);
          video.removeEventListener("error", onError);
          video.removeEventListener("seeked", onSeeked);
          window.removeEventListener("resize", onResize);
        };
      }, [drawNow]);

      const seekTo = react.useCallback((rawPosition) => {
        const video = videoRef.current;
        const canvas = canvasRef.current;
        if (!video || !canvas) return;
        const clamped = clampPosition(rawPosition);
        const requestedTime = (clamped / MAX_LEVEL) * (video.duration || 0);
        canvas.dataset.frame = String(Math.round(clamped * INTERPOLATION_FACTOR)).padStart(3, "0");
        if (!Number.isFinite(requestedTime) || video.readyState < 1) return;
        const lastFrameTime = Math.max(0, (video.duration || 0) - 1 / VIDEO_FPS);
        video.currentTime = Math.min(requestedTime, lastFrameTime);
      }, []);

      // 统一按位置 seek（拖动、初始锚点、档位跳转都走这里）
      react.useEffect(() => {
        if (videoState !== "ready") return;
        seekTo(position);
      }, [position, videoState, seekTo]);

      const commitEffort = (next) => {
        const sessionId = currentSessionId();
        if (sessionId === undefined || next === committedEffortRef.current) return;
        committedEffortRef.current = next;
        setEffortBusy(true);
        setEffortError(null);
        writeQueueRef.current = writeQueueRef.current.then(() => liangEffortsApi.write(sessionId, next)).then(
          (value) => {
            setEffortValue(value);
            setEffortBusy(false);
          },
          (err) => {
            setEffortError(String(err && err.message ? err.message : err));
            setEffortBusy(false);
          },
        );
      };

      const onSliderInput = (event) => {
        const value = Number(event.target.value);
        setPosition(value);
        commitEffort(positionToEffort(value));
      };

      const chooseEffort = (next) => {
        setPosition(effortAnchor(next));
        const sessionId = currentSessionId();
        if (sessionId === undefined) return;
        committedEffortRef.current = next;
        setEffortBusy(true);
        setEffortError(null);
        writeQueueRef.current = writeQueueRef.current.then(() => liangEffortsApi.write(sessionId, next)).then(
          (value) => {
            setEffortValue(value);
            setEffortBusy(false);
          },
          (err) => {
            setEffortError(String(err && err.message ? err.message : err));
            setEffortBusy(false);
          },
        );
      };

      // 打开时读取当前推理等级 → 滑块定位到对应档位锚点
      react.useEffect(() => {
        const sessionId = currentSessionId();
        if (sessionId === undefined) return;
        let cancelled = false;
        liangEffortsApi.read(sessionId).then((value) => {
          if (cancelled || loadedEffortRef.current) return;
          loadedEffortRef.current = true;
          committedEffortRef.current = value;
          setEffortValue(value);
          if (value !== undefined) setPosition(effortAnchor(value));
        }).catch(() => {});
        return () => { cancelled = true; };
      }, []);

      const ticks = [];
      for (let level = 0; level <= MAX_LEVEL; level += 1) {
        ticks.push(react.createElement("i", {
          key: level,
          className: "tick" + (level <= state.level ? " is-active" : ""),
          "data-level": String(level),
          "aria-hidden": true,
        }));
      }
      const markers = STAGES.map((stage, index) =>
        react.createElement("li", {
          key: stage,
          className:
            "stage-marker" +
            (index === state.stageIndex ? " is-current" : "") +
            (index < state.stageIndex ? " is-passed" : ""),
          "data-level": String(index * LEVELS_PER_STAGE),
        }, stage),
      );

      const loadText = videoState === "error" ? "图像加载失败，请刷新重试" : "载入连续祖力…";
      const loadStateEl = videoState === "loading" || videoState === "error"
        ? react.createElement("div", { className: "load-state" + (videoState === "error" ? " is-error" : ""), role: "status" }, loadText)
        : react.createElement("div", { className: "load-state", role: "status", hidden: true });

      return react.createElement(
        "div",
        {
          className: "experience",
          "data-stage": String(state.stageIndex),
          style: {
            "--strength": String(position / MAX_LEVEL),
            "--stage-progress": String(state.localProgress),
          },
        },
        react.createElement(
          "header",
          { className: "masthead" },
          react.createElement(
            "div",
            null,
            react.createElement("p", { className: "eyebrow" }, "LIANG INTENSITY CALIBRATOR"),
            react.createElement("h1", null, "滑动变祖器"),
          ),
          react.createElement(
            "div",
            { className: "level-meter", "aria-live": "polite" },
            react.createElement("span", null, "梁系强度"),
            react.createElement("output", { className: "level-output" },
              String(state.level).padStart(2, "0") + " / " + MAX_LEVEL),
          ),
        ),
        react.createElement(
          "section",
          { className: "portrait-zone" },
          react.createElement("p", { className: "stage-ghost", "aria-hidden": true }, state.stage),
          react.createElement(
            "div",
            { className: "portrait-shell" },
            react.createElement("div", { className: "imperial-halo", "aria-hidden": true }),
            react.createElement("canvas", {
              className: "portrait-canvas",
              role: "img",
              "aria-label": "当前形态：" + state.stage,
              ref: canvasRef,
            }),
            react.createElement("div", { className: "scan-grid", "aria-hidden": true }),
            react.createElement("span", { className: "frame-corner frame-corner--tl", "aria-hidden": true }),
            react.createElement("span", { className: "frame-corner frame-corner--tr", "aria-hidden": true }),
            react.createElement("span", { className: "frame-corner frame-corner--bl", "aria-hidden": true }),
            react.createElement("span", { className: "frame-corner frame-corner--br", "aria-hidden": true }),
            loadStateEl,
          ),
          react.createElement("video", {
            className: "evolution-video",
            ref: videoRef,
            muted: true,
            playsInline: true,
            preload: "auto",
            tabIndex: -1,
            "aria-hidden": true,
          },
            react.createElement("source", { src: "/liang-video/liang-evolution.webm", type: 'video/webm; codecs="vp9"' }),
            react.createElement("source", { src: "/liang-video/liang-evolution.mp4", type: 'video/mp4; codecs="avc1.64001f"' }),
          ),
          react.createElement(
            "div",
            { className: "stage-readout" },
            react.createElement("span", null, "当前状态"),
            react.createElement("p", { className: "stage-name", "aria-live": "polite" }, state.stage),
            react.createElement("span", { className: "stage-index" },
              "阶段 " + String(state.stageIndex + 1).padStart(2, "0") + " / 06"),
          ),
        ),
        react.createElement(
          "section",
          { className: "control-panel", "aria-label": "梁系强度控制" },
          react.createElement(
            "div",
            { className: "range-wrap" },
            react.createElement("div", { className: "tick-track" }, ticks),
            react.createElement("input", {
              id: "liang-strength-slider",
              className: "strength-slider",
              type: "range",
              min: "0",
              max: String(MAX_LEVEL),
              step: "0.01",
              value: String(position),
              "aria-label": "梁系强度",
              "aria-valuetext": state.stage + "，" + state.level + " 级，共 " + MAX_LEVEL + " 级",
              disabled: videoState !== "ready",
              onInput: onSliderInput,
            }),
          ),
          react.createElement("ol", { className: "stage-markers" }, markers),
          react.createElement(
            "p",
            { className: "drag-hint" },
            react.createElement("span", { "aria-hidden": true }, "←"),
            " 拖动以增强梁系浓度 ",
            react.createElement("span", { "aria-hidden": true }, "→"),
          ),
        ),
        react.createElement(ReasoningControl, {
          effort: effortValue,
          busy: effortBusy,
          error: effortError,
          onChoose: chooseEffort,
        }),
        react.createElement(
          "footer",
          { className: "footer-note" },
          react.createElement("span", null, "31 级连续进化"),
          react.createElement("span", null, "正脸识别协议：已启用"),
        ),
      );
    }

    // ─────────────────────────────────────────────────────────────
    // 推理等级控件（off / high / max，点击写入当前会话）
    // ─────────────────────────────────────────────────────────────
    function ReasoningControl(props) {
      const effort = props.effort;
      const busy = props.busy;
      const error = props.error;
      const onChoose = props.onChoose;
      const [sid] = react.useState(() => currentSessionId());

      if (liangHost.sessionsApi === null || sid === undefined) return null;

      return react.createElement(
        "div",
        { className: "liang-reasoning" },
        react.createElement("span", { className: "liang-reasoning-title" }, "推理等级"),
        EFFORTS.map((level) =>
          react.createElement("button", {
            key: level,
            type: "button",
            className: "liang-effort" + (effort === level ? " is-current" : ""),
            disabled: busy,
            onClick: () => onChoose(level),
          }, EFFORT_LABELS[level]),
        ),
        error !== null ? react.createElement("span", { className: "liang-reasoning-error" }, error) : null,
      );
    }

    // ─────────────────────────────────────────────────────────────
    // 模型菜单外壳（shadow 官方 conversation.input.model）：
    // 「模型」项承接官方选择功能；「推理等级」项直通滑动变祖器
    // ─────────────────────────────────────────────────────────────
    function LiangModelSelect(props) {
      const locked = props.locked;
      const available = props.available;
      const directory = props.directory;
      const load = props.load;
      const select = props.select;
      const t = props.t;
      const state = react.useSyncExternalStore(
        (fn) => directory.subscribe(fn),
        () => directory.getSnapshot(),
        () => directory.getSnapshot(),
      );
      const [open, setOpen] = react.useState(false);
      const [pane, setPane] = react.useState("root");
      const rootRef = react.useRef(null);
      const triggerRef = react.useRef(null);
      const menuId = react.useId();

      react.useEffect(() => {
        if (available) load();
      }, [available, load]);

      react.useEffect(() => {
        if (!open) return;
        const closeOutside = (event) => {
          if (rootRef.current && !rootRef.current.contains(event.target)) setOpen(false);
        };
        document.addEventListener("mousedown", closeOutside);
        return () => document.removeEventListener("mousedown", closeOutside);
      }, [open]);

      react.useEffect(() => {
        if (!open) return;
        const onKey = (event) => {
          if (event.key !== "Escape") return;
          setOpen(false);
          setPane("root");
        };
        document.addEventListener("keydown", onKey);
        return () => document.removeEventListener("keydown", onKey);
      }, [open]);

      if (!available) return null;

      const busy = state.status === "selecting";
      const groups = state.groups || [];
      const current = state.current || null;
      let currentChoice = null;
      for (const group of groups) {
        for (const model of group.models || []) {
          if (current !== null && group.id === current.provider && model.id === current.model) {
            currentChoice = { group, model };
            break;
          }
        }
        if (currentChoice !== null) break;
      }
      const reasoning = currentChoice !== null ? currentChoice.model.reasoning : undefined;
      const effectiveEffort = current !== null && current.reasoningEffort !== undefined
        ? current.reasoningEffort
        : (reasoning !== undefined ? reasoning.defaultEffort : undefined);
      let effortLabel;
      if (reasoning === undefined) effortLabel = undefined;
      else if (effectiveEffort === undefined) effortLabel = t("effort.providerDefault");
      else {
        const hit = (reasoning.efforts || []).find((level) => level.id === effectiveEffort);
        effortLabel = hit !== undefined ? hit.name : effectiveEffort;
      }
      const modelLabel = currentChoice !== null ? currentChoice.model.name : t("trigger.fallback");

      const show = () => {
        setPane("root");
        setOpen(true);
        if (available) load();
      };
      const close = () => {
        setOpen(false);
        setPane("root");
      };
      const choose = (selection) => {
        if (current !== null && current.provider === selection.provider && current.model === selection.model) {
          close();
          return;
        }
        select(selection).then((accepted) => {
          if (accepted) close();
        }, () => {});
      };
      const openLiang = () => {
        close();
        liangStore.setOpen(true);
      };

      return react.createElement(
        "div",
        { ref: rootRef, className: "liang-model-root" },
        react.createElement(
          "button",
          {
            ref: triggerRef,
            type: "button",
            className: "liang-model-trigger",
            "aria-haspopup": "menu",
            "aria-expanded": open,
            "aria-controls": open ? menuId + "-menu" : undefined,
            title: modelLabel,
            disabled: locked,
            onClick: () => { if (open) close(); else show(); },
          },
          react.createElement("span", { className: "liang-model-trigger-label" }, modelLabel),
          effortLabel !== undefined ? react.createElement("span", { className: "liang-model-trigger-effort" }, effortLabel) : null,
          react.createElement("span", { className: "liang-model-chevron" + (open ? " liang-model-chevron-open" : ""), "aria-hidden": true }, "▾"),
        ),
        open ? react.createElement(
          "div",
          { id: menuId + "-menu", className: "liang-model-menu", role: "menu", "aria-label": t("menu.aria"), "aria-busy": state.status === "loading" || busy },
          pane === "root" ? react.createElement(
            react.Fragment,
            null,
            react.createElement(
              "button",
              { type: "button", role: "menuitem", className: "liang-model-cell", onClick: () => setPane("model") },
              react.createElement("span", { className: "liang-model-cell-label" }, t("menu.model")),
              react.createElement("span", { className: "liang-model-cell-value" }, modelLabel),
              react.createElement("span", { className: "liang-model-cell-chevron", "aria-hidden": true }, "›"),
            ),
            react.createElement(
              "button",
              { type: "button", role: "menuitem", className: "liang-model-cell", onClick: openLiang },
              react.createElement("span", { className: "liang-model-cell-label" }, t("menu.effort")),
              react.createElement("span", { className: "liang-model-cell-value" }, effortLabel !== undefined ? effortLabel : "—"),
              react.createElement("span", { className: "liang-model-cell-chevron", "aria-hidden": true }, "›"),
            ),
          ) : null,
          pane === "model" ? react.createElement(
            react.Fragment,
            null,
            state.status === "loading" ? react.createElement("div", { className: "liang-model-status" }, t("status.loading")) : null,
            state.error !== null ? react.createElement(
              "div",
              { className: "liang-model-error" },
              react.createElement("span", null, t("error.action", { message: state.error })),
              react.createElement("button", { type: "button", className: "liang-model-retry", onClick: () => load() }, t("action.reload")),
            ) : null,
            (state.failures || []).map((failure) => react.createElement(
              "div",
              { key: failure.id, className: "liang-model-warning" },
              react.createElement("span", null, t("warning.groupLoad", { name: failure.name, message: failure.message })),
            )),
            react.createElement(
              "div",
              { className: "liang-model-groups" },
              groups.map((group) => react.createElement(
                "section",
                { key: group.id, role: "group", "aria-label": group.name },
                react.createElement("div", { className: "liang-model-group-title" }, group.name),
                (group.models || []).map((model) => {
                  const selected = current !== null && current.provider === group.id && current.model === model.id;
                  return react.createElement(
                    "button",
                    {
                      key: model.id,
                      type: "button",
                      role: "menuitemradio",
                      "aria-checked": selected,
                      className: "liang-model-option" + (selected ? " liang-model-option-selected" : ""),
                      title: model.name,
                      disabled: busy,
                      onClick: () => choose({ provider: group.id, model: model.id }),
                    },
                    react.createElement(
                      "span",
                      { className: "liang-model-option-copy" },
                      react.createElement("span", { className: "liang-model-name" }, model.name),
                      model.description !== undefined ? react.createElement("span", { className: "liang-model-desc" }, model.description) : null,
                    ),
                    selected ? react.createElement("span", { className: "liang-model-check", "aria-hidden": true }, "✓") : null,
                  );
                }),
              )),
            ),
          ) : null,
        ) : null,
      );
    }

    // ─────────────────────────────────────────────────────────────
    // 通用设置行：自定义滑块开关
    // ─────────────────────────────────────────────────────────────
    function LiangToggleRow(props) {
      const enabled = useLiangEnabled();
      return react.createElement(
        "div",
        { className: "liang-toggle-group" },
        react.createElement(
          "div",
          { className: "liang-toggle-copy" },
          react.createElement("div", { className: "liang-toggle-title" }, "自定义推理强度滑块"),
          react.createElement("div", { className: "liang-toggle-desc" }, "关闭后使用原版三档推理强度"),
        ),
        react.createElement(
          "button",
          {
            type: "button",
            role: "switch",
            "aria-checked": enabled,
            "aria-label": "自定义推理强度滑块",
            className: "liang-switch" + (enabled ? " is-on" : ""),
            onClick: () => liangStore.setEnabled(!enabled),
          },
          react.createElement("span", { className: "liang-switch-thumb", "aria-hidden": true }),
        ),
      );
    }

    // ─────────────────────────────────────────────────────────────
    // 侧栏入口按钮（sidebar.footer.action）
    // ─────────────────────────────────────────────────────────────
    function SidebarAction() {
      const open = useLiangOpen();
      return react.createElement(
        "button",
        {
          className: "liang-trigger",
          title: "滑动变祖器（梁系强度校准器）",
          "aria-pressed": open,
          "aria-label": "打开滑动变祖器",
          onClick: () => liangStore.setOpen(!open),
        },
        react.createElement("span", { className: "liang-trigger-glyph", "aria-hidden": true }, "梁"),
      );
    }

    // ─────────────────────────────────────────────────────────────
    // 覆盖层面板（shell.overlay）
    // ─────────────────────────────────────────────────────────────
    function OverlayPanel() {
      const open = useLiangOpen();
      const enabled = useLiangEnabled();
      react.useEffect(() => {
        if (!enabled) liangStore.setOpen(false);
      }, [enabled]);
      react.useEffect(() => {
        if (!open) return;
        const onKey = (event) => {
          if (event.key === "Escape") liangStore.setOpen(false);
        };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
      }, [open]);
      if (!open || !enabled) return null;
      return react.createElement(
        "div",
        {
          className: "liang-backdrop",
          onMouseDown: (event) => {
            if (event.target === event.currentTarget) liangStore.setOpen(false);
          },
        },
        react.createElement(
          "div",
          { className: "liang-frame" },
          react.createElement(
            "button",
            {
              className: "liang-close",
              "aria-label": "关闭滑动变祖器",
              onClick: () => liangStore.setOpen(false),
            },
            "×",
          ),
          react.createElement(LiangPanel, null),
        ),
      );
    }

    // ─────────────────────────────────────────────────────────────
    // 插件主体：把两个 UI 注册进对应 Slot（未声明时短暂重试）
    // ─────────────────────────────────────────────────────────────
    const inject = ["slots"];

    function apply(ctx) {
      const connection = ctx.get("connection");
      const sessions = ctx.get("sessions");
      if (connection !== undefined && connection.api !== undefined && connection.api.sessions !== undefined) {
        liangHost.sessionsApi = connection.api.sessions;
      }
      if (sessions !== undefined) liangHost.sessions = sessions;
      ctx.effect(() => {
        const disposers = [];
        const timers = [];
        const cleanup = () => {
          for (const timer of timers) window.clearTimeout(timer);
          timers.length = 0;
          for (const dispose of disposers) {
            try {
              dispose();
            } catch (_err) {
              /* noop */
            }
          }
          disposers.length = 0;
        };
        const registerWhenReady = (options, component) => {
          let attempts = 0;
          const attempt = () => {
            if (attempts >= 400) {
              console.error("dsh-client-liang: 放弃注册 slot " + options.name);
              return;
            }
            attempts += 1;
            try {
              const dispose = ctx.slots.register(options, component);
              disposers.push(dispose);
            } catch (err) {
              timers.push(window.setTimeout(attempt, 50));
            }
          };
          attempt();
        };

        registerWhenReady(
          { name: "shell.overlay", id: "liang-calibrator-overlay", order: 100, label: "滑动变祖器面板" },
          OverlayPanel,
        );
        registerWhenReady(
          { name: "settings.general.item", id: "liang-custom-slider", order: 30 },
          LiangToggleRow,
        );
        // 自定义滑块 shadow：随开关动态注册/注销（关闭时恢复官方三档）
        let shadowDisposer = null;
        const registerShadow = () => {
          if (shadowDisposer !== null) return;
          const modelDirectories = ctx.get("modelDirectories");
          const sessionsSvc = ctx.get("sessions");
          if (modelDirectories === undefined || sessionsSvc === undefined) return;
          let attempts = 0;
          const attempt = () => {
            if (attempts >= 400) {
              console.error("dsh-client-liang: 放弃注册 conversation.input.model");
              return;
            }
            attempts += 1;
            try {
              const dispose = ctx.slots.register(
                {
                  name: "conversation.input.model",
                  priority: -1,
                  locale: "model",
                  inject: (sessionId) => {
                    const directory = modelDirectories.directoryFor(sessionId);
                    const available = sessionsSvc.subagentAddress(sessionId) === undefined;
                    return {
                      available,
                      directory: directory.store,
                      load: () => {
                        if (available) directory.load().catch(() => {});
                      },
                      select: (selection) => available
                        ? directory.select(selection).then(() => true, () => false)
                        : Promise.resolve(false),
                    };
                  },
                },
                LiangModelSelect,
              );
              shadowDisposer = dispose;
              disposers.push(dispose);
            } catch (err) {
              timers.push(window.setTimeout(attempt, 50));
            }
          };
          attempt();
        };
        const unregisterShadow = () => {
          if (shadowDisposer === null) return;
          try {
            shadowDisposer();
          } catch (_err) {
            /* noop */
          }
          const at = disposers.indexOf(shadowDisposer);
          if (at !== -1) disposers.splice(at, 1);
          shadowDisposer = null;
        };
        const syncShadow = () => {
          if (liangStore.enabled) registerShadow();
          else {
            unregisterShadow();
            liangStore.setOpen(false);
          }
        };
        syncShadow();
        disposers.push(liangStore.subscribe(() => syncShadow()));
        return cleanup;
      }, "dsh-client-liang: slot registrations");
      ctx.effect(() => () => {
        liangHost.sessionsApi = null;
        liangHost.sessions = null;
      }, "dsh-client-liang: host handle cleanup");
    }

    // 内部导出：供诊断与冒烟测试使用，不影响插件运行
    exports.LiangPanel = LiangPanel;
    exports.OverlayPanel = OverlayPanel;
    exports.SidebarAction = SidebarAction;
    exports.getProgression = getProgression;
    exports.STAGES = STAGES;
    exports.liangStore = liangStore;
    exports.liangHost = liangHost;
    exports.liangEffortsApi = liangEffortsApi;
    exports.ReasoningControl = ReasoningControl;
    exports.EFFORTS = EFFORTS;
    exports.currentSessionId = currentSessionId;
    exports.LiangModelSelect = LiangModelSelect;
    exports.positionToEffort = positionToEffort;
    exports.effortAnchor = effortAnchor;
    exports.LiangToggleRow = LiangToggleRow;
    exports.useLiangEnabled = useLiangEnabled;    exports.apply = apply;
    exports.inject = inject;
    return module.exports;
  },
});
