# prompt inject — 锚定标准的上下文注入改版（anchored-standard-ci）

为 [xiaobright/dsh-anchored-standard](https://github.com/xiaobright/dsh-anchored-standard) 提供
**「上下文注入」改版预设**：保持其「首轮强锚定」设计（第一请求只暴露 Minimal 真实工具对
`bash` + `str_replace_editor`、剥离自动上下文注入），在**晋升后按对话轮次定期注入
AGENTS.md / CLAUDE.md 工作区指令内容**，并配套一个**对话工具行的注入频次选择器**。

> 实验性社区项目，非 DeepSeek 官方 preset。

## 核心目的（要解决什么问题）

`dsh-anchored-standard` 的锚定机制让首轮轨迹稳定，但代价是 **AGENTS.md 内容不再每轮自动注入**
（官方 `standard` 预设每轮注入，锚定预设改为「提示 + 模型自觉读取」）。实测中模型常不读取，
导致用户的全局/工作区指令（如：中文思维链、计划-审批工作流）在锚定模式下**持续失效**。

本项目在不破坏首轮锚定的前提下恢复指令送达：

| 阶段 | 行为 |
|---|---|
| 请求 #1（未晋升） | 与 anchored-standard 相同：仅 Minimal 工具对，**不注入任何上下文**（锚定保留） |
| 晋升后（首次工具调用或首次回复后） | `context-injector` 按**对话轮次**注入 AGENTS.md 内容（预算截断，默认 4096 字节） |
| 频次控制 | 每轮 / 隔一轮 / 隔两轮 / 隔三轮 / 关闭 —— GUI 下拉实时可调，下一个请求生效 |

**「对话轮次」语义**：一轮 = 用户一条消息到模型最终回复；一轮内多次工具调用**只注入一次**。

## 依赖项目（必须先行安装）

- **[xiaobright/dsh-anchored-standard](https://github.com/xiaobright/dsh-anchored-standard)**（MIT）
  - 提供本改版的基础：`anchored-standard` 主预设的组装骨架、`tool-bootstrap` 晋升机制、
    共享模块 `compaction-epoch.mjs`（epoch 晋升判定）等；
  - **本项目的 `preset/anchored-standard-ci/` 是"增量 overlay"**，不含其仓库整体内容；
    安装顺序：**先按依赖仓库 README 安装 anchored-standard，再安装本项目**。
- 可选：`dsh-plugin-vision`（视觉工具）——`agent.cordis.yml` 中 `residentTools` 已为其预留。

## 文件清单与来源标注

| 文件 | 来源 |
|---|---|
| `preset/anchored-standard-ci/agent.cordis.yml` | **基于依赖项目文件修改**（新增 context-injector 行、residentTools、中文注释） |
| `preset/anchored-standard-ci/preset.yml` | 本项目（显示名：锚定标准（上下文注入）） |
| `preset/anchored-standard-ci/context-injector.mjs` | **本项目原创**（按对话轮次注入插件） |
| `preset/anchored-standard-ci/tool-bootstrap.mjs` | **基于依赖项目文件修改**（新增 `residentTools` 配置项：晋升后常驻额外工具） |
| `preset/anchored-standard-ci/compaction-epoch.mjs` | **来自依赖项目**（MIT，未修改；运行依赖，随包附带） |
| `test/context-injector.test.mjs` | 本项目原创（15 个测试：轮次计数/覆盖文件/compaction 重置/容错） |
| `ci-control/` | 本项目原创（注入频次选择器静态包：host Remote 服务 + client 工具行 UI） |

## 安装

### 1. 安装依赖

按 [dsh-anchored-standard README](https://github.com/xiaobright/dsh-anchored-standard) 安装
`anchored-standard` 预设到 `$DSH_HOME/.agent-presets/anchored-standard`。

### 2. 安装本预设

将 `preset/anchored-standard-ci` 复制到 `$DSH_HOME/.agent-presets/anchored-standard-ci`：

```powershell
$target = Join-Path $env:USERPROFILE '.dsh\.agent-presets\anchored-standard-ci'
Copy-Item -Recurse -LiteralPath '.\preset\anchored-standard-ci' -Destination $target
```

### 3. 安装注入频次选择器（ci-control，可选但推荐）

参照 `dsh-usage-column` 的接入模式：

1. 把 `ci-control` 目录复制到 `$DSH_HOME\profiles\web\packages\ci-control`，
   并在 `$DSH_HOME\profiles\web\node_modules` 建立链接
   （`New-Item -ItemType Junction -Path ...\node_modules\ci-control -Target ...\packages\ci-control`）；
2. 在 `$DSH_HOME\profiles\web\cordis.patch.yml` 追加：

   ```yaml
   - insert:
       - id: ci-control
         name: ci-control
   ```

3. **重启 DSH**（profile 层改动需重启加载 client bundle）。

### 4. 验证

```sh
npm test            # 或 node --test test/  （context-injector 单元测试）
node --check preset/anchored-standard-ci/*.mjs ci-control/lib/*.js
```

## 使用

1. 新建空白会话，预设选择器中选择 **锚定标准（上下文注入）**；
2. 会话工具行右端出现 **`注入频次 ▾`** 下拉（仅该预设会话显示）：
   每轮(1) / 隔一轮(2) / 隔两轮(3) / 隔三轮(4) / 关闭(0)；
3. 选择即写入 `$DSH_HOME/.context-injector.json`，**下一次请求生效**（无需重启）；
4. 首轮仍只有 `bash` + `str_replace_editor`；晋升后按所选频次注入 AGENTS.md 内容。

## 故障排查

- **注入频次选择器未出现**：部分情况下（如 DSH 重启后的就绪窗口异常、浏览器
  bundle 缓存未更新），选择器可能无法自动拉起——**按 `Ctrl+R` 刷新页面即可恢复**
  （仍不出现时用 `Ctrl+Shift+R` 强制刷新）；
- 确认当前会话确实运行「锚定标准（上下文注入）」预设（该选择器仅此预设显示）；
- 检查 `C:\Users\<用户>\.dsh\.context-injector.json` 是否存在、内容是否为
  `{"interval": <0-4>}`；缺失时按 `agent.cordis.yml` 中的默认 `interval: 1`（每轮）执行。

## 设计要点

- **首轮锚定不妥协**：`context-injector` 只在晋升后注入，晋升前与 anchored-standard 完全一致；
- **频次按对话轮次计**：一轮内多步工具调用只注入一次（`agent/pre-step` 载荷的 `turn` 字段）；
- **覆盖文件优先**：`$DSH_HOME/.context-injector.json` 的 `interval` 覆盖 `agent.cordis.yml`
  配置（`0`=关闭；非法值回退配置）；
- **容错**：文件缺失/读取失败/插件异常一律跳过注入，绝不阻塞会话；
- **GUI 就绪重试**：重启后 host/连接存在就绪窗口，选择器自动重试直至出现；
- **可选视觉工具**：`residentTools: [see_image, vision_set_key, vision_status]`
  使晋升后目录直接包含 dsh-plugin-vision 的工具（免 `dev_tool_search` 解锁）。

## 兼容性

- 目标：DeepSeek Harness（0.1.0-rc.5+ 结构，rc.6 profile 实测通过）、Windows / Linux；
- 本机实测模型 deepseek-v4-flash（锚定效果因模型而异，参见依赖仓库的评测说明）；
- `agent.cordis.yml` 中 `bootstrapMaxTokens` 未启用（规避预构建 profile 的 maxTokens 覆盖问题）。

## 版权与许可

- **MIT**（本项目原创部分）；
- `compaction-epoch.mjs` 与 `agent.cordis.yml`/`tool-bootstrap.mjs` 的修改基线
  来自 [xiaobright/dsh-anchored-standard](https://github.com/xiaobright/dsh-anchored-standard)（MIT），
  原始 DeepSeek 版权与许可声明见该仓库 `NOTICE`；请遵守其许可条款。
