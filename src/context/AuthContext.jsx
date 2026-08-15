import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  // This function wraps the entire app, so it must never throw — if it
  // did, the splash screen would hang forever with no way to recover.
  // maybeSingle() (not single()) means a missing profile row degrades
  // to "no profile" instead of throwing.
  async function loadProfile(userId) {
    if (!userId) {
      setProfile(null)
      return
    }
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle()
      if (error) {
        console.error('Failed to load profile:', error)
        setProfile(null)
        return
      }
      setProfile(data)
    } catch (err) {
      console.error('Unexpected error loading profile:', err)
      setProfile(null)
    }
  }

  useEffect(() => {
    let cancelled = false

    async function init() {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (cancelled) return
        setSession(session)
        await loadProfile(session?.user?.id)
      } catch (err) {
        console.error('Failed to initialize session:', err)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    init()

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      loadProfile(session?.user?.id)
    })

    return () => {
      cancelled = true
      listener.subscription.unsubscribe()
    }
  }, [])

  async function signOut() {
    try {
      await supabase.auth.signOut()
    } catch (err) {
      console.error('Sign out error:', err)
    } finally {
      setProfile(null)
    }
  }

  const value = {
    session,
    user: session?.user ?? null,
    profile,
    // 'admin' = full admin, sees/manages everything.
    // 'district_admin' = scoped admin, sees/manages only their assigned district (enforced by RLS).
    isAdmin: profile?.role === 'admin',
    isDistrictAdmin: profile?.role === 'district_admin',
    isStaff: profile?.role === 'admin' || profile?.role === 'district_admin',
    managedDistrict: profile?.managed_district || null,
    hasPassword: Boolean(profile?.has_password),
    loading,
    signOut,
    refreshProfile: () => loadProfile(session?.user?.id),
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
