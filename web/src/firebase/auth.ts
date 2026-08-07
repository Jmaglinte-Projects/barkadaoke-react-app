import {
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithPopup,
  signOut as firebaseSignOut,
  type User,
  type Unsubscribe,
} from 'firebase/auth'

import { getFirebaseAuth } from '@/firebase/config'
import type { UserProfile } from '@/types/user'

const googleProvider = new GoogleAuthProvider()
googleProvider.setCustomParameters({ prompt: 'select_account' })

export function mapFirebaseUser(user: User): UserProfile {
  return {
    uid: user.uid,
    displayName: user.displayName ?? 'Singer',
    email: user.email ?? '',
    photoURL: user.photoURL ?? undefined,
  }
}

export async function signInWithGoogle(): Promise<UserProfile> {
  const result = await signInWithPopup(getFirebaseAuth(), googleProvider)
  return mapFirebaseUser(result.user)
}

export async function signOutUser(): Promise<void> {
  await firebaseSignOut(getFirebaseAuth())
}

export function subscribeToAuth(
  onChange: (user: UserProfile | null) => void,
): Unsubscribe {
  return onAuthStateChanged(getFirebaseAuth(), (user) => {
    onChange(user ? mapFirebaseUser(user) : null)
  })
}
