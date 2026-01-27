// ──────────────────────────────────────────────
// Domain types for the Portal app
// ──────────────────────────────────────────────

export type LeadStatus = 'new' | 'contacted' | 'booked' | 'won' | 'lost' | 'dnc';

export interface Lead {
  id: string;
  funnelId: string;
  funnelName: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  zip: string;
  city: string;
  state: string;
  status: LeadStatus;
  assignedTo: string | null;
  assignedName: string | null;
  notes: Note[];
  timeline: TimelineEvent[];
  createdAt: string;
  updatedAt: string;
}

export interface Note {
  id: string;
  leadId: string;
  authorId: string;
  authorName: string;
  content: string;
  createdAt: string;
}

export interface TimelineEvent {
  id: string;
  leadId: string;
  type: 'status_change' | 'note_added' | 'assigned' | 'created' | 'contacted';
  description: string;
  performedBy: string;
  performedByName: string;
  metadata?: Record<string, string>;
  createdAt: string;
}

export interface UserProfile {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: 'agent' | 'manager' | 'admin';
  orgIds: string[];
  primaryOrgId: string;
  avatarUrl: string | null;
  notificationPreferences: NotificationPreferences;
  createdAt: string;
}

export interface NotificationPreferences {
  emailNotifications: boolean;
  smsNotifications: boolean;
}

export interface Organization {
  id: string;
  name: string;
  slug: string;
  logoUrl: string | null;
  plan: string;
  memberCount: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  nextCursor: string | null;
  total: number;
}

export interface DashboardMetrics {
  newLeadsToday: number;
  totalActiveLeads: number;
  leadsByStatus: Record<LeadStatus, number>;
  recentLeads: Lead[];
}

export interface LeadFilters {
  search?: string;
  status?: LeadStatus | '';
  funnelId?: string;
  dateFrom?: string;
  dateTo?: string;
}
