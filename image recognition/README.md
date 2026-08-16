# 图片随附消息（Image Recognition Attachment）

> 为 [DeepSeek Harness](https://github.com/0xsline/awesome-deepseek-harness) 的纯文本模型提供**视觉能力 + 图片随附消息**：
> 粘贴/拖入图片后，**缩略图直接显示在用户发送的消息旁**，输入框无任何路径文字，
> 模型自动获得 **GLM 双模型并行分析**的结果。

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Platform](https://img.shields.io/badge/platform-DeepSeek%20Harness-4B32C3.svg)

---

## 基于

识图模块（`see_image` / `vision_set_key` / `vision_status` 工具，Gemini / GLM 视觉 API 调用）
基于 [tdf1995/dsh-plugin-vision](https://github.com/tdf1995/dsh-plugin-vision)（MIT）开发，
本仓库不重复其识图代码，只提供在其之上的**定制增量**：

- **图片随附消息**：缩略图显示在用户消息旁（而非模型回复下）；
- **粘贴即分发**：图片保存瞬间即并行调用双 GLM 模型分析，发送时零等待；
- **输入框零标记**：粘贴图片不再向输入框注入路径文字；
- **双模型综合分析**（`provider: both`）：GLM-4.6V-Flash + GLM-4.1V-Thinking-Flash 并行读图并输出综合结果；
- **体验修复**：并发临时文件冲突（EIO）、官方拖放提示层卡死、中文文件名 404、限流识别等。

## 目录结构

```
image recognition/
├── lib/
│   ├── host-custom.js      # Host 定制：粘贴即分发 / pre-step 注入 / 图片路由 / 并发修复
│   └── client-custom.js    # Client 定制：user 渲染接管 / 缩略图 / 拖拽拦截 / 样式
├── config/
│   ├── cordis.patch.yml            # profile 插件行
│   ├── credentials.example.yaml    # API Key 配置示例（占位符）
│   └── skills/shijue-gongju/SKILL.md  # 「视觉工具」技能（技能列表中文显示名）
├── docs/
│   └── image-attachment.md  # 「图片随附消息」实现原理详解
├── LICENSE                 # MIT（保留原作者版权行）
└── README.md
```

## 安装

### 1. 基础插件

先按 [tdf1995/dsh-plugin-vision](https://github.com/tdf1995/dsh-plugin-vision) 的安装方式
安装原版插件（npm 包 / third_party 目录 + junction），再按 [docs/image-attachment.md](docs/image-attachment.md)
的「文件对照」把 `lib/` 定制代码合并进原版 `lib/index.js` 与 `lib/client.js`。

> 本机部署示例：插件位于 `D:\DeepSeek Harness\third_party\dsh-plugin-vision`，
> 在 `C:\Users\Lenovo\.dsh\profiles\web\node_modules\dsh-plugin-vision` 建 junction 指向它。

### 2. 配置 API Key

复制 `config/credentials.example.yaml` 到 `~/.dsh/.credentials.yaml` 并填入真实 Key
（**切勿把真实 Key 提交到 GitHub**）：

| 凭据 | 通道 |
|---|---|
| `ZHIPU_API_KEY` | GLM 主通道（glm-4.6v-flash，国内直连免费） |
| `ZHIPU_API_KEY_2` | GLM 第二通道（glm-4.1v-thinking-flash，免费，双模型综合用） |
| `GEMINI_API_KEY` | Gemini（可选，需代理） |

### 3. profile 插件行

把 `config/cordis.patch.yml` 的 insert 追加到 profile 的 `cordis.patch.yml`：

```yaml
- insert:
    - id: dsh-plugin-vision
      name: 'dsh-plugin-vision'
```

### 4. 技能（可选）

把 `config/skills/shijue-gongju/SKILL.md` 放到 `~/.dsh/skills/shijue-gongju/`（用户级）
或 `<项目>/.dsh/skills/`（项目级），设置 → 技能 中即可看到「视觉工具」卡片（热生效）。

### 5. 重启

重启 dsh web 后生效。

## 使用

1. **粘贴 / 拖入 / 点击 🖼️ 按钮**添加图片 → 输入框**不出现任何路径文字**，仅显示附件卡片；
2. 输入问题发送；
3. **您的消息旁显示图片缩略图**（点击可全屏预览），模型回复基于双 GLM 模型的综合分析；
4. 也可显式使用工具：`see_image(image_path=..., provider="both")` / `vision_status` / `vision_set_key`。

## 工作原理（简述）

```
粘贴图片 → POST /vision/save-image
         → host 立即并行 GLM-4.6V-Flash + GLM-4.1V-Thinking-Flash 分析并缓存
发送消息 → agent/pre-step（waterfall）
         → ① 双模型描述注入 context 消息（折叠上下文行，模型可见）
         → ② 【vision-file:文件名】标记追加到用户消息
渲染     → 接管 conversation.chat.node keyed 'user'（priority -1）
         → 从标记渲染缩略图（GET /vision/image/<sessionId>/<file>）
         → 点击全屏预览
```

详细实现（含踩坑记录）见 [docs/image-attachment.md](docs/image-attachment.md)。

## 许可证

[MIT](LICENSE) —— 基于 [tdf1995/dsh-plugin-vision](https://github.com/tdf1995/dsh-plugin-vision)（MIT）开发，保留原作者版权声明。
