# dsh-usage-column · 用量侧栏

([English](README.en.md) | 简体中文)

DSH 插件：在 DSH Web 界面右侧（可一键切换到左侧）挂一个**用量侧栏**，实时显示：

- **账户余额**：可用 / 赠金 / 充值余额（赠金绿、充值蓝分色），来自官方公开接口 `GET https://api.deepseek.com/user/balance`；合成余额条（赠金+充值=可用、已耗灰，0% 段细线）只示意相对大小
- **本会话 API 消耗**：输入（缓存未命中 / 缓存命中）、输出（以及推理 tokens），由 DSH 会话日志直读折叠 + 运行期实时监听双通道累计（网关重启后历史仍完整）
- **运行指标**：LLM 运行时间、工具调用时间、输出速率（token/s）、缓存命中率
- **费用分解**：命中金额（绿）/ 未命中金额（橙）/ 输出金额（蓝）三类分色 + 三段相对比例条
- **上下文窗口条**：第一行「xx% 已使用」，第二行「剩余 xxK 上下文」；已用量取**最近一次模型请求的实测输入**（DeepSeek 计费 `prompt_tokens` 口径，与官方 usage 页基本一致），窗口值取官方模型元数据（缺省 1M，可在设置覆盖）
- **布局**：右侧 = 一体化分栏（主界面自动让出宽度，与侧栏构成同一窗口）；左侧 = 覆盖 DSH 自带左侧栏

> 注意：本项目参考命令默认指定 profile 为默认的 web，需要更改 profile 的请自行注意。

## 功能

- 侧栏默认钉在右侧，头部按钮可切左/右、手动刷新、关闭；入口 ¥ 按钮位于左侧栏底部（设置旁），**侧栏折叠（rail）时自动隐藏**
- 总开关位于 **设置 → 通用设置 →「侧边使用信息栏」**（风格与通用设置页一致），关闭后面板与入口全部隐藏
- 打开会话后自动统计该会话：输入（缓存未命中 / 缓存命中）、输出、推理 tokens、模型步骤数与费用
- 首次打开会话时记录「开始余额」作为基线，本会话消耗占比随基线计算；支持一键重置基线
- 余额数据缓存 60 秒；面板每 30 秒自动刷新
- 中英双语（跟随 DSH 界面语言）
- 随包附带 `dsh-usage` 命令行：终端直接查余额（无需网关运行）

## 数据来源与口径

| 数据 | 来源 |
| --- | --- |
| 余额（可用/赠金/充值） | 官方公开接口 `GET https://api.deepseek.com/user/balance`，API Key 取自 DSH 凭证库中的 `DEEPSEEK_API_KEY`（逐次解析，不落盘） |
| 会话 tokens | DSH 会话投影：累计日志中每个 `assistant/message` 事件的 `usage`（`inputTokens`=缓存未命中，`cacheReadTokens`=缓存命中，`outputTokens`=输出） |
| 费用 | `输入未命中×未命中价 + 输入命中×命中价 + 输出×输出价`（元/百万 tokens）；默认价格见下表，可在设置覆盖 |

默认价格表（取自[官方定价页](https://api-docs.deepseek.com/zh-cn/quick_start/pricing/)，单位：元/百万 tokens）：

| 模型档 | 输入·缓存命中 | 输入·缓存未命中 | 输出 |
| --- | --- | --- | --- |
| deepseek-chat（含 v3.x / v4 系列） | 0.2 | 2 | 3 |
| deepseek-reasoner / r1 系列 | 0.5 | 4 | 16 |

费用为估算值，实际扣费以官方账单为准。

## 复刻前置条件

外部用户若要复刻或安装本插件，需满足以下三个前提：

1. **DSH 版本兼容**：插件基于当前部署（DSH 0.1.0-rc.x，2026-08）的契约编写；若您的 DSH 版本差异较大，个别接口（如 typert manifest、sessionQuery 签名）可能需要小幅适配，详见「兼容性说明」。
2. **仓库地址**：下方安装命令已使用实际仓库地址 `github:FishScP/DeepSeek-Harness-Plugins`（插件位于仓库根，安装后自动挂载）；本地路径安装同样支持。
3. **配置凭证**：需已配置 `DEEPSEEK_API_KEY`（在 DSH 设置 → 模型页写入，或 `~/.dsh/.credentials.yaml` 中配置）。未配置时侧栏仅显示本地会话统计，并给出提示。

## 安装

1. 安装本包（bundle 层自动挂载，无需编辑配置文件）

   ```bash
   dsh plugin --profile web add github:FishScP/DeepSeek-Harness-Plugins
   ```

   本地路径安装同样支持：

   ```bash
   dsh plugin --profile web add "<path\to\side column>"
   ```

2. 重启网关

   ```bash
   dsh-restart
   ```

   重启后刷新页面：左侧栏底部「设置」旁出现 `¥` 按钮，点击即可打开侧栏。

3. 确保 `DEEPSEEK_API_KEY` 已配置（DSH 设置 → 模型页写入，或 `~/.dsh/.credentials.yaml` 中配置）。未配置时侧栏仅显示本地会话统计，并给出提示。

## 手动接入（开发）

```yaml
# 追加到 <profile>/cordis.patch.yml
- insert:
    - id: usage-column
      name: dsh-usage-column
```

并在 profile 的 `package.json` 中把本包加为依赖（`file:` 或 npm/git 地址）。

## 命令行

```bash
dsh-usage          # 打印账户余额、可用百分比条与凭证来源
```

## 价格覆盖

在 DSH 设置文档中编辑 `usage-column` 命名空间的 `pricingOverrides`（按模型全名覆盖）：

```yaml
usage-column:
  pricingOverrides:
    deepseek-chat:
      hit: 0.2
      miss: 2
      output: 3
```

## 卸载

```bash
dsh plugin --profile web remove dsh-usage-column
```

## 兼容性说明

- **验证版本**：基于 DSH 0.1.0-rc.x（2026-08 部署）契约编写与验证，Node.js ≥ 22（CI 使用 node 22）。
- **运行时依赖**：`@deepseek-ai/dsh-credentials`、`@deepseek-ai/dsh-typert-protocol`（均为 ^0.1.0-rc.6）、`yaml`、`zod`（v4）；客户端侧注入 `@deepseek-ai/dsh-client-runtime`、`@deepseek-ai/dsh-client-locale`、`@deepseek-ai/dsh-api-gateway`。
- **接口耦合点**：typert manifest（`lib/index.js` 的 `MANIFEST`）、`sessionQuery.readSession` 签名、`credentials.resolve`、`llm.resolveModelInfo`、`tokenMeter.measure`、设置命名空间 `usage-column`。DSH 版本差异较大时，这些接口可能需要小幅适配。
- **已知限制**：见下文「已知限制」小节。
- **仓库地址**：安装命令使用实际仓库地址 `github:FishScP/DeepSeek-Harness-Plugins`（插件即仓库根内容）。

## 已知限制

- 余额依赖官方公开接口；接口变更或 Key 失效时侧栏显示错误提示，本地会话统计不受影响
- 会话统计只累计插件运行期间网关可见的会话事件；插件挂载前已结束的会话按日志重放累计
- `dsh-usage` 命令行暂只提供余额（会话日志为 zstd 压缩，命令行解压留待后续版本）

## 免责声明

本插件为社区作品，与 DeepSeek 官方无关；费用估算基于公开价格，仅供参考，实际扣费以官方账单为准。

## License

MIT
