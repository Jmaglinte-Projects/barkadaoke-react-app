import { Outlet } from 'react-router-dom'

import { AuthGate } from '@/components/auth/AuthGate'

type AuthLayoutProps = {
  redirectTo?: string
}

export function AuthLayout({ redirectTo }: AuthLayoutProps) {
  return (
    <AuthGate redirectTo={redirectTo}>
      <Outlet />
    </AuthGate>
  )
}
