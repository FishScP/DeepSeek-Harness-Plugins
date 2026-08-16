import assert from 'node:assert/strict'
import test from 'node:test'
import { mkdtemp, writeFile, mkdir, rm } from 'node:fs/promises'
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

test('exports a diagnostic plugin name', () => {
  assert.equal(name, 'context-injector')
})

test('pre-promotion requests get NO injection', async () => {
  const { listeners } = register({ interval: 1 })
  const cwd = await mkdtemp(join(tmpdir(), 'ci-test-'))
  try {
    await writeFile(join(cwd, 'AGENTS.md'), 'rules: think in Chinese', 'utf8')
    const d = decision()
    const result = await listeners['agent/pre-step'](
      { agent: { session: session([], cwd) } },
      async () => d,
    )
    assert.equal(result, d)
  } finally {
    await rm(cwd, { recursive: true, force: true })
  }
})

test('interval=1 injects on EVERY post-promotion step', async () => {
  const { listeners } = register({ interval: 1, maxBytes: 4096 })
  const cwd = await mkdtemp(join(tmpdir(), 'ci-test-'))
  const home = await mkdtemp(join(tmpdir(), 'ci-home-'))
  const prevHome = process.env.DSH_HOME
  process.env.DSH_HOME = home
  try {
    await writeFile(join(cwd, 'AGENTS.md'), 'rules: always report a plan first', 'utf8')
    const agent = { session: session([{ type: 'assistant/message', seq: 1, data: {} }], cwd) }
    const first = await listeners['agent/pre-step']({ agent }, async () => decision())
    const second = await listeners['agent/pre-step']({ agent }, async () => decision())
    const third = await listeners['agent/pre-step']({ agent }, async () => decision())
    assert.equal(first.messages.length, 2)
    assert.equal(second.messages.length, 2)
    assert.equal(third.messages.length, 2)
    for (const r of [first, second, third]) {
      const inj = r.messages[1]
      assert.equal(inj.source.kind, 'context-injection')
      assert.match(inj.content[0].text, /always report a plan first/)
      assert.match(inj.content[0].text, /<system-reminder>/)
    }
  } finally {
    if (prevHome === undefined) delete process.env.DSH_HOME
    else process.env.DSH_HOME = prevHome
    await rm(cwd, { recursive: true, force: true })
    await rm(home, { recursive: true, force: true })
  }
})

test('interval=2 injects on every second step', async () => {
  const { listeners } = register({ interval: 2 })
  const cwd = await mkdtemp(join(tmpdir(), 'ci-test-'))
  const home = await mkdtemp(join(tmpdir(), 'ci-home-'))
  const prevHome = process.env.DSH_HOME
  process.env.DSH_HOME = home
  try {
    await writeFile(join(cwd, 'AGENTS.md'), 'workflow rules here', 'utf8')
    const agent = { agent: { session: session([{ type: 'assistant/message', seq: 1, data: {} }], cwd) } }
    const p1 = await listeners['agent/pre-step'](agent, async () => decision())
    const p2 = await listeners['agent/pre-step'](agent, async () => decision())
    const p3 = await listeners['agent/pre-step'](agent, async () => decision())
    const p4 = await listeners['agent/pre-step'](agent, async () => decision())
    assert.equal(p1.messages.length, 1, 'step 1: no injection')
    assert.equal(p2.messages.length, 2, 'step 2: injection')
    assert.equal(p3.messages.length, 1, 'step 3: no injection')
    assert.equal(p4.messages.length, 2, 'step 4: injection')
  } finally {
    if (prevHome === undefined) delete process.env.DSH_HOME
    else process.env.DSH_HOME = prevHome
    await rm(cwd, { recursive: true, force: true })
    await rm(home, { recursive: true, force: true })
  }
})

test('compaction/end resets the injection cadence', async () => {
  const { listeners } = register({ interval: 2 })
  const cwd = await mkdtemp(join(tmpdir(), 'ci-test-'))
  const home = await mkdtemp(join(tmpdir(), 'ci-home-'))
  const prevHome = process.env.DSH_HOME
  process.env.DSH_HOME = home
  try {
    await writeFile(join(cwd, 'AGENTS.md'), 'persistent rules', 'utf8')
    const sessionObj = session([{ type: 'assistant/message', seq: 1, data: {} }], cwd)
    const agent = { agent: { session: sessionObj } }
    // step 1: count=1, interval 2 -> no injection
    const p1 = await listeners['agent/pre-step'](agent, async () => decision())
    assert.equal(p1.messages.length, 1)
    // compaction resets promotion + counter
    listeners['session/event'](sessionObj, { type: 'compaction/end', seq: 2, data: {} })
    listeners['session/event'](sessionObj, { type: 'assistant/message', seq: 3, data: {} })
    // step 2 (post-compaction): count restarted at 1 -> no injection (would inject
    // at count 2 without the reset)
    const p2 = await listeners['agent/pre-step'](agent, async () => decision())
    assert.equal(p2.messages.length, 1)
    // step 3: count=2 -> injection
    const p3 = await listeners['agent/pre-step'](agent, async () => decision())
    assert.equal(p3.messages.length, 2)
  } finally {
    if (prevHome === undefined) delete process.env.DSH_HOME
    else process.env.DSH_HOME = prevHome
    await rm(cwd, { recursive: true, force: true })
    await rm(home, { recursive: true, force: true })
  }
})

test('no instruction files found -> no injection', async () => {
  const { listeners } = register({ interval: 1 })
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
  const { listeners } = register({ interval: 1, maxBytes: 64, maxSourceBytes: 4096 })
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
  const { listeners } = register({ interval: 1 })
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
  assert.throws(() => register({ interval: 0 }), /interval/)
  assert.throws(() => register({ interval: 1.5 }), /interval/)
  assert.throws(() => register({ maxBytes: 0 }), /maxBytes/)
  assert.throws(() => register({ promoteOn: 'bogus' }), /promoteOn/)
})

test('the pre-step hook registers with prepend', () => {
  const { hookOptions } = register()
  assert.deepEqual(hookOptions['agent/pre-step'], { prepend: true })
})

test('override file interval replaces the config cadence', async () => {
  const { listeners } = register({ interval: 1 })
  const cwd = await mkdtemp(join(tmpdir(), 'ci-test-'))
  const home = await mkdtemp(join(tmpdir(), 'ci-home-'))
  const prevHome = process.env.DSH_HOME
  process.env.DSH_HOME = home
  try {
    await writeFile(join(cwd, 'AGENTS.md'), 'rules', 'utf8')
    await writeFile(join(home, '.context-injector.json'), JSON.stringify({ interval: 3 }), 'utf8')
    const agent = { agent: { session: session([{ type: 'assistant/message', seq: 1, data: {} }], cwd) } }
    const p1 = await listeners['agent/pre-step'](agent, async () => decision())
    const p2 = await listeners['agent/pre-step'](agent, async () => decision())
    const p3 = await listeners['agent/pre-step'](agent, async () => decision())
    assert.equal(p1.messages.length, 1, 'override 3: step 1 no injection')
    assert.equal(p2.messages.length, 1, 'override 3: step 2 no injection')
    assert.equal(p3.messages.length, 2, 'override 3: step 3 injection')
  } finally {
    if (prevHome === undefined) delete process.env.DSH_HOME
    else process.env.DSH_HOME = prevHome
    await rm(cwd, { recursive: true, force: true })
    await rm(home, { recursive: true, force: true })
  }
})

test('override interval 0 disables injection entirely', async () => {
  const { listeners } = register({ interval: 1 })
  const cwd = await mkdtemp(join(tmpdir(), 'ci-test-'))
  const home = await mkdtemp(join(tmpdir(), 'ci-home-'))
  const prevHome = process.env.DSH_HOME
  process.env.DSH_HOME = home
  try {
    await writeFile(join(cwd, 'AGENTS.md'), 'rules', 'utf8')
    await writeFile(join(home, '.context-injector.json'), JSON.stringify({ interval: 0 }), 'utf8')
    const agent = { agent: { session: session([{ type: 'assistant/message', seq: 1, data: {} }], cwd) } }
    const p1 = await listeners['agent/pre-step'](agent, async () => decision())
    const p2 = await listeners['agent/pre-step'](agent, async () => decision())
    assert.equal(p1.messages.length, 1)
    assert.equal(p2.messages.length, 1)
  } finally {
    if (prevHome === undefined) delete process.env.DSH_HOME
    else process.env.DSH_HOME = prevHome
    await rm(cwd, { recursive: true, force: true })
    await rm(home, { recursive: true, force: true })
  }
})

test('invalid override file falls back to the config cadence', async () => {
  const { listeners } = register({ interval: 2 })
  const cwd = await mkdtemp(join(tmpdir(), 'ci-test-'))
  const home = await mkdtemp(join(tmpdir(), 'ci-home-'))
  const prevHome = process.env.DSH_HOME
  process.env.DSH_HOME = home
  try {
    await writeFile(join(cwd, 'AGENTS.md'), 'rules', 'utf8')
    await writeFile(join(home, '.context-injector.json'), '{ not json', 'utf8')
    const agent = { agent: { session: session([{ type: 'assistant/message', seq: 1, data: {} }], cwd) } }
    const p1 = await listeners['agent/pre-step'](agent, async () => decision())
    const p2 = await listeners['agent/pre-step'](agent, async () => decision())
    assert.equal(p1.messages.length, 1, 'fallback interval 2: step 1 no injection')
    assert.equal(p2.messages.length, 2, 'fallback interval 2: step 2 injection')
  } finally {
    if (prevHome === undefined) delete process.env.DSH_HOME
    else process.env.DSH_HOME = prevHome
    await rm(cwd, { recursive: true, force: true })
    await rm(home, { recursive: true, force: true })
  }
})

test('interval=1 injects AT MOST ONCE per turn (multi-step tool chains)', async () => {
  const { listeners } = register({ interval: 1 })
  const cwd = await mkdtemp(join(tmpdir(), 'ci-test-'))
  const home = await mkdtemp(join(tmpdir(), 'ci-home-'))
  const prevHome = process.env.DSH_HOME
  process.env.DSH_HOME = home
  try {
    await writeFile(join(cwd, 'AGENTS.md'), 'rules', 'utf8')
    const sessionObj = session([{ type: 'assistant/message', seq: 1, data: {} }], cwd)
    const agent = { agent: { session: sessionObj } }
    // Turn 1 with three model steps: only the first step injects.
    const t1s1 = await listeners['agent/pre-step']({ ...agent, turn: 1 }, async () => decision())
    const t1s2 = await listeners['agent/pre-step']({ ...agent, turn: 1 }, async () => decision())
    const t1s3 = await listeners['agent/pre-step']({ ...agent, turn: 1 }, async () => decision())
    assert.equal(t1s1.messages.length, 2, 'turn 1 first step: inject')
    assert.equal(t1s2.messages.length, 1, 'turn 1 second step: no repeat')
    assert.equal(t1s3.messages.length, 1, 'turn 1 third step: no repeat')
    // Turn 2: injects again (once).
    const t2s1 = await listeners['agent/pre-step']({ ...agent, turn: 2 }, async () => decision())
    const t2s2 = await listeners['agent/pre-step']({ ...agent, turn: 2 }, async () => decision())
    assert.equal(t2s1.messages.length, 2, 'turn 2 first step: inject')
    assert.equal(t2s2.messages.length, 1, 'turn 2 second step: no repeat')
  } finally {
    if (prevHome === undefined) delete process.env.DSH_HOME
    else process.env.DSH_HOME = prevHome
    await rm(cwd, { recursive: true, force: true })
    await rm(home, { recursive: true, force: true })
  }
})

test('interval=4 injects every fourth turn (隔三轮)', async () => {
  const { listeners } = register({ interval: 4 })
  const cwd = await mkdtemp(join(tmpdir(), 'ci-test-'))
  const home = await mkdtemp(join(tmpdir(), 'ci-home-'))
  const prevHome = process.env.DSH_HOME
  process.env.DSH_HOME = home
  try {
    await writeFile(join(cwd, 'AGENTS.md'), 'rules', 'utf8')
    const sessionObj = session([{ type: 'assistant/message', seq: 1, data: {} }], cwd)
    const agent = { agent: { session: sessionObj } }
    const results = []
    for (let turn = 1; turn <= 8; turn += 1) {
      const r = await listeners['agent/pre-step']({ ...agent, turn }, async () => decision())
      results.push(r.messages.length)
    }
    assert.deepEqual(results, [1, 1, 1, 2, 1, 1, 1, 2], 'inject on turns 4 and 8 only')
  } finally {
    if (prevHome === undefined) delete process.env.DSH_HOME
    else process.env.DSH_HOME = prevHome
    await rm(cwd, { recursive: true, force: true })
    await rm(home, { recursive: true, force: true })
  }
})

test('compaction resets turn counters (cadence restarts after re-promotion)', async () => {
  const { listeners } = register({ interval: 2 })
  const cwd = await mkdtemp(join(tmpdir(), 'ci-test-'))
  const home = await mkdtemp(join(tmpdir(), 'ci-home-'))
  const prevHome = process.env.DSH_HOME
  process.env.DSH_HOME = home
  try {
    await writeFile(join(cwd, 'AGENTS.md'), 'rules', 'utf8')
    const sessionObj = session([{ type: 'assistant/message', seq: 1, data: {} }], cwd)
    const agent = { agent: { session: sessionObj } }
    // Turn 1: count=1, interval 2 -> no injection. Turn 2: count=2 -> injection.
    await listeners['agent/pre-step']({ ...agent, turn: 1 }, async () => decision())
    const preCompaction = await listeners['agent/pre-step']({ ...agent, turn: 2 }, async () => decision())
    assert.equal(preCompaction.messages.length, 2, 'turn 2 injects before compaction')
    // Compaction resets promotion + counters; new promotion signal arrives.
    listeners['session/event'](sessionObj, { type: 'compaction/end', seq: 2, data: {} })
    listeners['session/event'](sessionObj, { type: 'assistant/message', seq: 3, data: {} })
    // Post-compaction turn 1: count restarted at 1 -> no injection.
    const post1 = await listeners['agent/pre-step']({ ...agent, turn: 3 }, async () => decision())
    assert.equal(post1.messages.length, 1, 'post-compaction turn 1: no injection (counter reset)')
    // Post-compaction turn 2: count=2 -> injection.
    const post2 = await listeners['agent/pre-step']({ ...agent, turn: 4 }, async () => decision())
    assert.equal(post2.messages.length, 2, 'post-compaction turn 2: injection')
  } finally {
    if (prevHome === undefined) delete process.env.DSH_HOME
    else process.env.DSH_HOME = prevHome
    await rm(cwd, { recursive: true, force: true })
    await rm(home, { recursive: true, force: true })
  }
})