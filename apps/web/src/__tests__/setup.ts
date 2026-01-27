/**
 * Vitest Test Setup
 *
 * This file configures the test environment for the web application.
 * It sets up mocks, global utilities, and test helpers.
 */

import { vi, beforeAll, afterEach, afterAll } from 'vitest';

// =============================================================================
// Global Mocks
// =============================================================================

/**
 * Mock window.matchMedia for components that use media queries
 */
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

/**
 * Mock IntersectionObserver for components that use intersection detection
 */
class MockIntersectionObserver implements IntersectionObserver {
  readonly root: Element | null = null;
  readonly rootMargin: string = '';
  readonly thresholds: ReadonlyArray<number> = [];

  constructor(
    public callback: IntersectionObserverCallback,
    public options?: IntersectionObserverInit
  ) {}

  observe = vi.fn();
  unobserve = vi.fn();
  disconnect = vi.fn();
  takeRecords = vi.fn(() => []);
}

Object.defineProperty(window, 'IntersectionObserver', {
  writable: true,
  value: MockIntersectionObserver,
});

/**
 * Mock ResizeObserver for components that use resize detection
 */
class MockResizeObserver implements ResizeObserver {
  constructor(public callback: ResizeObserverCallback) {}

  observe = vi.fn();
  unobserve = vi.fn();
  disconnect = vi.fn();
}

Object.defineProperty(window, 'ResizeObserver', {
  writable: true,
  value: MockResizeObserver,
});

/**
 * Mock sessionStorage
 */
const sessionStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] || null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key];
    }),
    clear: vi.fn(() => {
      store = {};
    }),
    get length() {
      return Object.keys(store).length;
    },
    key: vi.fn((index: number) => Object.keys(store)[index] || null),
  };
})();

Object.defineProperty(window, 'sessionStorage', {
  writable: true,
  value: sessionStorageMock,
});

/**
 * Mock localStorage
 */
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] || null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key];
    }),
    clear: vi.fn(() => {
      store = {};
    }),
    get length() {
      return Object.keys(store).length;
    },
    key: vi.fn((index: number) => Object.keys(store)[index] || null),
  };
})();

Object.defineProperty(window, 'localStorage', {
  writable: true,
  value: localStorageMock,
});

/**
 * Mock crypto.getRandomValues for auth state generation
 */
Object.defineProperty(globalThis, 'crypto', {
  value: {
    getRandomValues: <T extends ArrayBufferView>(array: T): T => {
      if (array instanceof Uint8Array) {
        for (let i = 0; i < array.length; i++) {
          array[i] = Math.floor(Math.random() * 256);
        }
      }
      return array;
    },
    randomUUID: () => 'test-uuid-' + Math.random().toString(36).substring(7),
    subtle: {} as SubtleCrypto,
  },
});

/**
 * Mock fetch for API tests
 */
const mockFetch = vi.fn();
globalThis.fetch = mockFetch;

// =============================================================================
// Test Lifecycle Hooks
// =============================================================================

beforeAll(() => {
  // Setup that runs once before all tests
});

afterEach(() => {
  // Clear all mocks after each test
  vi.clearAllMocks();
  sessionStorageMock.clear();
  localStorageMock.clear();
});

afterAll(() => {
  // Cleanup that runs once after all tests
  vi.restoreAllMocks();
});

// =============================================================================
// Test Utilities
// =============================================================================

/**
 * Create a mock Response object for fetch tests
 */
export function createMockResponse(
  body: unknown,
  options: { status?: number; ok?: boolean; headers?: Record<string, string> } = {}
): Response {
  const { status = 200, ok = true, headers = {} } = options;

  return {
    ok,
    status,
    statusText: ok ? 'OK' : 'Error',
    headers: new Headers(headers),
    json: vi.fn().mockResolvedValue(body),
    text: vi.fn().mockResolvedValue(JSON.stringify(body)),
    blob: vi.fn().mockResolvedValue(new Blob()),
    arrayBuffer: vi.fn().mockResolvedValue(new ArrayBuffer(0)),
    formData: vi.fn().mockResolvedValue(new FormData()),
    clone: vi.fn(),
    body: null,
    bodyUsed: false,
    redirected: false,
    type: 'basic' as ResponseType,
    url: '',
  } as Response;
}

/**
 * Wait for all pending promises to resolve
 */
export function flushPromises(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

/**
 * Create a delayed promise for testing async behavior
 */
export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Mock environment variables for a test
 */
export function mockEnv(vars: Record<string, string>): () => void {
  const originalEnv = { ...process.env };
  Object.assign(process.env, vars);
  return () => {
    Object.keys(vars).forEach((key) => {
      if (originalEnv[key] !== undefined) {
        process.env[key] = originalEnv[key];
      } else {
        delete process.env[key];
      }
    });
  };
}

// =============================================================================
// Test Data Factories
// =============================================================================

/**
 * Create a mock JWT token for testing
 */
export function createMockJwt(payload: Record<string, unknown>): string {
  const header = { alg: 'RS256', typ: 'JWT' };
  const encodedHeader = btoa(JSON.stringify(header));
  const encodedPayload = btoa(JSON.stringify(payload));
  const signature = 'mock-signature';
  return `${encodedHeader}.${encodedPayload}.${signature}`;
}

/**
 * Create a mock admin user payload for JWT
 */
export function createMockAdminUserPayload(
  overrides: Record<string, unknown> = {}
): Record<string, unknown> {
  return {
    sub: 'user-123',
    email: 'admin@example.com',
    'cognito:username': 'admin',
    'cognito:groups': ['Admin'],
    iss: 'https://cognito-idp.us-east-1.amazonaws.com/us-east-1_test',
    client_id: 'test-client-id',
    token_use: 'id',
    exp: Math.floor(Date.now() / 1000) + 3600,
    iat: Math.floor(Date.now() / 1000),
    ...overrides,
  };
}

/**
 * Create mock lead data for testing
 */
export function createMockLeadPayload(
  overrides: Record<string, unknown> = {}
): Record<string, unknown> {
  return {
    name: 'John Doe',
    email: 'john@example.com',
    phone: '+1234567890',
    notes: 'Test lead submission',
    utm: {
      utm_source: 'google',
      utm_medium: 'cpc',
      utm_campaign: 'test-campaign',
    },
    ...overrides,
  };
}

// Re-export vitest utilities for convenience
export { vi, expect, describe, it, test, beforeAll, afterEach, afterAll, beforeEach } from 'vitest';
