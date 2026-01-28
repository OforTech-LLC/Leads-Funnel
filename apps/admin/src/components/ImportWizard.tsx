'use client';

/**
 * Import Wizard Component
 *
 * Multi-step CSV import wizard:
 * Step 1: Upload file (drag and drop or click)
 * Step 2: Preview and map columns
 * Step 3: Validate and confirm
 * Step 4: Import progress
 * Step 5: Results summary
 */

import { useState, useCallback, useRef, useMemo } from 'react';
import { useToast } from './Toast';
import { escapeCsvValue } from '@/lib/csv';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ImportResult {
  imported: number;
  failed: number;
  skipped: number;
  errors: { row: number; field: string; message: string }[];
}

const LEAD_FIELDS = [
  { value: '', label: '-- Skip --' },
  { value: 'name', label: 'Name', required: true },
  { value: 'email', label: 'Email', required: true },
  { value: 'phone', label: 'Phone' },
  { value: 'funnelId', label: 'Funnel ID', required: true },
  { value: 'zipCode', label: 'Zip Code' },
  { value: 'status', label: 'Status' },
  { value: 'tags', label: 'Tags' },
  { value: 'notes', label: 'Notes' },
  { value: 'pageUrl', label: 'Page URL' },
  { value: 'referrer', label: 'Referrer' },
  { value: 'utmSource', label: 'UTM Source' },
  { value: 'utmMedium', label: 'UTM Medium' },
  { value: 'utmCampaign', label: 'UTM Campaign' },
];

const REQUIRED_FIELDS = LEAD_FIELDS.filter((f) => f.required).map((f) => f.value);

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

// ---------------------------------------------------------------------------
// Step indicators
// ---------------------------------------------------------------------------

type Step = 1 | 2 | 3 | 4 | 5;

const STEP_LABELS = ['Upload File', 'Map Columns', 'Validate', 'Importing', 'Results'];

function StepIndicator({ currentStep }: { currentStep: Step }) {
  return (
    <div className="flex items-center gap-2 mb-6">
      {STEP_LABELS.map((label, i) => {
        const stepNum = (i + 1) as Step;
        const isActive = stepNum === currentStep;
        const isComplete = stepNum < currentStep;
        return (
          <div key={label} className="flex items-center gap-2">
            <div
              className={`flex items-center justify-center w-7 h-7 rounded-full text-xs font-medium ${
                isActive
                  ? 'bg-blue-600 text-white'
                  : isComplete
                    ? 'bg-green-600 text-white'
                    : 'bg-[var(--bg-tertiary)] text-[var(--text-tertiary)]'
              }`}
            >
              {isComplete ? (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              ) : (
                stepNum
              )}
            </div>
            <span
              className={`text-xs hidden sm:inline ${
                isActive ? 'font-medium text-[var(--text-primary)]' : 'text-[var(--text-tertiary)]'
              }`}
            >
              {label}
            </span>
            {i < STEP_LABELS.length - 1 && (
              <div
                className={`w-8 h-0.5 ${isComplete ? 'bg-green-500' : 'bg-[var(--border-color)]'}`}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

interface ImportWizardProps {
  onImport: (data: Record<string, string>[]) => Promise<ImportResult>;
}

export default function ImportWizard({ onImport }: ImportWizardProps) {
  const [step, setStep] = useState<Step>(1);
  const [file, setFile] = useState<File | null>(null);
  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<string[][]>([]);
  const [columnMapping, setColumnMapping] = useState<Record<number, string>>({});
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [importProgress, setImportProgress] = useState(0);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const toast = useToast();

  // Parse CSV
  const parseCSV = useCallback(
    (text: string) => {
      const lines = text.split('\n').filter((l) => l.trim());
      if (lines.length < 2) {
        toast.error('CSV must have a header row and at least one data row');
        return;
      }

      // Simple CSV parser that handles quoted fields
      function parseLine(line: string): string[] {
        const result: string[] = [];
        let current = '';
        let inQuotes = false;

        for (let i = 0; i < line.length; i++) {
          const char = line[i];
          if (char === '"') {
            inQuotes = !inQuotes;
          } else if (char === ',' && !inQuotes) {
            result.push(current.trim());
            current = '';
          } else {
            current += char;
          }
        }
        result.push(current.trim());
        return result;
      }

      const parsedHeaders = parseLine(lines[0]);
      const parsedRows = lines.slice(1).map(parseLine);

      setHeaders(parsedHeaders);
      setRows(parsedRows);

      // Auto-map columns by header name
      const autoMapping: Record<number, string> = {};
      parsedHeaders.forEach((header, index) => {
        const normalized = header.toLowerCase().replace(/[^a-z]/g, '');
        const match = LEAD_FIELDS.find((f) => {
          const fieldNorm = f.value.toLowerCase().replace(/[^a-z]/g, '');
          return fieldNorm === normalized || header.toLowerCase().includes(f.value.toLowerCase());
        });
        if (match && match.value) {
          autoMapping[index] = match.value;
        }
      });
      setColumnMapping(autoMapping);
      setStep(2);
    },
    [toast]
  );

  // File handling
  const handleFile = useCallback(
    (f: File) => {
      if (!f.name.endsWith('.csv')) {
        toast.error('Please upload a CSV file');
        return;
      }
      if (f.size > MAX_FILE_SIZE) {
        setError('File size exceeds 10MB limit');
        toast.error('File size exceeds 10MB limit');
        return;
      }
      setError(null);
      setFile(f);
      const reader = new FileReader();
      reader.onload = (e) => {
        const text = e.target?.result as string;
        parseCSV(text);
      };
      reader.readAsText(f);
    },
    [parseCSV, toast]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const f = e.dataTransfer.files[0];
      if (f) handleFile(f);
    },
    [handleFile]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setIsDragging(false);
  }, []);

  // Validate
  const validate = useCallback(() => {
    const errors: string[] = [];
    const mappedFields = Object.values(columnMapping);

    // Check required fields
    for (const field of REQUIRED_FIELDS) {
      if (!mappedFields.includes(field)) {
        const label = LEAD_FIELDS.find((f) => f.value === field)?.label || field;
        errors.push(`Required field "${label}" is not mapped`);
      }
    }

    // Check for duplicate mappings
    const seen = new Set<string>();
    for (const field of mappedFields) {
      if (field && seen.has(field)) {
        const label = LEAD_FIELDS.find((f) => f.value === field)?.label || field;
        errors.push(`Field "${label}" is mapped to multiple columns`);
      }
      if (field) seen.add(field);
    }

    setValidationErrors(errors);
    if (errors.length === 0) {
      setStep(3);
    }
  }, [columnMapping]);

  // Build import data
  const mappedData = useMemo(() => {
    return rows.map((row) => {
      const record: Record<string, string> = {};
      Object.entries(columnMapping).forEach(([colIndexStr, field]) => {
        if (field) {
          const colIndex = parseInt(colIndexStr);
          record[field] = row[colIndex] || '';
        }
      });
      return record;
    });
  }, [rows, columnMapping]);

  // Import
  const handleImport = useCallback(async () => {
    setStep(4);
    setImportProgress(0);

    // Simulate progress
    const progressInterval = setInterval(() => {
      setImportProgress((prev) => Math.min(prev + 10, 90));
    }, 300);

    try {
      const importResult = await onImport(mappedData);
      clearInterval(progressInterval);
      setImportProgress(100);
      setResult(importResult);
      setStep(5);

      if (importResult.failed === 0) {
        toast.success(`Successfully imported ${importResult.imported} leads`);
      } else {
        toast.warning(`Imported ${importResult.imported} leads, ${importResult.failed} failed`);
      }
    } catch {
      clearInterval(progressInterval);
      toast.error('Import failed. Please try again.');
      setStep(3);
    }
  }, [mappedData, onImport, toast]);

  // Download error report (with CSV injection protection)
  const downloadErrorReport = useCallback(() => {
    if (!result?.errors.length) return;
    const csvContent = [
      'Row,Field,Message',
      ...result.errors.map(
        (e) => `${e.row},${escapeCsvValue(e.field)},${escapeCsvValue(e.message)}`
      ),
    ].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'import-errors.csv';
    a.click();
    URL.revokeObjectURL(url);
  }, [result]);

  // Reset
  const reset = useCallback(() => {
    setStep(1);
    setFile(null);
    setHeaders([]);
    setRows([]);
    setColumnMapping({});
    setValidationErrors([]);
    setImportProgress(0);
    setResult(null);
    setError(null);
  }, []);

  const previewRows = rows.slice(0, 5);

  return (
    <div className="space-y-6">
      <StepIndicator currentStep={step} />

      {/* Step 1: Upload */}
      {step === 1 && (
        <>
          <div
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            className={`border-2 border-dashed rounded-lg p-12 text-center transition-colors cursor-pointer ${
              isDragging
                ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                : 'border-[var(--border-color)] hover:border-[var(--text-tertiary)]'
            }`}
            onClick={() => fileInputRef.current?.click()}
            role="button"
            aria-label="Upload CSV file"
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleFile(f);
              }}
              className="hidden"
            />
            <svg
              className="w-12 h-12 mx-auto text-[var(--text-tertiary)] mb-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
              />
            </svg>
            <p className="text-sm text-[var(--text-primary)] font-medium">
              Drop your CSV file here or click to browse
            </p>
            <p className="text-xs text-[var(--text-tertiary)] mt-1">
              Only .csv files are accepted (max 10MB)
            </p>
          </div>
          {error && (
            <div className="rounded-md border border-red-200 bg-red-50 dark:bg-red-900/20 dark:border-red-800 p-4">
              <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
            </div>
          )}
        </>
      )}

      {/* Step 2: Column Mapping */}
      {step === 2 && (
        <div className="space-y-6">
          <div className="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-lg p-4">
            <h3 className="text-sm font-medium text-[var(--text-primary)] mb-1">
              File: {file?.name}
            </h3>
            <p className="text-xs text-[var(--text-secondary)]">
              {rows.length} rows, {headers.length} columns
            </p>
          </div>

          {/* Column Mapping */}
          <div className="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-lg">
            <div className="px-4 py-3 border-b border-[var(--border-color)]">
              <h3 className="text-sm font-medium text-[var(--text-primary)]">Column Mapping</h3>
              <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                Map CSV columns to lead fields. Required fields are marked with *
              </p>
            </div>
            <div className="divide-y divide-[var(--border-color)]">
              {headers.map((header, index) => (
                <div key={index} className="flex items-center gap-4 px-4 py-3">
                  <span className="text-sm text-[var(--text-primary)] w-40 truncate font-mono">
                    {header}
                  </span>
                  <svg
                    className="w-4 h-4 text-[var(--text-tertiary)] shrink-0"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M14 5l7 7m0 0l-7 7m7-7H3"
                    />
                  </svg>
                  <select
                    value={columnMapping[index] || ''}
                    onChange={(e) =>
                      setColumnMapping((prev) => ({
                        ...prev,
                        [index]: e.target.value,
                      }))
                    }
                    className={`flex-1 px-3 py-1.5 text-sm border rounded-md bg-[var(--card-bg)] text-[var(--text-primary)] ${
                      REQUIRED_FIELDS.includes(columnMapping[index])
                        ? 'border-green-500'
                        : 'border-[var(--border-color)]'
                    }`}
                  >
                    {LEAD_FIELDS.map((field) => (
                      <option key={field.value} value={field.value}>
                        {field.label}
                        {field.required ? ' *' : ''}
                      </option>
                    ))}
                  </select>
                </div>
              ))}
            </div>
          </div>

          {/* Preview */}
          <div className="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-lg">
            <div className="px-4 py-3 border-b border-[var(--border-color)]">
              <h3 className="text-sm font-medium text-[var(--text-primary)]">
                Preview (first 5 rows)
              </h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-[var(--border-color)]">
                    <th className="px-3 py-2 text-left text-[var(--text-tertiary)]">#</th>
                    {headers.map((h, i) => (
                      <th
                        key={i}
                        className="px-3 py-2 text-left text-[var(--text-secondary)] font-medium"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {previewRows.map((row, i) => (
                    <tr key={i} className="border-b border-[var(--border-color)]">
                      <td className="px-3 py-2 text-[var(--text-tertiary)]">{i + 1}</td>
                      {row.map((cell, j) => (
                        <td
                          key={j}
                          className="px-3 py-2 text-[var(--text-primary)] max-w-[200px] truncate"
                        >
                          {cell || '--'}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Validation errors */}
          {validationErrors.length > 0 && (
            <div className="rounded-md border border-red-200 bg-red-50 dark:bg-red-900/20 dark:border-red-800 p-4">
              <h4 className="text-sm font-medium text-red-800 dark:text-red-200 mb-2">
                Validation Errors
              </h4>
              <ul className="list-disc list-inside text-xs text-red-700 dark:text-red-300 space-y-1">
                {validationErrors.map((err, i) => (
                  <li key={i}>{err}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-between">
            <button
              onClick={reset}
              className="px-4 py-2 text-sm border border-[var(--border-color)] rounded-md hover:bg-[var(--bg-tertiary)] transition-colors text-[var(--text-primary)]"
            >
              Back
            </button>
            <button
              onClick={validate}
              className="px-4 py-2 text-sm font-medium bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              Validate & Continue
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Confirm */}
      {step === 3 && (
        <div className="space-y-6">
          <div className="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-lg p-6">
            <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-4">
              Ready to Import
            </h3>
            <dl className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <dt className="text-[var(--text-secondary)]">File</dt>
                <dd className="mt-1 text-[var(--text-primary)] font-medium">{file?.name}</dd>
              </div>
              <div>
                <dt className="text-[var(--text-secondary)]">Total Rows</dt>
                <dd className="mt-1 text-[var(--text-primary)] font-medium">{rows.length}</dd>
              </div>
              <div>
                <dt className="text-[var(--text-secondary)]">Mapped Fields</dt>
                <dd className="mt-1 text-[var(--text-primary)] font-medium">
                  {Object.values(columnMapping).filter(Boolean).length} of {headers.length}
                </dd>
              </div>
              <div>
                <dt className="text-[var(--text-secondary)]">Required Fields</dt>
                <dd className="mt-1 text-green-600 dark:text-green-400 font-medium">All mapped</dd>
              </div>
            </dl>
          </div>

          <div className="flex items-center justify-between">
            <button
              onClick={() => setStep(2)}
              className="px-4 py-2 text-sm border border-[var(--border-color)] rounded-md hover:bg-[var(--bg-tertiary)] transition-colors text-[var(--text-primary)]"
            >
              Back
            </button>
            <button
              onClick={handleImport}
              className="px-6 py-2 text-sm font-medium bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              Start Import
            </button>
          </div>
        </div>
      )}

      {/* Step 4: Progress */}
      {step === 4 && (
        <div className="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-lg p-8 text-center">
          <div className="animate-spin rounded-full border-[var(--border-color)] border-t-blue-600 h-12 w-12 border-3 mx-auto mb-4" />
          <p className="text-sm font-medium text-[var(--text-primary)] mb-2">Importing leads...</p>
          <div className="w-64 h-2 bg-[var(--bg-tertiary)] rounded-full mx-auto overflow-hidden">
            <div
              className="h-full bg-blue-600 rounded-full transition-all duration-300"
              style={{ width: `${importProgress}%` }}
            />
          </div>
          <p className="text-xs text-[var(--text-tertiary)] mt-2">{importProgress}%</p>
        </div>
      )}

      {/* Step 5: Results */}
      {step === 5 && result && (
        <div className="space-y-6">
          <div className="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-lg p-6">
            <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-4">
              Import Complete
            </h3>
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center p-4 rounded-lg bg-green-50 dark:bg-green-900/20">
                <p className="text-2xl font-semibold text-green-600 dark:text-green-400">
                  {result.imported}
                </p>
                <p className="text-xs text-green-700 dark:text-green-300 mt-1">Imported</p>
              </div>
              <div className="text-center p-4 rounded-lg bg-red-50 dark:bg-red-900/20">
                <p className="text-2xl font-semibold text-red-600 dark:text-red-400">
                  {result.failed}
                </p>
                <p className="text-xs text-red-700 dark:text-red-300 mt-1">Failed</p>
              </div>
              <div className="text-center p-4 rounded-lg bg-yellow-50 dark:bg-yellow-900/20">
                <p className="text-2xl font-semibold text-yellow-600 dark:text-yellow-400">
                  {result.skipped}
                </p>
                <p className="text-xs text-yellow-700 dark:text-yellow-300 mt-1">Skipped</p>
              </div>
            </div>
          </div>

          {/* Error Details */}
          {result.errors.length > 0 && (
            <div className="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-lg">
              <div className="px-4 py-3 border-b border-[var(--border-color)] flex items-center justify-between">
                <h3 className="text-sm font-medium text-[var(--text-primary)]">
                  Error Details ({result.errors.length} errors)
                </h3>
                <button
                  onClick={downloadErrorReport}
                  className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
                >
                  Download Error Report
                </button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-[var(--border-color)]">
                      <th className="px-4 py-2 text-left text-[var(--text-secondary)]">Row</th>
                      <th className="px-4 py-2 text-left text-[var(--text-secondary)]">Field</th>
                      <th className="px-4 py-2 text-left text-[var(--text-secondary)]">Message</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.errors.slice(0, 20).map((err, i) => (
                      <tr key={i} className="border-b border-[var(--border-color)]">
                        <td className="px-4 py-2 text-[var(--text-primary)]">{err.row}</td>
                        <td className="px-4 py-2 text-[var(--text-secondary)]">{err.field}</td>
                        <td className="px-4 py-2 text-red-600 dark:text-red-400">{err.message}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {result.errors.length > 20 && (
                  <p className="px-4 py-2 text-xs text-[var(--text-tertiary)]">
                    Showing first 20 of {result.errors.length} errors. Download the error report for
                    the full list.
                  </p>
                )}
              </div>
            </div>
          )}

          <div className="flex items-center justify-end">
            <button
              onClick={reset}
              className="px-4 py-2 text-sm font-medium bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              Import Another File
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
