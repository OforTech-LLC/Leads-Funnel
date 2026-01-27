import { type LeadStatus } from './index.js';

export const VALID_STATUS_TRANSITIONS: Record<LeadStatus, readonly LeadStatus[]> = {
  new: ['assigned', 'quarantined', 'unassigned'],
  unassigned: ['assigned', 'quarantined'],
  assigned: ['contacted', 'qualified', 'converted', 'lost', 'dnc', 'quarantined', 'booked'],
  contacted: ['qualified', 'converted', 'lost', 'dnc', 'booked'],
  qualified: ['converted', 'lost', 'dnc', 'booked'],
  booked: ['converted', 'won', 'lost', 'dnc'],
  converted: ['won', 'lost'],
  won: [],
  lost: ['contacted', 'qualified'],
  dnc: [],
  quarantined: ['new'],
};

export function isValidTransition(from: LeadStatus, to: LeadStatus): boolean {
  const allowed = VALID_STATUS_TRANSITIONS[from];
  if (!allowed) return false;
  return (allowed as readonly string[]).includes(to);
}

export function getAvailableTransitions(currentStatus: LeadStatus): readonly LeadStatus[] {
  return VALID_STATUS_TRANSITIONS[currentStatus] || [];
}
