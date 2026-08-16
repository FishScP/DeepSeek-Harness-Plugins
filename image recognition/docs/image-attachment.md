# 图片随附消息 —— 实现原理详解

> 目标效果：在 DSH（DeepSeek Harness）中粘贴/拖入图片后，
> **图片缩略图直接显示在用户发送的消息旁**（而非模型回复下），
> 输入框不出现任何路径文字，模型自动获得双模型视觉分析结果。

## 背景与约束

DSH 是纯文本模型的 Agent 平台：

1. **模型不支持图片输入**——DSH 在发送路径（`dsh-host-apiproxy` 的 `prompt` RPC）会校验
   `inputModalities`，文本模型收到图片附件直接拒绝（`MODEL_DOES_NOT_SUPPORT_IMAGES`），
   因此**图片不能作为原生附件块进入消息**；
2. **消息投影是逐字透传**——`session.deriveMessages` 对 `user/message` 事件原样投影，
   若消息 content 含 `{type:"image"}` 块，DeepSeek 适配器会直接抛
   `UNSUPPORTED_CONTENT`；
3. **用户消息文本是纯文本渲染**（非 Markdown）——`![](path)` 不会被渲染成图片；
4. **官方渲染器内部组件不可复用**——`UserStyleBubble`、`MessageIconActions` 等是打包内部符号。

因此"图片随附消息"采用 **文本标记 + 渲染层接管** 的桥接方案，分四个环节：

## 环节一：粘贴即分发（图片保存即分析）

```
浏览器粘贴/拖入/选择图片
  └─ POST /vision/save-image（原版已有）
       └─ host：保存到 <workspace>/.dsh-vision/uploads/
            └─ dispatchPending(sessionId, path)   ← 定制
                 └─ 立即并行调用 GLM-4.6V-Flash + GLM-4.1V-Thinking-Flash
                      └─ 双模型分析结果缓存到 pendingImages[sessionId]
```

- 用户在**打字期间**分析已经完成，发送时零等待；
- 删除附件卡片 → `POST /vision/discard-image` 丢弃对应缓存；
- 关键实现：`lib/host-custom.js` 的 `createPendingImageStore()`。

## 环节二：agent/pre-step 注入（发送时把图片"装进"消息）

DSH 的 agent loop 在每条用户消息进入模型前派发 `agent/pre-step`
（waterfall 事件，可替换 `decision.messages`）。定制监听器：

```
发送消息
  └─ agent/pre-step
       ├─ 取出该会话待消费的图片缓存（collect）
       ├─ ① 追加 context 消息（source.kind: 'plugin'）
       │    文本 = 【图片内容】+ 双模型综合描述 + 【vision-file:文件名】标记
       │    → UI 渲染为折叠的上下文行；模型投影照常包含（与系统上下文同管道）
       ├─ ② 把【vision-file:文件名】标记追加到用户消息（text 块）
       │    → 渲染层据此显示缩略图；模型看到标记但无碍
       └─ 返回替换后的 decision.messages（会被追加到会话并进入模型）
```

- context 消息的 `source.kind !== "user"` 是 UI 渲染为"上下文行"的关键
  （`dsh-client-ui-conversation` 的 `messageDefinition` 按 source.kind 分类）；
- 关键实现：`lib/host-custom.js` 的 `registerPreStepInjection()`。

## 环节三：GET /vision/image 路由（图片回传浏览器）

浏览器 `<img src="/vision/image/<sessionId>/<文件名>">` 需要同源 HTTP 服务：

```
webServer.register({ kind: 'prefix', path: '/vision/image', handler })
```

**关键坑**：webServer 的 prefix 匹配会自动拼接 `/`（`pathname.startsWith(prefix + "/")`），
因此注册路径**必须不带尾部斜杠**（写成 `/vision/image/` 会永远匹配不上，
请求落入前端 SPA fallback 返回 index.html——Network 里表现为
`200 + text/html` 的假成功）。

- 文件名校验允许中文（`联想截图_xxx.png`），只拒绝分隔符与 `..` 穿越；
- 关键实现：`lib/host-custom.js` 的 `registerImageRoute()`。

## 环节四：渲染层接管 user 节点（缩略图显示在用户消息旁）

官方把用户消息渲染器注册在 `conversation.chat.node` keyed `user`（priority 0）。
slot 系统按 **priority 升序**选择 keyed 渲染器，因此以 **priority -1** 注册
定制渲染器即可接管：

```
slots.register({ name: 'conversation.chat.node', key: 'user', priority: -1 }, VisionUserNode)
```

`VisionUserNode` 做的事情：

1. 遍历消息 content 的 text 块，用正则提取 `【vision-file:文件名】` 并从显示文本剔除；
2. 在气泡旁渲染 `<img src="/vision/image/<sessionId>/<文件名>">` 缩略图；
3. 点击缩略图 → 全屏预览（fixed overlay，点击关闭）；
4. 复刻官方气泡样式（`--dsw-specific-bubble` 等主题 token，明暗自适应）；
5. 提供轻量「复制」「分支」按钮（`forkAt(seq)` 来自 owner props）。

> 为什么不用 turnTail 链？`conversation.chat.turnTail` 渲染位置固定在该轮
> 助手消息的 IconActions 前——无法把图片放在用户消息旁，故改为接管 user 节点。

## 附：两个踩过的坑

| 现象 | 根因 | 修复 |
|---|---|---|
| 双模型偶发 `ReplaceFileW EIO` | both 模式两个并行请求（主/第二 GLM）keyRef 相同，临时文件名相同，并发写同一文件 | 临时文件加唯一后缀（`lib/host-custom.js` 的 `requestFilePaths()`） |
| 拖入图片后全屏提示层卡死 | 插件在 window 捕获阶段 `stopPropagation` 吞掉 drop，官方在 document 冒泡阶段监听、收不到 drop → 提示层永不关闭 | 捕获阶段**吞掉全部**携带文件的拖拽事件（`installGlobalDragListeners()`），官方提示层从头不显示 |

## 文件对照

| 本目录文件 | 合并进原版插件的位置 |
|---|---|
| `lib/host-custom.js` | 原版 `lib/index.js` 的 apply() 内：粘贴路由 handler、共享函数区、路由注册区 |
| `lib/client-custom.js` | 原版 `lib/client.js`：S 样式表、VisionDock 组件、slots 注册区 |
| `config/cordis.patch.yml` | profile 的 `cordis.patch.yml` 追加 |
| `config/credentials.example.yaml` | `~/.dsh/.credentials.yaml`（填入真实 Key） |
| `config/skills/shijue-gongju/SKILL.md` | `~/.dsh/skills/shijue-gongju/SKILL.md`（或项目 `.dsh/skills/`） |
