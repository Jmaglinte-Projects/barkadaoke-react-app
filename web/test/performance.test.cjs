const assert = require('node:assert/strict')
const { test } = require('node:test')
const fs = require('node:fs')
const path = require('node:path')
const Module = require('node:module')
const ts = require('typescript')

function loadSource(relativePath, imports = {}) {
  const filename = path.resolve(__dirname, '../src', relativePath)
  const compiled = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS },
  }).outputText
  const loaded = new Module(filename, module)
  loaded.require = (name) => {
    if (Object.hasOwn(imports, name)) return imports[name]
    throw new Error(`Unexpected dependency: ${name}`)
  }
  loaded._compile(compiled, filename)
  return loaded.exports
}
const cacheModule = loadSource('lib/request-cache.ts')
const { createRequestCache } = cacheModule
const deferred = () => {
  let resolve, reject
  const promise = new Promise((yes, no) => {
    resolve = yes
    reject = no
  })
  return { promise, resolve, reject }
}

test('concurrent callers share one request, but later membership checks revalidate', async () => {
  const request = createRequestCache()
  const pending = deferred()
  let calls = 0
  const load = () => {
    calls++
    return pending.promise
  }
  const first = request('member', load)
  assert.equal(first, request('member', load))
  pending.resolve('joined')
  assert.equal(await first, 'joined')
  assert.equal(calls, 1)
  await request('member', load)
  assert.equal(calls, 2)
})

test('search cache reuses results, expires, and separates users', async (t) => {
  t.mock.timers.enable({ apis: ['Date'], now: 1000 })
  const request = createRequestCache({ ttlMs: 60_000 })
  let calls = 0
  const load = async () => ++calls
  assert.equal(await request('alice:song', load), 1)
  assert.equal(await request('alice:song', load), 1)
  assert.equal(await request('bob:song', load), 2)
  t.mock.timers.tick(60_001)
  assert.equal(await request('alice:song', load), 3)
})

test('failed and synchronously throwing requests can be retried', async () => {
  const request = createRequestCache({ ttlMs: 60_000 })
  await assert.rejects(
    request('song', async () => {
      throw Error('offline')
    }),
  )
  await assert.rejects(
    request('song', () => {
      throw Error('setup failed')
    }),
  )
  assert.equal(await request('song', async () => 'ok'), 'ok')
})

test('cache stays bounded and evicted requests cannot overwrite a replacement', async () => {
  const request = createRequestCache({ ttlMs: 60_000, maxEntries: 1 })
  const old = deferred()
  const original = request('song', () => old.promise)
  await request('other', async () => 'other')
  assert.equal(await request('song', async () => 'new'), 'new')
  old.reject(Error('old failure'))
  await assert.rejects(original)
  assert.equal(await request('song', async () => 'unexpected'), 'new')
})

function loadRooms({
  updateDoc = async () => {},
  callable = async () => ({ data: {} }),
} = {}) {
  return loadSource('firebase/rooms.ts', {
    'firebase/firestore': {
      doc: (_db, ...segments) => segments.join('/'),
      updateDoc,
      serverTimestamp: () => 'timestamp',
    },
    'firebase/functions': { httpsCallable: () => callable },
    '@/firebase/config': {
      getDb: () => ({}),
      getFirebaseFunctions: () => ({}),
    },
    '@/firebase/mappers': {},
    '@/lib/request-cache': cacheModule,
    '@/lib/playback': {},
    '@/lib/room-limits': { readRoomSettings: (settings) => settings },
    '@/lib/room-code': {
      normalizeRoomCode: (code) => code.trim().toUpperCase(),
    },
  })
}

test('duplicate playback events share writes and rapid play/pause/play preserves order', async () => {
  const writes = []
  const pending = []
  const rooms = loadRooms({
    updateDoc: (_doc, data) => {
      writes.push(data.playbackState)
      const next = deferred()
      pending.push(next)
      return next.promise
    },
  })
  const play = rooms.setRoomPlaybackState('party', 'playing')
  assert.equal(play, rooms.setRoomPlaybackState('party', 'playing'))
  const pause = rooms.setRoomPlaybackState('party', 'paused')
  const resume = rooms.setRoomPlaybackState('party', 'playing')
  await new Promise(setImmediate)
  assert.deepEqual(writes, ['playing'])
  pending[0].resolve()
  await new Promise(setImmediate)
  assert.deepEqual(writes, ['playing', 'paused'])
  pending[1].resolve()
  await new Promise(setImmediate)
  assert.deepEqual(writes, ['playing', 'paused', 'playing'])
  pending[2].resolve()
  await Promise.all([play, pause, resume])
})

test('a failed playback write does not block subsequent states or retries', async () => {
  let calls = 0
  const rooms = loadRooms({
    updateDoc: async () => {
      if (++calls === 1) throw Error('offline')
    },
  })
  const first = rooms.setRoomPlaybackState('party', 'playing')
  const next = rooms.setRoomPlaybackState('party', 'paused')
  await assert.rejects(first)
  await next
  await rooms.setRoomPlaybackState('party', 'paused')
  assert.equal(calls, 3)
})

test('join calls deduplicate per user and room only while in flight', async () => {
  let calls = 0
  const rooms = loadRooms({
    callable: async () => {
      calls++
      return { data: { roomId: 'party' } }
    },
  })
  const first = rooms.joinRoom('party', { uid: 'alice' })
  assert.equal(first, rooms.joinRoom('party', { uid: 'alice' }))
  await Promise.all([first, rooms.joinRoom('party', { uid: 'bob' })])
  assert.equal(calls, 2)
  await rooms.joinRoom('party', { uid: 'alice' })
  assert.equal(calls, 3)
})
