'use client';

/**
 * Admin Leads Page
 *
 * View, filter, and manage leads across funnels.
 */

import { useEffect, useState, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  listFunnels,
  queryLeads,
  updateLead,
  bulkUpdateLeads,
  type Lead,
  type LeadStatus,
  type PipelineStatus,
  type QueryLeadsRequest,
} from '@/lib/admin/api';
import { getCurrentUser, type AdminUser } from '@/lib/admin/auth';
import {
  LEAD_STATUS_OPTIONS,
  PIPELINE_STATUS_OPTIONS,
  STATUS_LABELS,
  PIPELINE_LABELS,
} from '@/lib/lead-status';

const STATUS_OPTIONS: LeadStatus[] = LEAD_STATUS_OPTIONS;
const PIPELINE_OPTIONS: PipelineStatus[] = PIPELINE_STATUS_OPTIONS;

export default function LeadsPage() {
  const searchParams = useSearchParams();
  const initialFunnel = searchParams.get('funnel') || '';

  const [funnels, setFunnels] = useState<string[]>([]);
  const [selectedFunnel, setSelectedFunnel] = useState(initialFunnel);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [nextToken, setNextToken] = useState<string | undefined>();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [statusFilter, setStatusFilter] = useState<LeadStatus | ''>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Selection
  const [selectedLeads, setSelectedLeads] = useState<Set<string>>(new Set());

  // Edit modal
  const [editingLead, setEditingLead] = useState<Lead | null>(null);

  // User permissions
  const [user, setUser] = useState<AdminUser | null>(null);
  const canWrite = user?.role === 'Admin';

  const loadUser = useCallback(async () => {
    try {
      const currentUser = await getCurrentUser();
      setUser(currentUser);
    } catch (err) {
      console.error(
        '[LeadsPage] Failed to load user:',
        err instanceof Error ? err.message : 'Unknown error'
      );
    }
  }, []);

  const loadFunnels = useCallback(async () => {
    try {
      const { funnels: funnelList } = await listFunnels();
      setFunnels(funnelList);
      if (!selectedFunnel && funnelList.length > 0) {
        setSelectedFunnel(funnelList[0]);
      }
    } catch (err) {
      console.error('[LeadsPage] Failed to load funnels:', err);
      setError(err instanceof Error ? err.message : 'Failed to load funnels');
    }
  }, [selectedFunnel]);

  useEffect(() => {
    loadFunnels();
    loadUser();
  }, [loadFunnels, loadUser]);

  const loadLeads = useCallback(
    async (loadMore = false) => {
      if (!selectedFunnel) return;

      setLoading(true);
      setError(null);

      try {
        const request: QueryLeadsRequest = {
          funnelId: selectedFunnel,
          pageSize: 50,
          ...(statusFilter && { status: statusFilter }),
          ...(searchQuery && { search: searchQuery }),
          ...(startDate && { startDate }),
          ...(endDate && { endDate }),
          ...(loadMore && nextToken && { nextToken }),
        };

        const result = await queryLeads(request);

        if (loadMore) {
          setLeads((prev) => [...prev, ...result.leads]);
        } else {
          setLeads(result.leads);
          setSelectedLeads(new Set());
        }
        setTotalCount(result.totalCount);
        setNextToken(result.nextToken);
      } catch (err) {
        console.error('[LeadsPage] Failed to load leads:', err);
        setError(err instanceof Error ? err.message : 'Failed to load leads');
      } finally {
        setLoading(false);
      }
    },
    [selectedFunnel, statusFilter, searchQuery, startDate, endDate, nextToken]
  );

  useEffect(() => {
    if (selectedFunnel) {
      loadLeads();
    }
  }, [selectedFunnel, loadLeads]);

  async function handleUpdateLead(leadId: string, updates: Partial<Lead>) {
    try {
      await updateLead({
        funnelId: selectedFunnel,
        leadId,
        ...updates,
      });
      await loadLeads();
      setEditingLead(null);
    } catch (err) {
      console.error('[LeadsPage] Failed to update lead:', err);
      setError(err instanceof Error ? err.message : 'Failed to update lead');
    }
  }

  async function handleBulkUpdate(updates: {
    status?: LeadStatus;
    pipelineStatus?: PipelineStatus;
    doNotContact?: boolean;
  }) {
    if (selectedLeads.size === 0) return;

    try {
      await bulkUpdateLeads({
        funnelId: selectedFunnel,
        leadIds: Array.from(selectedLeads),
        ...updates,
      });
      await loadLeads();
      setSelectedLeads(new Set());
    } catch (err) {
      console.error('[LeadsPage] Failed to bulk update leads:', err);
      setError(err instanceof Error ? err.message : 'Failed to bulk update leads');
    }
  }

  function toggleSelectLead(leadId: string) {
    setSelectedLeads((prev) => {
      const next = new Set(prev);
      if (next.has(leadId)) {
        next.delete(leadId);
      } else {
        next.add(leadId);
      }
      return next;
    });
  }

  function toggleSelectAll() {
    if (selectedLeads.size === leads.length) {
      setSelectedLeads(new Set());
    } else {
      setSelectedLeads(new Set(leads.map((l) => l.leadId)));
    }
  }

  return (
    <div className="leads-page">
      <header className="leads-header">
        <div>
          <h1>Leads</h1>
          <div className="leads-count">
            {totalCount > 0 ? `${totalCount} total` : 'No leads yet'}
          </div>
        </div>

        {/* Funnel Selector */}
        <select
          value={selectedFunnel}
          onChange={(e) => setSelectedFunnel(e.target.value)}
          className="funnel-select"
        >
          <option value="">Select Funnel</option>
          {funnels.map((f) => (
            <option key={f} value={f}>
              {formatFunnelName(f)}
            </option>
          ))}
        </select>
      </header>

      {error && (
        <div className="error-banner">
          <span>{error}</span>
          <button onClick={() => setError(null)} className="dismiss-btn">
            Dismiss
          </button>
        </div>
      )}

      {/* Filters */}
      <div className="filters">
        <input
          type="text"
          placeholder="Search by email or name..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="search-input"
        />

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as LeadStatus | '')}
          className="filter-select"
        >
          <option value="">All Statuses</option>
          {STATUS_OPTIONS.map((s) => (
            <option key={s} value={s}>
              {formatStatus(s)}
            </option>
          ))}
        </select>

        <input
          type="date"
          value={startDate}
          onChange={(e) => setStartDate(e.target.value)}
          className="date-input"
          placeholder="Start Date"
        />

        <input
          type="date"
          value={endDate}
          onChange={(e) => setEndDate(e.target.value)}
          className="date-input"
          placeholder="End Date"
        />
      </div>

      {/* Bulk Actions */}
      {canWrite && selectedLeads.size > 0 && (
        <div className="bulk-actions">
          <span>{selectedLeads.size} selected</span>
          <select
            onChange={(e) => {
              if (e.target.value) {
                handleBulkUpdate({ status: e.target.value as LeadStatus });
                e.target.value = '';
              }
            }}
            className="bulk-select"
          >
            <option value="">Set Status...</option>
            {STATUS_OPTIONS.map((s) => (
              <option key={s} value={s}>
                {formatStatus(s)}
              </option>
            ))}
          </select>
          <button onClick={() => handleBulkUpdate({ doNotContact: true })} className="bulk-dnc">
            Mark DNC
          </button>
        </div>
      )}

      {/* Leads Table */}
      <div className="leads-table-wrapper">
        <table className="leads-table">
          <thead>
            <tr>
              {canWrite && (
                <th>
                  <input
                    type="checkbox"
                    checked={leads.length > 0 && selectedLeads.size === leads.length}
                    onChange={toggleSelectAll}
                  />
                </th>
              )}
              <th>Email</th>
              <th>Name</th>
              <th>Phone</th>
              <th>Status</th>
              <th>Pipeline</th>
              <th>AI Analysis</th>
              <th>Created</th>
              {canWrite && <th>Actions</th>}
            </tr>
          </thead>
          <tbody>
            {loading && leads.length === 0 ? (
              <tr>
                <td colSpan={canWrite ? 9 : 7} className="loading-cell">
                  <div className="loading-spinner" />
                  <span>Loading leads...</span>
                </td>
              </tr>
            ) : leads.length === 0 ? (
              <tr>
                <td colSpan={canWrite ? 9 : 7} className="empty-cell">
                  No leads found
                </td>
              </tr>
            ) : (
              leads.map((lead) => (
                <tr key={lead.leadId} className={lead.doNotContact ? 'dnc' : ''}>
                  {canWrite && (
                    <td>
                      <input
                        type="checkbox"
                        checked={selectedLeads.has(lead.leadId)}
                        onChange={() => toggleSelectLead(lead.leadId)}
                      />
                    </td>
                  )}
                  <td>{lead.email}</td>
                  <td>{lead.name || '-'}</td>
                  <td>{lead.phone || '-'}</td>
                  <td>
                    <span className={`status-badge ${lead.status}`}>
                      {formatStatus(lead.status)}
                    </span>
                  </td>
                  <td>
                    <span className={`pipeline-badge ${lead.pipelineStatus}`}>
                      {formatPipeline(lead.pipelineStatus)}
                    </span>
                  </td>
                  <td>
                    {/* UI Fix 5: Handle async analysis race condition */}
                    {lead.analysis ? (
                      <span title={lead.analysis.summary}>
                        {lead.analysis.urgency.toUpperCase()} / {lead.analysis.intent}
                      </span>
                    ) : (
                      <span className="text-gray-500 italic">Processing...</span>
                    )}
                  </td>
                  <td>{new Date(lead.createdAt).toLocaleDateString()}</td>
                  {canWrite && (
                    <td>
                      <button onClick={() => setEditingLead(lead)} className="edit-btn">
                        Edit
                      </button>
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Load More */}
      {nextToken && (
        <button onClick={() => loadLeads(true)} disabled={loading} className="load-more-btn">
          {loading ? 'Loading...' : 'Load More'}
        </button>
      )}

      {/* Edit Modal */}
      {editingLead && (
        <EditLeadModal
          lead={editingLead}
          onSave={(updates) => handleUpdateLead(editingLead.leadId, updates)}
          onClose={() => setEditingLead(null)}
        />
      )}
    </div>
  );
}

// Edit Lead Modal Component
function EditLeadModal({
  lead,
  onSave,
  onClose,
}: {
  lead: Lead;
  onSave: (updates: Partial<Lead>) => void;
  onClose: () => void;
}) {
  const [status, setStatus] = useState<LeadStatus>(lead.status);
  const [pipelineStatus, setPipelineStatus] = useState<PipelineStatus>(lead.pipelineStatus);
  const [notes, setNotes] = useState(lead.notes || '');
  const [tags, setTags] = useState(lead.tags?.join(', ') || '');
  const [doNotContact, setDoNotContact] = useState(lead.doNotContact || false);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    onSave({
      status,
      pipelineStatus,
      notes,
      tags: tags
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean),
      doNotContact,
    });
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h2>Edit Lead</h2>
        <p className="modal-email">{lead.email}</p>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Status</label>
            <select value={status} onChange={(e) => setStatus(e.target.value as LeadStatus)}>
              {STATUS_OPTIONS.map((s) => (
                <option key={s} value={s}>
                  {formatStatus(s)}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label>Pipeline Status</label>
            <select
              value={pipelineStatus}
              onChange={(e) => setPipelineStatus(e.target.value as PipelineStatus)}
            >
              {PIPELINE_OPTIONS.map((p) => (
                <option key={p} value={p}>
                  {formatPipeline(p)}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label>Notes</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={4}
              placeholder="Add notes about this lead..."
            />
          </div>

          <div className="form-group">
            <label>Tags (comma-separated)</label>
            <input
              type="text"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder="hot-lead, follow-up, vip"
            />
          </div>

          <div className="form-group checkbox">
            <label>
              <input
                type="checkbox"
                checked={doNotContact}
                onChange={(e) => setDoNotContact(e.target.checked)}
              />
              Do Not Contact
            </label>
          </div>

          <div className="modal-actions">
            <button type="button" onClick={onClose} className="cancel-btn">
              Cancel
            </button>
            <button type="submit" className="save-btn">
              Save Changes
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function formatFunnelName(funnelId: string): string {
  return funnelId
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

function formatStatus(status: LeadStatus): string {
  return STATUS_LABELS[status] || status;
}

function formatPipeline(status: PipelineStatus): string {
  return PIPELINE_LABELS[status] || status;
}
