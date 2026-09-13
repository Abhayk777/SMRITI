import { createContext, useCallback, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { useQueryClient } from '@tanstack/react-query'

import * as db from '@/lib/db.ts'
import type { Session } from '@/lib/db.ts'

export type AuthContextValue = {
  session: Session | null
  userId: string | null
  /** True until the initial session lookup has settled. */
  loading: boolean
  sendOtp: (phone: string) => Promise<void>
  verifyOtp: (phone: string, token: string) => Promise<void>
  signInWithGoogle: () => Promise<void>
  signOut: () => Promise<void>
}

export const AuthContext = createContext<AuthContextValue | null>(null)

/**
 * Session context (frontend.md §3, §14).
 *
 * The Supabase SDK owns the session and its refresh; this provider is a thin
 * subscription over it, not a second copy of the truth. The one piece of real
 * logic is in `signOut`: the entire query cache is dropped on the way out.
 * Leaving a previous account's patients, medicines and memos sitting in memory
 * for whoever signs in next on a shared laptop is the same class of failure as
 * the cross-patient leaks §12 is about, and the fix is the same — evict, don't
 * hope the keys differ.
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const queryClient = useQueryClient()

  useEffect(() => {
    let active = true

    void db.getSession().then(({ data }) => {
      if (!active) return
      setSession(data.session ?? null)
      setLoading(false)
    })

    const { data } = db.onAuthStateChange((next) => {
      if (!active) return
      setSession(next)
      setLoading(false)
    })

    return () => {
      active = false
      data.subscription.unsubscribe()
    }
  }, [])

  const sendOtp = useCallback(async (phone: string) => {
    const { error } = await db.signInWithOtp(phone)
    if (error) throw error
  }, [])

  const verifyOtp = useCallback(async (phone: string, token: string) => {
    const { error } = await db.verifyOtp(phone, token)
    if (error) throw error
  }, [])

  const signInWithGoogle = useCallback(async () => {
    const { error } = await db.signInWithGoogle()
    if (error) throw error
  }, [])

  const signOut = useCallback(async () => {
    await db.signOut()
    queryClient.clear()
  }, [queryClient])

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      userId: session?.user?.id ?? null,
      loading,
      sendOtp,
      verifyOtp,
      signInWithGoogle,
      signOut,
    }),
    [session, loading, sendOtp, verifyOtp, signInWithGoogle, signOut],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
