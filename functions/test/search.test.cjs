const assert = require('node:assert/strict')
const { test } = require('node:test')
const fs = require('node:fs')
const path = require('node:path')
const Module = require('node:module')
const { HttpsError } = require('firebase-functions/v2/https')

function loadBuilt(relativePath, imports) {
  const filename = path.resolve(__dirname, '../lib', relativePath)
  const loaded = new Module(filename, module)
  loaded.require = (name) => {
    if (Object.hasOwn(imports, name)) return imports[name]
    throw new Error(`Unexpected dependency: ${name}`)
  }
  loaded._compile(fs.readFileSync(filename, 'utf8'), filename)
  return loaded.exports
}

const song = (id, source = 'catalog') => ({
  videoId: id,
  title: `${id} karaoke`,
  thumbnailUrl: '',
  channelTitle: 'Test',
  source: 'youtube',
  resultSource: source,
})
const quiet = { warn() {}, error() {} }
const quotaError = () =>
  new Response(
    JSON.stringify({ error: { errors: [{ reason: 'quotaExceeded' }] } }),
    { status: 403 },
  )
const remoteResponse = (ids) =>
  new Response(
    JSON.stringify({
      items: ids.map((id) => ({
        id: { videoId: id },
        snippet: { title: `${id} karaoke` },
      })),
    }),
  )

function searchHarness({
  local = [],
  key = 'test-key',
  shared = {},
  catalogError,
  statusError,
  saveError,
} = {}) {
  const calls = { catalog: [], secret: 0, reads: 0, writes: 0 }
  const { searchVideos } = loadBuilt('youtube/searchVideos.js', {
    'firebase-admin/firestore': {
      getFirestore: () => ({
        doc: (name) => {
          assert.equal(name, '_searchStatus/youtube')
          return {
            get: async () => {
              calls.reads++
              if (statusError) throw statusError
              return { data: () => shared }
            },
            set: async (data) => {
              calls.writes++
              if (saveError) throw saveError
              Object.assign(shared, data)
            },
          }
        },
      }),
    },
    'firebase-functions/v2/https': {
      HttpsError,
      onCall: (_options, run) => ({ run }),
    },
    'firebase-functions/params': {
      defineSecret: () => ({
        value: () => {
          calls.secret++
          return key
        },
      }),
    },
    'firebase-functions': { logger: quiet },
    '../catalog/searchCatalog': {
      LOCAL_RESULT_THRESHOLD: 5,
      searchCatalog: async (...args) => {
        calls.catalog.push(args)
        if (catalogError) throw catalogError
        return local.slice(0, args[1])
      },
    },
  })
  return {
    calls,
    run: (data = {}, auth = { uid: 'test-user' }) =>
      searchVideos.run({ data, auth }),
  }
}

test('library searches and all blank-query modes skip YouTube and its secret', async (t) => {
  t.mock.method(global, 'fetch', () => {
    throw Error('YouTube must not be called')
  })
  for (const source of ['auto', 'catalog', 'youtube']) {
    const h = searchHarness({ local: [song('saved')] })
    assert.equal((await h.run({ source, query: '' })).searchMode, 'catalog')
    assert.equal(h.calls.secret, 0)
    assert.equal(h.calls.reads, 0)
  }
  const h = searchHarness()
  assert.deepEqual(
    (await h.run({ source: 'catalog', query: 'unknown' })).results,
    [],
  )
  assert.equal(h.calls.secret, 0)
})

test('Auto skips remote at threshold and merges fewer hits with catalog copies first', async (t) => {
  const fetch = t.mock.method(global, 'fetch', async () =>
    remoteResponse(['saved', 'new']),
  )
  const full = searchHarness({
    local: Array.from({ length: 5 }, (_, i) => song(String(i))),
  })
  assert.equal((await full.run({ query: 'song' })).searchMode, 'catalog')
  assert.equal(fetch.mock.callCount(), 0)
  const limited = searchHarness({
    local: [song('one'), song('two'), song('three')],
  })
  assert.equal(
    (await limited.run({ query: 'song', maxResults: 3 })).searchMode,
    'catalog',
  )
  assert.equal(fetch.mock.callCount(), 0)
  const h = searchHarness({ local: [song('saved')] })
  const result = await h.run({ query: 'song' })
  assert.deepEqual(
    result.results.map((s) => [s.videoId, s.resultSource]),
    [
      ['saved', 'catalog'],
      ['new', 'youtube'],
    ],
  )
  assert.equal(result.searchMode, 'catalog+youtube')
  assert.equal(result.youtubeSearchSucceeded, true)
})

test('YouTube mode searches remotely even with five local matches and returns only remote hits', async (t) => {
  const fetch = t.mock.method(global, 'fetch', async () =>
    remoteResponse(['remote']),
  )
  const h = searchHarness({
    local: Array.from({ length: 5 }, (_, i) => song(String(i))),
  })
  const result = await h.run({
    query: ' song ',
    source: 'youtube',
    maxResults: 3,
  })
  assert.equal(result.searchMode, 'youtube')
  assert.deepEqual(
    result.results.map((s) => s.videoId),
    ['remote'],
  )
  const [url, options] = fetch.mock.calls[0].arguments
  assert.equal(url.searchParams.get('q'), 'song karaoke')
  assert.equal(url.searchParams.get('maxResults'), '3')
  assert.ok(options.signal instanceof AbortSignal)
})

test('quota exhaustion returns an empty library successfully and cools down across instances', async (t) => {
  t.mock.timers.enable({ apis: ['Date'], now: 1000 })
  const fetch = t.mock.method(global, 'fetch', async () => quotaError())
  const shared = {}
  const first = await searchHarness({ shared }).run({ query: 'unknown' })
  assert.deepEqual(first.results, [])
  assert.equal(first.searchMode, 'catalog-fallback')
  assert.equal(first.fallbackReason, 'quota-exceeded')
  assert.equal(shared.retryAt, 901000)
  const second = await searchHarness({ shared, local: [song('saved')] }).run({
    query: 'saved',
    source: 'youtube',
  })
  assert.equal(second.results[0].videoId, 'saved')
  assert.equal(second.fallbackReason, 'quota-exceeded')
  assert.equal(fetch.mock.callCount(), 1)
  t.mock.timers.tick(15 * 60_000 + 1)
  fetch.mock.mockImplementation(async () => remoteResponse(['recovered']))
  const recovered = await searchHarness({ shared }).run({ query: 'new' })
  assert.equal(recovered.youtubeSearchSucceeded, true)
  assert.equal(fetch.mock.callCount(), 2)
})

test('network errors, timeouts, invalid JSON, and non-quota HTTP errors retain local search', async (t) => {
  for (const fail of [
    async () => {
      throw Error('offline')
    },
    async () => {
      throw new DOMException('timed out', 'TimeoutError')
    },
    async () => new Response('invalid json'),
    async () => new Response('proxy unavailable', { status: 503 }),
    async () =>
      new Response(
        JSON.stringify({ error: { errors: [{ reason: 'forbidden' }] } }),
        { status: 403 },
      ),
  ]) {
    const fetch = t.mock.method(global, 'fetch', fail)
    const h = searchHarness({ local: [song('saved')] })
    const result = await h.run({ query: 'saved' })
    assert.equal(result.fallbackReason, 'youtube-unavailable')
    assert.equal(result.results[0].videoId, 'saved')
    assert.equal(h.calls.writes, 0)
    fetch.mock.restore()
  }
})

test('missing key and quota-status storage errors do not block library results', async (t) => {
  t.mock.method(global, 'fetch', async () => quotaError())
  const missing = await searchHarness({ key: '' }).run({ query: 'unknown' })
  assert.deepEqual(missing.results, [])
  assert.equal(missing.fallbackReason, 'not-configured')
  const unreadable = await searchHarness({ statusError: Error('offline') }).run(
    { query: 'unknown' },
  )
  assert.equal(unreadable.fallbackReason, 'youtube-unavailable')
  const unwritable = await searchHarness({ saveError: Error('offline') }).run({
    query: 'unknown',
  })
  assert.equal(unwritable.fallbackReason, 'quota-exceeded')
})

test('request validation and actual library errors remain explicit errors', async () => {
  const h = searchHarness()
  await assert.rejects(h.run({}, null), { code: 'unauthenticated' })
  for (const data of [
    { source: 'invalid' },
    { query: 123 },
    { query: 'x' },
    { query: 'x'.repeat(201) },
  ]) {
    await assert.rejects(h.run(data), { code: 'invalid-argument' })
  }
  assert.equal(h.calls.catalog.length, 0)
  await assert.rejects(
    searchHarness({
      catalogError: new HttpsError('unavailable', 'Library unavailable'),
    }).run({ query: 'test' }),
    { code: 'unavailable' },
  )
})

function catalogHarness(rows, error) {
  const calls = []
  const query = {
    where: (...args) => {
      calls.push(['where', ...args])
      return query
    },
    orderBy: (...args) => {
      calls.push(['orderBy', ...args])
      return query
    },
    limit: (count) => {
      calls.push(['limit', count])
      return query
    },
    get: async () => {
      if (error) throw error
      return { docs: rows.map((data) => ({ data: () => data })) }
    },
  }
  const { searchCatalog } = loadBuilt('catalog/searchCatalog.js', {
    'firebase-admin/firestore': {
      getFirestore: () => ({ collection: () => query }),
    },
    'firebase-functions': { logger: quiet },
    'firebase-functions/v2/https': { HttpsError },
    './normalize': require('../lib/catalog/normalize'),
  })
  return { calls, searchCatalog }
}

test('empty library query browses popularity, skips unavailable/missing videos and honors limit', async () => {
  const h = catalogHarness([
    { ...song('low'), usageCount: 1 },
    { ...song('high'), usageCount: 10 },
    { ...song('unavailable'), available: false, usageCount: 100 },
    { title: 'no video', usageCount: 200 },
  ])
  assert.deepEqual(
    (await h.searchCatalog('', 1)).map((s) => s.videoId),
    ['high'],
  )
  assert.deepEqual(h.calls, [
    ['orderBy', 'usageCount', 'desc'],
    ['limit', 40],
  ])
})

test('typed catalog query uses token search and database errors are not empty successes', async () => {
  const h = catalogHarness([
    { ...song('hello'), searchTokens: ['hello', 'karaoke'] },
  ])
  const results = await h.searchCatalog('hello', 8)
  assert.equal(results[0].videoId, 'hello')
  assert.deepEqual(h.calls[0], [
    'where',
    'searchTokens',
    'array-contains',
    'hello',
  ])
  await assert.rejects(
    catalogHarness([], Error('database down')).searchCatalog('hello'),
    { code: 'unavailable' },
  )
})
