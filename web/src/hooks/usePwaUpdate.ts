import { useRegisterSW } from 'virtual:pwa-register/react'

const CHECK_INTERVAL_MS = 30 * 60 * 1000

let updateChecksStarted = false

async function checkForUpdate(
  swUrl: string,
  registration: ServiceWorkerRegistration,
) {
  if (registration.installing || !navigator) return
  if ('onLine' in navigator && !navigator.onLine) return

  try {
    const response = await fetch(swUrl, {
      cache: 'no-store',
      headers: { 'cache-control': 'no-cache' },
    })
    if (response.status === 200) await registration.update()
  } catch {
    // Offline or blocked — try again on the next interval.
  }
}

function startUpdateChecks(
  swUrl: string,
  registration: ServiceWorkerRegistration,
) {
  if (updateChecksStarted) return
  updateChecksStarted = true

  const check = () => {
    void checkForUpdate(swUrl, registration)
  }

  window.setInterval(check, CHECK_INTERVAL_MS)
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') check()
  })
}

export function usePwaUpdate() {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(swUrl, registration) {
      if (registration) startUpdateChecks(swUrl, registration)
    },
  })

  return {
    needRefresh,
    dismissUpdate: () => setNeedRefresh(false),
    applyUpdate: () => {
      void updateServiceWorker(true)
    },
  }
}
