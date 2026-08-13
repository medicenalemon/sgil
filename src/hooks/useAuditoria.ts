import { useCallback } from 'react'
import { supabase, isSupabaseConfigured } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import type { Auditoria } from '@/lib/types'

/**
 * Hook to log audit trail entries.
 * 
 * In demo mode, logs to console and localStorage.
 * In production, writes to the `auditorias` table in Supabase.
 */
export function useAuditoria() {
  const { user } = useAuth()

  const logAuditoria = useCallback(
    async (
      modulo: string,
      accion: string,
      detalle?: Record<string, unknown>
    ) => {
      const entry: Omit<Auditoria, 'id' | 'usuario'> = {
        usuario_id: user?.id ?? 'unknown',
        fecha: new Date().toISOString(),
        modulo,
        accion,
        detalle: detalle ?? null,
      }

      if (!isSupabaseConfigured) {
        // Demo mode: store in localStorage
        const existing = JSON.parse(localStorage.getItem('sgil_auditorias') ?? '[]')
        existing.unshift({
          id: existing.length + 1,
          ...entry,
          usuario: user ? { username: user.username, role: user.role } : null,
        })
        // Keep only last 500 entries
        if (existing.length > 500) existing.length = 500
        localStorage.setItem('sgil_auditorias', JSON.stringify(existing))
        console.log(`[Auditoría] ${modulo} — ${accion}`, detalle)
        return
      }

      // Production: write to Supabase
      try {
        await supabase.from('auditorias').insert(entry)
      } catch (err) {
        console.error('Error logging audit entry:', err)
      }
    },
    [user]
  )

  return { logAuditoria }
}
