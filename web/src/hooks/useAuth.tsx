import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { toast } from 'sonner'

import {
  mapFirebaseUser,
  signInWithGoogle,
  signOutUser,
  subscribeToAuth,
} from '@/firebase/auth'
import { isFirebaseConfigured } from '@/firebase/config'
import { MOCK_USER } from '@/lib/mock-data'
import type { UserProfile } from '@/types/user'

type AuthContextValue = {
  user: UserProfile | null
  isAuthenticated: boolean
  isLoading: boolean
  isMockAuth: boolean
  signIn: () => Promise<void>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

const MOCK_AUTH_KEY = 'barkadaoke.mockAuth'

function readMockUser(): UserProfile | null {
  try {
    return localStorage.getItem(MOCK_AUTH_KEY) === '1' ? MOCK_USER : null
  } catch {
    return null
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const isMockAuth = !isFirebaseConfigured

  useEffect(() => {
    if (isMockAuth) {
      setUser(readMockUser())
      setIsLoading(false)
      return
    }

    const unsubscribe = subscribeToAuth((nextUser) => {
      setUser(nextUser)
      setIsLoading(false)
    })

    return unsubscribe
  }, [isMockAuth])

  const signIn = useCallback(async () => {
    if (isMockAuth) {
      try {
        localStorage.setItem(MOCK_AUTH_KEY, '1')
      } catch {
        // ignore storage failures in private mode
      }
      setUser(MOCK_USER)
      toast.message('Signed in with mock user (Firebase not configured)')
      return
    }

    try {
      const profile = await signInWithGoogle()
      setUser(profile)
      toast.success(`Welcome, ${profile.displayName}`)
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Google sign-in failed'
      toast.error(message)
      throw error
    }
  }, [isMockAuth])

  const signOut = useCallback(async () => {
    if (isMockAuth) {
      try {
        localStorage.removeItem(MOCK_AUTH_KEY)
      } catch {
        // ignore
      }
      setUser(null)
      return
    }

    try {
      await signOutUser()
      setUser(null)
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Sign out failed'
      toast.error(message)
      throw error
    }
  }, [isMockAuth])

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isAuthenticated: Boolean(user),
      isLoading,
      isMockAuth,
      signIn,
      signOut,
    }),
    [user, isLoading, isMockAuth, signIn, signOut],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return context
}

/** Re-export for callers that already have a Firebase User */
export { mapFirebaseUser }
