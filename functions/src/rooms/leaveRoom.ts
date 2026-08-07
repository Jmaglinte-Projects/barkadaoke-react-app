import { getFirestore, FieldValue } from 'firebase-admin/firestore'
import { HttpsError, onCall } from 'firebase-functions/v2/https'
import { logger } from 'firebase-functions'

type LeaveRoomRequest = {
  roomId?: string
}

export const leaveRoom = onCall(
  { cors: true },
  async (request): Promise<{ roomId: string }> => {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Sign in to leave a room.')
    }

    const uid = request.auth.uid
    const roomId = String((request.data as LeaveRoomRequest)?.roomId ?? '').trim()
    if (!roomId) {
      throw new HttpsError('invalid-argument', 'Provide a room id.')
    }

    const db = getFirestore()
    const roomRef = db.collection('rooms').doc(roomId)
    const memberRef = roomRef.collection('members').doc(uid)

    try {
      await db.runTransaction(async (tx) => {
        const roomSnap = await tx.get(roomRef)
        if (!roomSnap.exists) {
          throw new HttpsError('not-found', 'Room not found.')
        }

        const room = roomSnap.data()!
        if (room.hostUserId === uid) {
          throw new HttpsError(
            'failed-precondition',
            'Hosts cannot leave. End the room instead.',
          )
        }

        const memberSnap = await tx.get(memberRef)
        if (!memberSnap.exists) {
          return
        }

        const currentCount = Number(room.memberCount ?? 1)
        tx.delete(memberRef)
        tx.update(roomRef, {
          memberCount: Math.max(currentCount - 1, 0),
          updatedAt: FieldValue.serverTimestamp(),
        })
      })

      return { roomId }
    } catch (error) {
      if (error instanceof HttpsError) throw error
      logger.error('leaveRoom transaction failed', error)
      throw new HttpsError('internal', 'Failed to leave room. Try again.')
    }
  },
)
