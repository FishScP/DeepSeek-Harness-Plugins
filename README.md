# DeepSeek Harness Plugins

DSH（DeepSeek Harness）社区插件集合。每个插件位于仓库根下的独立子目录，通过 DSH 的 bundle 机制挂载（`dsh plugin --profile web add <path>` 自动应用 `cordis.patch.yml`，无需手工编辑配置）。

## 插件列表

| 目录 | 包名 | 版本 | 作用 |
| --- | --- | --- | --- |
| [`side column/`](side column/README.md) | `dsh-usage-column` | 0.1.0 | DSH 用量侧栏：Web 界面右侧（可一键切左侧）实时显示账户余额、本会话 API 消耗、运行指标、费用分解与上下文窗口 |
| [`custom inference strength slider/`](custom inference strength slider/README.md) | `@deepseek-ai/dsh-client-liang` | 1.0.0 | 自定义推理强度滑块：31 级「滑动变祖器」面板，拖动滑块联动当前会话推理强度（off / high / max） |
| [`image recognition/`](image recognition/README.md) | `dsh-plugin-vision`（定制增量） | — | 图片随附消息：粘贴/拖入图片即双 GLM 并行分析，缩略图直接显示在用户消息旁，输入框零路径文字 |
| [`prompt inject/`](prompt inject/README.md) | `anchored-standard-ci` + `ci-control` | — | 锚定标准（上下文注入）：保持首轮强锚定，晋升后按对话轮次注入 AGENTS.md，配套注入频次选择器 |

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

### image recognition · 图片随附消息（dsh-plugin-vision 定制增量）

为纯文本模型提供**视觉能力 + 图片随附消息**：粘贴/拖入图片后，**缩略图直接显示在用户发送的消息旁**，输入框不出现任何路径文字，模型自动获得双 GLM 模型的并行分析结果。

- **粘贴即分发**：图片保存瞬间即并行调用 GLM-4.6V-Flash + GLM-4.1V-Thinking-Flash 分析并缓存，发送时零等待
- **输入框零标记**：粘贴图片不再向输入框注入路径文字，仅显示附件卡片
- **双模型综合分析**（`provider: both`）：两个 GLM 视觉模型并行读图并输出综合结果
- **体验修复**：并发临时文件冲突（EIO）、官方拖放提示层卡死、中文文件名 404、限流识别等
- 识图模块（`see_image` / `vision_set_key` / `vision_status`）基于 [tdf1995/dsh-plugin-vision](https://github.com/tdf1995/dsh-plugin-vision)（MIT），本仓库只提供定制增量

详细说明（安装、API Key 配置、实现原理）见 [image recognition/README.md](image recognition/README.md) 与 [docs/image-attachment.md](image recognition/docs/image-attachment.md)。

### prompt inject · 锚定标准（上下文注入）（anchored-standard-ci）

为 [xiaobright/dsh-anchored-standard](https://github.com/xiaobright/dsh-anchored-standard) 提供**「上下文注入」改版预设**：保持其「首轮强锚定」设计（第一请求只暴露 Minimal 工具对，不注入任何上下文），在**晋升后按对话轮次定期注入 AGENTS.md / CLAUDE.md 工作区指令内容**，解决锚定模式下全局/工作区指令持续失效的问题。

- **首轮锚定不妥协**：请求 #1 与 anchored-standard 完全一致，晋升前绝不注入
- **晋升后按对话轮次注入**：一轮 = 用户一条消息到模型最终回复，一轮内多次工具调用只注入一次；内容预算截断（默认 4096 字节）
- **频次 GUI 实时可调**：会话工具行右端「注入频次 ▾」下拉（每轮 / 隔一轮 / 隔两轮 / 隔三轮 / 关闭），选择即写入 `$DSH_HOME/.context-injector.json`，下一次请求生效
- **容错**：文件缺失/读取失败/插件异常一律跳过注入，绝不阻塞会话
- 配套 `ci-control` 静态包（host Remote 服务 + client 工具行 UI），可选但推荐安装

详细说明（安装、文件来源标注、故障排查）见 [prompt inject/README.md](prompt inject/README.md)。

## 安装

1. 克隆仓库：

   ```bash
   git clone https://github.com/FishScP/DeepSeek-Harness-Plugins.git
   ```

2. 各插件的安装方式不同，具体步骤见各自子目录 README：

   - [side column/README.md](side column/README.md)（`dsh plugin` bundle 安装）
   - [custom inference strength slider/README.md](custom inference strength slider/README.md)（手动安装）
   - [image recognition/README.md](image recognition/README.md)（原版 dsh-plugin-vision + 定制代码合并）
   - [prompt inject/README.md](prompt inject/README.md)（预设复制到 `.agent-presets/` + ci-control 静态包）

> **说明**：插件位于仓库子目录，而 pnpm 的 git 依赖协议（`github:<user>/<repo>`）不支持子目录安装，因此暂不支持直接从仓库 URL 安装插件；请使用「克隆 + 本地路径」方式，或将插件独立发布后直装。

## 免责声明

社区作品，与 DeepSeek 官方无关；费用估算基于公开价格，仅供参考，实际扣费以官方账单为准。

## License

MIT
