/**
 * Standardized API response envelope types for error and success responses.
 */

export type ErrorCode =
  | 'VALIDATION_ERROR'
  | 'NOT_FOUND'
  | 'FORBIDDEN'
  | 'UNAUTHORIZED'
  | 'RATE_LIMITED'
  | 'INTERNAL_ERROR'
  | 'FEATURE_DISABLED';

export interface ApiErrorResponse {
  error: {
    code: ErrorCode;
    message: string;
    details?: Record<string, unknown>;
  };
}

export interface ApiSuccessResponse<T> {
  data: T;
}
