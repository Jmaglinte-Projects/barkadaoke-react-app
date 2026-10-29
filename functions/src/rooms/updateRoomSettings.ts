import { FieldValue, getFirestore } from 'firebase-admin/firestore'
import { HttpsError, onCall } from 'firebase-functions/v2/https'
import { validateRoomSettings, validateSongLimit } from './limits'

export const updateRoomSettings = onCall({ cors: true }, async (request) => {
  if (!request.auth)
    throw new HttpsError('unauthenticated', 'Sign in to manage a room.')
  const { roomId, settings, memberSongLimits = [] } = request.data ?? {}
  if (typeof roomId !== 'string' || !roomId || roomId.includes('/'))
    throw new HttpsError('invalid-argument', 'Provide a valid room id.')
  const validatedSettings = validateRoomSettings(settings)
  if (!Array.isArray(memberSongLimits))
    throw new HttpsError('invalid-argument', 'Provide valid member allowances.')
  const overrides = memberSongLimits.map((entry: unknown) => {
    if (!entry || typeof entry !== 'object')
      throw new HttpsError('invalid-argument', 'Invalid member allowance.')
    const { userId, limit } = entry as Record<string, unknown>
    if (typeof userId !== 'string' || !userId || userId.includes('/'))
      throw new HttpsError('invalid-argument', 'Invalid member id.')
    return {
      userId,
      limit:
        limit === 'default'
          ? ('default' as const)
          : validateSongLimit(limit, 'Member allowance'),
    }
  })
  if (new Set(overrides.map((entry) => entry.userId)).size !== overrides.length)
    throw new HttpsError('invalid-argument', 'Duplicate member allowances.')
  const db = getFirestore()
  const roomRef = db.collection('rooms').doc(roomId)
  await db.runTransaction(async (tx) => {
    const room = await tx.get(roomRef)
    if (!room.exists) throw new HttpsError('not-found', 'Room not found.')
    if (room.data()!.hostUserId !== request.auth!.uid)
      throw new HttpsError(
        'permission-denied',
        'Only the host can change room settings.',
      )
    if (room.data()!.status === 'ended')
      throw new HttpsError('failed-precondition', 'This room has ended.')
    const memberRefs = overrides.map((entry) =>
      roomRef.collection('members').doc(entry.userId),
    )
    const members = memberRefs.length ? await tx.getAll(...memberRefs) : []
    if (members.some((member) => !member.exists))
      throw new HttpsError(
        'failed-precondition',
        'A participant has left. Reopen settings and try again.',
      )
    tx.update(roomRef, {
      settings: validatedSettings,
      updatedAt: FieldValue.serverTimestamp(),
    })
    overrides.forEach((entry, index) => {
      tx.update(memberRefs[index], {
        songLimitOverride:
          entry.limit === 'default' ? FieldValue.delete() : entry.limit,
      })
      const allowanceRef = roomRef
        .collection('songAllowances')
        .doc(entry.userId)
      if (entry.limit === 'default') tx.delete(allowanceRef)
      else tx.set(allowanceRef, { limit: entry.limit })
    })
  })
  return { settings: validatedSettings }
})
