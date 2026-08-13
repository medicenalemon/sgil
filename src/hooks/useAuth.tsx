import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import type { ReactNode } from 'react'
import { supabase } from '@/lib/supabase'
import type { Profile } from '@/lib/types'
import type { UserRole } from '@/lib/permissions'

// ============================================
// Auth Context
// ============================================

interface AuthContextType {
  user: Profile | null
  loading: boolean
  login: (username: string, password: string) => Promise<{ error?: string }>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)

  // Check for existing session on mount
  useEffect(() => {
    // Check Supabase session
    const checkSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (session?.user) {
          const { data: rawProfile } = await supabase
            .from('profiles')
            .select('*, roles(nombre)')
            .eq('id', session.user.id)
            .single()
          
          if (rawProfile) {
            const profile: Profile = {
              ...rawProfile,
              role: rawProfile.roles?.nombre || 'vendedor'
            }
            setUser(profile)
          }
        }
      } catch (err) {
        console.error('Error checking session:', err)
      } finally {
        setLoading(false)
      }
    }

    checkSession()

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        if (session?.user) {
          const { data: rawProfile } = await supabase
            .from('profiles')
            .select('*, roles(nombre)')
            .eq('id', session.user.id)
            .single()
          
          if (rawProfile) {
            const profile: Profile = {
              ...rawProfile,
              role: rawProfile.roles?.nombre || 'vendedor'
            }
            setUser(profile)
          }
        } else {
          setUser(null)
        }
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  const login = useCallback(async (username: string, password: string): Promise<{ error?: string }> => {
    // Supabase auth — map username to email
    const email = `${username.toLowerCase()}@sgil.local`
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    
    if (error) {
      if (error.message.includes('Invalid login credentials')) {
        return { error: 'Usuario o contraseña incorrectos' }
      }
      return { error: error.message }
    }

    return {}
  }, [])

  const logout = useCallback(async () => {
    await supabase.auth.signOut()
    setUser(null)
  }, [])

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

export function useUserRole(): UserRole {
  const { user } = useAuth()
  return user?.role ?? 'vendedor'
}
