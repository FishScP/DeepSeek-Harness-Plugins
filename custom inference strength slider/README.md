# 自定义推理强度滑块（Custom Inference Strength Slider）

DSH（DeepSeek Harness）客户端插件：把社区趣味项目「滑动变祖器」移植为**推理强度调节界面**。拖动 31 级滑块，人像从「小难梁」连续演化到「梁祖」的同时，推理强度按区间自动写入当前会话（`off` / `high` / `max`）。

## 功能

- **推理强度联动**：滑块 0–9 → `Off`，10–19 → `High`，20–30 → `Max`；跨档位边界时通过 DSH 官方通道 `sessions.selectModel` 写入当前会话，与 `/model` 弹窗同一数据源
- **视觉演化动画**：241 帧插值视频随滑块连续 seek（WebM/MP4 双格式回退）
- **入口**：点击输入框旁模型按钮 → 菜单「推理等级」→ 打开滑动变祖器
- **设置开关**：设置 > 通用设置 →「自定义推理强度滑块」（蓝色开关）；关闭后恢复官方原版三档推理强度菜单

## 素材来源（重要）

本插件的人像演化视频素材来自第三方仓库：

> [Lichtspektrum/liang-intensity-calibrator](https://github.com/Lichtspektrum/liang-intensity-calibrator)（滑动变祖器：31 级梁系强度校准器）

**本仓库不包含视频文件**（涉及他人肖像权）。请自行从上述仓库的 `public/video/` 获取以下两个文件，放入本插件的 `video/` 目录后即可使用：

```
video/
├── liang-evolution.webm   # WebM (VP9)，约 6.3 MB
└── liang-evolution.mp4     # MP4 (H.264)，约 6.7 MB
```

> ⚠️ 复用或二次发布前，请确认你拥有相关肖像与素材的使用权（原仓库 README 声明）。

## 目录结构

```
custom inference strength slider/
├── package.json          # 插件包声明（dsh.client: { platform: "web" }）
├── lib/
│   ├── index.js          # host 半边：/liang-video 视频路由（Range/206、404 防护）
│   └── client.js         # 浏览器半边：面板、滑块↔推理档联动、模型菜单 shadow、设置开关
└── video/                # 自行放入素材（见上）
```

## 安装步骤

1. 将本目录复制到 DSH 的 web profile 下：

   ```
   ~/.dsh/profiles/web/packages/dsh-client-liang/
   ```

2. 在 `~/.dsh/profiles/web/package.json` 的 `dependencies` 中添加：

   ```json
   "@deepseek-ai/dsh-client-liang": "file:./packages/dsh-client-liang"
   ```

3. 在 `~/.dsh/profiles/web/cordis.patch.yml` 中追加：

   ```yaml
   - insert:
       - id: ui-liang
         name: '@deepseek-ai/dsh-client-liang'
         inject: [webServer]
   ```

4. 建立运行时解析链接（二选一）：
   - 执行 `pnpm install`（推荐，由 file: 依赖自动链接）；或
   - 手动创建 junction：

     ```
     node_modules\@deepseek-ai\dsh-client-liang → ..\..\packages\dsh-client-liang
     ```

5. **重启 DSH**（插件表在进程启动时扫描），放入视频素材后即可使用。

## 使用

- 模型按钮 →「推理等级」→ 滑动变祖器面板
- 拖动滑块：视觉演化 + 推理强度按区间切换（Off / High / Max）
- 设置 > 通用设置：「自定义推理强度滑块」开关，关闭即恢复官方三档

## 移除

删除 `cordis.patch.yml` 中的 `ui-liang` 行即可停用；再删除插件目录与依赖声明可完全卸载。

## 许可

代码部分 MIT，Copyright (c) 2026 FishScP（与 DSH 一致）。视频素材权利归原作者所有，见上文素材来源。
