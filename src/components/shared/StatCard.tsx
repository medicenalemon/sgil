import type { StatCardData } from '@/lib/types'

interface StatCardProps extends StatCardData {
  className?: string
}

/**
 * Stat card displayed at the top of module pages.
 * Shows a metric with icon, value, label, and optional trend indicator.
 */
export default function StatCard({ title, value, icon, color, trend, className = '' }: StatCardProps) {
  return (
    <div className={`stat-card ${className}`}>
      <div className="flex items-center gap-4">
        <div
          className="flex items-center justify-center rounded-xl shrink-0"
          style={{
            width: 48,
            height: 48,
            background: color ? `${color}15` : 'var(--color-primary-50)',
            color: color || 'var(--color-primary-600)',
          }}
        >
          {icon}
        </div>
        <div>
          <p
            className="text-sm font-medium mb-1"
            style={{ color: 'var(--color-text-secondary)' }}
          >
            {title}
          </p>
          <p className="text-xl font-bold" style={{ color: color || 'var(--color-text-primary)' }}>
            {value}
          </p>
          {trend && (
            <p
              className="text-xs mt-1 font-medium"
              style={{ color: trend.positive ? 'var(--color-success-600)' : 'var(--color-danger-600)' }}
            >
              {trend.positive ? '↑' : '↓'} {Math.abs(trend.value)}%
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
