'use client';

/**
 * Admin Exports Page
 *
 * Create and download lead exports in various formats.
 */

import { useEffect, useState } from 'react';
import {
  listFunnels,
  createExport,
  getExportStatus,
  getExportDownloadUrl,
  type ExportJob,
  type ExportFormat,
  type LeadStatus,
} from '@/lib/admin/api';

const FORMAT_OPTIONS: { value: ExportFormat; label: string; icon: string }[] = [
  { value: 'csv', label: 'CSV', icon: '(CSV)' },
  { value: 'xlsx', label: 'Excel', icon: '(XLS)' },
  { value: 'json', label: 'JSON', icon: '(JSON)' },
  { value: 'pdf', label: 'PDF', icon: '(PDF)' },
  { value: 'docx', label: 'Word', icon: '(DOC)' },
];

const STATUS_OPTIONS: { value: LeadStatus | ''; label: string }[] = [
  { value: '', label: 'All Statuses' },
  { value: 'new', label: 'New' },
  { value: 'contacted', label: 'Contacted' },
  { value: 'qualified', label: 'Qualified' },
  { value: 'converted', label: 'Converted' },
  { value: 'lost', label: 'Lost' },
  { value: 'dnc', label: 'Do Not Contact' },
];

export default function ExportsPage() {
  const [funnels, setFunnels] = useState<string[]>([]);
  const [selectedFunnel, setSelectedFunnel] = useState('');
  const [selectedFormat, setSelectedFormat] = useState<ExportFormat>('csv');
  const [statusFilter, setStatusFilter] = useState<LeadStatus | ''>('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const [jobs, setJobs] = useState<ExportJob[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [funnelsLoading, setFunnelsLoading] = useState(true);

  useEffect(() => {
    loadFunnels();
  }, []);

  async function loadFunnels() {
    setFunnelsLoading(true);
    try {
      const { funnels: funnelList } = await listFunnels();
      setFunnels(funnelList);
      if (funnelList.length > 0) {
        setSelectedFunnel(funnelList[0]);
      }
    } catch (err) {
      console.error('[Exports] Failed to load funnels:', err);
      setError(err instanceof Error ? err.message : 'Failed to load funnels');
    } finally {
      setFunnelsLoading(false);
    }
  }

  async function handleCreateExport() {
    if (!selectedFunnel) {
      setError('Please select a funnel');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { job } = await createExport({
        funnelId: selectedFunnel,
        format: selectedFormat,
        ...(statusFilter && { status: statusFilter }),
        ...(startDate && { startDate }),
        ...(endDate && { endDate }),
      });

      setJobs((prev) => [job, ...prev]);

      // Poll for completion if pending
      if (job.status === 'pending' || job.status === 'processing') {
        pollJobStatus(job.jobId);
      }
    } catch (err) {
      console.error('[Exports] Failed to create export:', err);
      setError(err instanceof Error ? err.message : 'Failed to create export');
    } finally {
      setLoading(false);
    }
  }

  async function pollJobStatus(jobId: string, attempts = 0) {
    if (attempts > 30) {
      console.warn(`[Exports] Polling timeout for job ${jobId} after ${attempts} attempts`);
      return; // Max 30 attempts (5 minutes)
    }

    try {
      const { job } = await getExportStatus(jobId);

      setJobs((prev) => prev.map((j) => (j.jobId === jobId ? job : j)));

      if (job.status === 'pending' || job.status === 'processing') {
        setTimeout(() => pollJobStatus(jobId, attempts + 1), 10000); // Poll every 10 seconds
      }
    } catch (err) {
      // Log poll errors but don't surface them to user - job status will be stale
      console.warn(
        `[Exports] Failed to poll job ${jobId} status:`,
        err instanceof Error ? err.message : 'Unknown error'
      );
    }
  }

  async function handleDownload(job: ExportJob) {
    try {
      const { downloadUrl } = await getExportDownloadUrl(job.jobId);
      window.open(downloadUrl, '_blank');
    } catch (err) {
      console.error('[Exports] Failed to get download URL:', err);
      setError(err instanceof Error ? err.message : 'Failed to get download URL');
    }
  }

  return (
    <div className="exports-page">
      <header className="exports-header">
        <h1>Exports</h1>
        <p>Export leads to various formats</p>
      </header>

      {error && (
        <div className="error-banner">
          <span>{error}</span>
          <button onClick={() => setError(null)} className="dismiss-btn">
            Dismiss
          </button>
        </div>
      )}

      {/* Export Form */}
      <div className="export-form">
        <h2>Create New Export</h2>

        {funnelsLoading ? (
          <div className="form-loading">
            <div className="loading-spinner" />
            <span>Loading funnels...</span>
          </div>
        ) : (
          <>
            <div className="form-row">
              <div className="form-group">
                <label>Funnel</label>
                <select value={selectedFunnel} onChange={(e) => setSelectedFunnel(e.target.value)}>
                  <option value="">Select Funnel</option>
                  {funnels.map((f) => (
                    <option key={f} value={f}>
                      {formatFunnelName(f)}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>Format</label>
                <div className="format-options">
                  {FORMAT_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      className={`format-btn ${selectedFormat === opt.value ? 'active' : ''}`}
                      onClick={() => setSelectedFormat(opt.value)}
                    >
                      <span className="format-icon">{opt.icon}</span>
                      <span>{opt.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Status Filter</label>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as LeadStatus | '')}
                >
                  {STATUS_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>Start Date</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label>End Date</label>
                <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
              </div>
            </div>

            <button
              onClick={handleCreateExport}
              disabled={loading || !selectedFunnel}
              className="create-btn"
            >
              {loading ? 'Creating Export...' : 'Create Export'}
            </button>
          </>
        )}
      </div>

      {/* Export Jobs */}
      <div className="jobs-section">
        <h2>Recent Exports</h2>

        {jobs.length === 0 ? (
          <p className="no-jobs">No exports yet. Create one above.</p>
        ) : (
          <div className="jobs-list">
            {jobs.map((job) => (
              <div key={job.jobId} className="job-card">
                <div className="job-info">
                  <div className="job-funnel">{formatFunnelName(job.funnelId)}</div>
                  <div className="job-meta">
                    <span className="job-format">{job.format.toUpperCase()}</span>
                    <span className="job-date">{new Date(job.createdAt).toLocaleString()}</span>
                  </div>
                </div>

                <div className="job-status">
                  <span className={`status-badge ${job.status}`}>
                    {formatJobStatus(job.status)}
                  </span>
                  {job.recordCount !== undefined && (
                    <span className="job-count">{job.recordCount} records</span>
                  )}
                </div>

                <div className="job-actions">
                  {job.status === 'completed' && (
                    <button onClick={() => handleDownload(job)} className="download-btn">
                      Download
                    </button>
                  )}
                  {job.status === 'failed' && job.errorMessage && (
                    <span className="error-text">{job.errorMessage}</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <style jsx>{`
        .exports-page {
          max-width: 1000px;
          margin: 0 auto;
        }

        .exports-header {
          margin-bottom: 32px;
        }

        .exports-header h1 {
          font-size: 28px;
          font-weight: 600;
          margin: 0 0 8px;
        }

        .exports-header p {
          color: rgba(255, 255, 255, 0.6);
          margin: 0;
        }

        .error-banner {
          background: rgba(239, 68, 68, 0.1);
          border: 1px solid rgba(239, 68, 68, 0.3);
          border-radius: 8px;
          padding: 12px 16px;
          color: #ef4444;
          margin-bottom: 24px;
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

        .export-form {
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 16px;
          padding: 24px;
          margin-bottom: 32px;
        }

        .export-form h2 {
          font-size: 18px;
          margin: 0 0 20px;
        }

        .form-loading {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 12px;
          padding: 40px;
          color: rgba(255, 255, 255, 0.6);
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

        .form-row {
          display: flex;
          gap: 16px;
          margin-bottom: 16px;
          flex-wrap: wrap;
        }

        .form-group {
          flex: 1;
          min-width: 200px;
        }

        .form-group label {
          display: block;
          margin-bottom: 8px;
          font-size: 14px;
          color: rgba(255, 255, 255, 0.7);
        }

        .form-group select,
        .form-group input {
          width: 100%;
          padding: 10px 12px;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.2);
          border-radius: 8px;
          color: #fff;
          font-size: 14px;
        }

        .format-options {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
        }

        .format-btn {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 8px 12px;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.2);
          border-radius: 6px;
          color: rgba(255, 255, 255, 0.7);
          font-size: 13px;
          cursor: pointer;
          transition: all 0.2s;
        }

        .format-btn:hover {
          background: rgba(255, 255, 255, 0.1);
        }

        .format-btn.active {
          background: rgba(59, 130, 246, 0.2);
          border-color: rgba(59, 130, 246, 0.5);
          color: #3b82f6;
        }

        .format-icon {
          font-size: 11px;
          opacity: 0.7;
        }

        .create-btn {
          width: 100%;
          padding: 14px;
          background: linear-gradient(135deg, #3b82f6, #8b5cf6);
          border: none;
          border-radius: 8px;
          color: #fff;
          font-size: 16px;
          font-weight: 500;
          cursor: pointer;
          transition: opacity 0.2s;
        }

        .create-btn:hover:not(:disabled) {
          opacity: 0.9;
        }

        .create-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .jobs-section h2 {
          font-size: 18px;
          margin: 0 0 16px;
        }

        .no-jobs {
          color: rgba(255, 255, 255, 0.5);
          text-align: center;
          padding: 40px;
        }

        .jobs-list {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .job-card {
          display: flex;
          align-items: center;
          gap: 16px;
          padding: 16px;
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 12px;
        }

        .job-info {
          flex: 1;
        }

        .job-funnel {
          font-weight: 500;
          margin-bottom: 4px;
        }

        .job-meta {
          display: flex;
          gap: 12px;
          font-size: 13px;
          color: rgba(255, 255, 255, 0.5);
        }

        .job-format {
          background: rgba(255, 255, 255, 0.1);
          padding: 2px 6px;
          border-radius: 4px;
        }

        .job-status {
          display: flex;
          flex-direction: column;
          align-items: flex-end;
          gap: 4px;
        }

        .status-badge {
          padding: 4px 8px;
          border-radius: 4px;
          font-size: 12px;
          font-weight: 500;
        }

        .status-badge.pending {
          background: rgba(245, 158, 11, 0.2);
          color: #f59e0b;
        }
        .status-badge.processing {
          background: rgba(59, 130, 246, 0.2);
          color: #3b82f6;
        }
        .status-badge.completed {
          background: rgba(34, 197, 94, 0.2);
          color: #22c55e;
        }
        .status-badge.failed {
          background: rgba(239, 68, 68, 0.2);
          color: #ef4444;
        }

        .job-count {
          font-size: 12px;
          color: rgba(255, 255, 255, 0.5);
        }

        .job-actions {
          min-width: 100px;
          text-align: right;
        }

        .download-btn {
          padding: 8px 16px;
          background: rgba(34, 197, 94, 0.2);
          border: 1px solid rgba(34, 197, 94, 0.3);
          border-radius: 6px;
          color: #22c55e;
          font-size: 13px;
          cursor: pointer;
        }

        .download-btn:hover {
          background: rgba(34, 197, 94, 0.3);
        }

        .error-text {
          font-size: 12px;
          color: #ef4444;
        }
      `}</style>
    </div>
  );
}

function formatFunnelName(funnelId: string): string {
  return funnelId
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

function formatJobStatus(status: ExportJob['status']): string {
  const labels: Record<ExportJob['status'], string> = {
    pending: 'Pending',
    processing: 'Processing',
    completed: 'Completed',
    failed: 'Failed',
  };
  return labels[status] || status;
}
