/**
 * dsh-plugin-vision —— 「图片随附消息」Client 端定制（可运行模块）
 * ====================================================================
 * 本模块是 dsh-plugin-vision（https://github.com/tdf1995/dsh-plugin-vision）
 * 之上的定制增量，包含：
 *
 *   1. VisionUserNode：接管 conversation.chat.node keyed 'user' 渲染器
 *      （priority -1 < 官方 0），把图片缩略图直接渲染在用户消息气泡旁；
 *   2. 粘贴/拖拽拦截：任何携带文件的拖拽都在捕获阶段被吞掉，
 *      避免 DSH 官方拖放提示层出现后无法关闭（界面卡死）；
 *   3. 输入框零标记：粘贴图片不向 draft 注入任何文字；
 *   4. 移除附件卡片时通知 host 丢弃待消费缓存。
 *
 * 组件使用 React.createElement（无 JSX），可直接合并进原版 lib/client.js。
 * ====================================================================
 */

/** 用户消息节点渲染器：官方气泡样式 + 附件缩略图 + 复制/分支 + 点击放大。 */
export function createVisionUserNode(React, S) {
  return function VisionUserNode(props) {
    const data = props.node && props.node.data;
    const content = data && Array.isArray(data.content) ? data.content : [];
    const preview = React.useState(null);
    const setPreview = preview[1];
    const texts = [];
    const files = [];

    // 从消息文本块中提取【vision-file:文件名】标记并从显示文本剔除
    for (let i = 0; i < content.length; i += 1) {
      const b = content[i];
      if (b && b.type === 'text' && typeof b.text === 'string') {
        const re = /【vision-file:([^】]+)】/g;
        let m;
        let clean = '';
        let last = 0;
        while ((m = re.exec(b.text)) !== null) {
          if (files.indexOf(m[1]) < 0) files.push(m[1]);
          clean += b.text.slice(last, m.index);
          last = m.index + m[0].length;
        }
        clean += b.text.slice(last);
        texts.push(clean);
      }
    }
    const text = texts.join('');
    const sessionId = props.sessionId;
    const time = data && data.time;
    const seq = (data && typeof data.seq === 'number') ? data.seq : (props.node ? props.node.anchorSeq : undefined);
    const forkAt = props.forkAt;

    const copyText = () => {
      try {
        if (typeof navigator !== 'undefined' && navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(text).catch(() => { /* best effort */ });
        }
      } catch (e) { /* best effort */ }
    };

    let timeLabel = '';
    if (time !== undefined) {
      try { timeLabel = new Date(time).toLocaleString(); } catch (e) { timeLabel = ''; }
    }

    return React.createElement('div', { style: S.userRow, 'data-time-hover-root': true, title: timeLabel || undefined },
      React.createElement('div', { style: S.userStack },
        files.length > 0
          ? React.createElement('div', { style: S.attachRow },
              files.map((f, idx) => {
                const src = '/vision/image/' + encodeURIComponent(sessionId || '') + '/' + encodeURIComponent(f);
                return React.createElement('img', {
                  key: idx,
                  src,
                  alt: f,
                  title: f,
                  style: S.attachImg,
                  onClick: () => setPreview({ src, name: f }),
                });
              })
            )
          : null,
        React.createElement('div', { style: S.userBubble },
          React.createElement('span', { style: { whiteSpace: 'pre-wrap' } }, text)
        )
      ),
      React.createElement('div', { style: S.userActions },
        React.createElement('button', { type: 'button', style: S.userActionBtn, title: '复制消息', onClick: copyText }, '⧉'),
        typeof forkAt === 'function' && seq !== undefined
          ? React.createElement('button', { type: 'button', style: S.userActionBtn, title: '从此处分支', onClick: () => forkAt(seq) }, '⑂')
          : null
      ),
      preview[0]
        ? React.createElement('div', { style: S.previewOverlay, onClick: () => setPreview(null) },
            React.createElement('img', { src: preview[0].src, alt: preview[0].name, style: S.previewImg })
          )
        : null
    );
  };
}

/** 注册 user 渲染器接管（priority -1 低于官方 0，按 priority 升序先被选中）。 */
export function registerUserNode(slots, React, S) {
  const VisionUserNode = createVisionUserNode(React, S);
  slots.inject('conversation.chat.node', () => slots.register(
    { name: 'conversation.chat.node', key: 'user', priority: -1 },
    (props) => React.createElement(VisionUserNode, Object.assign({}, props))
  ));
}

/**
 * 全局粘贴/拖拽拦截（在 VisionDock 组件的 useEffect 中挂载）：
 * - 任何携带文件的拖拽事件都在 window 捕获阶段被 preventDefault + stopPropagation，
 *   官方 DSH 在 document 冒泡阶段监听的拖放提示层因此不会出现，也不会卡死；
 * - 图片类型的粘贴/拖入交给 handleFile 处理。
 */
export function installGlobalDragListeners(handleFile) {
  function hasFiles(e) {
    const dt = e.dataTransfer;
    if (!dt || !dt.types) return false;
    for (let i = 0; i < dt.types.length; i += 1) {
      if (dt.types[i] === 'Files') return true;
    }
    return false;
  }
  function onDragEnter(e) { if (hasFiles(e)) { e.preventDefault(); e.stopPropagation(); } }
  function onDragOver(e) { if (hasFiles(e)) { e.preventDefault(); e.stopPropagation(); } }
  function onDragLeave(e) { if (hasFiles(e)) e.stopPropagation(); }
  function onDrop(e) {
    const files = e.dataTransfer && e.dataTransfer.files;
    if (!files || files.length === 0) return;
    e.preventDefault(); e.stopPropagation();
    for (let i = 0; i < files.length; i += 1) {
      const f = files[i];
      if (f && f.type && f.type.toLowerCase().indexOf('image/') === 0) handleFile(f);
    }
  }
  function onPaste(e) {
    const items = e.clipboardData && e.clipboardData.items;
    if (!items) return;
    for (let i = 0; i < items.length; i += 1) {
      const it = items[i];
      if (it && it.kind === 'file' && it.type && it.type.toLowerCase().indexOf('image/') === 0) {
        const f = it.getAsFile();
        if (f) { e.preventDefault(); e.stopPropagation(); handleFile(f); return; }
      }
    }
  }
  window.addEventListener('dragenter', onDragEnter, true);
  window.addEventListener('dragover', onDragOver, true);
  window.addEventListener('dragleave', onDragLeave, true);
  window.addEventListener('drop', onDrop, true);
  window.addEventListener('paste', onPaste, true);
  return () => {
    window.removeEventListener('dragenter', onDragEnter, true);
    window.removeEventListener('dragover', onDragOver, true);
    window.removeEventListener('dragleave', onDragLeave, true);
    window.removeEventListener('drop', onDrop, true);
    window.removeEventListener('paste', onPaste, true);
  };
}

/** 定制 UI 样式（主题 token 驱动，明暗模式自适应）。 */
export const customStyles = {
  attachRow: {
    display: 'flex', alignItems: 'flex-end', gap: 8, flexWrap: 'wrap',
    padding: '2px 0', justifyContent: 'flex-end',
  },
  attachImg: {
    maxWidth: 180, maxHeight: 180, borderRadius: 10,
    border: '1px solid var(--dsw-alias-border-l1)', objectFit: 'cover', display: 'block',
    cursor: 'zoom-in',
  },
  previewOverlay: {
    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
    background: 'rgba(0, 0, 0, 0.78)', display: 'flex',
    alignItems: 'center', justifyContent: 'center', zIndex: 9999,
    cursor: 'zoom-out',
  },
  previewImg: {
    maxWidth: '92vw', maxHeight: '92vh', borderRadius: 8,
    boxShadow: '0 8px 40px rgba(0, 0, 0, 0.5)',
  },
  userRow: { flexDirection: 'column', alignItems: 'flex-end', gap: 6, display: 'flex' },
  userStack: {
    flexDirection: 'column', alignItems: 'flex-end', gap: 8,
    minWidth: 0, maxWidth: 'min(525px, 82%)', display: 'flex',
  },
  userBubble: {
    background: 'var(--dsw-specific-bubble)', maxWidth: '100%',
    color: 'var(--dsw-alias-label-primary)', borderRadius: 22,
    padding: '10px 16px', fontSize: 16, lineHeight: '24px',
    whiteSpace: 'pre-wrap', wordBreak: 'break-word',
  },
  userActions: { display: 'flex', gap: 2, padding: '0 4px' },
  userActionBtn: {
    border: 'none', background: 'transparent',
    color: 'var(--dsw-alias-label-secondary)', cursor: 'pointer',
    fontSize: 13, padding: '2px 6px', borderRadius: 6, lineHeight: 1,
  },
};
