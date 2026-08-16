/**
 * context-injector — periodic workspace-instruction injection for the
 * "（上下文注入）" anchored variant.
 *
 * WHY: the anchored bootstrap keeps request #1 on the Minimal tool pair with
 * NO auto-injected context (both `agent-instructions` and `skill-catalog` are
 * stripped pre-promotion). After promotion the model should keep seeing the
 * workspace/user instruction files on a policy-controlled cadence, so
 * language and workflow rules (e.g. Chinese reasoning + a plan-approval
 * policy) keep reaching the model without giving up the first-request anchor.
 *
 * Injection cadence — one of five modes:
 *   mode: 'turns'      — inject every `interval` ROUNDS. One round = one user
 *                        instruction OR one model text reply (user/message and
 *                        tool-call-free assistant/message events); tool-call
 *                        intermediate messages do NOT count.
 *   mode: 'compaction' — inject once right after promotion, then re-inject
 *                        once after every `compaction/end` (the context
 *                        rewrite), i.e. roughly once per compaction cycle.
 *   mode: 'off'        — never inject.
 *
 * Behavior:
 *  - Pre-promotion requests get NOTHING (matches the anchored bootstrap).
 *  - The injected user message contains the bounded content of the found
 *    instruction files:
 *      - user-global: `$DSH_HOME/AGENTS.md`
 *      - project chain: AGENTS.md / CLAUDE.md / AGENTS.local.md /
 *        CLAUDE.local.md walking up from the session cwd to the project root
 *        (a directory containing `.git`, or the cwd itself).
 *  - `compaction/end` resets the per-session counters so the cadence
 *    restarts after a context rewrite.
 *  - A user override file `$DSH_HOME/.context-injector.json` is re-read
 *    before every injection and overrides the config. Formats:
 *      { "mode": "turns", "interval": 5 }   every 5 rounds
 *      { "mode": "compaction" }             after promotion, then per compaction
 *      { "mode": "off" }                    disabled
 *      legacy: { "interval": N }            turns mode, every N rounds (0 = off)
 *    An invalid file falls back to the config.
 *  - A missing fs seam, unreadable file, or any plugin error degrades to no
 *    injection (never throws).
 *
 * ROW ORDER: registered with `prepend: true` and after `tool-bootstrap`, so
 * it runs inside the bootstrap's outermost strip — but it only injects AFTER
 * promotion, when the strip is inactive. Its source kind is
 * `context-injection`, which is NOT in `suppressedContextSources`, so it is
 * never stripped.
 */

import { createEpochPromotion } from './compaction-epoch.mjs'
import { readFile, stat } from 'node:fs/promises'

/** Cordis plugin name used by loader diagnostics. */
export const name = 'context-injector'

/** Durable session event types that count as a promotion signal per mode. */
const PROMOTE_EVENTS = {
  'tool-call': ['tool/call'],
  'assistant-message': ['assistant/message'],
  either: ['tool/call', 'assistant/message'],
}

/** Candidate file names, in probe order, for the project chain and user-global. */
const PROJECT_CANDIDATES = ['AGENTS.md', 'CLAUDE.md', 'AGENTS.local.md', 'CLAUDE.local.md']
const USER_GLOBAL_CANDIDATE = 'AGENTS.md'

const DEFAULT_MAX_BYTES = 4096

/** Valid injection modes. */
const MODES = new Set(['turns', 'compaction', 'off'])

function parsePromoteOn(value) {
  if (value === undefined || value === 'either') return PROMOTE_EVENTS.either
  if (value === 'tool-call' || value === 'assistant-message') return PROMOTE_EVENTS[value]
  throw new TypeError(`${name}: promoteOn must be one of "tool-call", "assistant-message", "either"; got ${JSON.stringify(value)}`)
}

function parseInterval(value) {
  if (value === undefined) return 1
  if (typeof value !== 'number' || !Number.isInteger(value) || value < 1 || value > 100) {
    throw new TypeError(`${name}: interval must be an integer 1..100; got ${JSON.stringify(value)}`)
  }
  return value
}

function parseMode(value) {
  if (value === undefined) return 'turns'
  if (typeof value !== 'string' || !MODES.has(value)) {
    throw new TypeError(`${name}: mode must be one of "turns", "compaction", "off"; got ${JSON.stringify(value)}`)
  }
  return value
}

function parseMaxBytes(value) {
  if (value === undefined) return DEFAULT_MAX_BYTES
  if (typeof value !== 'number' || !Number.isInteger(value) || value < 1) {
    throw new TypeError(`${name}: maxBytes must be a positive integer; got ${JSON.stringify(value)}`)
  }
  return value
}

/** Join one path segment onto a directory (platform-agnostic string join). */
function joinPath(dir, segment) {
  if (dir.endsWith('/') || dir.endsWith('\\')) return dir + segment
  const sep = dir.includes('\\') ? '\\' : '/'
  return dir + sep + segment
}

/** Parent of an absolute Windows or POSIX path. */
function parentPath(path) {
  const idx = Math.max(path.lastIndexOf('/'), path.lastIndexOf('\\'))
  if (idx <= 0) return path
  const parent = path.slice(0, idx)
  return parent.length === 0 ? path : parent
}

/** Find the project root: first ancestor containing any root marker (e.g. .git). */
async function findProjectRoot(cwd, signal) {
  let current = cwd
  for (;;) {
    for (const marker of ['.git', '.hg', '.svn']) {
      try {
        await stat(joinPath(current, marker), { signal })
        return current
      } catch {
        // Probe failure = marker absent; continue.
      }
    }
    const parent = parentPath(current)
    if (parent === current || parent.length === 0) return cwd
    current = parent
  }
}

/** Read the bounded content of one file, or undefined when unreadable/over maxSourceBytes. */
async function readBoundedFile(filePath, maxSourceBytes, signal) {
  try {
    const info = await stat(filePath, { signal })
    if (!info.isFile() || info.size > maxSourceBytes) return undefined
    return { path: filePath, content: await readFile(filePath, { encoding: 'utf8', signal }) }
  } catch {
    return undefined
  }
}

/** Read bounded content from all present candidates in one directory. */
async function presentInDir(dir, candidates, maxSourceBytes, signal) {
  const found = []
  for (const candidate of candidates) {
    const file = await readBoundedFile(joinPath(dir, candidate), maxSourceBytes, signal)
    if (file !== undefined) found.push(file)
  }
  return found
}

/**
 * Read the user's cadence override from `$DSH_HOME/.context-injector.json`
 * (written by the in-UI frequency picker). Re-read before every injection, so
 * a change applies to the next request without a restart. Returns an owned
 * `{ mode, interval? }` object, or undefined when the file is missing/invalid
 * (caller falls back to the config). Legacy `{ interval: N }` files map to
 * turns mode (0 = off).
 */
async function readConfigOverride() {
  const dshHome = process.env.DSH_HOME ?? (process.env.USERPROFILE ? `${process.env.USERPROFILE}\\.dsh` : undefined)
  if (dshHome === undefined) return undefined
  try {
    const raw = await readFile(joinPath(dshHome, '.context-injector.json'), { encoding: 'utf8' })
    const parsed = JSON.parse(raw)
    if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) return undefined
    const interval = parsed.interval
    const mode = parsed.mode
    if (typeof mode === 'string' && MODES.has(mode)) {
      if (mode === 'turns') {
        if (typeof interval !== 'number' || !Number.isInteger(interval) || interval < 1 || interval > 100) return undefined
        return { mode, interval }
      }
      return { mode }
    }
    // Legacy: { interval } with no mode. interval 0 = off.
    if (typeof interval === 'number' && Number.isInteger(interval)) {
      if (interval === 0) return { mode: 'off' }
      if (interval >= 1 && interval <= 100) return { mode: 'turns', interval }
    }
    return undefined
  } catch {
    return undefined
  }
}

/** Whether an assistant/message event carries tool-call blocks (intermediate step, not a reply). */
function hasToolCallBlock(event) {
  const msg = event && event.data && event.data.message
  const content = msg && Array.isArray(msg.content) ? msg.content : []
  return content.some((block) => block !== null && typeof block === 'object' && block.type === 'tool-call')
}

/** Register the periodic post-promotion context injector. */
export function apply(ctx, config) {
  const promoteEvents = parsePromoteOn(config.promoteOn)
  const configMode = parseMode(config.mode)
  const configInterval = parseInterval(config.interval)
  const maxBytes = parseMaxBytes(config.maxBytes)
  const maxSourceBytes = parseMaxBytes(config.maxSourceBytes) // same positive check, sized per file
  const promotion = createEpochPromotion(promoteEvents)

  /** sessionId -> { count, injected, lastInjectedCount } (per session, in-memory). */
  const state = new Map()

  ctx.on('session/event', (session, event) => {
    promotion.observe(session, event)
    if (session === undefined || session.id === undefined) return
    let entry = state.get(session.id)
    if (entry === undefined) {
      entry = { count: 0, injected: false, lastInjectedCount: -1 }
      state.set(session.id, entry)
    }
    // One round = one user instruction OR one model text reply. Tool-call
    // intermediate messages do not count. Compaction restarts the cadence.
    if (event.type === 'user/message') {
      entry.count += 1
    } else if (event.type === 'assistant/message') {
      if (!hasToolCallBlock(event)) entry.count += 1
    } else if (event.type === 'compaction/end') {
      entry.count = 0
      entry.injected = false
      entry.lastInjectedCount = -1
    }
  })

  let warned = false
  const warnOnce = (message) => {
    if (warned) return
    warned = true
    try {
      ctx.logger.warn(message)
    } catch {
      // Logger unavailable — the guard exists only to avoid spamming.
    }
  }

  ctx.on('agent/pre-step', async ({ agent, signal }, next) => {
    const decision = await next()
    try {
      if (promotion.status(agent).promoted !== true) return decision
      const session = agent.session
      if (session === undefined) return decision

      // Cadence override from the in-UI picker (re-read per step).
      const override = await readConfigOverride()
      const mode = override === undefined ? configMode : override.mode
      const interval = override === undefined ? configInterval : (override.interval ?? configInterval)
      if (mode === 'off') return decision

      const entry = state.get(session.id) ?? { count: 0, injected: false, lastInjectedCount: -1 }
      state.set(session.id, entry)

      if (mode === 'compaction') {
        // Inject once per epoch: right after promotion, and again after every
        // compaction/end (the marker is reset there).
        if (entry.injected) return decision
        entry.injected = true
      } else {
        // turns mode: inject when the message round counter crosses the
        // interval boundary; never twice for the same count.
        if (entry.count % interval !== 0) return decision
        if (entry.lastInjectedCount === entry.count) return decision
        entry.lastInjectedCount = entry.count
      }

      const cwd = session.header.cwd ?? process.cwd()
      const sections = []
      const root = await findProjectRoot(cwd, signal)

      const projectFiles = await presentInDir(root, PROJECT_CANDIDATES, maxSourceBytes, signal)
      for (const file of projectFiles) {
        sections.push(`Instructions from: ${file.path}\n\n${file.content}`)
      }

      const dshHome = process.env.DSH_HOME ?? (process.env.USERPROFILE ? `${process.env.USERPROFILE}\\.dsh` : undefined)
      if (dshHome !== undefined) {
        const userGlobal = await readBoundedFile(joinPath(dshHome, USER_GLOBAL_CANDIDATE), maxSourceBytes, signal)
        if (userGlobal !== undefined) {
          sections.push(`Instructions from: ${userGlobal.path}\n\n${userGlobal.content}`)
        }
      }

      if (sections.length === 0) return decision

      let text = sections.join('\n\n')
      const truncated = Buffer.byteLength(text, 'utf8') > maxBytes
      if (truncated) text = Buffer.from(text, 'utf8').subarray(0, maxBytes).toString('utf8')

      const body = [
        '<system-reminder>',
        'The following workspace instructions are injected per session policy. Follow them unless more specific system or direct user instructions override them.',
        '',
        text,
        truncated ? '\n[Context injection truncated to fit the configured byte budget.]' : '',
        '</system-reminder>',
      ].filter(Boolean).join('\n')

      return {
        ...decision,
        messages: [...decision.messages, {
          id: `context-injection-${session.id}-${entry.count}`,
          role: 'user',
          content: [{ type: 'text', text: body }],
          source: { kind: 'context-injection', form: 'policy' },
        }],
      }
    } catch (error) {
      // An injection bug must never hurt the session: skip the injection.
      warnOnce(`${name}: injection failed, skipping: ${String((error && error.message) || error)}`)
      return decision
    }
  }, { prepend: true })
}
