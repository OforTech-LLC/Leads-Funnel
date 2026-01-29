'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import type { Lead, LeadStatus } from '@/lib/types';
import { useTeamMembers } from '@/lib/queries/team';
import StatusBadge from './StatusBadge';
import StatusSelect from './StatusSelect';
import NoteForm from './NoteForm';
import { formatShortDate, timeAgo } from '@/lib/timeago';

interface LeadDetailModalProps {
  lead: Lead;
  onStatusChange: (status: LeadStatus) => void;
  onAddNote: (content: string) => void;
  onAssign?: (assignedTo: string | null) => void;
  isUpdatingStatus?: boolean;
  isAddingNote?: boolean;
  isAssigning?: boolean;
}

export default function LeadDetailModal({
  lead,
  onStatusChange,
  onAddNote,
  onAssign,
  isUpdatingStatus = false,
  isAddingNote = false,
  isAssigning = false,
}: LeadDetailModalProps) {
  const router = useRouter();
  const fullName = `${lead.firstName} ${lead.lastName}`.trim();

  // Assignment dropdown state
  const [showAssignDropdown, setShowAssignDropdown] = useState(false);
  const assignRef = useRef<HTMLDivElement>(null);
  const { data: teamMembers } = useTeamMembers();

  // Close assign dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (assignRef.current && !assignRef.current.contains(event.target as Node)) {
        setShowAssignDropdown(false);
      }
    }
    if (showAssignDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showAssignDropdown]);

  const currentAssignee = teamMembers?.find((m) => m.userId === lead.assignedTo);
  const evidence = lead.evidencePack;
  const qualityScore = lead.qualityScore ?? evidence?.quality?.score;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="sticky top-0 z-30 border-b border-gray-200 bg-white">
        <div className="mx-auto flex h-14 max-w-3xl items-center gap-3 px-4">
          <button
            onClick={() => router.back()}
            className="flex h-10 w-10 items-center justify-center rounded-lg text-gray-500 transition-colors hover:bg-gray-100 active:bg-gray-200"
            aria-label="Go back"
          >
            <svg
              className="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18"
              />
            </svg>
          </button>
          <h1 className="min-w-0 flex-1 truncate text-base font-semibold text-gray-900">
            {fullName || 'Lead Details'}
          </h1>
          <StatusSelect
            currentStatus={lead.status}
            onStatusChange={onStatusChange}
            disabled={isUpdatingStatus}
          />
        </div>
      </div>

      {/* Content */}
      <div className="mx-auto max-w-3xl px-4 py-6 space-y-6 pb-24">
        {/* Contact Info Card */}
        <section className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-3">
            Contact Information
          </h2>

          <div className="space-y-3">
            <div>
              <p className="text-sm font-medium text-gray-900">{fullName}</p>
            </div>

            {lead.email && (
              <div className="flex items-center justify-between">
                <div className="min-w-0">
                  <p className="text-xs text-gray-500">Email</p>
                  <p className="truncate text-sm text-gray-900">{lead.email}</p>
                </div>
                <a
                  href={`mailto:${encodeURIComponent(lead.email)}`}
                  className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg bg-blue-50 text-blue-600 transition-colors hover:bg-blue-100 active:bg-blue-200"
                  aria-label={`Email ${fullName}`}
                >
                  <svg
                    className="h-5 w-5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={1.5}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75"
                    />
                  </svg>
                </a>
              </div>
            )}

            {lead.phone && (
              <div className="flex items-center justify-between">
                <div className="min-w-0">
                  <p className="text-xs text-gray-500">Phone</p>
                  <p className="text-sm text-gray-900">{lead.phone}</p>
                </div>
                <a
                  href={`tel:${encodeURIComponent(lead.phone)}`}
                  className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg bg-green-50 text-green-600 transition-colors hover:bg-green-100 active:bg-green-200"
                  aria-label={`Call ${fullName}`}
                >
                  <svg
                    className="h-5 w-5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={1.5}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z"
                    />
                  </svg>
                </a>
              </div>
            )}
          </div>
        </section>

        {/* Location Card */}
        {(lead.zip || lead.city || lead.state) && (
          <section className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-3">
              Location
            </h2>
            <div className="flex items-center gap-2">
              <svg
                className="h-4 w-4 text-gray-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.5}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z"
                />
              </svg>
              <p className="text-sm text-gray-900">
                {[lead.city, lead.state, lead.zip].filter(Boolean).join(', ')}
              </p>
            </div>
          </section>
        )}

        {/* Pipeline Status Card */}
        <section className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-3">
            Pipeline Status
          </h2>
          <div className="flex items-center justify-between">
            <StatusBadge status={lead.status} size="md" />
            <StatusSelect
              currentStatus={lead.status}
              onStatusChange={onStatusChange}
              disabled={isUpdatingStatus}
            />
          </div>
          <div className="mt-3 text-xs text-gray-500">
            <p>Funnel: {lead.funnelName}</p>
            {lead.assignedName && <p className="mt-1">Assigned to: {lead.assignedName}</p>}
          </div>
        </section>

        {(evidence || qualityScore !== undefined) && (
          <section className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-3">
              Evidence Pack
            </h2>
            <div className="space-y-2 text-xs text-gray-600">
              {evidence?.capturedAt && (
                <div className="flex items-center justify-between">
                  <span>Captured</span>
                  <span>
                    {formatShortDate(evidence.capturedAt)} · {timeAgo(evidence.capturedAt)}
                  </span>
                </div>
              )}
              {(evidence?.utm?.['utm_source'] || evidence?.utm?.source) && (
                <div className="flex items-center justify-between">
                  <span>Source</span>
                  <span>{evidence.utm?.['utm_source'] || evidence.utm?.source}</span>
                </div>
              )}
              <div className="flex items-center justify-between">
                <span>Consent</span>
                <span>{evidence?.consent?.privacyAccepted ? 'Yes' : 'No'}</span>
              </div>
              {qualityScore !== undefined && (
                <div className="flex items-center justify-between">
                  <span>Quality score</span>
                  <span>{qualityScore}</span>
                </div>
              )}
              {evidence?.quality?.threshold !== undefined && (
                <div className="flex items-center justify-between">
                  <span>Threshold</span>
                  <span>{evidence.quality.threshold}</span>
                </div>
              )}
              {evidence?.security?.reasons?.length ? (
                <p className="text-xs text-amber-600">
                  Flags: {evidence.security.reasons.join(', ')}
                </p>
              ) : null}
              {evidence?.pageUrl && (
                <a
                  href={evidence.pageUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs text-blue-600 hover:text-blue-700"
                >
                  View landing page
                </a>
              )}
            </div>
          </section>
        )}

        {/* Assignment Card */}
        {onAssign && (
          <section className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-3">
              Assign To
            </h2>

            <div ref={assignRef} className="relative">
              <button
                type="button"
                onClick={() => setShowAssignDropdown(!showAssignDropdown)}
                disabled={isAssigning}
                className="flex w-full items-center justify-between rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-700 transition-colors hover:bg-gray-50 disabled:opacity-50"
                aria-haspopup="listbox"
                aria-expanded={showAssignDropdown}
                aria-label="Assign lead to team member"
              >
                <span className="flex items-center gap-2">
                  {currentAssignee ? (
                    <>
                      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-brand-100 text-[10px] font-bold text-brand-700">
                        {currentAssignee.firstName.charAt(0)}
                        {currentAssignee.lastName.charAt(0)}
                      </span>
                      <span className="font-medium">
                        {currentAssignee.firstName} {currentAssignee.lastName}
                      </span>
                    </>
                  ) : lead.assignedName ? (
                    <span className="font-medium">{lead.assignedName}</span>
                  ) : (
                    <span className="text-gray-400">Unassigned</span>
                  )}
                </span>
                <svg
                  className={`h-4 w-4 text-gray-400 transition-transform ${showAssignDropdown ? 'rotate-180' : ''}`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {showAssignDropdown && teamMembers && (
                <div className="absolute z-50 mt-1 w-full rounded-lg border border-gray-200 bg-white py-1 shadow-lg">
                  {/* Unassign option */}
                  <button
                    type="button"
                    className={`flex w-full items-center gap-2.5 px-3 py-2.5 text-left text-sm transition-colors min-h-[44px] ${
                      !lead.assignedTo
                        ? 'bg-brand-50 font-medium text-brand-700'
                        : 'text-gray-700 hover:bg-gray-50'
                    }`}
                    onClick={() => {
                      onAssign(null);
                      setShowAssignDropdown(false);
                    }}
                  >
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-gray-100 text-gray-400">
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
                          d="M6 18L18 6M6 6l12 12"
                        />
                      </svg>
                    </span>
                    Unassigned
                  </button>
                  {teamMembers.map((member) => (
                    <button
                      key={member.userId}
                      type="button"
                      className={`flex w-full items-center gap-2.5 px-3 py-2.5 text-left text-sm transition-colors min-h-[44px] ${
                        lead.assignedTo === member.userId
                          ? 'bg-brand-50 font-medium text-brand-700'
                          : 'text-gray-700 hover:bg-gray-50'
                      }`}
                      onClick={() => {
                        onAssign(member.userId);
                        setShowAssignDropdown(false);
                      }}
                    >
                      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-brand-100 text-[10px] font-bold text-brand-700">
                        {member.firstName.charAt(0)}
                        {member.lastName.charAt(0)}
                      </span>
                      {member.firstName} {member.lastName}
                      {lead.assignedTo === member.userId && (
                        <svg
                          className="ml-auto h-4 w-4 text-brand-600"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth={2}
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </section>
        )}

        {/* Notes Section */}
        <section className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-3">
            Notes
          </h2>

          <NoteForm onSubmit={onAddNote} isSubmitting={isAddingNote} />

          {lead.notes && lead.notes.length > 0 ? (
            <div className="mt-4 space-y-3 border-t border-gray-100 pt-4">
              {lead.notes.map((note) => (
                <div key={note.id} className="rounded-lg bg-gray-50 p-3">
                  <p className="text-sm text-gray-900 whitespace-pre-wrap">{note.content}</p>
                  <div className="mt-2 flex items-center gap-2 text-xs text-gray-400">
                    <span>{note.authorName}</span>
                    <span>--</span>
                    <time dateTime={note.createdAt}>
                      {new Date(note.createdAt).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                        hour: 'numeric',
                        minute: '2-digit',
                      })}
                    </time>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-4 text-center text-xs text-gray-400 py-4">No notes yet</p>
          )}
        </section>

        {/* Timeline / History */}
        {lead.timeline && lead.timeline.length > 0 && (
          <section className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-3">
              Activity Timeline
            </h2>
            <div className="space-y-0">
              {lead.timeline.map((event, index) => (
                <div key={event.id} className="relative flex gap-3 pb-4">
                  {/* Connecting line */}
                  {index < lead.timeline.length - 1 && (
                    <div className="absolute left-[11px] top-6 h-full w-px bg-gray-200" />
                  )}

                  {/* Dot */}
                  <div className="relative mt-1.5 h-[6px] w-[6px] flex-shrink-0 rounded-full bg-gray-300 ring-4 ring-white" />

                  {/* Content */}
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-gray-700">{event.description}</p>
                    <div className="mt-0.5 flex items-center gap-2 text-xs text-gray-400">
                      <span>{event.performedByName}</span>
                      <span>--</span>
                      <time dateTime={event.createdAt}>
                        {new Date(event.createdAt).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          hour: 'numeric',
                          minute: '2-digit',
                        })}
                      </time>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Meta info */}
        <section className="text-center text-xs text-gray-400 space-y-1">
          <p>
            Created{' '}
            <time dateTime={lead.createdAt}>
              {new Date(lead.createdAt).toLocaleDateString('en-US', {
                month: 'long',
                day: 'numeric',
                year: 'numeric',
              })}
            </time>
          </p>
          <p>
            Last updated{' '}
            <time dateTime={lead.updatedAt}>
              {new Date(lead.updatedAt).toLocaleDateString('en-US', {
                month: 'long',
                day: 'numeric',
                year: 'numeric',
                hour: 'numeric',
                minute: '2-digit',
              })}
            </time>
          </p>
        </section>
      </div>
    </div>
  );
}
