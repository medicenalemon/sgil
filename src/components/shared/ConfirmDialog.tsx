import { AlertTriangle, X } from 'lucide-react'
import { createPortal } from 'react-dom'
import type { ReactNode } from 'react'

interface ConfirmDialogProps {
  open: boolean
  title?: string
  message: string
  confirmLabel?: ReactNode
  cancelLabel?: ReactNode
  icon?: ReactNode
  variant?: 'danger' | 'warning' | 'primary'
  onConfirm: () => void
  onCancel: () => void
}

/**
 * Confirmation dialog for destructive actions.
 * Matches the reference design with overlay and centered card.
 */
export default function ConfirmDialog({
  open,
  title = '¿Estás seguro?',
  message,
  confirmLabel = 'Confirmar',
  cancelLabel = 'Cancelar',
  icon,
  variant = 'danger',
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  if (!open) return null

  const variantStyles = {
    danger: { bg: 'var(--color-danger-600)', hover: 'var(--color-danger-700)', iconBg: 'var(--color-danger-50)', iconColor: 'var(--color-danger-600)' },
    warning: { bg: 'var(--color-warning-500)', hover: 'var(--color-warning-600)', iconBg: 'var(--color-warning-50)', iconColor: 'var(--color-warning-600)' },
    primary: { bg: 'var(--color-primary-600)', hover: 'var(--color-primary-700)', iconBg: 'var(--color-primary-50)', iconColor: 'var(--color-primary-600)' },
  }[variant]

  return createPortal(
    <div className="modal-overlay" onClick={onCancel}>
      <div
        className="modal-content relative"
        style={{ maxWidth: 420, padding: '1.5rem' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          onClick={onCancel}
          className="absolute top-3 right-3 p-1 rounded-md transition-colors cursor-pointer"
          style={{
            color: 'var(--color-text-muted)',
            background: 'transparent',
            border: 'none',
          }}
        >
          <X size={18} />
        </button>

        <div className="flex flex-col items-center text-center gap-4">
          {/* Icon */}
          <div
            className="flex items-center justify-center rounded-full"
            style={{
              width: 48,
              height: 48,
              background: variantStyles.iconBg,
              color: variantStyles.iconColor,
            }}
          >
            {icon || <AlertTriangle size={24} />}
          </div>

          {/* Content */}
          <div>
            <h3 className="text-lg font-semibold mb-1">{title}</h3>
            <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
              {message}
            </p>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3 w-full mt-2">
            <button className="btn btn-outline flex-1 flex items-center justify-center gap-2" onClick={onCancel}>
              {cancelLabel}
            </button>
            <button
              className="btn flex-1 text-white cursor-pointer flex items-center justify-center gap-2"
              style={{ background: variantStyles.bg }}
              onMouseEnter={(e) => {
                ;(e.currentTarget as HTMLElement).style.background = variantStyles.hover
              }}
              onMouseLeave={(e) => {
                ;(e.currentTarget as HTMLElement).style.background = variantStyles.bg
              }}
              onClick={onConfirm}
            >
              {confirmLabel}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  )
}
