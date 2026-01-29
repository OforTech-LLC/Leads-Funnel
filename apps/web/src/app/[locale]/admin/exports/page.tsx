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
import { LEAD_STATUS_FILTER_OPTIONS } from '@/lib/lead-status';

const FORMAT_OPTIONS: { value: ExportFormat; label: string; icon: string }[] = [
  { value: 'csv', label: 'CSV', icon: '(CSV)' },
  { value: 'xlsx', label: 'Excel', icon: '(XLS)' },
  { value: 'json', label: 'JSON', icon: '(JSON)' },
  { value: 'pdf', label: 'PDF', icon: '(PDF)' },
  { value: 'docx', label: 'Word', icon: '(DOC)' },
];

const STATUS_OPTIONS: { value: LeadStatus | ''; label: string }[] = LEAD_STATUS_FILTER_OPTIONS;

/**
 * Validate that a download URL points to an allowed origin.
 */
function isValidDownloadUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return (
      parsed.protocol === 'https:' &&
      (parsed.hostname.endsWith('.amazonaws.com') || parsed.hostname.endsWith('.kanjona.com'))
    );
  } catch {
    return false;
  }
}

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
      if (downloadUrl && isValidDownloadUrl(downloadUrl)) {
        window.open(downloadUrl, '_blank', 'noopener,noreferrer');
      } else {
        console.error('Invalid download URL received');
        setError('Invalid download URL received. Please try again.');
      }
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
