# DeepSeek Harness Plugins

DSH（DeepSeek Harness）社区插件集合。每个插件位于仓库根下的独立子目录，通过 DSH 的 bundle 机制挂载（`dsh plugin --profile web add <path>` 自动应用 `cordis.patch.yml`，无需手工编辑配置）。

## 插件列表

| 目录 | 包名 | 版本 | 作用 |
| --- | --- | --- | --- |
| [`side column/`](side column/README.md) | `dsh-usage-column` | 0.1.0 | DSH 用量侧栏：Web 界面右侧（可一键切左侧）实时显示账户余额、本会话 API 消耗、运行指标、费用分解与上下文窗口 |
| [`custom inference strength slider/`](custom inference strength slider/README.md) | `@deepseek-ai/dsh-client-liang` | 1.0.0 | 自定义推理强度滑块：31 级「滑动变祖器」面板，拖动滑块联动当前会话推理强度（off / high / max） |

### side column · 用量侧栏（dsh-usage-column）

在 DSH Web 界面挂一个**用量侧栏**，实时显示：

- **账户余额**：可用 / 赠金 / 充值余额（分色），来自官方公开接口 `GET https://api.deepseek.com/user/balance`（API Key 取自 DSH 凭证库，逐次解析、不落盘）
- **本会话 API 消耗**：输入（缓存未命中 / 命中）、输出、推理 tokens，由 DSH 会话日志直读折叠 + 运行期实时监听双通道累计
- **运行指标**：LLM 运行时间、工具调用时间、输出速率（token/s）、缓存命中率
- **费用分解**：命中 / 未命中 / 输出三类分色金额 + 三段相对比例条（按官方公开定价估算，可在设置覆盖）
- **上下文窗口条**：已用百分比 + 剩余上下文（口径对齐 DeepSeek 计费 `prompt_tokens`）
- 随包附带 `dsh-usage` 命令行：终端直接查余额（无需网关运行）

详细说明（安装、数据口径、价格覆盖、已知限制）见 [side column/README.md](side column/README.md)。

### custom inference strength slider · 自定义推理强度滑块（@deepseek-ai/dsh-client-liang）

DSH 客户端插件：把社区趣味项目「滑动变祖器」移植为**推理强度调节界面**。拖动 31 级滑块，人像从「小难梁」连续演化到「梁祖」，推理强度按区间自动写入当前会话（`off` / `high` / `max`）。

- **推理强度联动**：滑块 0–9 → `Off`，10–19 → `High`，20–30 → `Max`，通过 DSH 官方通道 `sessions.selectModel` 写入当前会话
- **视觉演化动画**：241 帧插值视频随滑块连续 seek（WebM/MP4 双格式回退；视频素材不随仓库分发，需自行获取，见子目录 README）
- **入口与开关**：模型菜单 →「推理等级」打开面板；设置 > 通用设置可关闭，恢复官方三档推理强度

详细说明（安装、素材来源、移除）见 [custom inference strength slider/README.md](custom inference strength slider/README.md)。

## 安装

1. 克隆仓库：

   ```bash
   git clone https://github.com/FishScP/DeepSeek-Harness-Plugins.git
   ```

2. 安装插件（以 side column 为例，支持本地路径）：

   ```bash
   dsh plugin --profile web add "<repo-root>\side column"
   ```

   默认 profile 为 `web`，需要更改 profile 的请自行调整参数。

3. 重启网关：

   ```bash
   dsh-restart
   ```

   刷新页面后生效：左侧栏底部「设置」旁出现 `¥` 按钮，点击即可打开用量侧栏。

> **说明**：插件位于仓库子目录，而 pnpm 的 git 依赖协议（`github:<user>/<repo>`）不支持子目录安装，因此暂不支持直接从仓库 URL 安装插件；请使用「克隆 + 本地路径」方式，或将插件独立发布后直装。

## 前置条件

- **DSH 版本兼容**：插件基于当前部署（DSH 0.1.0-rc.x，2026-08）的契约编写；若您的 DSH 版本差异较大，个别接口（如 typert manifest、sessionQuery 签名）可能需要小幅适配。
- **配置凭证**：各插件所需凭证（如 `DEEPSEEK_API_KEY`）请在 DSH 设置 → 模型页写入，或 `~/.dsh/.credentials.yaml` 中配置；未配置时侧栏仅显示本地会话统计。
- **Node.js** ≥ 22（CI 使用 node 22）。

## 兼容性说明

- 验证版本：DSH 0.1.0-rc.x（2026-08 部署）。
- 运行时依赖：`@deepseek-ai/dsh-credentials`、`@deepseek-ai/dsh-typert-protocol`（^0.1.0-rc.6）、`yaml`、`zod`（v4）；客户端侧注入 `@deepseek-ai/dsh-client-runtime`、`@deepseek-ai/dsh-client-locale`、`@deepseek-ai/dsh-api-gateway`。
- CI：`side column/.github/workflows/ci.yml`（语法检查 + 单元测试）。

## 免责声明

社区作品，与 DeepSeek 官方无关；费用估算基于公开价格，仅供参考，实际扣费以官方账单为准。

## License

MIT
