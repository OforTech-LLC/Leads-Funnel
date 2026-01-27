/**
 * Settings API Route
 *
 * Proxies requests to the backend admin API for feature flags
 * and SSM configuration values.
 */

import { NextRequest, NextResponse } from 'next/server';
import { AUTH_COOKIE_NAME } from '@/lib/constants';

const API_BASE = process.env.ADMIN_API_BASE_URL || '';

export async function GET(request: NextRequest) {
  const token = request.cookies.get(AUTH_COOKIE_NAME)?.value;

  if (!token) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const response = await fetch(`${API_BASE}/admin/settings`, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      return NextResponse.json({ error: 'Failed to fetch settings' }, { status: response.status });
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch {
    // Return mock data in development if API is unavailable
    if (process.env.NODE_ENV === 'development') {
      return NextResponse.json({
        featureFlags: {
          admin_exports: true,
          bulk_operations: true,
          gdpr_tools: false,
          ip_allowlist: true,
          notification_retry: true,
          pipeline_tracking: true,
        },
        config: {
          environment: process.env.NODE_ENV || 'development',
          region: process.env.AWS_REGION || 'us-east-1',
          project_name: 'kanjona',
          rate_limit_query: '100/min',
          rate_limit_export: '10/hr',
          export_retention_days: '7',
          audit_log_retention_days: '90',
        },
      });
    }

    return NextResponse.json({ error: 'Settings service unavailable' }, { status: 503 });
  }
}
