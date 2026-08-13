import { Outlet, useLocation } from 'react-router-dom'

import { AppNav } from '@/components/layout/AppNav'
import { useMediaQuery } from '@/hooks/useMediaQuery'

const HOST_ROOM_PATH = /\/room\/[^/]+\/host\/?$/

export function AppLayout() {
  const { pathname } = useLocation()
  const isCompactLandscape = useMediaQuery(
    '(orientation: landscape) and (max-height: 500px)',
  )
  const hideNav = HOST_ROOM_PATH.test(pathname) && isCompactLandscape

  return (
    <div className="min-h-svh bg-background">
      {hideNav ? null : <AppNav />}
      <Outlet />
    </div>
  )
}
