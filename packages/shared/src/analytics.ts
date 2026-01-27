export interface OverviewMetrics {
  totalLeads: number;
  assignedLeads: number;
  convertedLeads: number;
  unassignedLeads: number;
  quarantinedLeads: number;
  conversionRate: number;
  avgResponseTime: number; // minutes
  period: { start: string; end: string };
}

export interface TrendPoint {
  date: string; // ISO date
  totalLeads: number;
  assignedLeads: number;
  convertedLeads: number;
}

export interface FunnelMetric {
  funnelId: string;
  funnelName: string;
  totalLeads: number;
  assignedLeads: number;
  convertedLeads: number;
  conversionRate: number;
}

export interface OrgMetric {
  orgId: string;
  orgName: string;
  leadsReceived: number;
  leadsConverted: number;
  conversionRate: number;
  avgResponseTime: number;
}

export interface ConversionFunnel {
  stages: ConversionStage[];
}

export interface ConversionStage {
  name: string;
  count: number;
  percentage: number;
  dropOff: number;
}

export interface SourceMetric {
  source: string;
  medium: string;
  leads: number;
  conversions: number;
  conversionRate: number;
}

export type DateRangePreset = 'today' | '7d' | '30d' | '90d' | 'custom';

export interface DateRange {
  preset: DateRangePreset;
  start: string;
  end: string;
}
