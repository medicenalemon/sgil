import { useState, useMemo } from 'react'
import { Search, ChevronUp, ChevronDown } from 'lucide-react'
import type { Column } from '@/lib/types'

interface DataTableProps<T> {
  data: T[]
  columns: Column<T>[]
  searchPlaceholder?: string
  searchKeys?: (keyof T)[]
  actions?: (item: T) => React.ReactNode
  actionsHeader?: string
  emptyMessage?: string
  pageSize?: number
  onRowClick?: (item: T) => void
}

/**
 * Reusable data table with search, sort, and pagination.
 * Used across all CRUD modules for consistency.
 */
export default function DataTable<T extends { id: number | string }>({
  data,
  columns,
  searchPlaceholder = 'Buscar...',
  searchKeys = [],
  actions,
  actionsHeader = 'Acciones',
  emptyMessage = 'No se encontraron registros',
  pageSize = 10,
  onRowClick,
}: DataTableProps<T>) {
  const [search, setSearch] = useState('')
  const [sortKey, setSortKey] = useState<string | null>(null)
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')
  const [currentPage, setCurrentPage] = useState(1)

  // Filter
  const filtered = useMemo(() => {
    if (!search.trim()) return data
    const lower = search.toLowerCase()
    return data.filter((item) =>
      searchKeys.some((key) => {
        const val = item[key]
        if (val == null) return false
        return String(val).toLowerCase().includes(lower)
      })
    )
  }, [data, search, searchKeys])

  // Sort
  const sorted = useMemo(() => {
    if (!sortKey) return filtered
    return [...filtered].sort((a, b) => {
      const aVal = (a as Record<string, unknown>)[sortKey]
      const bVal = (b as Record<string, unknown>)[sortKey]
      if (aVal == null && bVal == null) return 0
      if (aVal == null) return 1
      if (bVal == null) return -1
      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return sortDir === 'asc' ? aVal - bVal : bVal - aVal
      }
      const comparison = String(aVal).localeCompare(String(bVal))
      return sortDir === 'asc' ? comparison : -comparison
    })
  }, [filtered, sortKey, sortDir])

  // Paginate
  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize))
  const paginated = sorted.slice((currentPage - 1) * pageSize, currentPage * pageSize)

  const handleSort = (key: string) => {
    if (sortKey === key) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc')
    } else {
      setSortKey(key)
      setSortDir('asc')
    }
  }

  return (
    <div className="card">
      {/* Search bar */}
      {searchKeys.length > 0 && (
        <div 
          className="border-b" 
          style={{ borderColor: 'var(--color-border-light)', padding: '24px' }}
        >
          <div className="relative" style={{ maxWidth: 320 }}>
            <Search
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2"
              style={{ color: 'var(--color-text-muted)' }}
            />
            <input
              type="text"
              className="input"
              style={{ paddingLeft: '2.25rem' }}
              placeholder={searchPlaceholder}
              value={search}
              onChange={(e) => {
                setSearch(e.target.value)
                setCurrentPage(1)
              }}
            />
          </div>
        </div>
      )}

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="data-table">
          <thead>
            <tr>
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={col.className ?? ''}
                  style={{ cursor: col.sortable ? 'pointer' : 'default' }}
                  onClick={() => col.sortable && handleSort(col.key)}
                >
                  <div className="flex items-center gap-1">
                    {col.header}
                    {col.sortable && sortKey === col.key && (
                      sortDir === 'asc'
                        ? <ChevronUp size={14} />
                        : <ChevronDown size={14} />
                    )}
                  </div>
                </th>
              ))}
              {actions && <th style={{ width: 120 }}>{actionsHeader}</th>}
            </tr>
          </thead>
          <tbody>
            {paginated.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length + (actions ? 1 : 0)}
                  className="text-center py-8"
                  style={{ color: 'var(--color-text-muted)' }}
                >
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              paginated.map((item) => (
                <tr
                  key={item.id}
                  onClick={() => onRowClick?.(item)}
                  style={{ cursor: onRowClick ? 'pointer' : 'default' }}
                >
                  {columns.map((col) => (
                    <td key={col.key} className={col.className ?? ''}>
                      {col.render
                        ? col.render(item)
                        : String((item as Record<string, unknown>)[col.key] ?? '')}
                    </td>
                  ))}
                  {actions && (
                    <td>
                      <div className="flex items-center gap-1">
                        {actions(item)}
                      </div>
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div
          className="flex items-center justify-between px-4 py-3 border-t"
          style={{ borderColor: 'var(--color-border-light)' }}
        >
          <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
            Mostrando {(currentPage - 1) * pageSize + 1}–
            {Math.min(currentPage * pageSize, sorted.length)} de {sorted.length} registros
          </p>
          <div className="flex items-center gap-1">
            <button
              className="btn btn-outline btn-sm"
              disabled={currentPage === 1}
              onClick={() => setCurrentPage(currentPage - 1)}
            >
              Anterior
            </button>
            {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
              let page: number
              if (totalPages <= 5) {
                page = i + 1
              } else if (currentPage <= 3) {
                page = i + 1
              } else if (currentPage >= totalPages - 2) {
                page = totalPages - 4 + i
              } else {
                page = currentPage - 2 + i
              }
              return (
                <button
                  key={page}
                  className="btn btn-sm"
                  style={{
                    background: page === currentPage ? 'var(--color-primary-600)' : 'transparent',
                    color: page === currentPage ? 'white' : 'var(--color-text-secondary)',
                    border: page === currentPage ? 'none' : '1px solid var(--color-border)',
                    minWidth: 36,
                  }}
                  onClick={() => setCurrentPage(page)}
                >
                  {page}
                </button>
              )
            })}
            <button
              className="btn btn-outline btn-sm"
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage(currentPage + 1)}
            >
              Siguiente
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
