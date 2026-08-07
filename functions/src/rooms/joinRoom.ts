import { getFirestore, FieldValue } from 'firebase-admin/firestore'
import { HttpsError, onCall } from 'firebase-functions/v2/https'
import { logger } from 'firebase-functions'

export const MAX_ROOM_MEMBERS = 5

type JoinRoomRequest = {
  roomId?: string
  roomCode?: string
}

type JoinRoomResponse = {
  roomId: string
  name: string
  roomCode: string
  hostUserId: string
  status: string
  memberCount: number
  alreadyMember: boolean
}

function normalizeRoomCode(code: string): string {
  return code.trim().toUpperCase().replace(/[^A-Z0-9]/g, '')
}

export const joinRoom = onCall(
  { cors: true },
  async (request): Promise<JoinRoomResponse> => {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Sign in to join a room.')
    }

    const uid = request.auth.uid
    const displayName =
      request.auth.token.name ||
      request.auth.token.email ||
      'Guest'
    const photoURL =
      typeof request.auth.token.picture === 'string'
        ? request.auth.token.picture
        : null

    const data = (request.data ?? {}) as JoinRoomRequest
    const db = getFirestore()

    let roomId = typeof data.roomId === 'string' ? data.roomId.trim() : ''
    const roomCode = normalizeRoomCode(String(data.roomCode ?? ''))

    if (!roomId && !roomCode) {
      throw new HttpsError(
        'invalid-argument',
        'Provide a room id or room code.',
      )
    }

    if (!roomId && roomCode) {
      const snapshot = await db
        .collection('rooms')
        .where('roomCode', '==', roomCode)
        .where('status', 'in', ['waiting', 'active'])
        .limit(1)
        .get()

      const match = snapshot.docs[0]
      if (!match) {
        throw new HttpsError(
          'not-found',
          'No active room found for that code.',
        )
      }
      roomId = match.id
    }

    const roomRef = db.collection('rooms').doc(roomId)
    const memberRef = roomRef.collection('members').doc(uid)
    const membersRef = roomRef.collection('members')

    try {
      return await db.runTransaction(async (tx) => {
        const roomSnap = await tx.get(roomRef)
        if (!roomSnap.exists) {
          throw new HttpsError('not-found', 'Room not found.')
        }

        const room = roomSnap.data()!
        if (room.status === 'ended') {
          throw new HttpsError(
            'failed-precondition',
            'This room has ended.',
          )
        }

        const existingMember = await tx.get(memberRef)
        if (existingMember.exists) {
          return {
            roomId,
            name: String(room.name ?? 'Karaoke Room'),
            roomCode: String(room.roomCode ?? ''),
            hostUserId: String(room.hostUserId ?? ''),
            status: String(room.status ?? 'active'),
            memberCount: Number(room.memberCount ?? 1),
            alreadyMember: true,
          } satisfies JoinRoomResponse
        }

        // Count current members inside the transaction to avoid race conditions.
        const membersSnap = await tx.get(membersRef)
        if (membersSnap.size >= MAX_ROOM_MEMBERS) {
          throw new HttpsError(
            'resource-exhausted',
            'This room is full.\nMaximum of 5 users are allowed in a room.',
          )
        }

        const role = room.hostUserId === uid ? 'host' : 'guest'
        const nextCount = membersSnap.size + 1

        tx.set(memberRef, {
          userId: uid,
          displayName,
          photoURL,
          role,
          joinedAt: FieldValue.serverTimestamp(),
        })

        tx.update(roomRef, {
          memberCount: nextCount,
          updatedAt: FieldValue.serverTimestamp(),
        })

        return {
          roomId,
          name: String(room.name ?? 'Karaoke Room'),
          roomCode: String(room.roomCode ?? ''),
          hostUserId: String(room.hostUserId ?? ''),
          status: String(room.status ?? 'active'),
          memberCount: nextCount,
          alreadyMember: false,
        } satisfies JoinRoomResponse
      })
    } catch (error) {
      if (error instanceof HttpsError) throw error
      logger.error('joinRoom transaction failed', error)
      throw new HttpsError('internal', 'Failed to join room. Try again.')
    }
  },
)
