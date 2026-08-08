const STORAGE_KEY = 'barkadaoke.deviceId'

/** Stable per-tab device id for player presence heartbeats. */
export function getDeviceId(): string {
  try {
    const existing = sessionStorage.getItem(STORAGE_KEY)
    if (existing) return existing
    const next =
      typeof crypto !== 'undefined' && 'randomUUID' in crypto
        ? crypto.randomUUID()
        : `device-${Date.now()}-${Math.random().toString(36).slice(2)}`
    sessionStorage.setItem(STORAGE_KEY, next)
    return next
  } catch {
    return `device-${Date.now()}`
  }
}
