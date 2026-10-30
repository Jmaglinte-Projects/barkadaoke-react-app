import { lazy, Suspense } from 'react'
import { BrowserRouter, Navigate, useRoutes } from 'react-router-dom'

import { AppLayout } from '@/components/layout/AppLayout'
import { AuthLayout } from '@/components/layout/AuthLayout'
import { LandingPage } from '@/pages/LandingPage'

const CreateRoomPage = lazy(() =>
  import('@/pages/CreateRoomPage').then((module) => ({
    default: module.CreateRoomPage,
  })),
)
const GuestRoomPage = lazy(() =>
  import('@/pages/GuestRoomPage').then((module) => ({
    default: module.GuestRoomPage,
  })),
)
const HomePage = lazy(() =>
  import('@/pages/HomePage').then((module) => ({ default: module.HomePage })),
)
const HostRoomPage = lazy(() =>
  import('@/pages/HostRoomPage').then((module) => ({
    default: module.HostRoomPage,
  })),
)
const JoinRoomPage = lazy(() =>
  import('@/pages/JoinRoomPage').then((module) => ({
    default: module.JoinRoomPage,
  })),
)
const RemoteControlPage = lazy(() =>
  import('@/pages/RemoteControlPage').then((module) => ({
    default: module.RemoteControlPage,
  })),
)
const SavedSongsPage = lazy(() =>
  import('@/pages/SavedSongsPage').then((module) => ({
    default: module.SavedSongsPage,
  })),
)

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
      <Suspense
        fallback={
          <p role="status" className="p-6 text-sm text-body">
            Loading…
          </p>
        }
      >
        <AppRoutes />
      </Suspense>
    </BrowserRouter>
  )
}
