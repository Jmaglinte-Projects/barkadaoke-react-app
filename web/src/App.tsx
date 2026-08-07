import { AppRouter } from '@/app/router'
import { Toaster } from '@/components/ui/sonner'
import { ActiveRoomProvider } from '@/hooks/useActiveRoom'
import { AuthProvider } from '@/hooks/useAuth'

export default function App() {
  return (
    <AuthProvider>
      <ActiveRoomProvider>
        <div className="dark min-h-svh">
          <AppRouter />
          <Toaster theme="dark" position="top-center" />
        </div>
      </ActiveRoomProvider>
    </AuthProvider>
  )
}
