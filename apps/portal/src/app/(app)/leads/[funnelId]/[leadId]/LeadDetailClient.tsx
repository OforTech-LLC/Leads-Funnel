'use client';

import { useParams } from 'next/navigation';
import { useLead, useUpdateLeadStatus, useAddNote, useAssignLead } from '@/lib/queries/leads';
import LeadDetailModal from '@/components/LeadDetailModal';
import { PageLoader } from '@/components/LoadingSpinner';
import { toast } from '@/lib/toast';
import { ApiError } from '@/lib/api';

export default function LeadDetailClient() {
  const params = useParams();
  const funnelId = params.funnelId as string;
  const leadId = params.leadId as string;

  const { data: lead, isLoading, error } = useLead(funnelId, leadId);
  const updateStatus = useUpdateLeadStatus();
  const addNote = useAddNote();
  const assignLead = useAssignLead();

  if (isLoading) {
    return <PageLoader />;
  }

  const isProfileGate =
    error instanceof ApiError &&
    error.status === 403 &&
    (error.body as { error?: { code?: string } } | undefined)?.error?.code === 'PROFILE_INCOMPLETE';

  if (isProfileGate) {
    return (
      <div className="mx-auto max-w-xl px-4 py-12">
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-6 text-sm text-amber-700">
          <p className="font-semibold">Complete your profile to view lead details.</p>
          <p className="mt-2 text-amber-600">
            Add a profile photo and phone number to unlock lead access.
          </p>
          <a
            href="/settings"
            className="mt-4 inline-flex rounded-lg bg-amber-600 px-3 py-2 text-xs font-medium text-white hover:bg-amber-700"
          >
            Go to settings
          </a>
        </div>
      </div>
    );
  }

  if (error || !lead) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center px-4">
        <div className="text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-red-50">
            <svg
              className="h-6 w-6 text-red-500"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z"
              />
            </svg>
          </div>
          <h2 className="mt-4 text-lg font-semibold text-gray-900">Lead not found</h2>
          <p className="mt-1 text-sm text-gray-500">
            This lead may have been removed or you may not have access.
          </p>
        </div>
      </div>
    );
  }

  return (
    <LeadDetailModal
      lead={lead}
      onStatusChange={(status) => updateStatus.mutate({ funnelId, leadId, status })}
      onAddNote={(content) => addNote.mutate({ funnelId, leadId, content })}
      onAssign={(assignedTo) =>
        assignLead.mutate(
          { funnelId, leadId, assignedTo },
          {
            onSuccess: () => toast.success(assignedTo ? 'Lead assigned' : 'Lead unassigned'),
            onError: () => toast.error('Failed to update assignment'),
          }
        )
      }
      isUpdatingStatus={updateStatus.isPending}
      isAddingNote={addNote.isPending}
      isAssigning={assignLead.isPending}
    />
  );
}
