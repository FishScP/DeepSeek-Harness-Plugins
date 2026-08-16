/**
 * context-injector — periodic workspace-instruction injection for the
 * "（上下文注入）" anchored variant.
 *
 * WHY: the anchored bootstrap keeps request #1 on the Minimal tool pair with
 * NO auto-injected context (both `agent-instructions` and `skill-catalog` are
 * stripped pre-promotion). After promotion the model should keep seeing the
 * workspace/user instruction files on a policy-controlled cadence — every
 * request (`interval: 1`, the default) or every N requests — so language and
 * workflow rules (e.g. Chinese reasoning + a plan-approval policy) keep
 * reaching the model without giving up the first-request anchor.
 *
 * Difference from instruction-hint: this plugin injects the FILES' CONTENT
 * (bounded by maxBytes), not a one-shot "these files exist" hint, and it
 * re-injects periodically instead of once per session/epoch.
 *
 * Behavior:
 *  - Pre-promotion requests get NOTHING (matches the anchored bootstrap).
 *  - After promotion, injection follows the configured cadence counted in
 *    CONVERSATION TURNS, not model steps: `interval: 1` injects once per
 *    user turn (multi-step tool chains inside one turn inject at most once),
 *    `2` every other turn, `3` every third, `4` every fourth, `0` disables.
 *    When the pre-step payload carries no `turn` (unexpected), counting falls
 *    back to per-step so the plugin never stalls.
 *  - The injected user message contains the bounded content of the found
 *    instruction files:
 *      - user-global: `$DSH_HOME/AGENTS.md`
 *      - project chain: AGENTS.md / CLAUDE.md / AGENTS.local.md /
 *        CLAUDE.local.md walking up from the session cwd to the project root
 *        (a directory containing `.git`, or the cwd itself).
 *  - `compaction/end` resets the per-session counters so the cadence
 *    restarts after a context rewrite.
 *  - A user override file `$DSH_HOME/.context-injector.json` ({ "interval": N },
 *    N = 1 every turn, 2 every other turn, … 0 disables injection) is re-read
 *    before every injection and overrides the config `interval`, so the
 *    in-UI frequency picker takes effect on the next request.
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
import { join } from 'node:path'

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

function parsePromoteOn(value) {
  if (value === undefined || value === 'either') return PROMOTE_EVENTS.either
  if (value === 'tool-call' || value === 'assistant-message') return PROMOTE_EVENTS[value]
  throw new TypeError(`${name}: promoteOn must be one of "tool-call", "assistant-message", "either"; got ${JSON.stringify(value)}`)
}

function parseInterval(value) {
  if (value === undefined) return 1
  if (typeof value !== 'number' || !Number.isInteger(value) || value < 1) {
    throw new TypeError(`${name}: interval must be a positive integer; got ${JSON.stringify(value)}`)
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

/**
 * Read the user's cadence override from `$DSH_HOME/.context-injector.json`
 * (written by the in-UI frequency picker). The override is re-read before
 * every injection, so a change applies to the next request without a restart.
 * Returns a non-negative integer (`0` disables injection) or undefined when
 * the file is missing or invalid (caller falls back to the config value).
 */
async function readIntervalOverride() {
  const dshHome = process.env.DSH_HOME ?? (process.env.USERPROFILE ? `${process.env.USERPROFILE}\\.dsh` : undefined)
  if (dshHome === undefined) return undefined
  try {
    const raw = await readFile(joinPath(dshHome, '.context-injector.json'), { encoding: 'utf8' })
    const parsed = JSON.parse(raw)
    if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) return undefined
    const value = parsed.interval
    if (typeof value !== 'number' || !Number.isInteger(value) || value < 0 || value > 10) return undefined
    return value
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

/** Register the periodic post-promotion context injector. */
export function apply(ctx, config) {
  const promoteEvents = parsePromoteOn(config.promoteOn)
  const interval = parseInterval(config.interval)
  const maxBytes = parseMaxBytes(config.maxBytes)
  const maxSourceBytes = parseMaxBytes(config.maxSourceBytes) // same positive check, sized per file
  const promotion = createEpochPromotion(promoteEvents)

  /** sessionId -> { count, lastTurn, lastInjectedTurn } — turn counters (per session, in-memory). */
  const state = new Map()

  ctx.on('session/event', (session, event) => {
    promotion.observe(session, event)
    // A compaction rewrites the model-visible surface: restart the injection
    // cadence so the next request after re-promotion injects fresh.
    if (event.type === 'compaction/end') {
      state.set(session.id, { count: 0, lastTurn: undefined, lastInjectedTurn: undefined })
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

  ctx.on('agent/pre-step', async ({ agent, signal, turn }, next) => {
    const decision = await next()
    try {
      if (promotion.status(agent).promoted !== true) return decision
      const session = agent.session
      if (session === undefined) return decision

      // Cadence override from the in-UI frequency picker (re-read per step).
      const override = await readIntervalOverride()
      if (override === 0) return decision
      const effectiveInterval = override ?? interval

      // Count in CONVERSATION TURNS: the counter advances only when `turn`
      // changes, so a multi-step tool chain inside one turn counts once and
      // injects at most once. Without a `turn` in the payload, fall back to
      // per-step counting so the cadence never stalls.
      const entry = state.get(session.id) ?? { count: 0, lastTurn: undefined, lastInjectedTurn: undefined }
      const perTurn = typeof turn === 'number'
      if (!perTurn || entry.lastTurn !== turn) {
        entry.count += 1
        if (perTurn) entry.lastTurn = turn
      }
      state.set(session.id, entry)
      if (perTurn && entry.lastInjectedTurn === turn) return decision
      if (entry.count % effectiveInterval !== 0) return decision
      if (perTurn) entry.lastInjectedTurn = turn

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