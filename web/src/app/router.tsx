import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'

import { AuthGate } from '@/components/auth/AuthGate'
import { CreateRoomPage } from '@/pages/CreateRoomPage'
import { GuestRoomPage } from '@/pages/GuestRoomPage'
import { HomePage } from '@/pages/HomePage'
import { HostRoomPage } from '@/pages/HostRoomPage'
import { JoinRoomPage } from '@/pages/JoinRoomPage'
import { LandingPage } from '@/pages/LandingPage'
import { RemoteControlPage } from '@/pages/RemoteControlPage'
import { SavedSongsPage } from '@/pages/SavedSongsPage'

export function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/join" element={<JoinRoomPage />} />
        <Route path="/join/:roomCode" element={<JoinRoomPage />} />

        <Route
          path="/home"
          element={
            <AuthGate>
              <HomePage />
            </AuthGate>
          }
        />
        <Route
          path="/create"
          element={
            <AuthGate>
              <CreateRoomPage />
            </AuthGate>
          }
        />
        <Route
          path="/saved"
          element={
            <AuthGate>
              <SavedSongsPage />
            </AuthGate>
          }
        />
        <Route
          path="/room/:roomId"
          element={
            <AuthGate redirectTo="/join">
              <GuestRoomPage />
            </AuthGate>
          }
        />
        <Route
          path="/room/:roomId/host"
          element={
            <AuthGate>
              <HostRoomPage />
            </AuthGate>
          }
        />
        <Route
          path="/room/:roomId/remote"
          element={
            <AuthGate redirectTo="/join">
              <RemoteControlPage />
            </AuthGate>
          }
        />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
