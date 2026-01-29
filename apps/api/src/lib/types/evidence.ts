/**
 * Evidence Pack Types
 *
 * Captures trust, consent, and quality signals for each lead.
 * Stored with the lead record and surfaced in portal/admin.
 */

import type { LeadMetadata, LeadUtm, LeadConsentInput } from '@kanjona/shared';

export interface EvidenceConsent extends LeadConsentInput {
  capturedAt: string;
  ipHash: string;
}

export interface EvidenceVerification {
  emailValid?: boolean;
  phoneValid?: boolean;
  captchaVerified?: boolean;
  captchaScore?: number;
}

export interface EvidenceDeliveryAttempt {
  channel: 'email' | 'sms' | 'voice' | 'webhook';
  status: 'sent' | 'failed' | 'skipped';
  attemptedAt: string;
  target?: string;
  error?: string;
}

export interface EvidenceAssignment {
  ruleId?: string;
  assignedOrgId?: string;
  assignedUserId?: string;
  assignedAt?: string;
}

export interface EvidenceDispute {
  url?: string;
  policy?: string;
}

export interface EvidenceQuality {
  score?: number;
  threshold?: number;
  matchedRules?: string[];
  status?: 'accepted' | 'quarantined';
}

export interface EvidenceSecurity {
  suspicious: boolean;
  reasons: string[];
}

export interface EvidencePack {
  capturedAt: string;
  funnelId: string;
  pageVariant?: string;
  pageUrl?: string;
  referrer?: string;
  utm?: LeadUtm;
  metadata?: LeadMetadata;
  consent?: EvidenceConsent;
  verification?: EvidenceVerification;
  delivery?: {
    attempts?: EvidenceDeliveryAttempt[];
  };
  assignment?: EvidenceAssignment;
  dispute?: EvidenceDispute;
  quality?: EvidenceQuality;
  security?: EvidenceSecurity;
}
