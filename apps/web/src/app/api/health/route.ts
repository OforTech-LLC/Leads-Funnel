/**
 * Health Check API Route
 *
 * Provides health status for the Next.js application and its dependencies.
 * Used by load balancers and monitoring systems.
 */

import { NextResponse } from 'next/server';

// =============================================================================
// Types
// =============================================================================

interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  version: string;
  uptime: number;
  timestamp: string;
  environment: string;
  dependencies: {
    api: DependencyStatus;
  };
}

interface DependencyStatus {
  status: 'healthy' | 'unhealthy' | 'unknown';
  latencyMs?: number;
  error?: string;
}

// =============================================================================
// Configuration
// =============================================================================

const VERSION = process.env.npm_package_version || '1.0.0';
const START_TIME = Date.now();
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

export async function GET() {
  try {
    // Check dependencies
    const apiStatus = await checkApiBackend();

    // Determine overall status
    const allHealthy = apiStatus.status === 'healthy' || apiStatus.status === 'unknown';
    const overallStatus: HealthStatus['status'] = allHealthy ? 'healthy' : 'degraded';

    const healthStatus: HealthStatus = {
      status: overallStatus,
      version: VERSION,
      uptime: Math.floor((Date.now() - START_TIME) / 1000),
      timestamp: new Date().toISOString(),
      environment: ENVIRONMENT,
      dependencies: {
        api: apiStatus,
      },
    };

    // Return 200 for healthy/degraded, would return 503 for fully unhealthy
    const statusCode = overallStatus === 'healthy' ? 200 : 200; // Still return 200 for degraded

    console.log('[Health] Check completed:', {
      status: overallStatus,
      api: apiStatus.status,
    });

    return NextResponse.json(healthStatus, {
      status: statusCode,
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      },
    });
  } catch (error) {
    // Unexpected error during health check
    console.error(
      '[Health] Unexpected error:',
      error instanceof Error ? error.message : 'Unknown error'
    );

    const healthStatus: HealthStatus = {
      status: 'unhealthy',
      version: VERSION,
      uptime: Math.floor((Date.now() - START_TIME) / 1000),
      timestamp: new Date().toISOString(),
      environment: ENVIRONMENT,
      dependencies: {
        api: {
          status: 'unknown',
          error: 'Health check failed',
        },
      },
    };

    return NextResponse.json(healthStatus, {
      status: 503,
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      },
    });
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
