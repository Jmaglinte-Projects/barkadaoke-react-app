const assert = require('node:assert/strict')
const { test } = require('node:test')
const fs = require('node:fs')
const path = require('node:path')
const Module = require('node:module')
const ts = require('typescript')

function loadSource(relativePath, imports, dev = false) {
  const filename = path.resolve(__dirname, '../src', relativePath)
  const source = fs
    .readFileSync(filename, 'utf8')
    .replaceAll('import.meta.env.DEV', String(dev))
  const compiled = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      jsx: ts.JsxEmit.ReactJSX,
    },
  }).outputText
  const loaded = new Module(filename, module)
  loaded.require = (name) => {
    if (Object.hasOwn(imports, name)) return imports[name]
    throw new Error(`Unexpected dependency: ${name}`)
  }
  loaded._compile(compiled, filename)
  return loaded.exports
}
const cache = loadSource('lib/request-cache.ts', {})
const result = (id) => ({
  videoId: id,
  title: id,
  resultSource: 'catalog',
  source: 'youtube',
})

function clientHarness({ callable, dev = false } = {}) {
  const user = { uid: 'alice' }
  const calls = []
  const api = loadSource(
    'firebase/youtube.ts',
    {
      'firebase/functions': {
        httpsCallable: (_functions, name) => async (data) => {
          assert.equal(name, 'searchVideos')
          calls.push(data)
          return callable
            ? callable(data)
            : {
                data: { results: [result(data.source)], searchMode: 'catalog' },
              }
        },
      },
      '@/firebase/config': {
        getFirebaseAuth: () => ({ currentUser: user }),
        getFirebaseFunctions: () => ({}),
      },
      '@/lib/request-cache': cache,
      '@/lib/mock-data': { MOCK_SEARCH_RESULTS: [result('demo')] },
    },
    dev,
  )
  return { ...api, calls, user }
}

test('search sends the chosen source and separates cached results by source and user', async () => {
  const h = clientHarness()
  for (const source of ['auto', 'catalog', 'youtube']) {
    assert.equal(
      (await h.searchKaraokeVideos('  Hello   song ', source)).results[0]
        .videoId,
      source,
    )
  }
  await h.searchKaraokeVideos('hello song', 'catalog')
  assert.equal(h.calls.length, 3)
  assert.deepEqual(h.calls[0], { query: 'Hello song', source: 'auto' })
  h.user.uid = 'bob'
  await h.searchKaraokeVideos('hello song', 'catalog')
  assert.equal(h.calls.length, 4)
})

test('empty-query library browsing and quota fallback metadata pass through the client', async () => {
  const h = clientHarness({
    callable: async () => ({
      data: {
        results: [],
        searchMode: 'catalog-fallback',
        youtubeSearchSucceeded: false,
        fallbackReason: 'quota-exceeded',
      },
    }),
  })
  const response = await h.searchKaraokeVideos('', 'catalog')
  assert.deepEqual(h.calls[0], { query: '', source: 'catalog' })
  assert.equal(response.fallbackReason, 'quota-exceeded')
  assert.equal(response.usedFallback, false)
  assert.deepEqual(response.results, [])
})

test('production failures never show demo songs and library mode never uses demo fallback', async () => {
  for (const [dev, source, code] of [
    [false, 'auto', 'functions/not-found'],
    [true, 'catalog', 'functions/not-found'],
    [true, 'auto', 'functions/failed-precondition'],
    [false, 'youtube', 'functions/unavailable'],
  ]) {
    const h = clientHarness({
      dev,
      callable: async () => {
        throw Object.assign(Error('failed'), { code })
      },
    })
    await assert.rejects(h.searchKaraokeVideos('hello', source), { code })
  }
  const h = clientHarness({
    dev: true,
    callable: async () => {
      throw { code: 'functions/not-found' }
    },
  })
  assert.equal((await h.searchKaraokeVideos('hello')).usedFallback, true)
})

// Small hook driver: preserves hook state, runs effect cleanup on dependency
// changes, and lets the test explicitly render pending asynchronous responses.
function hookHarness(search) {
  const slots = []
  let cursor = 0
  let pendingEffect
  let lastDeps
  let cleanup
  const { useYouTubeSearch } = loadSource('hooks/useYouTubeSearch.ts', {
    react: {
      useState: (initial) => {
        const index = cursor++
        if (!(index in slots)) slots[index] = initial
        return [
          slots[index],
          (value) => {
            slots[index] = value
          },
        ]
      },
      useEffect: (effect, deps) => {
        if (
          !lastDeps ||
          deps.some((value, index) => value !== lastDeps[index])
        ) {
          pendingEffect = effect
          lastDeps = deps
        }
      },
    },
    '@/firebase/youtube': { searchKaraokeVideos: search },
  })
  return {
    render(query, source) {
      cursor = 0
      return useYouTubeSearch(query, source)
    },
    effects() {
      if (pendingEffect) {
        cleanup?.()
        cleanup = pendingEffect()
        pendingEffect = null
      }
    },
    unmount() {
      cleanup?.()
    },
  }
}
const flush = () => new Promise(setImmediate)
const response = (id) => ({
  results: [result(id)],
  searchMode: 'catalog',
  usedFallback: false,
  youtubeSearchSucceeded: false,
})

// The hook uses browser timers; Node's mock clock drives them without sleeps.
test('switching source hides old results immediately and ignores a late response', async (t) => {
  t.mock.timers.enable({ apis: ['setTimeout'] })
  global.window = global
  t.after(() => {
    delete global.window
  })
  const requests = []
  const h = hookHarness(
    (query, source) =>
      new Promise((resolve) => {
        requests.push({ query, source, resolve })
      }),
  )
  h.render('hello', 'auto')
  h.effects()
  t.mock.timers.tick(550)
  requests[0].resolve(response('auto'))
  await flush()
  assert.equal(h.render('hello', 'auto').results[0].videoId, 'auto')
  const switching = h.render('hello', 'youtube')
  assert.deepEqual(switching.results, [])
  assert.equal(switching.isSearching, true)
  h.effects()
  t.mock.timers.tick(550)
  h.render('hello', 'catalog')
  h.effects()
  t.mock.timers.tick(550)
  requests[1].resolve(response('stale-youtube'))
  await flush()
  assert.deepEqual(h.render('hello', 'catalog').results, [])
  requests[2].resolve(response('library'))
  await flush()
  assert.equal(h.render('hello', 'catalog').results[0].videoId, 'library')
  assert.deepEqual(
    requests.map((r) => r.source),
    ['auto', 'youtube', 'catalog'],
  )
  h.unmount()
})

test('blank search browses the library; one-character queries cancel pending work', async (t) => {
  t.mock.timers.enable({ apis: ['setTimeout'] })
  global.window = global
  t.after(() => {
    delete global.window
  })
  const calls = []
  const h = hookHarness(async (...args) => {
    calls.push(args)
    return response('browse')
  })
  h.render('', 'auto')
  h.effects()
  t.mock.timers.tick(550)
  await flush()
  assert.deepEqual(calls, [['', 'auto']])
  h.render('another', 'youtube')
  h.effects()
  assert.deepEqual(h.render('a', 'youtube').results, [])
  h.effects()
  t.mock.timers.tick(550)
  assert.equal(calls.length, 1)
  h.unmount()
})
