---
name: shijue-gongju
displayName: 视觉工具
description: 让纯文本大模型（DeepSeek）具备图像理解能力：通过免费 Gemini / GLM 视觉 API 完成图片描述、OCR、视觉问答，支持双模型并行综合分析。
whenToUse: 当用户要求查看、描述、分析本地图片，识别截图或图片中的文字（OCR），或回答与图片内容相关的问题时使用。
user-invocable: true
---

# 视觉工具（dsh-plugin-vision）

本技能指导如何正确使用 DSH 视觉插件（dsh-plugin-vision）提供的图像理解能力。DeepSeek 自身不支持图片输入，需要理解图片内容时由视觉插件通过外部视觉模型（Gemini / GLM）代为读图。

## 自动读图链路（粘贴即分发）⭐

浏览器粘贴/拖入/选择图片后：

1. 图片保存至工作区 `.dsh-vision/uploads/`，host **立即并行分发** GLM-4.6V-Flash（`ZHIPU_API_KEY`）与 GLM-4.1V-Thinking-Flash（`ZHIPU_API_KEY_2`）双模型读图；
2. **输入框不注入任何文字标记**，仅显示附件卡片（缩略图 + 文件名）；
3. 用户输入问题发送后，host 在消息进入模型前把双模型综合描述以**上下文消息**形式注入（对话中显示为折叠的上下文行，不显示大段文字）；
4. 模型直接基于图片描述回答，**无需调用 `see_image` 工具**。

因此：用户消息中出现"图片内容上下文"时，模型应直接利用其中的描述信息；仅在自动分析失败（上下文行提示失败）时，才调用 `see_image` 工具兜底。

## 工具一：see_image（核心读图工具，兜底/显式调用）

| 参数 | 类型 | 必填 | 说明 |
|---|---|---|---|
| `image_path` | string | ✅ | 图片文件路径（绝对路径或相对当前工作区的路径），支持 png / jpg / jpeg / webp / gif |
| `question` | string | — | 针对图片的具体问题或分析要求；省略时默认详细描述图片内容 |
| `provider` | string | — | `auto`（默认，自动选择已配置 Key 的提供商，记住上次成功者，失败自动切换）/ `gemini` / `glm` / `both`（双模型并行综合分析） |
| `model` | string | — | 覆盖默认模型名（Gemini 默认 gemini-3.6-flash，GLM 默认 glm-4.6v-flash） |

### 双模型综合模式（provider=both）⭐

同时并行调用**主提供商**（当前为 GLM-4.6V-Flash，凭据 `ZHIPU_API_KEY`）与**第二 GLM 模型**（GLM-4.1V-Thinking-Flash，凭据 `ZHIPU_API_KEY_2`）读同一张图片，输出两模型独立结果并给出综合结论。两个请求互不拖累、各自独立重试。适合对重要图片做交叉验证（如 OCR 关键信息、图表读数、真伪核对）。

调用示例：`see_image(image_path="D:\work\截图.png", provider="both", question="图中商品是什么？价格多少？")`

## 工具二：vision_set_key（配置 API Key）

保存视觉提供商 API Key 至 DSH 凭据库（`~/.dsh/.credentials.yaml`），立即生效，无需重启。

| 参数 | 类型 | 必填 | 说明 |
|---|---|---|---|
| `provider` | string | ✅ | `gemini` 或 `glm` |
| `api_key` | string | ✅ | API Key 值（非空） |

## 工具三：vision_status（查看配置状态）

查看各提供商 Key 的配置状态（仅报告是否已配置、来源与可写性，**不显示 Key 本身**）。

## 注意事项

- 图片上限 20MB；超过 4MB 自动压缩至最长边 1920px（JPEG 质量 85）后上传；
- 图片路径支持中文（插件自动切换到系统临时目录处理）；
- GLM 国内直连、免费额度（glm-4.6v-flash / glm-4.1v-thinking-flash 免费）；Gemini 需代理访问；
- 限流（429 / 访问量过大 / 速率限制）自动退避重试（默认 3 次），失败自动切换另一提供商；
- 请求临时文件（含认证配置）每次调用后自动清理，不残留磁盘；
- 浏览器端可 Ctrl+V / 拖拽 / 点击图片按钮粘贴图片，图片保存至工作区 `.dsh-vision/uploads/`，发送后模型自动读图，图片以缩略图随附在用户消息旁。
