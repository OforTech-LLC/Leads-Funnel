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

const STATUS_OPTIONS: LeadStatus[] = [
  'new',
  'assigned',
  'unassigned',
  'contacted',
  'qualified',
  'booked',
  'converted',
  'won',
  'lost',
  'dnc',
  'quarantined',
];
const PIPELINE_OPTIONS: PipelineStatus[] = [
  'none',
  'nurturing',
  'negotiating',
  'closing',
  'closed_won',
  'closed_lost',
];

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

  useEffect(() => {
    loadFunnels();
    loadUser();
  }, []);

  useEffect(() => {
    if (selectedFunnel) {
      loadLeads();
    }
  }, [selectedFunnel, statusFilter, searchQuery, startDate, endDate]);

  async function loadUser() {
    try {
      const currentUser = await getCurrentUser();
      setUser(currentUser);
    } catch (err) {
      console.error(
        '[LeadsPage] Failed to load user:',
        err instanceof Error ? err.message : 'Unknown error'
      );
    }
  }

  async function loadFunnels() {
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
  }

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
        <h1>Leads</h1>

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

      <style jsx>{`
        .leads-page {
          max-width: 1400px;
          margin: 0 auto;
        }

        .leads-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 24px;
        }

        .leads-header h1 {
          font-size: 28px;
          font-weight: 600;
          margin: 0;
        }

        .funnel-select {
          padding: 10px 16px;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.2);
          border-radius: 8px;
          color: #fff;
          font-size: 14px;
          min-width: 200px;
        }

        .error-banner {
          background: rgba(239, 68, 68, 0.1);
          border: 1px solid rgba(239, 68, 68, 0.3);
          border-radius: 8px;
          padding: 12px 16px;
          color: #ef4444;
          margin-bottom: 16px;
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .dismiss-btn {
          padding: 6px 12px;
          background: rgba(239, 68, 68, 0.2);
          border: 1px solid rgba(239, 68, 68, 0.4);
          border-radius: 4px;
          color: #ef4444;
          font-size: 13px;
          cursor: pointer;
        }

        .filters {
          display: flex;
          gap: 12px;
          margin-bottom: 16px;
          flex-wrap: wrap;
        }

        .search-input {
          flex: 1;
          min-width: 200px;
          padding: 10px 16px;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.2);
          border-radius: 8px;
          color: #fff;
          font-size: 14px;
        }

        .filter-select,
        .date-input {
          padding: 10px 16px;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.2);
          border-radius: 8px;
          color: #fff;
          font-size: 14px;
        }

        .bulk-actions {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px 16px;
          background: rgba(59, 130, 246, 0.1);
          border: 1px solid rgba(59, 130, 246, 0.3);
          border-radius: 8px;
          margin-bottom: 16px;
        }

        .bulk-select {
          padding: 8px 12px;
          background: rgba(255, 255, 255, 0.1);
          border: 1px solid rgba(255, 255, 255, 0.2);
          border-radius: 6px;
          color: #fff;
          font-size: 14px;
        }

        .bulk-dnc {
          padding: 8px 12px;
          background: rgba(239, 68, 68, 0.2);
          border: 1px solid rgba(239, 68, 68, 0.3);
          border-radius: 6px;
          color: #ef4444;
          font-size: 14px;
          cursor: pointer;
        }

        .leads-table-wrapper {
          overflow-x: auto;
          background: rgba(255, 255, 255, 0.02);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 12px;
        }

        .leads-table {
          width: 100%;
          border-collapse: collapse;
        }

        .leads-table th,
        .leads-table td {
          padding: 12px 16px;
          text-align: left;
          border-bottom: 1px solid rgba(255, 255, 255, 0.05);
        }

        .leads-table th {
          background: rgba(255, 255, 255, 0.03);
          font-weight: 500;
          font-size: 13px;
          color: rgba(255, 255, 255, 0.7);
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .leads-table tr.dnc {
          opacity: 0.5;
        }

        .loading-cell,
        .empty-cell {
          text-align: center;
          padding: 40px;
          color: rgba(255, 255, 255, 0.5);
        }

        .loading-cell {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 12px;
        }

        .loading-spinner {
          width: 24px;
          height: 24px;
          border: 2px solid rgba(255, 255, 255, 0.1);
          border-top-color: #3b82f6;
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }

        .status-badge {
          display: inline-block;
          padding: 4px 8px;
          border-radius: 4px;
          font-size: 12px;
          font-weight: 500;
        }

        .status-badge.new {
          background: rgba(59, 130, 246, 0.2);
          color: #3b82f6;
        }
        .status-badge.contacted {
          background: rgba(249, 115, 22, 0.2);
          color: #f97316;
        }
        .status-badge.qualified {
          background: rgba(139, 92, 246, 0.2);
          color: #8b5cf6;
        }
        .status-badge.converted {
          background: rgba(34, 197, 94, 0.2);
          color: #22c55e;
        }
        .status-badge.lost {
          background: rgba(107, 114, 128, 0.2);
          color: #6b7280;
        }
        .status-badge.dnc {
          background: rgba(239, 68, 68, 0.2);
          color: #ef4444;
        }
        .status-badge.quarantined {
          background: rgba(245, 158, 11, 0.2);
          color: #f59e0b;
        }

        .pipeline-badge {
          display: inline-block;
          padding: 4px 8px;
          border-radius: 4px;
          font-size: 12px;
          background: rgba(255, 255, 255, 0.1);
          color: rgba(255, 255, 255, 0.7);
        }

        .edit-btn {
          padding: 6px 12px;
          background: rgba(59, 130, 246, 0.2);
          border: 1px solid rgba(59, 130, 246, 0.3);
          border-radius: 6px;
          color: #3b82f6;
          font-size: 13px;
          cursor: pointer;
        }

        .load-more-btn {
          display: block;
          width: 100%;
          padding: 12px;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 8px;
          color: #fff;
          font-size: 14px;
          cursor: pointer;
          margin-top: 16px;
        }

        .load-more-btn:hover {
          background: rgba(255, 255, 255, 0.1);
        }

        .load-more-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
      `}</style>
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

        <style jsx>{`
          .modal-overlay {
            position: fixed;
            inset: 0;
            background: rgba(0, 0, 0, 0.8);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 1000;
          }

          .modal {
            background: #1a1a2e;
            border: 1px solid rgba(255, 255, 255, 0.1);
            border-radius: 16px;
            padding: 24px;
            width: 100%;
            max-width: 480px;
          }

          .modal h2 {
            margin: 0 0 4px;
            font-size: 20px;
          }

          .modal-email {
            color: rgba(255, 255, 255, 0.6);
            margin: 0 0 24px;
          }

          .form-group {
            margin-bottom: 16px;
          }

          .form-group label {
            display: block;
            margin-bottom: 6px;
            font-size: 14px;
            color: rgba(255, 255, 255, 0.7);
          }

          .form-group select,
          .form-group input[type='text'],
          .form-group textarea {
            width: 100%;
            padding: 10px 12px;
            background: rgba(255, 255, 255, 0.05);
            border: 1px solid rgba(255, 255, 255, 0.2);
            border-radius: 8px;
            color: #fff;
            font-size: 14px;
          }

          .form-group textarea {
            resize: vertical;
          }

          .form-group.checkbox label {
            display: flex;
            align-items: center;
            gap: 8px;
            cursor: pointer;
          }

          .modal-actions {
            display: flex;
            gap: 12px;
            margin-top: 24px;
          }

          .cancel-btn {
            flex: 1;
            padding: 12px;
            background: rgba(255, 255, 255, 0.05);
            border: 1px solid rgba(255, 255, 255, 0.2);
            border-radius: 8px;
            color: #fff;
            font-size: 14px;
            cursor: pointer;
          }

          .save-btn {
            flex: 1;
            padding: 12px;
            background: linear-gradient(135deg, #3b82f6, #8b5cf6);
            border: none;
            border-radius: 8px;
            color: #fff;
            font-size: 14px;
            font-weight: 500;
            cursor: pointer;
          }
        `}</style>
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
  const labels: Record<LeadStatus, string> = {
    new: 'New',
    assigned: 'Assigned',
    unassigned: 'Unassigned',
    contacted: 'Contacted',
    qualified: 'Qualified',
    booked: 'Booked',
    converted: 'Converted',
    won: 'Won',
    lost: 'Lost',
    dnc: 'Do Not Contact',
    quarantined: 'Quarantined',
  };
  return labels[status] || status;
}

function formatPipeline(status: PipelineStatus): string {
  const labels: Record<PipelineStatus, string> = {
    none: 'None',
    nurturing: 'Nurturing',
    negotiating: 'Negotiating',
    closing: 'Closing',
    closed_won: 'Closed Won',
    closed_lost: 'Closed Lost',
  };
  return labels[status] || status;
}
