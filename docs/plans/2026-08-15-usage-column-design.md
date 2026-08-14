# 用量侧栏（dsh-usage-column）· 设计

> 日期：2026-08-15 · 状态：已实现（v0.1）

## 目标

在 DSH Web 界面提供一个侧栏（默认右侧、可切左侧），把「页面下方的信息栏」对应的会话统计与 DeepSeek 账户余额整合进同一处可视化：

1. 账户余额（可用 / 赠金 / 充值）与**可用百分比条**；
2. **单一会话**的 API 消耗：输入（缓存未命中 / 命中）、输出、费用估算；
3. 本会话消耗占「开始余额 + 消耗」的**百分比条**；
4. 可独立上传 GitHub、供他人 `dsh plugin add` 安装（对齐 `dsh-skill-viewer` 与 `dsh-client-liang` 的插件格式）。

## 形态决策

- **DSH 静态插件**（npm 包 + `cordis.patch.yml`），而非浏览器扩展 / 油猴脚本：目标页面（DSH Web GUI）本身由 DSH 网关托管，插件主机半部可直接使用 DSH 服务（凭证、会话投影、typert 远程服务），无需用户手动导出令牌。
- 主机半部 = Typert 远程服务（对齐 `dsh-skill-viewer`）；浏览器半部 = `sidebar.footer.action` 入口按钮 + `shell.overlay` 浮动侧栏（对齐 `dsh-client-liang`）。

## 数据链路

```text
浏览器半部（侧栏 UI）
   │  typert remote: usageColumn/snapshot(sessionId)
   ▼
主机半部（dsh-usage-column）
   ├─ 余额：credentials.resolve(DEEPSEEK_API_KEY)
   │        → GET https://api.deepseek.com/user/balance（60s 缓存）
   ├─ 用量：sessionProjections 快照["usageColumn"]
   │        ← 投影单元折叠 assistant/message.usage
   │          inputTokens=未命中 / cacheReadTokens=命中 / outputTokens=输出
   ├─ 价格：math.resolvePrice(当前模型, 覆盖表)（默认官方 V3.2 价）
   ├─ 基线：首次 snapshot 记录开始余额 → settings 命名空间 "usage-column"
   └─ 百分比：balancePercent / sessionPercent（lib/math.js 纯函数）
```

## 关键决策

| 决策 | 结论 | 理由 |
| --- | --- | --- |
| 余额来源 | 官方公开接口 + DSH 凭证库 | 无需平台网页 userToken；凭证逐次解析、不落盘 |
| 用量来源 | 会话投影单元（`usageColumn`） | 与 `dsh-session-stats` 同机制：可重放、随日志持久、跨重启用仍完整 |
| 缓存口径 | `inputTokens`=未命中，`cacheReadTokens`=命中，`cacheWriteTokens` 按未命中计 | 对齐 `@deepseek-ai/dsh-llm` 的 TokenUsage 说明（DeepSeek 无缓存写入计费档） |
| 百分比分母 | 可用 = 余额 ÷（赠金+充值）；会话 = 消耗 ÷（开始余额+消耗） | 历史入账总额在接口中可得；分母为 0 时显示 "—" |
| UI 位置 | `shell.overlay`（加性、无替换风险）+ `sidebar.footer.action` | Slot 树中无独立的「右侧栏」加性席位；浮动层是官方推荐的框架级加性席位 |
| 价格 | 内置默认 + 按模型全名覆盖（settings） | 官方价会变动；账单以官方为准，费用标注「估算」 |
| 语言 | zh/en 双语（`ctx.locale`） | 对齐两份参考插件 |

## 风险与降级

- 余额接口失败 / Key 缺失 → 侧栏保留本地会话统计并显示错误提示；
- settings 服务缺失 → 基线/覆盖表降级为进程内存；
- 会话无 `assistant/message.usage`（适配器未上报）→ 对应字段为 0，费用为 0，不报错。
