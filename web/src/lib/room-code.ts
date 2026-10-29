const ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'

export function generateRoomCode(length = 6): string {
  const values = crypto.getRandomValues(new Uint32Array(length))
  return Array.from(values, (value) => ALPHABET[value % ALPHABET.length]).join(
    '',
  )
}

export function normalizeRoomCode(code: string): string {
  return code
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
}

export function getRoomJoinUrl(roomCode: string): string {
  const appUrl = (
    import.meta.env.VITE_APP_URL ||
    (typeof window !== 'undefined' ? window.location.origin : '')
  ).replace(/\/$/, '')

  return appUrl ? `${appUrl}/join/${roomCode}` : `/join/${roomCode}`
}
