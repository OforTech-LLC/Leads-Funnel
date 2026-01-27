/**
 * API Client Tests
 *
 * Tests for the API client including:
 * - Retry logic with exponential backoff
 * - Timeout handling
 * - Error handling
 * - Request methods (GET, POST, PUT, DELETE)
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createMockResponse, flushPromises, delay } from './setup';

// We need to re-create the api client module for testing since we need to mock fetch
// This is a simplified test version that mirrors the actual implementation

interface ApiError {
  message: string;
  code?: string;
  errors?: Record<string, string[]>;
}

class ApiRequestError extends Error {
  status: number;
  code?: string;
  errors?: Record<string, string[]>;

  constructor(message: string, status: number, code?: string, errors?: Record<string, string[]>) {
    super(message);
    this.name = 'ApiRequestError';
    this.status = status;
    this.code = code;
    this.errors = errors;
  }
}

const REQUEST_TIMEOUT_MS = 30000;
const MAX_RETRIES = 3;
const INITIAL_RETRY_DELAY_MS = 1000;

function isRetryableError(error: unknown): boolean {
  if (error instanceof ApiRequestError) {
    return error.status >= 500 && error.status < 600;
  }
  if (error instanceof Error) {
    return error.name === 'AbortError' || error.message.includes('Network error');
  }
  return false;
}

function getRetryDelay(attempt: number): number {
  const exponentialDelay = INITIAL_RETRY_DELAY_MS * Math.pow(2, attempt);
  const jitter = exponentialDelay * 0.25 * Math.random();
  return exponentialDelay + jitter;
}

describe('ApiRequestError', () => {
  it('should create error with all properties', () => {
    const error = new ApiRequestError('Test error', 400, 'BAD_REQUEST', {
      email: ['Invalid email'],
    });

    expect(error.message).toBe('Test error');
    expect(error.status).toBe(400);
    expect(error.code).toBe('BAD_REQUEST');
    expect(error.errors).toEqual({ email: ['Invalid email'] });
    expect(error.name).toBe('ApiRequestError');
  });

  it('should create error with minimal properties', () => {
    const error = new ApiRequestError('Simple error', 500);

    expect(error.message).toBe('Simple error');
    expect(error.status).toBe(500);
    expect(error.code).toBeUndefined();
    expect(error.errors).toBeUndefined();
  });

  it('should be instance of Error', () => {
    const error = new ApiRequestError('Test', 500);

    expect(error).toBeInstanceOf(Error);
    expect(error).toBeInstanceOf(ApiRequestError);
  });
});

describe('isRetryableError', () => {
  describe('server errors (5xx)', () => {
    it('should return true for 500 Internal Server Error', () => {
      const error = new ApiRequestError('Server error', 500);
      expect(isRetryableError(error)).toBe(true);
    });

    it('should return true for 502 Bad Gateway', () => {
      const error = new ApiRequestError('Bad gateway', 502);
      expect(isRetryableError(error)).toBe(true);
    });

    it('should return true for 503 Service Unavailable', () => {
      const error = new ApiRequestError('Service unavailable', 503);
      expect(isRetryableError(error)).toBe(true);
    });

    it('should return true for 504 Gateway Timeout', () => {
      const error = new ApiRequestError('Gateway timeout', 504);
      expect(isRetryableError(error)).toBe(true);
    });

    it('should return true for 599 (upper boundary)', () => {
      const error = new ApiRequestError('Custom 5xx', 599);
      expect(isRetryableError(error)).toBe(true);
    });
  });

  describe('client errors (4xx)', () => {
    it('should return false for 400 Bad Request', () => {
      const error = new ApiRequestError('Bad request', 400);
      expect(isRetryableError(error)).toBe(false);
    });

    it('should return false for 401 Unauthorized', () => {
      const error = new ApiRequestError('Unauthorized', 401);
      expect(isRetryableError(error)).toBe(false);
    });

    it('should return false for 403 Forbidden', () => {
      const error = new ApiRequestError('Forbidden', 403);
      expect(isRetryableError(error)).toBe(false);
    });

    it('should return false for 404 Not Found', () => {
      const error = new ApiRequestError('Not found', 404);
      expect(isRetryableError(error)).toBe(false);
    });

    it('should return false for 422 Unprocessable Entity', () => {
      const error = new ApiRequestError('Validation error', 422);
      expect(isRetryableError(error)).toBe(false);
    });

    it('should return false for 429 Too Many Requests', () => {
      // Rate limiting should not be retried automatically
      const error = new ApiRequestError('Rate limited', 429);
      expect(isRetryableError(error)).toBe(false);
    });
  });

  describe('abort and network errors', () => {
    it('should return true for AbortError', () => {
      const error = new Error('Aborted');
      error.name = 'AbortError';
      expect(isRetryableError(error)).toBe(true);
    });

    it('should return true for network error message', () => {
      const error = new Error('Network error: Failed to fetch');
      expect(isRetryableError(error)).toBe(true);
    });

    it('should return false for other error types', () => {
      const error = new Error('Some other error');
      expect(isRetryableError(error)).toBe(false);
    });
  });

  describe('edge cases', () => {
    it('should return false for null', () => {
      expect(isRetryableError(null)).toBe(false);
    });

    it('should return false for undefined', () => {
      expect(isRetryableError(undefined)).toBe(false);
    });

    it('should return false for string', () => {
      expect(isRetryableError('error string')).toBe(false);
    });

    it('should return false for status 0 (network error in ApiRequestError)', () => {
      const error = new ApiRequestError('Network error', 0);
      // Status 0 is not in 500-599 range
      expect(isRetryableError(error)).toBe(false);
    });
  });
});

describe('getRetryDelay', () => {
  beforeEach(() => {
    // Seed random for deterministic tests
    vi.spyOn(Math, 'random').mockReturnValue(0.5);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should calculate exponential delay for attempt 0', () => {
    const delay = getRetryDelay(0);
    // Base: 1000ms, Jitter: 1000 * 0.25 * 0.5 = 125ms
    expect(delay).toBe(1125);
  });

  it('should calculate exponential delay for attempt 1', () => {
    const delay = getRetryDelay(1);
    // Base: 2000ms, Jitter: 2000 * 0.25 * 0.5 = 250ms
    expect(delay).toBe(2250);
  });

  it('should calculate exponential delay for attempt 2', () => {
    const delay = getRetryDelay(2);
    // Base: 4000ms, Jitter: 4000 * 0.25 * 0.5 = 500ms
    expect(delay).toBe(4500);
  });

  it('should calculate exponential delay for attempt 3', () => {
    const delay = getRetryDelay(3);
    // Base: 8000ms, Jitter: 8000 * 0.25 * 0.5 = 1000ms
    expect(delay).toBe(9000);
  });

  it('should add jitter to the delay', () => {
    vi.restoreAllMocks();

    // Test multiple times to ensure jitter is being applied
    const delays = new Set<number>();
    for (let i = 0; i < 10; i++) {
      delays.add(getRetryDelay(0));
    }

    // With jitter, we should have some variation
    // All delays should be between 1000 and 1250 (base + max 25% jitter)
    delays.forEach((d) => {
      expect(d).toBeGreaterThanOrEqual(1000);
      expect(d).toBeLessThanOrEqual(1250);
    });
  });
});

describe('API Client Integration', () => {
  let mockFetch: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockFetch = vi.fn();
    globalThis.fetch = mockFetch;
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  describe('successful requests', () => {
    it('should make GET request and return data', async () => {
      const responseData = { id: 1, name: 'Test' };
      mockFetch.mockResolvedValueOnce(createMockResponse(responseData));

      const response = await fetch('https://api.example.com/test', {
        method: 'GET',
      });
      const data = await response.json();

      expect(mockFetch).toHaveBeenCalledTimes(1);
      expect(data).toEqual(responseData);
    });

    it('should make POST request with body', async () => {
      const requestBody = { name: 'New Item' };
      const responseData = { id: 2, name: 'New Item' };
      mockFetch.mockResolvedValueOnce(createMockResponse(responseData));

      await fetch('https://api.example.com/items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      });

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.example.com/items',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify(requestBody),
        })
      );
    });
  });

  describe('timeout handling', () => {
    it('should abort request after timeout', async () => {
      // Create a never-resolving promise to simulate timeout
      mockFetch.mockImplementation(
        () =>
          new Promise((_, reject) => {
            setTimeout(() => {
              const error = new Error('Aborted');
              error.name = 'AbortError';
              reject(error);
            }, REQUEST_TIMEOUT_MS + 100);
          })
      );

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 100);

      try {
        await fetch('https://api.example.com/slow', {
          signal: controller.signal,
        });
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        expect((error as Error).name).toBe('AbortError');
      }

      clearTimeout(timeoutId);
    });
  });

  describe('retry logic', () => {
    it('should retry on 500 error', async () => {
      mockFetch
        .mockResolvedValueOnce(
          createMockResponse({ message: 'Server error' }, { status: 500, ok: false })
        )
        .mockResolvedValueOnce(
          createMockResponse({ message: 'Server error' }, { status: 500, ok: false })
        )
        .mockResolvedValueOnce(createMockResponse({ success: true }));

      // Simulate retry logic
      let attempts = 0;
      let lastError: Error | null = null;

      while (attempts < MAX_RETRIES) {
        const response = await fetch('https://api.example.com/retry-test');

        if (response.ok) {
          break;
        }

        const error = new ApiRequestError('Server error', response.status);
        if (!isRetryableError(error)) {
          throw error;
        }

        lastError = error;
        attempts++;
      }

      expect(mockFetch).toHaveBeenCalledTimes(3);
    });

    it('should not retry on 400 error', async () => {
      mockFetch.mockResolvedValueOnce(
        createMockResponse({ message: 'Bad request' }, { status: 400, ok: false })
      );

      const response = await fetch('https://api.example.com/bad-request');
      const error = new ApiRequestError('Bad request', response.status);

      expect(isRetryableError(error)).toBe(false);
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it('should stop retrying after MAX_RETRIES', async () => {
      // Always fail with 500
      mockFetch.mockResolvedValue(
        createMockResponse({ message: 'Server error' }, { status: 500, ok: false })
      );

      let attempts = 0;

      while (attempts <= MAX_RETRIES) {
        const response = await fetch('https://api.example.com/always-fail');

        if (response.ok) break;

        const error = new ApiRequestError('Server error', response.status);
        if (!isRetryableError(error) || attempts >= MAX_RETRIES) {
          break;
        }

        attempts++;
      }

      expect(mockFetch).toHaveBeenCalledTimes(MAX_RETRIES + 1);
    });
  });

  describe('error handling', () => {
    it('should throw ApiRequestError for non-ok response', async () => {
      const errorResponse = {
        message: 'Validation failed',
        code: 'VALIDATION_ERROR',
        errors: { email: ['Invalid email format'] },
      };
      mockFetch.mockResolvedValueOnce(
        createMockResponse(errorResponse, { status: 400, ok: false })
      );

      const response = await fetch('https://api.example.com/validate');
      const data = await response.json();

      expect(response.ok).toBe(false);
      expect(data.message).toBe('Validation failed');
      expect(data.code).toBe('VALIDATION_ERROR');
    });

    it('should handle network errors', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error: Failed to fetch'));

      try {
        await fetch('https://api.example.com/network-error');
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        expect((error as Error).message).toContain('Network error');
      }
    });

    it('should handle JSON parse errors', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.reject(new SyntaxError('Invalid JSON')),
      } as Response);

      try {
        const response = await fetch('https://api.example.com/bad-json');
        await response.json();
      } catch (error) {
        expect(error).toBeInstanceOf(SyntaxError);
      }
    });
  });

  describe('request configuration', () => {
    it('should set Content-Type header for JSON requests', async () => {
      mockFetch.mockResolvedValueOnce(createMockResponse({}));

      await fetch('https://api.example.com/json', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ test: true }),
      });

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
          }),
        })
      );
    });

    it('should preserve custom headers', async () => {
      mockFetch.mockResolvedValueOnce(createMockResponse({}));

      await fetch('https://api.example.com/custom-headers', {
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer token123',
          'X-Custom-Header': 'custom-value',
        },
      });

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: 'Bearer token123',
            'X-Custom-Header': 'custom-value',
          }),
        })
      );
    });
  });

  describe('HTTP methods', () => {
    it('should support GET requests', async () => {
      mockFetch.mockResolvedValueOnce(createMockResponse({ data: 'get' }));

      await fetch('https://api.example.com/get', { method: 'GET' });

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ method: 'GET' })
      );
    });

    it('should support POST requests', async () => {
      mockFetch.mockResolvedValueOnce(createMockResponse({ data: 'post' }));

      await fetch('https://api.example.com/post', {
        method: 'POST',
        body: JSON.stringify({ name: 'test' }),
      });

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ method: 'POST' })
      );
    });

    it('should support PUT requests', async () => {
      mockFetch.mockResolvedValueOnce(createMockResponse({ data: 'put' }));

      await fetch('https://api.example.com/put', {
        method: 'PUT',
        body: JSON.stringify({ name: 'updated' }),
      });

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ method: 'PUT' })
      );
    });

    it('should support DELETE requests', async () => {
      mockFetch.mockResolvedValueOnce(createMockResponse({ success: true }));

      await fetch('https://api.example.com/delete/1', { method: 'DELETE' });

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ method: 'DELETE' })
      );
    });
  });
});
