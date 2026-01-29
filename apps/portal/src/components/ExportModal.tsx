'use client';

import { useState, useEffect, useRef } from 'react';
import {
  useCreateExport,
  useExportStatus,
  downloadExportFile,
  EXPORT_FIELDS,
  type ExportFormat,
  type ExportRequest,
} from '@/lib/exports';
import { useFocusTrap } from '@/lib/useFocusTrap';
import { ERROR_MESSAGES } from '@/lib/constants';
import { PORTAL_EXPORT_STATUS_OPTIONS } from '@/lib/lead-status';
import type { LeadStatus } from '@/lib/types';

const FORMAT_OPTIONS: { value: ExportFormat; label: string; description: string }[] = [
  { value: 'csv', label: 'CSV', description: 'Comma-separated values, opens in Excel' },
  { value: 'xlsx', label: 'XLSX', description: 'Native Excel spreadsheet format' },
  { value: 'json', label: 'JSON', description: 'Structured data for developers' },
];

const STATUS_OPTIONS: { value: LeadStatus | ''; label: string }[] = PORTAL_EXPORT_STATUS_OPTIONS;

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ExportModal({ isOpen, onClose }: ExportModalProps) {
  const [format, setFormat] = useState<ExportFormat>('csv');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [statusFilter, setStatusFilter] = useState<LeadStatus | ''>('');
  const [selectedFields, setSelectedFields] = useState<string[]>(
    EXPORT_FIELDS.filter((f) => f.default).map((f) => f.key)
  );
  const [exportId, setExportId] = useState<string | null>(null);

  const modalRef = useRef<HTMLDivElement>(null);
  const createExport = useCreateExport();
  const { data: exportJob } = useExportStatus(exportId);

  // Focus trap
  useFocusTrap(modalRef, isOpen);

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setExportId(null);
      createExport.reset();
    }
  }, [isOpen]);

  // Auto-download when export is complete
  useEffect(() => {
    if (exportJob?.status === 'completed' && exportJob.id) {
      downloadExportFile(exportJob.id);
    }
  }, [exportJob?.status, exportJob?.id]);

  // Close on Escape
  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Escape') {
      onClose();
    }
  }

  function handleFieldToggle(fieldKey: string) {
    setSelectedFields((prev) =>
      prev.includes(fieldKey) ? prev.filter((k) => k !== fieldKey) : [...prev, fieldKey]
    );
  }

  function handleExport() {
    const request: ExportRequest = {
      format,
      fields: selectedFields,
    };
    if (dateFrom) request.dateFrom = dateFrom;
    if (dateTo) request.dateTo = dateTo;
    if (statusFilter) request.status = statusFilter as LeadStatus;

    createExport.mutate(request, {
      onSuccess: (job) => {
        setExportId(job.id);
      },
    });
  }

  function handleClose() {
    onClose();
  }

  if (!isOpen) return null;

  const isProcessing =
    createExport.isPending ||
    (exportJob && exportJob.status !== 'completed' && exportJob.status !== 'failed');
  const isCompleted = exportJob?.status === 'completed';
  const isFailed = exportJob?.status === 'failed';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onKeyDown={handleKeyDown}
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={handleClose}
        aria-hidden="true"
      />

      {/* Modal */}
      <div
        ref={modalRef}
        className="relative w-full max-w-lg rounded-2xl border border-gray-200 bg-white shadow-2xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="export-modal-title"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
          <h2 id="export-modal-title" className="text-lg font-semibold text-gray-900">
            Export Leads
          </h2>
          <button
            type="button"
            onClick={handleClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
            aria-label="Close"
          >
            <svg
              className="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="max-h-[60vh] overflow-y-auto px-6 py-4 space-y-5">
          {/* Format selection */}
          <fieldset>
            <legend className="mb-2 text-sm font-semibold text-gray-900">Format</legend>
            <div className="grid grid-cols-3 gap-2">
              {FORMAT_OPTIONS.map((option) => (
                <label
                  key={option.value}
                  className={`flex cursor-pointer flex-col items-center rounded-xl border-2 p-3 transition-colors ${
                    format === option.value
                      ? 'border-brand-500 bg-brand-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <input
                    type="radio"
                    name="format"
                    value={option.value}
                    checked={format === option.value}
                    onChange={() => setFormat(option.value)}
                    className="sr-only"
                  />
                  <span
                    className={`text-sm font-bold ${
                      format === option.value ? 'text-brand-700' : 'text-gray-700'
                    }`}
                  >
                    {option.label}
                  </span>
                  <span className="mt-0.5 text-center text-[10px] leading-tight text-gray-400">
                    {option.description}
                  </span>
                </label>
              ))}
            </div>
          </fieldset>

          {/* Date range */}
          <div>
            <label className="mb-2 block text-sm font-semibold text-gray-900">Date Range</label>
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="h-10 flex-1 rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-700 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                aria-label="From date"
              />
              <span className="text-xs text-gray-400">to</span>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="h-10 flex-1 rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-700 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                aria-label="To date"
              />
            </div>
            <p className="mt-1 text-[10px] text-gray-400">Leave empty to export all dates</p>
          </div>

          {/* Status filter */}
          <div>
            <label
              htmlFor="export-status"
              className="mb-2 block text-sm font-semibold text-gray-900"
            >
              Status Filter
            </label>
            <select
              id="export-status"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as LeadStatus | '')}
              className="h-10 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-700 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
            >
              {STATUS_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          {/* Fields selection */}
          <fieldset>
            <legend className="mb-2 text-sm font-semibold text-gray-900">Include Fields</legend>
            <div className="grid grid-cols-2 gap-1.5">
              {EXPORT_FIELDS.map((field) => (
                <label
                  key={field.key}
                  className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm hover:bg-gray-50 cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={selectedFields.includes(field.key)}
                    onChange={() => handleFieldToggle(field.key)}
                    className="h-4 w-4 rounded border-gray-300 text-brand-600 focus:ring-brand-500"
                  />
                  <span className="text-gray-700">{field.label}</span>
                </label>
              ))}
            </div>
          </fieldset>
        </div>

        {/* Footer */}
        <div className="border-t border-gray-100 px-6 py-4">
          {/* Progress state */}
          {isProcessing && (
            <div className="mb-3">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <svg
                  className="h-4 w-4 animate-spin text-brand-600"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
                <span>
                  {exportJob
                    ? `Processing... ${exportJob.processedRecords ?? 0}/${exportJob.totalRecords ?? '?'} records`
                    : 'Starting export...'}
                </span>
              </div>
              {exportJob?.totalRecords && exportJob.processedRecords !== undefined && (
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-gray-200">
                  <div
                    className="h-full rounded-full bg-brand-500 transition-all duration-300"
                    style={{
                      width: `${Math.round(
                        (exportJob.processedRecords / exportJob.totalRecords) * 100
                      )}%`,
                    }}
                  />
                </div>
              )}
            </div>
          )}

          {/* Completed state */}
          {isCompleted && (
            <div
              className="mb-3 flex items-center gap-2 rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700"
              role="alert"
            >
              <svg
                className="h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
              Export complete! Download started automatically.
            </div>
          )}

          {/* Failed state */}
          {isFailed && (
            <div
              className="mb-3 flex items-center gap-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700"
              role="alert"
            >
              <svg
                className="h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
              {exportJob?.errorMessage || ERROR_MESSAGES.EXPORT_FAILED}
            </div>
          )}

          {/* Error from mutation */}
          {createExport.isError && !exportId && (
            <div
              className="mb-3 flex items-center gap-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700"
              role="alert"
            >
              <svg
                className="h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
              {ERROR_MESSAGES.EXPORT_START_FAILED}
            </div>
          )}

          <div className="flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={handleClose}
              className="min-h-[40px] rounded-lg px-4 py-2 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-100"
            >
              {isCompleted ? 'Done' : 'Cancel'}
            </button>

            {!isCompleted && (
              <button
                type="button"
                onClick={handleExport}
                disabled={isProcessing || selectedFields.length === 0}
                className="inline-flex min-h-[40px] items-center rounded-lg bg-brand-600 px-5 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-brand-700 active:bg-brand-800 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isProcessing ? (
                  <>
                    <svg className="mr-2 h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      />
                    </svg>
                    Exporting...
                  </>
                ) : isFailed ? (
                  'Retry Export'
                ) : (
                  <>
                    <svg
                      className="mr-1.5 h-4 w-4"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3"
                      />
                    </svg>
                    Export
                  </>
                )}
              </button>
            )}

            {/* Manual download button when complete */}
            {isCompleted && exportJob?.id && (
              <button
                type="button"
                onClick={() => downloadExportFile(exportJob.id)}
                className="inline-flex min-h-[40px] items-center rounded-lg bg-brand-600 px-5 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-brand-700"
              >
                <svg
                  className="mr-1.5 h-4 w-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3"
                  />
                </svg>
                Download Again
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
