import assert from 'node:assert/strict'
import test from 'node:test'
import { mkdtemp, writeFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { apply, name } from '../preset/anchored-standard-ci/context-injector.mjs'

function register(cfg = {}) {
  const listeners = {}
  const hookOptions = {}
  const warns = []
  const ctx = {
    on(event, callback, options) {
      listeners[event] = callback
      hookOptions[event] = options
    },
    get() { return undefined },
    logger: { warn(message) { warns.push(message) } },
  }
  apply(ctx, cfg)
  return { listeners, hookOptions, warns }
}

const session = (events, cwd, id = 's') => ({ id, events, header: { cwd } })
const decision = () => ({ kind: 'enter', messages: [{ id: 'u', role: 'user', content: [{ type: 'text', text: 'hi' }], source: { kind: 'user' } }] })

/** Feed a durable-style event through the plugin's session/event listener. */
const feed = (listeners, sessionObj, type, data = {}, seq = 1) => {
  listeners['session/event'](sessionObj, { type, seq, data })
}

/** One pre-step call with the given turn; returns the decision messages count. */
const step = async (listeners, agent, turn = 1) => {
  const r = await listeners['agent/pre-step']({ ...agent, turn }, async () => decision())
  return r.messages.length
}

test('exports a diagnostic plugin name', () => {
  assert.equal(name, 'context-injector')
})

test('pre-promotion requests get NO injection', async () => {
  const { listeners } = register({ mode: 'turns', interval: 5 })
  const cwd = await mkdtemp(join(tmpdir(), 'ci-test-'))
  try {
    await writeFile(join(cwd, 'AGENTS.md'), 'rules', 'utf8')
    const d = decision()
    const r = await listeners['agent/pre-step']({ agent: { session: session([], cwd) } }, async () => d)
    assert.equal(r, d)
  } finally {
    await rm(cwd, { recursive: true, force: true })
  }
})

test('turns mode injects every 5 rounds (message-level counting)', async () => {
  const { listeners } = register({ mode: 'turns', interval: 5 })
  const cwd = await mkdtemp(join(tmpdir(), 'ci-test-'))
  const home = await mkdtemp(join(tmpdir(), 'ci-home-'))
  const prevHome = process.env.DSH_HOME
  process.env.DSH_HOME = home
  try {
    await writeFile(join(cwd, 'AGENTS.md'), 'rules', 'utf8')
    const sessionObj = session([{ type: 'assistant/message', seq: 1, data: {} }], cwd)
    const agent = { agent: { session: sessionObj } }
    // count=0: boundary hit -> inject (post-promotion first step).
    assert.equal(await step(listeners, agent), 2, 'count 0: inject')
    // count=1..4: no inject.
    feed(listeners, sessionObj, 'user/message', {}, 2)
    assert.equal(await step(listeners, agent), 1, 'count 1: no inject')
    feed(listeners, sessionObj, 'user/message', {}, 3)
    feed(listeners, sessionObj, 'assistant/message', { message: { content: [{ type: 'text', text: 'ok' }] } }, 4)
    feed(listeners, sessionObj, 'user/message', {}, 5)
    feed(listeners, sessionObj, 'assistant/message', { message: { content: [{ type: 'text', text: 'ok' }] } }, 6)
    assert.equal(await step(listeners, agent), 2, 'count 5: inject')
    feed(listeners, sessionObj, 'assistant/message', { message: { content: [{ type: 'text', text: 'ok' }] } }, 7)
    assert.equal(await step(listeners, agent), 1, 'count 6: no inject')
    // count 7..10 -> inject at 10.
    for (const seq of [8, 9]) {
      feed(listeners, sessionObj, 'user/message', {}, seq)
      feed(listeners, sessionObj, 'assistant/message', { message: { content: [{ type: 'text', text: 'ok' }] } }, seq + 100)
    }
    assert.equal(await step(listeners, agent), 2, 'count 10: inject')
  } finally {
    if (prevHome === undefined) delete process.env.DSH_HOME
    else process.env.DSH_HOME = prevHome
    await rm(cwd, { recursive: true, force: true })
    await rm(home, { recursive: true, force: true })
  }
})

test('tool-call assistant messages do NOT count as rounds', async () => {
  const { listeners } = register({ mode: 'turns', interval: 2 })
  const cwd = await mkdtemp(join(tmpdir(), 'ci-test-'))
  const home = await mkdtemp(join(tmpdir(), 'ci-home-'))
  const prevHome = process.env.DSH_HOME
  process.env.DSH_HOME = home
  try {
    await writeFile(join(cwd, 'AGENTS.md'), 'rules', 'utf8')
    const sessionObj = session([{ type: 'assistant/message', seq: 1, data: {} }], cwd)
    const agent = { agent: { session: sessionObj } }
    assert.equal(await step(listeners, agent), 2, 'count 0: inject')
    // A tool-call intermediate message must not advance the counter.
    feed(listeners, sessionObj, 'assistant/message', { message: { content: [{ type: 'tool-call', name: 'bash', arguments: '{}' }] } }, 2)
    assert.equal(await step(listeners, agent), 1, 'tool-call step: still count 0, no re-inject')
    feed(listeners, sessionObj, 'user/message', {}, 3)
    assert.equal(await step(listeners, agent), 1, 'count 1: no inject')
    feed(listeners, sessionObj, 'user/message', {}, 4)
    assert.equal(await step(listeners, agent), 2, 'count 2: inject')
  } finally {
    if (prevHome === undefined) delete process.env.DSH_HOME
    else process.env.DSH_HOME = prevHome
    await rm(cwd, { recursive: true, force: true })
    await rm(home, { recursive: true, force: true })
  }
})

test('compaction mode: once after promotion, then once per compaction', async () => {
  const { listeners } = register({ mode: 'compaction' })
  const cwd = await mkdtemp(join(tmpdir(), 'ci-test-'))
  const home = await mkdtemp(join(tmpdir(), 'ci-home-'))
  const prevHome = process.env.DSH_HOME
  process.env.DSH_HOME = home
  try {
    await writeFile(join(cwd, 'AGENTS.md'), 'rules', 'utf8')
    const sessionObj = session([{ type: 'assistant/message', seq: 1, data: {} }], cwd)
    const agent = { agent: { session: sessionObj } }
    assert.equal(await step(listeners, agent), 2, 'post-promotion: inject')
    assert.equal(await step(listeners, agent), 1, 'same epoch: no repeat')
    assert.equal(await step(listeners, agent), 1, 'same epoch: no repeat')
    // Compaction resets promotion + the injected marker.
    feed(listeners, sessionObj, 'compaction/end', {}, 2)
    feed(listeners, sessionObj, 'assistant/message', { message: { content: [{ type: 'text', text: 'ok' }] } }, 3)
    assert.equal(await step(listeners, agent), 2, 'post-compaction re-promotion: inject again')
    assert.equal(await step(listeners, agent), 1, 'second epoch: no repeat')
  } finally {
    if (prevHome === undefined) delete process.env.DSH_HOME
    else process.env.DSH_HOME = prevHome
    await rm(cwd, { recursive: true, force: true })
    await rm(home, { recursive: true, force: true })
  }
})

test('off mode never injects', async () => {
  const { listeners } = register({ mode: 'off' })
  const cwd = await mkdtemp(join(tmpdir(), 'ci-test-'))
  const home = await mkdtemp(join(tmpdir(), 'ci-home-'))
  const prevHome = process.env.DSH_HOME
  process.env.DSH_HOME = home
  try {
    await writeFile(join(cwd, 'AGENTS.md'), 'rules', 'utf8')
    const sessionObj = session([{ type: 'assistant/message', seq: 1, data: {} }], cwd)
    const agent = { agent: { session: sessionObj } }
    assert.equal(await step(listeners, agent), 1)
    assert.equal(await step(listeners, agent), 1)
  } finally {
    if (prevHome === undefined) delete process.env.DSH_HOME
    else process.env.DSH_HOME = prevHome
    await rm(cwd, { recursive: true, force: true })
    await rm(home, { recursive: true, force: true })
  }
})

test('override file: turns every 11 rounds', async () => {
  const { listeners } = register({ mode: 'turns', interval: 2 })
  const cwd = await mkdtemp(join(tmpdir(), 'ci-test-'))
  const home = await mkdtemp(join(tmpdir(), 'ci-home-'))
  const prevHome = process.env.DSH_HOME
  process.env.DSH_HOME = home
  try {
    await writeFile(join(cwd, 'AGENTS.md'), 'rules', 'utf8')
    await writeFile(join(home, '.context-injector.json'), JSON.stringify({ mode: 'turns', interval: 11 }), 'utf8')
    const sessionObj = session([{ type: 'assistant/message', seq: 1, data: {} }], cwd)
    const agent = { agent: { session: sessionObj } }
    assert.equal(await step(listeners, agent), 2, 'count 0: inject')
    for (let i = 1; i <= 10; i += 1) {
      feed(listeners, sessionObj, 'user/message', {}, 10 + i)
      assert.equal(await step(listeners, agent), 1, `count ${i}: no inject`)
    }
    feed(listeners, sessionObj, 'user/message', {}, 30)
    assert.equal(await step(listeners, agent), 2, 'count 11: inject')
  } finally {
    if (prevHome === undefined) delete process.env.DSH_HOME
    else process.env.DSH_HOME = prevHome
    await rm(cwd, { recursive: true, force: true })
    await rm(home, { recursive: true, force: true })
  }
})

test('override file: off disables injection entirely', async () => {
  const { listeners } = register({ mode: 'turns', interval: 1 })
  const cwd = await mkdtemp(join(tmpdir(), 'ci-test-'))
  const home = await mkdtemp(join(tmpdir(), 'ci-home-'))
  const prevHome = process.env.DSH_HOME
  process.env.DSH_HOME = home
  try {
    await writeFile(join(cwd, 'AGENTS.md'), 'rules', 'utf8')
    await writeFile(join(home, '.context-injector.json'), JSON.stringify({ mode: 'off' }), 'utf8')
    const sessionObj = session([{ type: 'assistant/message', seq: 1, data: {} }], cwd)
    const agent = { agent: { session: sessionObj } }
    assert.equal(await step(listeners, agent), 1)
    feed(listeners, sessionObj, 'user/message', {}, 2)
    assert.equal(await step(listeners, agent), 1)
  } finally {
    if (prevHome === undefined) delete process.env.DSH_HOME
    else process.env.DSH_HOME = prevHome
    await rm(cwd, { recursive: true, force: true })
    await rm(home, { recursive: true, force: true })
  }
})

test('override file: legacy { interval } maps to turns mode', async () => {
  const { listeners } = register({ mode: 'compaction' })
  const cwd = await mkdtemp(join(tmpdir(), 'ci-test-'))
  const home = await mkdtemp(join(tmpdir(), 'ci-home-'))
  const prevHome = process.env.DSH_HOME
  process.env.DSH_HOME = home
  try {
    await writeFile(join(cwd, 'AGENTS.md'), 'rules', 'utf8')
    await writeFile(join(home, '.context-injector.json'), JSON.stringify({ interval: 2 }), 'utf8')
    const sessionObj = session([{ type: 'assistant/message', seq: 1, data: {} }], cwd)
    const agent = { agent: { session: sessionObj } }
    assert.equal(await step(listeners, agent), 2, 'count 0: inject')
    feed(listeners, sessionObj, 'user/message', {}, 2)
    assert.equal(await step(listeners, agent), 1, 'count 1: no inject')
    feed(listeners, sessionObj, 'user/message', {}, 3)
    assert.equal(await step(listeners, agent), 2, 'count 2: inject')
  } finally {
    if (prevHome === undefined) delete process.env.DSH_HOME
    else process.env.DSH_HOME = prevHome
    await rm(cwd, { recursive: true, force: true })
    await rm(home, { recursive: true, force: true })
  }
})

test('invalid override file falls back to the config cadence', async () => {
  const { listeners } = register({ mode: 'turns', interval: 2 })
  const cwd = await mkdtemp(join(tmpdir(), 'ci-test-'))
  const home = await mkdtemp(join(tmpdir(), 'ci-home-'))
  const prevHome = process.env.DSH_HOME
  process.env.DSH_HOME = home
  try {
    await writeFile(join(cwd, 'AGENTS.md'), 'rules', 'utf8')
    await writeFile(join(home, '.context-injector.json'), '{ not json', 'utf8')
    const sessionObj = session([{ type: 'assistant/message', seq: 1, data: {} }], cwd)
    const agent = { agent: { session: sessionObj } }
    assert.equal(await step(listeners, agent), 2, 'count 0: inject (config interval 2)')
    feed(listeners, sessionObj, 'user/message', {}, 2)
    assert.equal(await step(listeners, agent), 1, 'count 1: no inject')
    feed(listeners, sessionObj, 'user/message', {}, 3)
    assert.equal(await step(listeners, agent), 2, 'count 2: inject')
  } finally {
    if (prevHome === undefined) delete process.env.DSH_HOME
    else process.env.DSH_HOME = prevHome
    await rm(cwd, { recursive: true, force: true })
    await rm(home, { recursive: true, force: true })
  }
})

test('compaction resets turns counters (cadence restarts after re-promotion)', async () => {
  const { listeners } = register({ mode: 'turns', interval: 3 })
  const cwd = await mkdtemp(join(tmpdir(), 'ci-test-'))
  const home = await mkdtemp(join(tmpdir(), 'ci-home-'))
  const prevHome = process.env.DSH_HOME
  process.env.DSH_HOME = home
  try {
    await writeFile(join(cwd, 'AGENTS.md'), 'rules', 'utf8')
    const sessionObj = session([{ type: 'assistant/message', seq: 1, data: {} }], cwd)
    const agent = { agent: { session: sessionObj } }
    assert.equal(await step(listeners, agent), 2, 'count 0: inject')
    feed(listeners, sessionObj, 'user/message', {}, 2)
    feed(listeners, sessionObj, 'user/message', {}, 3)
    feed(listeners, sessionObj, 'user/message', {}, 4)
    assert.equal(await step(listeners, agent), 2, 'count 3: inject before compaction')
    // Compaction resets promotion + counters; new promotion signal arrives.
    feed(listeners, sessionObj, 'compaction/end', {}, 5)
    feed(listeners, sessionObj, 'assistant/message', { message: { content: [{ type: 'text', text: 'ok' }] } }, 6)
    // The re-promotion assistant message counts as round 1 after the reset.
    assert.equal(await step(listeners, agent), 1, 'post-compaction count 1: no inject')
    feed(listeners, sessionObj, 'user/message', {}, 7)
    feed(listeners, sessionObj, 'assistant/message', { message: { content: [{ type: 'text', text: 'ok' }] } }, 8)
    assert.equal(await step(listeners, agent), 2, 'post-compaction count 3: inject')
  } finally {
    if (prevHome === undefined) delete process.env.DSH_HOME
    else process.env.DSH_HOME = prevHome
    await rm(cwd, { recursive: true, force: true })
    await rm(home, { recursive: true, force: true })
  }
})

test('no instruction files found -> no injection', async () => {
  const { listeners } = register({ mode: 'turns', interval: 1 })
  const cwd = await mkdtemp(join(tmpdir(), 'ci-empty-'))
  const home = await mkdtemp(join(tmpdir(), 'ci-home-empty-'))
  const prevHome = process.env.DSH_HOME
  process.env.DSH_HOME = home
  try {
    const d = decision()
    const result = await listeners['agent/pre-step'](
      { agent: { session: session([{ type: 'assistant/message', seq: 1, data: {} }], cwd) } },
      async () => d,
    )
    assert.equal(result, d)
  } finally {
    if (prevHome === undefined) delete process.env.DSH_HOME
    else process.env.DSH_HOME = prevHome
    await rm(cwd, { recursive: true, force: true })
    await rm(home, { recursive: true, force: true })
  }
})

test('content over maxBytes is truncated with a notice', async () => {
  const { listeners } = register({ mode: 'turns', interval: 1, maxBytes: 64, maxSourceBytes: 4096 })
  const cwd = await mkdtemp(join(tmpdir(), 'ci-test-'))
  const home = await mkdtemp(join(tmpdir(), 'ci-home-'))
  const prevHome = process.env.DSH_HOME
  process.env.DSH_HOME = home
  try {
    await writeFile(join(cwd, 'AGENTS.md'), 'x'.repeat(1000), 'utf8')
    const result = await listeners['agent/pre-step'](
      { agent: { session: session([{ type: 'assistant/message', seq: 1, data: {} }], cwd) } },
      async () => decision(),
    )
    assert.equal(result.messages.length, 2)
    const text = result.messages[1].content[0].text
    assert.ok(Buffer.byteLength(text, 'utf8') < 1000, 'bounded output (raw file was 1000 bytes)')
    assert.match(text, /truncated to fit the configured byte budget/)
  } finally {
    if (prevHome === undefined) delete process.env.DSH_HOME
    else process.env.DSH_HOME = prevHome
    await rm(cwd, { recursive: true, force: true })
    await rm(home, { recursive: true, force: true })
  }
})

test('user-global AGENTS.md is included when present', async () => {
  const { listeners } = register({ mode: 'turns', interval: 1 })
  const cwd = await mkdtemp(join(tmpdir(), 'ci-test-'))
  const home = await mkdtemp(join(tmpdir(), 'ci-home-'))
  const prevHome = process.env.DSH_HOME
  process.env.DSH_HOME = home
  try {
    await writeFile(join(home, 'AGENTS.md'), 'user-global: always use Chinese', 'utf8')
    const result = await listeners['agent/pre-step'](
      { agent: { session: session([{ type: 'assistant/message', seq: 1, data: {} }], cwd) } },
      async () => decision(),
    )
    assert.equal(result.messages.length, 2)
    assert.match(result.messages[1].content[0].text, /user-global: always use Chinese/)
  } finally {
    if (prevHome === undefined) delete process.env.DSH_HOME
    else process.env.DSH_HOME = prevHome
    await rm(cwd, { recursive: true, force: true })
    await rm(home, { recursive: true, force: true })
  }
})

test('invalid config values fail at apply time', () => {
  assert.throws(() => register({ mode: 'bogus' }), /mode/)
  assert.throws(() => register({ mode: 'turns', interval: 0 }), /interval/)
  assert.throws(() => register({ mode: 'turns', interval: 1.5 }), /interval/)
  assert.throws(() => register({ maxBytes: 0 }), /maxBytes/)
  assert.throws(() => register({ promoteOn: 'bogus' }), /promoteOn/)
})

test('the pre-step hook registers with prepend', () => {
  const { hookOptions } = register()
  assert.deepEqual(hookOptions['agent/pre-step'], { prepend: true })
})
