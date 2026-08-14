# 用量侧栏（dsh-usage-column）· 实现

> 日期：2026-08-15 · 状态：已实现（v0.1）

## 文件结构

```text
side column/
├── package.json               # name: dsh-usage-column；dsh.client.inject + dsh.bundle.patch
├── cordis.patch.yml           # insert {id: usage-column, name: dsh-usage-column}
├── lib/
│   ├── index.js               # 主机半部：投影单元 + UsageColumnGateway + typert manifest
│   ├── client.js              # 浏览器半部：sidebar.footer.action + shell.overlay 侧栏
│   └── math.js                # 纯函数：价格/费用/百分比/格式化（可独立测试）
├── bin/dsh-usage.js           # CLI：余额查询（env > ~/.dsh/.credentials.yaml）
├── test/math.test.js          # node:test 单元测试
├── docs/plans/                # 本文档
├── .github/workflows/ci.yml   # node --check + node --test
├── README.md / README.en.md / LICENSE / .gitignore
```

## 主机半部（lib/index.js）

- `export const name = "usage-column"`，`inject = ["typert", "sessionProjections", "sessions"]`。
- **投影单元**：`{ key: "usageColumn", schema, init, apply, view, stateVersion: 1 }`；`apply` 仅处理 `assistant/message`，把 `data.usage` 的五个字段累加入状态；无 usage 或全零时返回原引用（零下游工作）。
- **UsageColumnGateway extends TypertRemoteService**（`super(ctx, "usageColumn")`）：
  - `snapshot(sessionId)`：余额（60s 缓存）+ 投影快照 + `resolvePrice(当前模型)` + 基线（首次捕获并持久化）+ `sessionPercent`；
  - `balance()`：官方接口，`credentials.resolve(credentialRef("DEEPSEEK_API_KEY"))` 逐次解析，超时 10s；
  - `setPricing(pricing)` / `resetBaseline(sessionId)`：写入 settings 命名空间 `usage-column`（`pricingOverrides` / `baselines`），settings 缺失时降级内存。
- `apply(ctx)`：实例化网关 + `ctx.effect` 注册投影单元与 typert MANIFEST（随 fiber 卸载）。

## 浏览器半部（lib/client.js）

- `window.__ModuleLoader__.load({ id: "dsh-usage-column", factory })`，仅 `require("react")`（不引 jsx-runtime/primitives，图标为内联 SVG）。
- CSS 以 `<style data-plugin-css>` 注入，配色全部使用 `--dsw-alias-*` 主题变量（深色模式自适应）。
- locale：`ctx.locale.register(NS, { zh, en })` + `ctx.locale.bind(NS)`。
- 远程调用：`ctx.remote.$mount(CONTRIBUTION)`（identity codec），`ctx.get("remote.usageColumn")`。
- **开合状态**：模块级 `panelStore`（open/side）+ `useSyncExternalStore`；侧边偏好写入 `localStorage("dsh-usage-column.side")`。
- **Slot 注册**：`ctx.slots.inject(...)` 两个席位：
  - `sidebar.footer.action`（id `usage-column`，order 90）→ `¥` 字形开关按钮；
  - `shell.overlay`（id `usage-column-panel`，order 90）→ 面板；关闭时返回 `null`，打开时挂载 30s 轮询（卸载即清理），Esc 关闭。
- 面板：余额卡（大数字 + 赠金/充值/凭证来源 + 可用百分比条）、会话卡（命中/未命中/输出 tokens、费用与计价档、消耗占比条、开始余额 + 重置基线）、估算免责声明。

## 验证

- `npm run check`：四个 JS 文件 `node --check`；
- `npm run test`：`node --test test/`（价格/费用/百分比/格式化 14 组断言）；
- 集成验证路径：profile 挂载 → `dsh-restart` → 页面确认 `¥` 按钮与侧栏渲染、余额与百分比条显示、会话切换统计跟随、左/右切换与折叠。

## v0.1 迭代（2026-08-15 反馈修订）

- **余额构成条**：赠金（绿）/ 充值（蓝）分色数值 + 构成堆叠条；可用百分比条保留。
- **运行指标**：透传 `sessionStats` 投影（LLM 时间/工具时间/decode 统计），派生输出速率 token/s 与输入缓存命中率。
- **费用分解**：`usageCostBreakdown` 返回 `{hit, miss, output, total}`，三类金额分色 + 金额占比堆叠条。
- **上下文窗口条**：`llm.resolveModelInfo(context.contextWindow)` 优先，缺省 settings `contextWindow`（1M）；已用 = `tokenMeter.measure(surfaceTokens)`；按 `xxK/1.0M · 剩余 xxK` 显示。
- **布局重构**：右侧 = 一体化分栏（`body:has(.ucc-panel[data-side=right]) #root{width:calc(100% - 300px)}`，随开合启停）；左侧 = 覆盖 DSH 自带左侧栏（shell.overlay 层 z=20）；面板全高停靠（`position:fixed`，`right:0/left:0`）。

## v0.2 迭代（2026-08-15 数据链路重构）

- **持久化日志直读**：新增 `lib/fold.js`（纯函数，可测），`snapshot` 改由 `sessionQuery.readSession(sessionId)` 读取完整持久化事件后折叠（usage + stats 自包含，10s 缓存）——不再依赖内存投影，**网关重启后历史会话数据依然完整**；`debug` 字段随快照返回（sessionFound/events/usageSteps）供排障。
- **余额条合并**：余额卡由两条（构成条 + 可用条）合成一条：赠金(绿)+充值(蓝)=可用部分、已耗(灰)，0% 段自动呈现为 2px 细线；caption 标注「可用百分比 x% · 赠金 x% / 充值 x%」。
- **全部条形图加可见标签**：可用百分比、消耗占比、上下文窗口、金额占比均在 caption 中标明含义。
- 测试增至 21 组（math 14 + fold 7）。

## 后续（v1.1 候选）

- 平台 usage 页内部接口（`userToken`）聚合「今日/本月」视图；
- `dsh-usage` CLI 增加 zstd 会话日志解压与会话用量输出；
- 侧栏拖拽定位与宽度记忆。
