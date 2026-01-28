/**
 * Standardized API response envelope types for error and success responses.
 */

/**
 * Const enum-like object for API error codes.
 * Use `ApiErrorCodes.VALIDATION` instead of hardcoding `'VALIDATION_ERROR'`.
 */
export const ApiErrorCodes = {
  VALIDATION: 'VALIDATION_ERROR',
  NOT_FOUND: 'NOT_FOUND',
  FORBIDDEN: 'FORBIDDEN',
  AUTH: 'UNAUTHORIZED',
  RATE_LIMIT: 'RATE_LIMITED',
  INTERNAL: 'INTERNAL_ERROR',
  FEATURE_DISABLED: 'FEATURE_DISABLED',
} as const;

/** Union type derived from ApiErrorCodes values. */
export type ApiErrorCode = (typeof ApiErrorCodes)[keyof typeof ApiErrorCodes];

/**
 * @deprecated Use `ApiErrorCode` instead. Kept for backward compatibility.
 */
export type ErrorCode = ApiErrorCode;

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
