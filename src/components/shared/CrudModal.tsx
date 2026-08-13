import { X } from 'lucide-react'
import { createPortal } from 'react-dom'
import type { ReactNode } from 'react'

interface CrudModalProps {
  open: boolean
  title: string
  subtitle?: string
  children: ReactNode
  onClose: () => void
  footer?: ReactNode
  maxWidth?: number
}

/**
 * Generic CRUD modal matching the reference design:
 * white background, rounded corners, dark overlay, close button.
 * Uses React Portal to render at document.body level, ensuring
 * the overlay covers the entire viewport (including sidebar).
 */
export default function CrudModal({
  open,
  title,
  subtitle,
  children,
  onClose,
  footer,
  maxWidth = 600,
}: CrudModalProps) {
  if (!open) return null

  return createPortal(
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-content relative"
        style={{ maxWidth, padding: '32px' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-md transition-colors cursor-pointer"
          style={{
            color: 'var(--color-text-muted)',
            background: 'transparent',
            border: 'none',
          }}
          onMouseEnter={(e) => {
            ;(e.currentTarget as HTMLElement).style.background = 'var(--color-surface-tertiary)'
          }}
          onMouseLeave={(e) => {
            ;(e.currentTarget as HTMLElement).style.background = 'transparent'
          }}
        >
          <X size={20} />
        </button>

        {/* Header */}
        <div>
          <h2 className="text-xl font-bold" style={{ color: 'var(--color-text-primary)' }}>
            {title}
          </h2>
          {subtitle && (
            <p className="text-sm mt-1" style={{ color: 'var(--color-text-secondary)' }}>
              {subtitle}
            </p>
          )}
        </div>

        {/* Body */}
        <div style={{ marginTop: '24px' }}>{children}</div>

        {/* Footer */}
        {footer && (
          <div className="flex justify-end items-center gap-3 w-full" style={{ marginTop: '32px' }}>
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body
  )
}
