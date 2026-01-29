import { describe, it, expect, vi, afterEach } from 'vitest';
import type { APIGatewayProxyStructuredResultV2 } from 'aws-lambda';

type HttpModule = typeof import('../lib/http.js');

async function loadHttp(allowedOrigins: string): Promise<HttpModule> {
  vi.resetModules();
  process.env.ALLOWED_ORIGINS = allowedOrigins;
  return import('../lib/http.js');
}

afterEach(() => {
  delete process.env.ALLOWED_ORIGINS;
});

describe('lead capture http responses', () => {
  it('created returns success response with legacy fields and CORS headers', async () => {
    const http = await loadHttp('https://example.com');

    const response = http.created(
      'lead-123',
      'accepted',
      'https://example.com'
    ) as APIGatewayProxyStructuredResultV2;
    const body = JSON.parse(response.body as string) as {
      success: boolean;
      ok: boolean;
      leadId: string;
      status: string;
      data: { id: string; status: string };
    };

    expect(response.statusCode).toBe(201);
    expect(body.success).toBe(true);
    expect(body.ok).toBe(true);
    expect(body.leadId).toBe('lead-123');
    expect(body.status).toBe('accepted');
    expect(body.data.id).toBe('lead-123');
    expect(body.data.status).toBe('accepted');
    expect(response.headers?.['Access-Control-Allow-Origin']).toBe('https://example.com');
  });

  it('validationError returns error response with fieldErrors', async () => {
    const http = await loadHttp('https://example.com');

    const response = http.validationError(
      { email: 'Email is required' },
      'https://example.com'
    ) as APIGatewayProxyStructuredResultV2;
    const body = JSON.parse(response.body as string) as {
      success: boolean;
      ok: boolean;
      error: { code: string; message: string; fieldErrors?: Record<string, string> };
    };

    expect(response.statusCode).toBe(400);
    expect(body.success).toBe(false);
    expect(body.ok).toBe(false);
    expect(body.error.code).toBe('VALIDATION_ERROR');
    expect(body.error.fieldErrors?.email).toBe('Email is required');
    expect(response.headers?.['Access-Control-Allow-Origin']).toBe('https://example.com');
  });
});
