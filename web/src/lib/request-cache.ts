/** Share pending requests and optionally reuse successful results for a short TTL. */
export function createRequestCache({
  ttlMs = 0,
  maxEntries = 30,
}: {
  ttlMs?: number
  maxEntries?: number
} = {}) {
  const entries = new Map<
    string,
    { promise: Promise<unknown>; expiresAt: number }
  >()

  return function request<T>(key: string, load: () => Promise<T>): Promise<T> {
    const existing = entries.get(key)
    if (existing && existing.expiresAt > Date.now()) {
      return existing.promise as Promise<T>
    }

    const entry = {
      promise: Promise.resolve().then(load),
      expiresAt: Infinity,
    }
    entries.delete(key)
    entries.set(key, entry)
    while (entries.size > maxEntries) {
      entries.delete(entries.keys().next().value!)
    }

    void entry.promise.then(
      () => {
        if (entries.get(key) !== entry) return
        if (ttlMs > 0) entry.expiresAt = Date.now() + ttlMs
        else entries.delete(key)
      },
      () => {
        // A failed request must remain retryable.
        if (entries.get(key) === entry) entries.delete(key)
      },
    )
    return entry.promise
  }
}
