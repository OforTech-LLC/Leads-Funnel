'use client';

/**
 * Bulk Import Page
 *
 * CSV file upload with drag-and-drop zone, column mapping,
 * preview, import progress, and results summary.
 */

import ImportWizard from '@/components/ImportWizard';
import RequireRole from '@/components/RequireRole';
import { useImportLeadsMutation } from '@/store/services/leads';

export default function ImportPage() {
  const [importLeads] = useImportLeadsMutation();

  const handleImport = async (data: Record<string, string>[]) => {
    const result = await importLeads({ leads: data }).unwrap();
    return result;
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-semibold text-[var(--text-primary)]">Bulk Import</h1>
        <p className="text-sm text-[var(--text-secondary)] mt-1">Import leads from a CSV file</p>
      </div>

      <RequireRole
        roles={['ADMIN']}
        fallback={
          <div className="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-lg p-12 text-center">
            <p className="text-sm text-[var(--text-secondary)]">
              You do not have permission to import leads. Contact an administrator.
            </p>
          </div>
        }
      >
        <ImportWizard onImport={handleImport} />
      </RequireRole>
    </div>
  );
}
