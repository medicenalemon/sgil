import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    'Supabase URL or Anon Key not found. Running in demo mode with mock data.'
  )
}

export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder-key'
)

/**
 * Admin Auth API — routes through the Vite dev‑server proxy
 * so the service_role key never reaches the browser.
 */
export const adminAuthApi = {
  createUser: async (userData: { email: string, password?: string, email_confirm?: boolean, user_metadata?: any }) => {
    const res = await fetch('/api/admin-auth/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(userData)
    })
    if (!res.ok) {
      const err = await res.json()
      throw new Error(err.message || err.msg || 'Error al crear usuario')
    }
    return res.json()
  },
  updateUserById: async (uid: string, data: { password?: string }) => {
    const res = await fetch(`/api/admin-auth/users/${uid}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    })
    if (!res.ok) {
      const err = await res.json()
      throw new Error(err.message || err.msg || 'Error al actualizar usuario')
    }
    return res.json()
  }
}

/** Whether Supabase is properly configured */
export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey)
