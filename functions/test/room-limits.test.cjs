const assert = require('node:assert/strict')
const { test, before, beforeEach, after } = require('node:test')
const { initializeApp, deleteApp } = require('firebase-admin/app')
const { getFirestore, Timestamp } = require('firebase-admin/firestore')
const {
  readRoomSettings,
  validateRoomSettings,
  effectiveSongLimit,
  assertQueueCapacity,
} = require('../lib/rooms/limits')
const { addSongToQueue } = require('../lib/queue/addSongToQueue')
const { updateRoomSettings } = require('../lib/rooms/updateRoomSettings')
const { joinRoom } = require('../lib/rooms/joinRoom')
const { leaveRoom } = require('../lib/rooms/leaveRoom')

const defaults = { queueLimit: null, songsPerUser: 3, memberLimit: 5 }
test('legacy rooms retain an unlimited queue, three songs each and five members', () => {
  assert.deepEqual(readRoomSettings(undefined), defaults)
  assert.deepEqual(
    readRoomSettings({ queueLimit: 0, songsPerUser: -2, memberLimit: 1.5 }),
    defaults,
  )
})
test('unlimited overrides and inherited limits remain distinct', () => {
  assert.equal(effectiveSongLimit(defaults, undefined), 3)
  assert.equal(effectiveSongLimit(defaults, null), null)
  assert.equal(effectiveSongLimit(defaults, 2), 2)
  assert.equal(
    effectiveSongLimit({ ...defaults, songsPerUser: null }, undefined),
    null,
  )
})
test('both limits apply, including individual Unlimited under a finite room cap', () => {
  assert.throws(
    () => assertQueueCapacity({ ...defaults, queueLimit: 2 }, null, 2, 0),
    /room queue is full/,
  )
  assert.throws(() => assertQueueCapacity(defaults, 2, 2, 2), /2 waiting songs/)
  assert.doesNotThrow(() => assertQueueCapacity(defaults, null, 500, 500))
})
test('settings reject zero, fractions, negative, non-numeric and unsafe limits', () => {
  for (const value of [
    0,
    -1,
    1.5,
    '3',
    undefined,
    Infinity,
    Number.MAX_SAFE_INTEGER + 1,
  ]) {
    assert.throws(() =>
      validateRoomSettings({ ...defaults, songsPerUser: value }),
    )
    assert.throws(() =>
      validateRoomSettings({ ...defaults, memberLimit: value }),
    )
  }
  assert.deepEqual(
    validateRoomSettings({
      queueLimit: null,
      songsPerUser: null,
      memberLimit: 1,
    }),
    { queueLimit: null, songsPerUser: null, memberLimit: 1 },
  )
})

const emulator = process.env.FIRESTORE_EMULATOR_HOST
const projectId = 'demo-barkadaoke-limits'
let app, db, clientApp, clientDb, hostApp, hostDb, sdk
const roomRef = () => db.doc('rooms/party')
const auth = (uid) => ({ uid, token: { name: uid } })
const add = (uid = 'guest') =>
  addSongToQueue.run({
    auth: auth(uid),
    data: { roomId: 'party', videoId: 'abcdefghijk', title: 'Test karaoke' },
  })
const save = (settings = defaults, memberSongLimits = [], uid = 'host') =>
  updateRoomSettings.run({
    auth: auth(uid),
    data: { roomId: 'party', settings, memberSongLimits },
  })
const join = (uid) =>
  joinRoom.run({ auth: auth(uid), data: { roomId: 'party' } })

before(async () => {
  if (!emulator) return
  assert.match(
    emulator,
    /^(127\.0\.0\.1|localhost):\d+$/,
    'Tests must target a local emulator.',
  )
  app = initializeApp({ projectId })
  db = getFirestore(app)
  const { createRequire } = require('node:module')
  const webRequire = createRequire(
    require('node:path').resolve(__dirname, '../../web/package.json'),
  )
  const firebase = webRequire('firebase/app')
  sdk = webRequire('firebase/firestore')
  sdk.setLogLevel('silent')
  clientApp = firebase.initializeApp(
    { projectId, apiKey: 'fake-key' },
    'rules-tests',
  )
  clientDb = sdk.getFirestore(clientApp)
  const [host, port] = emulator.split(':')
  sdk.connectFirestoreEmulator(clientDb, host, Number(port), {
    mockUserToken: { sub: 'guest' },
  })
  hostApp = firebase.initializeApp(
    { projectId, apiKey: 'fake-key' },
    'host-rules-tests',
  )
  hostDb = sdk.getFirestore(hostApp)
  sdk.connectFirestoreEmulator(hostDb, host, Number(port), {
    mockUserToken: { sub: 'host' },
  })
})
beforeEach(async (context) => {
  if (!emulator || !context.name.startsWith('emulator:')) return
  await db.recursiveDelete(db.collection('rooms'))
  await roomRef().set({
    name: 'Party',
    hostUserId: 'host',
    roomCode: 'PARTY1',
    status: 'active',
    memberCount: 2,
    settings: defaults,
    currentQueueItemId: null,
  })
  for (const uid of ['host', 'guest'])
    await roomRef()
      .collection('members')
      .doc(uid)
      .set({
        userId: uid,
        displayName: uid,
        role: uid === 'host' ? 'host' : 'guest',
        joinedAt: Timestamp.now(),
      })
})
after(async () => {
  if (clientApp) {
    await sdk.terminate(clientDb)
    await sdk.terminate(hostDb)
    const { createRequire } = require('node:module')
    const webRequire = createRequire(
      require('node:path').resolve(__dirname, '../../web/package.json'),
    )
    await webRequire('firebase/app').deleteApp(clientApp)
    await webRequire('firebase/app').deleteApp(hostApp)
  }
  if (app) await deleteApp(app)
})
const integration = (name, handler) =>
  test(
    `emulator: ${name}`,
    {
      skip:
        !emulator &&
        'Run with Firestore emulator to test transactions and security rules.',
    },
    handler,
  )

integration(
  'simultaneous additions cannot exceed the shared queue cap and allocate distinct order',
  async () => {
    await save({ ...defaults, queueLimit: 2, songsPerUser: null })
    const results = await Promise.allSettled(
      Array.from({ length: 6 }, () => add()),
    )
    assert.equal(results.filter((r) => r.status === 'fulfilled').length, 2)
    assert.ok(
      results
        .filter((r) => r.status === 'rejected')
        .every((r) => r.reason.code === 'resource-exhausted'),
    )
    const queue = await roomRef().collection('queue').get()
    assert.equal(queue.size, 2)
    assert.equal(new Set(queue.docs.map((doc) => doc.data().order)).size, 2)
  },
)
integration(
  'simultaneous requests enforce personal allowances even when the room is Unlimited',
  async () => {
    await save(defaults, [{ userId: 'guest', limit: 2 }])
    const results = await Promise.allSettled(
      Array.from({ length: 5 }, () => add()),
    )
    assert.equal(results.filter((r) => r.status === 'fulfilled').length, 2)
  },
)
integration(
  'only waiting songs count and a starting song frees a slot',
  async () => {
    await save({ ...defaults, queueLimit: 1, songsPerUser: 1 })
    await add()
    const queue = await roomRef().collection('queue').get()
    await queue.docs[0].ref.update({ status: 'playing' })
    await add()
    assert.equal(
      (
        await roomRef()
          .collection('queue')
          .where('status', '==', 'queued')
          .get()
      ).size,
      1,
    )
  },
)
integration(
  'unlimited default, overrides, and resetting to inherited default',
  async () => {
    await save({ ...defaults, songsPerUser: null })
    for (let i = 0; i < 4; i++) await add()
    await save({ ...defaults, songsPerUser: 1 }, [
      { userId: 'guest', limit: null },
    ])
    await add()
    await save({ ...defaults, songsPerUser: 1 }, [
      { userId: 'guest', limit: 'default' },
    ])
    await assert.rejects(add(), { code: 'resource-exhausted' })
  },
)
integration(
  'lowering limits preserves members and songs, but blocks additions and joins',
  async () => {
    await add()
    await add()
    await save({ queueLimit: 1, songsPerUser: 1, memberLimit: 1 })
    assert.equal((await roomRef().collection('queue').get()).size, 2)
    assert.equal((await roomRef().collection('members').get()).size, 2)
    await assert.rejects(add(), { code: 'resource-exhausted' })
    await assert.rejects(join('new-guest'), { code: 'resource-exhausted' })
    assert.equal((await join('guest')).alreadyMember, true)
  },
)
integration(
  'room capacity includes the host and serializes simultaneous joins',
  async () => {
    await save({ ...defaults, memberLimit: 3 })
    const results = await Promise.allSettled(['a', 'b', 'c', 'd'].map(join))
    assert.equal(results.filter((r) => r.status === 'fulfilled').length, 1)
    assert.equal((await roomRef().collection('members').get()).size, 3)
    assert.equal((await roomRef().get()).data().memberCount, 3)
  },
)
integration('member overrides survive leaving and rejoining', async () => {
  await save(defaults, [{ userId: 'guest', limit: 1 }])
  await add()
  await leaveRoom.run({ auth: auth('guest'), data: { roomId: 'party' } })
  await join('guest')
  assert.equal(
    (await roomRef().collection('members').doc('guest').get()).data()
      .songLimitOverride,
    1,
  )
  await assert.rejects(add(), { code: 'resource-exhausted' })
})
integration(
  'only the owner can edit limits; unauthenticated users, outsiders and ended rooms cannot add',
  async () => {
    await assert.rejects(save(defaults, [], 'guest'), {
      code: 'permission-denied',
    })
    await assert.rejects(addSongToQueue.run({ data: {} }), {
      code: 'unauthenticated',
    })
    await assert.rejects(add('outsider'), { code: 'permission-denied' })
    await roomRef().update({ status: 'ended' })
    await assert.rejects(add(), { code: 'failed-precondition' })
    await assert.rejects(save(), { code: 'failed-precondition' })
  },
)
integration(
  'stale member edits fail without partially saving room settings',
  async () => {
    await assert.rejects(
      save({ ...defaults, memberLimit: 10 }, [{ userId: 'missing', limit: 4 }]),
      { code: 'failed-precondition' },
    )
    assert.equal((await roomRef().get()).data().settings.memberLimit, 5)
  },
)
integration('legacy rooms use defaults on the backend', async () => {
  const { FieldValue } = require('firebase-admin/firestore')
  await roomRef().update({ settings: FieldValue.delete() })
  for (let i = 0; i < 3; i++) await add()
  await assert.rejects(add(), { code: 'resource-exhausted' })
  for (const uid of ['a', 'b', 'c']) await join(uid)
  await assert.rejects(join('d'), { code: 'resource-exhausted' })
})
integration(
  'rules block direct song creation, self-promotion and allowance/room-limit bypasses',
  async () => {
    await assert.rejects(
      sdk.setDoc(sdk.doc(clientDb, 'rooms/party/queue/bypass'), {
        singerUserId: 'guest',
        status: 'queued',
      }),
      { code: 'permission-denied' },
    )
    await assert.rejects(
      sdk.updateDoc(sdk.doc(clientDb, 'rooms/party'), {
        settings: { ...defaults, songsPerUser: null },
      }),
      { code: 'permission-denied' },
    )
    await assert.rejects(
      sdk.updateDoc(sdk.doc(clientDb, 'rooms/party/members/guest'), {
        songLimitOverride: null,
      }),
      { code: 'permission-denied' },
    )
    await roomRef().collection('members').doc('guest').delete()
    await assert.rejects(
      sdk.setDoc(sdk.doc(clientDb, 'rooms/party/members/guest'), {
        userId: 'guest',
        displayName: 'guest',
        role: 'host',
        joinedAt: sdk.serverTimestamp(),
      }),
      { code: 'permission-denied' },
    )
  },
)
integration(
  'guests can remove their own waiting songs but cannot requeue history or alter ownership',
  async () => {
    await add()
    const song = (await roomRef().collection('queue').get()).docs[0]
    const ref = sdk.doc(clientDb, song.ref.path)
    await sdk.updateDoc(ref, {
      status: 'removed',
      completedAt: sdk.serverTimestamp(),
    })
    await assert.rejects(sdk.updateDoc(ref, { status: 'queued' }), {
      code: 'permission-denied',
    })
    await assert.rejects(
      sdk.updateDoc(ref, { status: 'removed', singerUserId: 'host' }),
      { code: 'permission-denied' },
    )
  },
)

test('frontend and backend agree about legacy defaults, unlimited overrides and blocking messages', () => {
  const fs = require('node:fs')
  const ts = require('typescript')
  const Module = require('node:module')
  const filename = require('node:path').resolve(
    __dirname,
    '../../web/src/lib/room-limits.ts',
  )
  const compiled = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS },
  }).outputText
  const frontend = new Module(filename, module)
  frontend._compile(compiled, filename)
  const policy = frontend.exports
  assert.deepEqual(policy.readRoomSettings(undefined), defaults)
  assert.equal(
    policy.getUserSongLimit(defaults, { songLimitOverride: null }),
    null,
  )
  assert.equal(policy.getUserSongLimit(defaults, {}), 3)
  assert.equal(policy.formatLimit(null), 'Unlimited')
  assert.match(
    policy.getQueueLimitMessage(
      { settings: { ...defaults, queueLimit: 2 } },
      { songLimitOverride: null },
      2,
      0,
    ),
    /Room queue is full/,
  )
  assert.match(
    policy.getQueueLimitMessage(
      { settings: defaults },
      { songLimitOverride: 1 },
      1,
      1,
    ),
    /allowance is 1/,
  )
  assert.equal(
    policy.getQueueLimitMessage(
      { settings: { ...defaults, songsPerUser: null } },
      {},
      100,
      100,
    ),
    null,
  )
})

integration(
  'host obeys song allowances and cannot bypass them through direct writes',
  async () => {
    await save(defaults, [{ userId: 'host', limit: 1 }])
    await add('host')
    await assert.rejects(add('host'), { code: 'resource-exhausted' })
    await assert.rejects(
      sdk.setDoc(sdk.doc(hostDb, 'rooms/party/queue/bypass'), {
        singerUserId: 'host',
        status: 'queued',
      }),
      { code: 'permission-denied' },
    )
    await assert.rejects(
      sdk.updateDoc(sdk.doc(hostDb, 'rooms/party'), {
        settings: { ...defaults, songsPerUser: null },
      }),
      { code: 'permission-denied' },
    )
    await assert.rejects(
      sdk.updateDoc(sdk.doc(hostDb, 'rooms/party/members/host'), {
        songLimitOverride: null,
      }),
      { code: 'permission-denied' },
    )
  },
)
integration(
  'rules preserve host room creation, playback and role management',
  async () => {
    const batch = sdk.writeBatch(hostDb)
    batch.set(sdk.doc(hostDb, 'rooms/new-room'), {
      name: 'New room',
      roomCode: 'NEW123',
      hostUserId: 'host',
      status: 'active',
      memberCount: 1,
      settings: defaults,
    })
    batch.set(sdk.doc(hostDb, 'rooms/new-room/members/host'), {
      userId: 'host',
      displayName: 'Host',
      role: 'host',
      joinedAt: sdk.serverTimestamp(),
    })
    await batch.commit()
    await add()
    const song = (await roomRef().collection('queue').get()).docs[0]
    await sdk.updateDoc(sdk.doc(hostDb, song.ref.path), {
      status: 'playing',
      startedAt: sdk.serverTimestamp(),
    })
    await sdk.updateDoc(sdk.doc(hostDb, 'rooms/party'), {
      currentQueueItemId: song.id,
      playbackState: 'playing',
    })
    await sdk.updateDoc(sdk.doc(hostDb, 'rooms/party/members/guest'), {
      role: 'controller',
    })
    await sdk.updateDoc(sdk.doc(clientDb, song.ref.path), {
      status: 'removed',
      completedAt: sdk.serverTimestamp(),
    })
    await assert.rejects(
      sdk.updateDoc(sdk.doc(hostDb, song.ref.path), { status: 'queued' }),
      { code: 'permission-denied' },
    )
  },
)

integration(
  'live queue excludes history and sorts active songs without a composite index',
  async () => {
    const fs = require('node:fs')
    const ts = require('typescript')
    const Module = require('node:module')
    const filename = require('node:path').resolve(
      __dirname,
      '../../web/src/firebase/queue.ts',
    )
    const loaded = new Module(filename, module)
    const dependencies = {
      'firebase/firestore': sdk,
      'firebase/functions': {},
      '@/firebase/config': { getDb: () => clientDb },
      '@/firebase/catalog': {},
      '@/firebase/mappers': { mapQueueItem: (id, data) => ({ id, ...data }) },
      '@/lib/queue': {},
    }
    loaded.require = (name) => {
      assert.ok(Object.hasOwn(dependencies, name), `Unexpected import: ${name}`)
      return dependencies[name]
    }
    loaded._compile(
      ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
        compilerOptions: { module: ts.ModuleKind.CommonJS },
      }).outputText,
      filename,
    )
    const batch = db.batch()
    for (const [id, status, order] of [
      ['history', 'completed', 1],
      ['removed', 'removed', 2],
      ['later', 'queued', 4],
      ['current', 'playing', 3],
      ['skipped', 'skipped', 5],
    ])
      batch.set(roomRef().collection('queue').doc(id), { status, order })
    await batch.commit()
    let unsubscribe
    try {
      const items = await new Promise((resolve, reject) => {
        const timer = setTimeout(
          () => reject(Error('Queue snapshot timed out')),
          5000,
        )
        unsubscribe = loaded.exports.subscribeToQueue(
          'party',
          (items) => {
            if (items.length === 0) return
            clearTimeout(timer)
            resolve(items)
          },
          (error) => {
            clearTimeout(timer)
            reject(error)
          },
        )
      })
      assert.deepEqual(
        items.map((item) => item.id),
        ['current', 'later'],
      )
    } finally {
      unsubscribe?.()
    }
  },
)
