import { FieldValue, getFirestore } from 'firebase-admin/firestore'
import { HttpsError, onCall } from 'firebase-functions/v2/https'
import { catalogSongId } from '../catalog/normalize'
import { assertQueueCapacity, readRoomSettings } from '../rooms/limits'

/** All queue additions go through this transaction, including the host's. */
export const addSongToQueue = onCall({ cors: true }, async (request) => {
  if (!request.auth)
    throw new HttpsError('unauthenticated', 'Sign in to add a song.')
  const { roomId, videoId, title } = request.data ?? {}
  if (
    typeof roomId !== 'string' ||
    !roomId ||
    roomId.includes('/') ||
    typeof videoId !== 'string' ||
    !/^[A-Za-z0-9_-]{11}$/.test(videoId) ||
    typeof title !== 'string' ||
    !title.trim() ||
    title.length > 500
  ) {
    throw new HttpsError('invalid-argument', 'Provide a valid room and song.')
  }
  const db = getFirestore()
  const roomRef = db.collection('rooms').doc(roomId)
  const queueRef = roomRef.collection('queue')
  const songRef = queueRef.doc()
  const uid = request.auth.uid
  await db.runTransaction(async (tx) => {
    const [room, member] = await tx.getAll(
      roomRef,
      roomRef.collection('members').doc(uid),
    )
    if (!room.exists) throw new HttpsError('not-found', 'Room not found.')
    if (!member.exists)
      throw new HttpsError(
        'permission-denied',
        'Join this room before adding songs.',
      )
    if (!['active', 'waiting'].includes(room.data()!.status))
      throw new HttpsError('failed-precondition', 'This room has ended.')
    const waiting = await tx.get(queueRef.where('status', '==', 'queued'))
    const personalCount = waiting.docs.filter(
      (song) => song.data().singerUserId === uid,
    ).length
    assertQueueCapacity(
      readRoomSettings(room.data()!.settings),
      member.data()!.songLimitOverride,
      waiting.size,
      personalCount,
    )
    const last = await tx.get(queueRef.orderBy('order', 'desc').limit(1))
    const catalog = await tx.get(
      db.collection('songs').doc(catalogSongId(videoId)),
    )
    if (catalog.exists && catalog.data()!.available === false)
      throw new HttpsError(
        'not-found',
        'This video is no longer available on YouTube.',
      )
    tx.create(songRef, {
      youtubeVideoId: videoId,
      title:
        typeof catalog.data()?.title === 'string'
          ? catalog.data()!.title
          : title.trim(),
      thumbnailUrl: `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
      singerUserId: uid,
      singerName: String(
        member.data()!.displayName ?? request.auth!.token.name ?? 'Singer',
      ),
      singerPhotoURL: member.data()!.photoURL ?? null,
      status: 'queued',
      order: Number(last.docs[0]?.data().order ?? 0) + 1,
      createdAt: FieldValue.serverTimestamp(),
    })
    // Serialize additions against the room as well as the queue queries, so
    // concurrent tabs and changes to settings always recheck the same capacity.
    tx.update(roomRef, { queueRevision: FieldValue.increment(1) })
  })
  return { queueItemId: songRef.id }
})
