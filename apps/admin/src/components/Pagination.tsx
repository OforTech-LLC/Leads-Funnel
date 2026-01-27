'use client';

/**
 * Cursor-Based Pagination Controls
 *
 * Supports both cursor-based (next token) and offset-based pagination.
 */

interface PaginationProps {
  /** Total number of items (if known) */
  total?: number;
  /** Current page size */
  pageSize: number;
  /** Whether there is a next page */
  hasNext: boolean;
  /** Whether there is a previous page */
  hasPrev: boolean;
  /** Callback for next page */
  onNext: () => void;
  /** Callback for previous page */
  onPrev: () => void;
  /** Current page number (for display) */
  currentPage?: number;
  /** Callback to change page size */
  onPageSizeChange?: (size: number) => void;
}

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100];

export default function Pagination({
  total,
  pageSize,
  hasNext,
  hasPrev,
  onNext,
  onPrev,
  currentPage,
  onPageSizeChange,
}: PaginationProps) {
  return (
    <div className="flex items-center justify-between px-4 py-3 border-t border-[var(--border-color)]">
      <div className="flex items-center gap-4">
        {total !== undefined && (
          <span className="text-sm text-[var(--text-secondary)]">
            {total} total result{total !== 1 ? 's' : ''}
          </span>
        )}
        {onPageSizeChange && (
          <div className="flex items-center gap-2">
            <label className="text-sm text-[var(--text-secondary)]">Show:</label>
            <select
              value={pageSize}
              onChange={(e) => onPageSizeChange(Number(e.target.value))}
              className="text-sm border border-[var(--border-color)] rounded px-2 py-1 bg-[var(--card-bg)] text-[var(--text-primary)]"
            >
              {PAGE_SIZE_OPTIONS.map((size) => (
                <option key={size} value={size}>
                  {size}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      <div className="flex items-center gap-2">
        {currentPage !== undefined && (
          <span className="text-sm text-[var(--text-secondary)] mr-2">Page {currentPage}</span>
        )}
        <button
          onClick={onPrev}
          disabled={!hasPrev}
          className="px-3 py-1.5 text-sm border border-[var(--border-color)] rounded-md disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[var(--bg-tertiary)] transition-colors text-[var(--text-primary)]"
        >
          Previous
        </button>
        <button
          onClick={onNext}
          disabled={!hasNext}
          className="px-3 py-1.5 text-sm border border-[var(--border-color)] rounded-md disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[var(--bg-tertiary)] transition-colors text-[var(--text-primary)]"
        >
          Next
        </button>
      </div>
    </div>
  );
}
