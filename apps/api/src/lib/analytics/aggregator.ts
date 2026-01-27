/**
 * Analytics Aggregator
 *
 * DynamoDB scan/query aggregation functions for analytics endpoints.
 * Results are cached in DynamoDB with a 5-minute TTL for expensive queries.
 */

import { QueryCommand, GetCommand, PutCommand, ScanCommand } from '@aws-sdk/lib-dynamodb';
import { getDocClient, tableName } from '../db/client.js';
import { createLogger } from '../logging.js';

const log = createLogger('analytics');

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface DateRange {
  startDate: string; // ISO 8601 date
  endDate: string; // ISO 8601 date
}

export type Granularity = 'daily' | 'weekly' | 'monthly';

export interface OverviewMetrics {
  totalLeads: number;
  assignedLeads: number;
  unassignedLeads: number;
  convertedLeads: number;
  lostLeads: number;
  conversionRate: number;
  avgTimeToCloseMs: number;
  dateRange: DateRange;
}

export interface FunnelMetric {
  funnelId: string;
  totalLeads: number;
  assignedLeads: number;
  convertedLeads: number;
  conversionRate: number;
}

export interface OrgMetric {
  orgId: string;
  orgName?: string;
  totalLeads: number;
  convertedLeads: number;
  conversionRate: number;
  avgResponseTimeMs: number;
}

export interface TrendPoint {
  date: string;
  totalLeads: number;
  assignedLeads: number;
  convertedLeads: number;
}

export interface SourceMetric {
  source: string;
  totalLeads: number;
  convertedLeads: number;
  conversionRate: number;
}

// ---------------------------------------------------------------------------
// Cache
// ---------------------------------------------------------------------------

const CACHE_TTL_SECONDS = 300; // 5 minutes

interface CachedResult {
  pk: string;
  sk: string;
  data: unknown;
  cachedAt: string;
  ttl: number;
}

async function getCachedResult(cacheKey: string): Promise<unknown | null> {
  const doc = getDocClient();

  try {
    const result = await doc.send(
      new GetCommand({
        TableName: tableName(),
        Key: { pk: `ANALYTICS_CACHE#${cacheKey}`, sk: 'DATA' },
      })
    );

    if (!result.Item) return null;

    const cached = result.Item as CachedResult;
    const cachedAt = new Date(cached.cachedAt).getTime();
    const now = Date.now();

    // Check if cache is still valid (TTL might not have expired yet via DynamoDB)
    if (now - cachedAt > CACHE_TTL_SECONDS * 1000) {
      return null;
    }

    return cached.data;
  } catch {
    return null;
  }
}

async function setCachedResult(cacheKey: string, data: unknown): Promise<void> {
  const doc = getDocClient();
  const now = new Date().toISOString();
  const ttl = Math.floor(Date.now() / 1000) + CACHE_TTL_SECONDS;

  try {
    await doc.send(
      new PutCommand({
        TableName: tableName(),
        Item: {
          pk: `ANALYTICS_CACHE#${cacheKey}`,
          sk: 'DATA',
          data,
          cachedAt: now,
          ttl,
        },
      })
    );
  } catch {
    // Cache write failure is non-critical
  }
}

// ---------------------------------------------------------------------------
// Lead Scanning Helper
// ---------------------------------------------------------------------------

interface LeadItem {
  pk: string;
  sk: string;
  funnelId?: string;
  orgId?: string;
  status?: string;
  createdAt?: string;
  assignedAt?: string;
  updatedAt?: string;
  utm?: Record<string, string>;
  [key: string]: unknown;
}

/**
 * Scan all leads within a date range using GSI1 (by funnel).
 * NOTE: For production at scale, replace with pre-aggregated metrics
 * or stream-based aggregation.
 */
async function scanLeadsInRange(dateRange: DateRange): Promise<LeadItem[]> {
  const doc = getDocClient();
  const leads: LeadItem[] = [];
  let lastKey: Record<string, unknown> | undefined;

  do {
    const result = await doc.send(
      new ScanCommand({
        TableName: tableName(),
        FilterExpression:
          'begins_with(pk, :prefix) AND sk = :meta AND createdAt BETWEEN :start AND :end',
        ExpressionAttributeValues: {
          ':prefix': 'LEAD#',
          ':meta': 'META',
          ':start': dateRange.startDate,
          ':end': dateRange.endDate,
        },
        ExclusiveStartKey: lastKey,
      })
    );

    leads.push(...((result.Items || []) as LeadItem[]));
    lastKey = result.LastEvaluatedKey;
  } while (lastKey);

  return leads;
}

// ---------------------------------------------------------------------------
// Aggregation Functions
// ---------------------------------------------------------------------------

/**
 * Get high-level overview metrics.
 */
export async function getOverviewMetrics(dateRange: DateRange): Promise<OverviewMetrics> {
  const cacheKey = `overview:${dateRange.startDate}:${dateRange.endDate}`;
  const cached = await getCachedResult(cacheKey);
  if (cached) return cached as OverviewMetrics;

  const leads = await scanLeadsInRange(dateRange);

  let totalLeads = leads.length;
  let assignedLeads = 0;
  let unassignedLeads = 0;
  let convertedLeads = 0;
  let lostLeads = 0;
  let totalCloseTimeMs = 0;
  let closedCount = 0;

  for (const lead of leads) {
    if (
      lead.status === 'assigned' ||
      lead.status === 'contacted' ||
      lead.status === 'qualified' ||
      lead.status === 'converted'
    ) {
      assignedLeads++;
    }
    if (lead.status === 'unassigned' || lead.status === 'new') {
      unassignedLeads++;
    }
    if (lead.status === 'converted') {
      convertedLeads++;
      if (lead.createdAt && lead.updatedAt) {
        const created = new Date(lead.createdAt).getTime();
        const closed = new Date(lead.updatedAt).getTime();
        if (closed > created) {
          totalCloseTimeMs += closed - created;
          closedCount++;
        }
      }
    }
    if (lead.status === 'lost') {
      lostLeads++;
    }
  }

  const conversionRate = totalLeads > 0 ? (convertedLeads / totalLeads) * 100 : 0;
  const avgTimeToCloseMs = closedCount > 0 ? totalCloseTimeMs / closedCount : 0;

  const metrics: OverviewMetrics = {
    totalLeads,
    assignedLeads,
    unassignedLeads,
    convertedLeads,
    lostLeads,
    conversionRate: Math.round(conversionRate * 100) / 100,
    avgTimeToCloseMs: Math.round(avgTimeToCloseMs),
    dateRange,
  };

  await setCachedResult(cacheKey, metrics);
  return metrics;
}

/**
 * Get per-funnel metrics.
 */
export async function getFunnelMetrics(dateRange: DateRange): Promise<FunnelMetric[]> {
  const cacheKey = `funnels:${dateRange.startDate}:${dateRange.endDate}`;
  const cached = await getCachedResult(cacheKey);
  if (cached) return cached as FunnelMetric[];

  const leads = await scanLeadsInRange(dateRange);

  const funnelMap = new Map<string, { total: number; assigned: number; converted: number }>();

  for (const lead of leads) {
    const funnelId = lead.funnelId || 'unknown';
    const current = funnelMap.get(funnelId) || { total: 0, assigned: 0, converted: 0 };

    current.total++;
    if (lead.orgId) current.assigned++;
    if (lead.status === 'converted') current.converted++;

    funnelMap.set(funnelId, current);
  }

  const metrics: FunnelMetric[] = [];
  for (const [funnelId, data] of funnelMap) {
    metrics.push({
      funnelId,
      totalLeads: data.total,
      assignedLeads: data.assigned,
      convertedLeads: data.converted,
      conversionRate: data.total > 0 ? Math.round((data.converted / data.total) * 10000) / 100 : 0,
    });
  }

  // Sort by total leads descending
  metrics.sort((a, b) => b.totalLeads - a.totalLeads);

  await setCachedResult(cacheKey, metrics);
  return metrics;
}

/**
 * Get per-org performance metrics.
 */
export async function getOrgMetrics(dateRange: DateRange): Promise<OrgMetric[]> {
  const cacheKey = `orgs:${dateRange.startDate}:${dateRange.endDate}`;
  const cached = await getCachedResult(cacheKey);
  if (cached) return cached as OrgMetric[];

  const leads = await scanLeadsInRange(dateRange);

  const orgMap = new Map<
    string,
    { total: number; converted: number; totalResponseMs: number; respondedCount: number }
  >();

  for (const lead of leads) {
    if (!lead.orgId) continue;
    const orgId = lead.orgId as string;
    const current = orgMap.get(orgId) || {
      total: 0,
      converted: 0,
      totalResponseMs: 0,
      respondedCount: 0,
    };

    current.total++;
    if (lead.status === 'converted') current.converted++;

    if (lead.assignedAt && lead.createdAt) {
      const assigned = new Date(lead.assignedAt as string).getTime();
      const created = new Date(lead.createdAt).getTime();
      if (assigned > created) {
        current.totalResponseMs += assigned - created;
        current.respondedCount++;
      }
    }

    orgMap.set(orgId, current);
  }

  const metrics: OrgMetric[] = [];
  for (const [orgId, data] of orgMap) {
    metrics.push({
      orgId,
      totalLeads: data.total,
      convertedLeads: data.converted,
      conversionRate: data.total > 0 ? Math.round((data.converted / data.total) * 10000) / 100 : 0,
      avgResponseTimeMs:
        data.respondedCount > 0 ? Math.round(data.totalResponseMs / data.respondedCount) : 0,
    });
  }

  metrics.sort((a, b) => b.totalLeads - a.totalLeads);

  await setCachedResult(cacheKey, metrics);
  return metrics;
}

/**
 * Get time-series trend data.
 */
export async function getTrends(
  dateRange: DateRange,
  granularity: Granularity
): Promise<TrendPoint[]> {
  const cacheKey = `trends:${granularity}:${dateRange.startDate}:${dateRange.endDate}`;
  const cached = await getCachedResult(cacheKey);
  if (cached) return cached as TrendPoint[];

  const leads = await scanLeadsInRange(dateRange);

  const bucketMap = new Map<string, { total: number; assigned: number; converted: number }>();

  for (const lead of leads) {
    if (!lead.createdAt) continue;
    const dateKey = getBucketKey(lead.createdAt, granularity);
    const current = bucketMap.get(dateKey) || { total: 0, assigned: 0, converted: 0 };

    current.total++;
    if (lead.orgId) current.assigned++;
    if (lead.status === 'converted') current.converted++;

    bucketMap.set(dateKey, current);
  }

  const trends: TrendPoint[] = [];
  for (const [date, data] of bucketMap) {
    trends.push({
      date,
      totalLeads: data.total,
      assignedLeads: data.assigned,
      convertedLeads: data.converted,
    });
  }

  // Sort chronologically
  trends.sort((a, b) => a.date.localeCompare(b.date));

  await setCachedResult(cacheKey, trends);
  return trends;
}

/**
 * Get lead source attribution based on UTM parameters.
 */
export async function getLeadSourceAttribution(dateRange: DateRange): Promise<SourceMetric[]> {
  const cacheKey = `sources:${dateRange.startDate}:${dateRange.endDate}`;
  const cached = await getCachedResult(cacheKey);
  if (cached) return cached as SourceMetric[];

  const leads = await scanLeadsInRange(dateRange);

  const sourceMap = new Map<string, { total: number; converted: number }>();

  for (const lead of leads) {
    const source = lead.utm?.utm_source || 'direct';
    const current = sourceMap.get(source) || { total: 0, converted: 0 };

    current.total++;
    if (lead.status === 'converted') current.converted++;

    sourceMap.set(source, current);
  }

  const metrics: SourceMetric[] = [];
  for (const [source, data] of sourceMap) {
    metrics.push({
      source,
      totalLeads: data.total,
      convertedLeads: data.converted,
      conversionRate: data.total > 0 ? Math.round((data.converted / data.total) * 10000) / 100 : 0,
    });
  }

  metrics.sort((a, b) => b.totalLeads - a.totalLeads);

  await setCachedResult(cacheKey, metrics);
  return metrics;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getBucketKey(isoDate: string, granularity: Granularity): string {
  const date = new Date(isoDate);

  switch (granularity) {
    case 'daily':
      return isoDate.slice(0, 10); // YYYY-MM-DD

    case 'weekly': {
      // ISO week: get Monday of the week
      const day = date.getUTCDay();
      const diff = date.getUTCDate() - day + (day === 0 ? -6 : 1);
      const monday = new Date(date);
      monday.setUTCDate(diff);
      return monday.toISOString().slice(0, 10);
    }

    case 'monthly':
      return isoDate.slice(0, 7); // YYYY-MM

    default:
      return isoDate.slice(0, 10);
  }
}
