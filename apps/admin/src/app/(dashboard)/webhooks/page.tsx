'use client';

/**
 * Webhook Management Page
 *
 * List, create, edit, delete webhooks.
 * Test webhook delivery, view recent deliveries, retry failed.
 */

import { useState, useCallback } from 'react';
import {
  useListWebhooksQuery,
  useCreateWebhookMutation,
  useUpdateWebhookMutation,
  useDeleteWebhookMutation,
  useTestWebhookMutation,
  useListDeliveriesQuery,
  useRetryDeliveryMutation,
  WEBHOOK_EVENTS,
} from '@/store/webhooksApi';
import type { Webhook, WebhookDelivery } from '@/store/webhooksApi';
import Modal from '@/components/Modal';
import ConfirmDialog from '@/components/ConfirmDialog';
import FormField from '@/components/FormField';
import StatusBadge from '@/components/StatusBadge';
import ErrorAlert from '@/components/ErrorAlert';
import LoadingSpinner from '@/components/LoadingSpinner';
import RequireRole from '@/components/RequireRole';
import { useToast } from '@/components/Toast';
import { formatRelativeTime } from '@/lib/utils';

// ---------------------------------------------------------------------------
// WebhookCard
// ---------------------------------------------------------------------------

function WebhookCard({
  webhook,
  onEdit,
  onDelete,
  onTest,
  onViewDeliveries,
}: {
  webhook: Webhook;
  onEdit: (webhook: Webhook) => void;
  onDelete: (id: string) => void;
  onTest: (id: string) => void;
  onViewDeliveries: (id: string) => void;
}) {
  return (
    <div className="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-lg p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <StatusBadge status={webhook.active ? 'active' : 'inactive'} />
            {webhook.description && (
              <span className="text-sm font-medium text-[var(--text-primary)]">
                {webhook.description}
              </span>
            )}
          </div>
          <p className="text-sm text-[var(--text-secondary)] font-mono truncate">{webhook.url}</p>
          <div className="flex flex-wrap gap-1.5 mt-2">
            {webhook.events.map((event) => (
              <span
                key={event}
                className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--bg-tertiary)] text-[var(--text-tertiary)]"
              >
                {event}
              </span>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => onTest(webhook.id)}
            className="px-3 py-1.5 text-xs font-medium border border-[var(--border-color)] rounded-md hover:bg-[var(--bg-tertiary)] transition-colors text-[var(--text-primary)]"
          >
            Test
          </button>
          <button
            onClick={() => onViewDeliveries(webhook.id)}
            className="px-3 py-1.5 text-xs font-medium border border-[var(--border-color)] rounded-md hover:bg-[var(--bg-tertiary)] transition-colors text-[var(--text-primary)]"
          >
            Deliveries
          </button>
          <RequireRole roles={['ADMIN']}>
            <button
              onClick={() => onEdit(webhook)}
              className="px-3 py-1.5 text-xs text-blue-600 hover:text-blue-700 dark:text-blue-400"
            >
              Edit
            </button>
            <button
              onClick={() => onDelete(webhook.id)}
              className="px-3 py-1.5 text-xs text-red-600 hover:text-red-700 dark:text-red-400"
            >
              Delete
            </button>
          </RequireRole>
        </div>
      </div>
      <p className="text-xs text-[var(--text-tertiary)] mt-3">
        Created {formatRelativeTime(webhook.createdAt)}
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Deliveries Modal
// ---------------------------------------------------------------------------

function DeliveriesModal({ webhookId, onClose }: { webhookId: string; onClose: () => void }) {
  const { data, isLoading, error } = useListDeliveriesQuery({ webhookId });
  const [retryDelivery] = useRetryDeliveryMutation();
  const toast = useToast();

  const handleRetry = async (deliveryId: string) => {
    try {
      await retryDelivery({ webhookId, deliveryId }).unwrap();
      toast.success('Delivery retry initiated');
    } catch {
      toast.error('Failed to retry delivery');
    }
  };

  return (
    <Modal open={true} onClose={onClose} title="Recent Deliveries" width="xl">
      {isLoading && (
        <div className="flex justify-center py-8">
          <LoadingSpinner />
        </div>
      )}
      {error && <ErrorAlert message="Failed to load deliveries." />}
      {data && data.deliveries.length === 0 && (
        <p className="text-sm text-[var(--text-secondary)] text-center py-8">
          No deliveries recorded yet.
        </p>
      )}
      {data && data.deliveries.length > 0 && (
        <div className="overflow-x-auto -mx-6">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-[var(--border-color)]">
                <th className="px-4 py-2 text-left font-medium text-[var(--text-secondary)]">
                  Event
                </th>
                <th className="px-4 py-2 text-left font-medium text-[var(--text-secondary)]">
                  Status
                </th>
                <th className="px-4 py-2 text-right font-medium text-[var(--text-secondary)]">
                  Code
                </th>
                <th className="px-4 py-2 text-right font-medium text-[var(--text-secondary)]">
                  Time
                </th>
                <th className="px-4 py-2 text-left font-medium text-[var(--text-secondary)]">
                  When
                </th>
                <th className="px-4 py-2 text-right font-medium text-[var(--text-secondary)]">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {data.deliveries.map((d) => (
                <tr key={d.id} className="border-b border-[var(--border-color)]">
                  <td className="px-4 py-2 text-[var(--text-primary)]">{d.event}</td>
                  <td className="px-4 py-2">
                    <StatusBadge status={d.success ? 'completed' : 'failed'} />
                  </td>
                  <td className="px-4 py-2 text-right text-[var(--text-secondary)]">
                    {d.statusCode}
                  </td>
                  <td className="px-4 py-2 text-right text-[var(--text-secondary)]">
                    {d.responseTimeMs}ms
                  </td>
                  <td className="px-4 py-2 text-[var(--text-tertiary)]">
                    {formatRelativeTime(d.timestamp)}
                  </td>
                  <td className="px-4 py-2 text-right">
                    {!d.success && (
                      <button
                        onClick={() => handleRetry(d.id)}
                        className="text-blue-600 hover:text-blue-700 dark:text-blue-400"
                      >
                        Retry
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Modal>
  );
}

// ---------------------------------------------------------------------------
// Main Page
// ---------------------------------------------------------------------------

export default function WebhooksPage() {
  const { data, isLoading, error, refetch } = useListWebhooksQuery();
  const [createWebhook, { isLoading: isCreating }] = useCreateWebhookMutation();
  const [updateWebhook, { isLoading: isUpdating }] = useUpdateWebhookMutation();
  const [deleteWebhook, { isLoading: isDeleting }] = useDeleteWebhookMutation();
  const [testWebhook] = useTestWebhookMutation();
  const toast = useToast();

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingWebhook, setEditingWebhook] = useState<Webhook | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [viewDeliveriesId, setViewDeliveriesId] = useState<string | null>(null);

  // Create form
  const [createForm, setCreateForm] = useState({
    url: '',
    description: '',
    events: [] as string[],
  });

  // Edit form
  const [editForm, setEditForm] = useState({
    url: '',
    description: '',
    events: [] as string[],
    active: true,
  });

  const handleCreate = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      try {
        await createWebhook({
          url: createForm.url,
          events: createForm.events,
          description: createForm.description || undefined,
        }).unwrap();
        toast.success('Webhook created successfully');
        setShowCreateModal(false);
        setCreateForm({ url: '', description: '', events: [] });
      } catch {
        toast.error('Failed to create webhook');
      }
    },
    [createWebhook, createForm, toast]
  );

  const handleEdit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!editingWebhook) return;
      try {
        await updateWebhook({
          id: editingWebhook.id,
          url: editForm.url,
          events: editForm.events,
          active: editForm.active,
          description: editForm.description || undefined,
        }).unwrap();
        toast.success('Webhook updated');
        setEditingWebhook(null);
      } catch {
        toast.error('Failed to update webhook');
      }
    },
    [updateWebhook, editingWebhook, editForm, toast]
  );

  const handleDelete = useCallback(async () => {
    if (!confirmDeleteId) return;
    try {
      await deleteWebhook(confirmDeleteId).unwrap();
      toast.success('Webhook deleted');
      setConfirmDeleteId(null);
    } catch {
      toast.error('Failed to delete webhook');
    }
  }, [deleteWebhook, confirmDeleteId, toast]);

  const handleTest = useCallback(
    async (id: string) => {
      try {
        const result = await testWebhook(id).unwrap();
        if (result.success) {
          toast.success(`Test successful: ${result.statusCode} in ${result.responseTimeMs}ms`);
        } else {
          toast.warning(`Test returned ${result.statusCode} in ${result.responseTimeMs}ms`);
        }
      } catch {
        toast.error('Test delivery failed');
      }
    },
    [testWebhook, toast]
  );

  const openEdit = useCallback((webhook: Webhook) => {
    setEditingWebhook(webhook);
    setEditForm({
      url: webhook.url,
      description: webhook.description || '',
      events: [...webhook.events],
      active: webhook.active,
    });
  }, []);

  const toggleEvent = useCallback((events: string[], event: string) => {
    return events.includes(event) ? events.filter((e) => e !== event) : [...events, event];
  }, []);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-[var(--text-primary)]">Webhooks</h1>
          <p className="text-sm text-[var(--text-secondary)] mt-1">
            Manage webhook endpoints for event notifications
          </p>
        </div>
        <RequireRole roles={['ADMIN']}>
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-2 text-sm font-medium bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            Create Webhook
          </button>
        </RequireRole>
      </div>

      {error && <ErrorAlert message="Failed to load webhooks." onRetry={refetch} />}

      {/* Loading */}
      {isLoading && (
        <div className="flex items-center justify-center py-16">
          <LoadingSpinner size="lg" />
        </div>
      )}

      {/* Webhook list */}
      {!isLoading && data && (
        <div className="space-y-4">
          {data.webhooks.length === 0 ? (
            <div className="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-lg py-16 text-center">
              <p className="text-sm text-[var(--text-secondary)]">
                No webhooks configured. Create one to receive event notifications.
              </p>
            </div>
          ) : (
            data.webhooks.map((webhook) => (
              <WebhookCard
                key={webhook.id}
                webhook={webhook}
                onEdit={openEdit}
                onDelete={setConfirmDeleteId}
                onTest={handleTest}
                onViewDeliveries={setViewDeliveriesId}
              />
            ))
          )}
        </div>
      )}

      {/* Create Modal */}
      <Modal
        open={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Create Webhook"
        width="lg"
      >
        <form onSubmit={handleCreate} className="space-y-4">
          <FormField
            label="Endpoint URL"
            name="url"
            value={createForm.url}
            onChange={(v) => setCreateForm((f) => ({ ...f, url: v }))}
            required
            placeholder="https://your-server.com/webhook"
          />
          <FormField
            label="Description"
            name="description"
            value={createForm.description}
            onChange={(v) => setCreateForm((f) => ({ ...f, description: v }))}
            placeholder="Optional description"
          />

          <div>
            <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
              Events
            </label>
            <div className="grid grid-cols-2 gap-2">
              {WEBHOOK_EVENTS.map((event) => (
                <label key={event} className="flex items-center gap-2 text-sm cursor-pointer">
                  <input
                    type="checkbox"
                    checked={createForm.events.includes(event)}
                    onChange={() =>
                      setCreateForm((f) => ({
                        ...f,
                        events: toggleEvent(f.events, event),
                      }))
                    }
                    className="rounded border-gray-300"
                  />
                  <span className="text-[var(--text-secondary)]">{event}</span>
                </label>
              ))}
            </div>
          </div>

          <p className="text-xs text-[var(--text-tertiary)]">
            A webhook secret will be auto-generated and displayed after creation.
          </p>

          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={() => setShowCreateModal(false)}
              className="px-4 py-2 text-sm border border-[var(--border-color)] rounded-md hover:bg-[var(--bg-tertiary)] transition-colors text-[var(--text-primary)]"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isCreating || !createForm.url || createForm.events.length === 0}
              className="px-4 py-2 text-sm font-medium bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              {isCreating ? 'Creating...' : 'Create'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Edit Modal */}
      {editingWebhook && (
        <Modal open={true} onClose={() => setEditingWebhook(null)} title="Edit Webhook" width="lg">
          <form onSubmit={handleEdit} className="space-y-4">
            <FormField
              label="Endpoint URL"
              name="editUrl"
              value={editForm.url}
              onChange={(v) => setEditForm((f) => ({ ...f, url: v }))}
              required
              placeholder="https://your-server.com/webhook"
            />
            <FormField
              label="Description"
              name="editDescription"
              value={editForm.description}
              onChange={(v) => setEditForm((f) => ({ ...f, description: v }))}
              placeholder="Optional description"
            />

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="webhookActive"
                checked={editForm.active}
                onChange={(e) => setEditForm((f) => ({ ...f, active: e.target.checked }))}
                className="rounded border-gray-300"
              />
              <label htmlFor="webhookActive" className="text-sm text-[var(--text-primary)]">
                Active
              </label>
            </div>

            <div>
              <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
                Events
              </label>
              <div className="grid grid-cols-2 gap-2">
                {WEBHOOK_EVENTS.map((event) => (
                  <label key={event} className="flex items-center gap-2 text-sm cursor-pointer">
                    <input
                      type="checkbox"
                      checked={editForm.events.includes(event)}
                      onChange={() =>
                        setEditForm((f) => ({
                          ...f,
                          events: toggleEvent(f.events, event),
                        }))
                      }
                      className="rounded border-gray-300"
                    />
                    <span className="text-[var(--text-secondary)]">{event}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="bg-[var(--bg-tertiary)] rounded-md p-3">
              <p className="text-xs text-[var(--text-secondary)]">
                <span className="font-medium">Secret:</span>{' '}
                <code className="font-mono">{editingWebhook.secret}</code>
              </p>
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <button
                type="button"
                onClick={() => setEditingWebhook(null)}
                className="px-4 py-2 text-sm border border-[var(--border-color)] rounded-md hover:bg-[var(--bg-tertiary)] transition-colors text-[var(--text-primary)]"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isUpdating || !editForm.url || editForm.events.length === 0}
                className="px-4 py-2 text-sm font-medium bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                {isUpdating ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Deliveries Modal */}
      {viewDeliveriesId && (
        <DeliveriesModal webhookId={viewDeliveriesId} onClose={() => setViewDeliveriesId(null)} />
      )}

      {/* Confirm Delete */}
      <ConfirmDialog
        open={!!confirmDeleteId}
        onClose={() => setConfirmDeleteId(null)}
        onConfirm={handleDelete}
        title="Delete Webhook"
        message="Are you sure you want to delete this webhook? All delivery history will be lost."
        confirmLabel="Delete"
        confirmVariant="danger"
        loading={isDeleting}
      />
    </div>
  );
}
