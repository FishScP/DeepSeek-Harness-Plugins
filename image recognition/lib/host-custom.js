/**
 * dsh-plugin-vision —— 「图片随附消息」Host 端定制（可运行模块）
 * ====================================================================
 * 本模块是 dsh-plugin-vision（https://github.com/tdf1995/dsh-plugin-vision）
 * 之上的定制增量：实现「粘贴即分发 + 发送时把图片随附到用户消息」。
 *
 * 原版插件的识图逻辑（see_image 工具、GLM/Gemini 调用、runBoth 等）不在此处，
 * 通过依赖注入接入（见每个导出函数的参数说明与 README「合并方式」）。
 * ====================================================================
 */

/** 取本地路径最后一段（文件名）。 */
export function fileNameOf(path) {
  const norm = String(path).replace(/\\/g, '/');
  const idx = norm.lastIndexOf('/');
  return idx >= 0 ? norm.slice(idx + 1) : norm;
}

/**
 * 待消费图片缓存：sessionId → 图片条目列表。
 * 图片在粘贴保存时立即开始双模型分析，发送时由 pre-step 消费。
 */
export function createPendingImageStore() {
  const map = new Map();
  const TTL_MS = 10 * 60 * 1000;

  /**
   * 登记一张图片并立即发起分析（fire-and-forget）。
   * @param deps.analyzeImageBoth(path, policy, signal, question) 双模型分析函数
   * @param deps.resolvePolicyForSessionId(ctx, sessionId)        会话沙箱策略
   * @param deps.DEFAULT_QUESTION                                 默认提问文本
   */
  function dispatch(sessionId, path, deps) {
    if (!sessionId) return;
    let queue = map.get(sessionId);
    if (!queue) { queue = []; map.set(sessionId, queue); }
    const entry = { path, description: null, error: null, time: Date.now(), used: false };
    queue.push(entry);
    const ac = new AbortController();
    const timer = setTimeout(() => ac.abort(), 90000);
    const policy = deps.resolvePolicyForSessionId(deps.ctx, sessionId);
    deps.analyzeImageBoth(path, policy, ac.signal, deps.DEFAULT_QUESTION)
      .then((out) => { entry.description = out.content; })
      .catch((e) => { entry.error = e && e.message ? e.message : String(e); })
      .finally(() => { clearTimeout(timer); });
  }

  /** 移除一张图片（浏览器端删除附件卡片时调用）。 */
  function discard(sessionId, path) {
    if (!sessionId || !path) return;
    const queue = map.get(sessionId);
    if (!queue) return;
    map.set(sessionId, queue.filter((e) => e.path !== path));
  }

  /** 取出该会话未消费的条目并全部标记为已消费。 */
  function collect(sessionId) {
    const queue = map.get(sessionId);
    if (!queue || queue.length === 0) return [];
    const now = Date.now();
    const fresh = queue.filter((e) => !e.used && now - e.time < TTL_MS);
    if (fresh.length === 0) return [];
    fresh.forEach((e) => { e.used = true; });
    map.set(sessionId, queue.filter((e) => !e.used));
    return fresh;
  }

  return { map, dispatch, discard, collect };
}

/**
 * agent/pre-step 注入：消息进入模型前，把待消费图片的
 *   ① 双模型分析 → context 消息（折叠上下文行，模型可见）
 *   ② 【vision-file:文件名】标记 → 用户消息（渲染层显示缩略图）
 * 追加进 decision.messages。
 *
 * 事件契约（dsh-agent-loop）：payload { agent, messages, turn, step, signal }，
 * 监听器调用 next() 取得默认决策后替换 messages 返回；kind === 'enter' 的
 * decision.messages 会被追加到会话并进入模型投影。
 */
export function registerPreStepInjection(ctx, store) {
  if (typeof ctx.on !== 'function') return;
  ctx.on('agent/pre-step', async (payload, next) => {
    const decision = await next();
    if (decision.kind !== 'enter') return decision;
    const agent = payload && payload.agent;
    const sessionId = agent && agent.session ? agent.session.id : undefined;
    if (!sessionId) return decision;
    const fresh = store.collect(sessionId);
    if (fresh.length === 0) return decision;

    // 等待进行中的分析（粘贴时已启动，通常早已完成；最长 30s）
    const deadline = Date.now() + 30000;
    for (const entry of fresh) {
      while (entry.description === null && entry.error === null && Date.now() < deadline) {
        await new Promise((r) => setTimeout(r, 500));
      }
    }

    const parts = [];
    const fileTags = [];
    for (const entry of fresh) {
      const fileTag = '【vision-file:' + fileNameOf(entry.path) + '】';
      fileTags.push(fileTag);
      if (entry.description) {
        parts.push(entry.description + '\n' + fileTag);
      } else if (entry.error) {
        parts.push('（用户附加了一张图片，但自动分析失败：' + entry.error + '。如需查看可用 see_image 工具并提供图片路径）\n' + fileTag);
      } else {
        parts.push('（用户附加了一张图片，自动分析超时。如需查看可用 see_image 工具并提供图片路径）\n' + fileTag);
      }
    }

    const messages = decision.messages.slice();

    // ① context 消息：source.kind !== 'user' → UI 渲染为折叠上下文行
    messages.push({
      id: 'vision-' + Date.now().toString(36) + '-' + Math.floor(Math.random() * 1e9).toString(36),
      role: 'user',
      content: [{ type: 'text', text: '【图片内容】\n' + parts.join('\n\n---\n\n') }],
      source: { kind: 'plugin', plugin: 'dsh-plugin-vision', form: 'snapshot' },
    });

    // ② 标记追加到最后一条用户消息 → 渲染层在用户气泡旁显示缩略图
    const claimed = Array.isArray(payload.messages) ? payload.messages : [];
    let userIdx = -1;
    for (let i = claimed.length - 1; i >= 0; i -= 1) {
      const m = claimed[i];
      if (m && m.role === 'user' && Array.isArray(m.content)) { userIdx = i; break; }
    }
    if (userIdx >= 0 && userIdx < messages.length) {
      const target = { ...messages[userIdx], content: messages[userIdx].content.slice() };
      for (const tag of fileTags) target.content.push({ type: 'text', text: tag });
      messages[userIdx] = target;
    }
    return { ...decision, messages };
  });
}

/**
 * GET /vision/image/<sessionId>/<file>：向浏览器提供附件图片。
 * 注意：webServer 的 prefix 匹配会自动拼接 "/"，注册路径必须【不带尾部斜杠】
 * （写成 '/vision/image/' 将永远匹配不上，请求会落到前端 SPA fallback 返回 index.html）。
 *
 * @param deps.resolvePolicyForSessionId(ctx, sessionId) 会话沙箱策略
 * @param deps.fs              DSH 文件服务（ctx.fs）
 * @param deps.MIME            扩展名 → MIME 映射（原版常量）
 */
export function registerImageRoute(ctx, ws, deps) {
  return ws.register({
    kind: 'prefix',
    path: '/vision/image',
    async handler(req, res) {
      if (req.method !== 'GET') {
        res.statusCode = 405;
        res.setHeader('Allow', 'GET');
        res.end();
        return;
      }
      try {
        const url = new URL(req.url, 'http://localhost');
        const rest = decodeURIComponent(url.pathname.slice('/vision/image'.length)).replace(/^\/+/, '');
        const slash = rest.indexOf('/');
        if (slash <= 0 || slash === rest.length - 1) throw new Error('路径格式错误');
        const sessionId = rest.slice(0, slash);
        const filename = rest.slice(slash + 1);
        // 允许中文文件名（如“联想截图_xxx.png”），只拒绝分隔符与路径穿越
        if (!filename || filename.indexOf('/') >= 0 || filename.indexOf('\\') >= 0 || filename.indexOf('..') >= 0) {
          throw new Error('非法文件名');
        }
        const policy = deps.resolvePolicyForSessionId(ctx, sessionId);
        const workspaceRoot = policy && policy.workspaceRoot ? policy.workspaceRoot : '.';
        const target = await deps.fs.resolve(workspaceRoot + '/.dsh-vision/uploads/' + filename);
        const bytes = await deps.fs.readBytes(target, undefined, 32 * 1024 * 1024);
        if (!bytes || bytes.length === 0) throw new Error('图片不存在或为空');
        const ext = filename.slice(filename.lastIndexOf('.') + 1).toLowerCase();
        res.statusCode = 200;
        res.setHeader('Content-Type', deps.MIME[ext] || 'application/octet-stream');
        res.setHeader('Cache-Control', 'no-store');
        res.end(Buffer.from(bytes));
      } catch (e) {
        res.statusCode = 404;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ error: (e && e.message) ? e.message : String(e) }));
      }
    },
  });
}

/** both 模式并行请求的临时文件路径（唯一后缀，避免并发写同一文件触发 EIO）。 */
export function requestFilePaths(dir, keyRef) {
  const uid = Date.now().toString(36) + '-' + Math.floor(Math.random() * 1e9).toString(36);
  return {
    uid,
    payloadPath: dir + '/payload-' + keyRef + '-' + uid + '.json',
    respPath: dir + '/resp-' + keyRef + '-' + uid + '.json',
    cfgPath: dir + '/curl-' + keyRef + '-' + uid + '.cfg',
  };
}

/** 限流关键词扩展：在原版基础上补智谱中文提示。 */
export function isRateLimitedExtended(message) {
  if (typeof message !== 'string') return false;
  return (
    message.indexOf('速率限制') >= 0 ||
    message.indexOf('控制请求频率') >= 0 ||
    message.indexOf('访问量过大') >= 0 ||
    message.indexOf('1305') >= 0 ||
    message.indexOf('429') >= 0 ||
    message.indexOf('rate') >= 0 ||
    message.indexOf('Rate') >= 0 ||
    message.indexOf('quota') >= 0 ||
    message.indexOf('Quota') >= 0
  );
}
