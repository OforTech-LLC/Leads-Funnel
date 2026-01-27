/**
 * Cursor-based pagination types for all list endpoints.
 */

export interface PaginationRequest {
  limit?: number;
  cursor?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface PaginationResponse {
  cursor: string | null;
  hasMore: boolean;
}

export interface PaginatedResult<T> {
  items: T[];
  pagination: PaginationResponse;
}
