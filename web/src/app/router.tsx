import { BrowserRouter, Navigate, useRoutes } from 'react-router-dom'

import { AppLayout } from '@/components/layout/AppLayout'
import { AuthLayout } from '@/components/layout/AuthLayout'
import { CreateRoomPage } from '@/pages/CreateRoomPage'
import { GuestRoomPage } from '@/pages/GuestRoomPage'
import { HomePage } from '@/pages/HomePage'
import { HostRoomPage } from '@/pages/HostRoomPage'
import { JoinRoomPage } from '@/pages/JoinRoomPage'
import { LandingPage } from '@/pages/LandingPage'
import { RemoteControlPage } from '@/pages/RemoteControlPage'
import { SavedSongsPage } from '@/pages/SavedSongsPage'

function AppRoutes() {
  return useRoutes([
    {
      element: <AppLayout />,
      children: [
        { path: '/', element: <LandingPage /> },
        { path: '/join', element: <JoinRoomPage /> },
        { path: '/join/:roomCode', element: <JoinRoomPage /> },
        {
          element: <AuthLayout />,
          children: [
            { path: '/home', element: <HomePage /> },
            { path: '/create', element: <CreateRoomPage /> },
            { path: '/saved', element: <SavedSongsPage /> },
            { path: '/room/:roomId/host', element: <HostRoomPage /> },
          ],
        },
        {
          element: <AuthLayout redirectTo="/join" />,
          children: [
            { path: '/room/:roomId', element: <GuestRoomPage /> },
            { path: '/room/:roomId/remote', element: <RemoteControlPage /> },
          ],
        },
      ],
    },
    { path: '*', element: <Navigate to="/" replace /> },
  ])
}

export function AppRouter() {
  return (
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  )
}
