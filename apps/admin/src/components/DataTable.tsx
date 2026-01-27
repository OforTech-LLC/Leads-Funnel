'use client';

/**
 * Reusable Data Table
 *
 * Supports sorting, column definitions, row click handling, and loading states.
 */

import { cn } from '@/lib/utils';
import LoadingSpinner from './LoadingSpinner';

export interface Column<T> {
  key: string;
  header: string;
  sortable?: boolean;
  width?: string;
  render?: (row: T) => React.ReactNode;
  className?: string;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  loading?: boolean;
  emptyMessage?: string;
  sortField?: string;
  sortOrder?: 'asc' | 'desc';
  onSort?: (field: string) => void;
  onRowClick?: (row: T) => void;
  rowKey: (row: T) => string;
  selectedRows?: Set<string>;
  onSelectRow?: (key: string) => void;
  onSelectAll?: () => void;
}

export default function DataTable<T>({
  columns,
  data,
  loading,
  emptyMessage = 'No data found.',
  sortField,
  sortOrder,
  onSort,
  onRowClick,
  rowKey,
  selectedRows,
  onSelectRow,
  onSelectAll,
}: DataTableProps<T>) {
  const showCheckbox = !!onSelectRow;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <LoadingSpinner />
      </div>
    );
  }

  if (data.length === 0) {
    return <div className="text-center py-16 text-[var(--text-secondary)]">{emptyMessage}</div>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-[var(--border-color)]">
            {showCheckbox && (
              <th className="px-4 py-3 text-left w-10">
                <input
                  type="checkbox"
                  onChange={onSelectAll}
                  checked={
                    selectedRows ? selectedRows.size === data.length && data.length > 0 : false
                  }
                  className="rounded border-gray-300"
                />
              </th>
            )}
            {columns.map((col) => (
              <th
                key={col.key}
                className={cn(
                  'px-4 py-3 text-left font-medium text-[var(--text-secondary)] whitespace-nowrap',
                  col.sortable && 'cursor-pointer select-none hover:text-[var(--text-primary)]',
                  col.width,
                  col.className
                )}
                onClick={() => col.sortable && onSort?.(col.key)}
              >
                <span className="inline-flex items-center gap-1">
                  {col.header}
                  {col.sortable && sortField === col.key && (
                    <span className="text-xs">{sortOrder === 'asc' ? '\u2191' : '\u2193'}</span>
                  )}
                </span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row) => {
            const key = rowKey(row);
            const isSelected = selectedRows?.has(key);
            return (
              <tr
                key={key}
                onClick={() => onRowClick?.(row)}
                className={cn(
                  'border-b border-[var(--border-color)] transition-colors',
                  onRowClick && 'cursor-pointer hover:bg-[var(--bg-tertiary)]',
                  isSelected && 'bg-blue-50 dark:bg-blue-900/20'
                )}
              >
                {showCheckbox && (
                  <td className="px-4 py-3">
                    <input
                      type="checkbox"
                      checked={isSelected || false}
                      onChange={(e) => {
                        e.stopPropagation();
                        onSelectRow?.(key);
                      }}
                      className="rounded border-gray-300"
                    />
                  </td>
                )}
                {columns.map((col) => (
                  <td key={col.key} className={cn('px-4 py-3', col.className)}>
                    {col.render
                      ? col.render(row)
                      : String((row as Record<string, unknown>)[col.key] ?? '')}
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
