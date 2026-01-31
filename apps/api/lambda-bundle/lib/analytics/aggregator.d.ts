/**
 * Analytics Aggregator
 *
 * DynamoDB query aggregation functions for analytics endpoints.
 * Results are cached in DynamoDB with a 5-minute TTL for expensive queries.
 *
 * Issue #5: Replaced ScanCommand with QueryCommand + GSI1 pagination.
 * Leads are queried via GSI1 (FUNNEL#<funnelId> / CREATED#<iso>) for
 * efficient, index-backed retrieval instead of full-table scans.
 */
export interface DateRange {
    startDate: string;
    endDate: string;
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
/**
 * Get high-level overview metrics.
 */
export declare function getOverviewMetrics(dateRange: DateRange): Promise<OverviewMetrics>;
/**
 * Get per-funnel metrics.
 */
export declare function getFunnelMetrics(dateRange: DateRange): Promise<FunnelMetric[]>;
/**
 * Get per-org performance metrics.
 */
export declare function getOrgMetrics(dateRange: DateRange): Promise<OrgMetric[]>;
/**
 * Get time-series trend data.
 */
export declare function getTrends(dateRange: DateRange, granularity: Granularity): Promise<TrendPoint[]>;
/**
 * Get lead source attribution based on UTM parameters.
 */
export declare function getLeadSourceAttribution(dateRange: DateRange): Promise<SourceMetric[]>;
