'use client';

import Link from 'next/link';
import type { Lead, LeadStatus } from '@/lib/types';
import StatusBadge from './StatusBadge';
import StatusSelect from './StatusSelect';

interface LeadCardProps {
  lead: Lead;
  onStatusChange: (leadId: string, funnelId: string, status: LeadStatus) => void;
  isUpdating?: boolean;
}

export default function LeadCard({ lead, onStatusChange, isUpdating = false }: LeadCardProps) {
  const fullName = `${lead.firstName} ${lead.lastName}`.trim();

  return (
    <div className="rounded-xl border border-gray-100 bg-white shadow-sm transition-shadow hover:shadow-md">
      {/* Main content - tappable to navigate */}
      <Link href={`/leads/${lead.funnelId}/${lead.id}`} className="block px-4 pt-4 pb-2">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <h3 className="truncate text-sm font-semibold text-gray-900">
              {fullName || 'Unknown'}
            </h3>
            <p className="mt-0.5 truncate text-xs text-gray-500">
              {lead.funnelName}
              {lead.zip && (
                <span className="ml-2 text-gray-400">
                  {lead.city ? `${lead.city}, ${lead.state}` : lead.zip}
                </span>
              )}
            </p>
          </div>
          <StatusBadge status={lead.status} />
        </div>
      </Link>

      {/* Quick actions bar */}
      <div className="flex items-center gap-2 border-t border-gray-50 px-4 py-2.5">
        {/* Call button */}
        {lead.phone && (
          <a
            href={`tel:${lead.phone}`}
            className="inline-flex min-h-[36px] items-center gap-1.5 rounded-lg bg-green-50 px-3 py-1.5 text-xs font-medium text-green-700 transition-colors hover:bg-green-100 active:bg-green-200"
            onClick={(e) => e.stopPropagation()}
            aria-label={`Call ${fullName}`}
          >
            <svg
              className="h-3.5 w-3.5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z"
              />
            </svg>
            Call
          </a>
        )}

        {/* Email button */}
        {lead.email && (
          <a
            href={`mailto:${lead.email}`}
            className="inline-flex min-h-[36px] items-center gap-1.5 rounded-lg bg-blue-50 px-3 py-1.5 text-xs font-medium text-blue-700 transition-colors hover:bg-blue-100 active:bg-blue-200"
            onClick={(e) => e.stopPropagation()}
            aria-label={`Email ${fullName}`}
          >
            <svg
              className="h-3.5 w-3.5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75"
              />
            </svg>
            Email
          </a>
        )}

        {/* Status change */}
        <div className="ml-auto" onClick={(e) => e.stopPropagation()}>
          <StatusSelect
            currentStatus={lead.status}
            onStatusChange={(status) => onStatusChange(lead.id, lead.funnelId, status)}
            disabled={isUpdating}
          />
        </div>
      </div>
    </div>
  );
}
