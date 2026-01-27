export interface LeadScore {
  total: number; // 0-100
  completeness: number; // 0-35
  quality: number; // 0-35
  engagement: number; // 0-30
  breakdown: ScoreBreakdown;
}

export interface ScoreBreakdown {
  hasPhone: boolean;
  hasMessage: boolean;
  hasFullName: boolean;
  validEmail: boolean;
  notDisposable: boolean;
  noSpamKeywords: boolean;
  organicSource: boolean;
  hasUtm: boolean;
  hasZipCode: boolean;
}

export type LeadQuality = 'hot' | 'warm' | 'cold' | 'spam';

export function qualityFromScore(score: number): LeadQuality {
  if (score >= 80) return 'hot';
  if (score >= 50) return 'warm';
  if (score >= 20) return 'cold';
  return 'spam';
}
