/**
 * Health Check API Route
 *
 * Provides health status for the Next.js application.
 * Used by load balancers and monitoring systems.
 *
 * Returns minimal information publicly. Detailed dependency
 * checks are only included when the x-internal-health header is present.
 */

import { NextRequest, NextResponse } from 'next/server';

// =============================================================================
// Types
// =============================================================================

interface DependencyStatus {
  status: 'healthy' | 'unhealthy' | 'unknown';
  latencyMs?: number;
  error?: string;
}

// =============================================================================
// Configuration
// =============================================================================

const ENVIRONMENT = process.env.NODE_ENV || 'development';

// =============================================================================
// Dependency Checks
// =============================================================================

/**
 * Check API backend connectivity
 */
async function checkApiBackend(): Promise<DependencyStatus> {
  const apiUrl = process.env.NEXT_PUBLIC_API_BASE_URL;

  if (!apiUrl) {
    // In development, API might not be configured
    if (ENVIRONMENT === 'development') {
      return {
        status: 'healthy',
        latencyMs: 0,
      };
    }

    return {
      status: 'unknown',
      error: 'API URL not configured',
    };
  }

  const startTime = Date.now();

  try {
    // Try to hit the API health endpoint
    const response = await fetch(`${apiUrl}/health`, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
      },
      // Short timeout for health checks
      signal: AbortSignal.timeout(5000),
    });

    const latencyMs = Date.now() - startTime;

    if (response.ok) {
      return {
        status: 'healthy',
        latencyMs,
      };
    }

    return {
      status: 'unhealthy',
      latencyMs,
      error: `API returned ${response.status}`,
    };
  } catch (error) {
    const latencyMs = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : 'Connection failed';

    console.error('[Health] API check failed:', errorMessage);

    return {
      status: 'unhealthy',
      latencyMs,
      error: 'Connection failed',
    };
  }
}

// =============================================================================
// Request Handler
// =============================================================================

export async function GET(request: NextRequest) {
  try {
    // Check dependencies
    const apiStatus = await checkApiBackend();

    // Determine overall status
    const allHealthy = apiStatus.status === 'healthy' || apiStatus.status === 'unknown';
    const overallStatus = allHealthy ? 'healthy' : 'degraded';

    // For public access, return minimal info only
    const isInternalRequest = request.headers.get('x-internal-health') === 'true';

    if (isInternalRequest) {
      // Detailed health info for internal monitoring only
      return NextResponse.json(
        {
          status: overallStatus,
          timestamp: new Date().toISOString(),
          dependencies: {
            api: apiStatus,
          },
        },
        {
          status: 200,
          headers: {
            'Cache-Control': 'no-cache, no-store, must-revalidate',
          },
        }
      );
    }

    // Public response: minimal information
    return NextResponse.json(
      {
        status: overallStatus,
        timestamp: new Date().toISOString(),
      },
      {
        status: 200,
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
        },
      }
    );
  } catch (error) {
    // Unexpected error during health check
    console.error(
      '[Health] Unexpected error:',
      error instanceof Error ? error.message : 'Unknown error'
    );

    return NextResponse.json(
      {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
      },
      {
        status: 503,
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
        },
      }
    );
  }
}

// Handle OPTIONS for CORS preflight
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}
