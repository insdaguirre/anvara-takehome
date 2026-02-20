'use client';

import { useActionState, useRef, useState, type RefObject } from 'react';
import { useRouter } from 'next/navigation';
import { useFormStatus } from 'react-dom';
import { formatPrice } from '@/lib/format';
import type { Campaign } from '@/lib/types';
import { ConfirmDialog } from '../../components/confirm-dialog';
import type { DashboardToastInput } from '../../components/use-dashboard-toasts';
import { deleteCampaign, updateCampaign } from '../actions';
import { INITIAL_CAMPAIGN_FORM_STATE, type CampaignFormState } from '../form-state';

interface CampaignCardProps {
  campaign: Campaign;
  onToast(toast: DashboardToastInput): void;
}

const statusColors: Record<string, string> = {
  DRAFT: 'bg-gray-100 text-gray-600',
  PENDING_REVIEW: 'bg-amber-100 text-amber-700',
  APPROVED: 'bg-teal-100 text-teal-700',
  ACTIVE: 'bg-green-100 text-green-700',
  PAUSED: 'bg-yellow-100 text-yellow-700',
  COMPLETED: 'bg-blue-100 text-blue-700',
  CANCELLED: 'bg-red-100 text-red-700',
};

const CAMPAIGN_STATUSES = [
  'DRAFT',
  'PENDING_REVIEW',
  'APPROVED',
  'ACTIVE',
  'PAUSED',
  'COMPLETED',
  'CANCELLED',
] as const;

function toDateInputValue(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '';
  }
  return date.toISOString().slice(0, 10);
}

function SaveCampaignButton() {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-lg bg-[var(--color-primary)] px-3 py-1.5 text-sm font-semibold text-white transition-colors hover:bg-[var(--color-primary-hover)] disabled:cursor-not-allowed disabled:opacity-60"
    >
      {pending ? 'Saving...' : 'Save'}
    </button>
  );
}

function DeleteCampaignButton({ buttonRef }: { buttonRef: RefObject<HTMLButtonElement | null> }) {
  const { pending } = useFormStatus();

  return (
    <button
      ref={buttonRef}
      type="submit"
      disabled={pending}
      className="rounded-lg border border-red-300 px-3 py-1.5 text-sm font-medium text-red-700 transition-colors hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {pending ? 'Deleting...' : 'Delete'}
    </button>
  );
}

export function CampaignCard({ campaign, onToast }: CampaignCardProps) {
  const router = useRouter();
  const [isEditing, setIsEditing] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const allowDeleteSubmitRef = useRef(false);
  const deleteFormRef = useRef<HTMLFormElement | null>(null);
  const deleteButtonRef = useRef<HTMLButtonElement | null>(null);
  const [updateState, updateAction, isUpdatePending] = useActionState(
    async (prevState: CampaignFormState, formData: FormData) => {
      const result = await updateCampaign(prevState, formData);
      if (result.success) {
        setIsEditing(false);
        onToast({
          tone: 'success',
          title: 'Campaign updated',
          message: `${campaign.name} has been updated.`,
        });
        router.refresh();
      } else if (result.error) {
        onToast({
          tone: 'error',
          title: 'Unable to update campaign',
          message: result.error,
        });
      }
      return result;
    },
    INITIAL_CAMPAIGN_FORM_STATE
  );
  const [deleteState, deleteAction, isDeletePending] = useActionState(
    async (prevState: CampaignFormState, formData: FormData) => {
      const result = await deleteCampaign(prevState, formData);
      if (result.success) {
        onToast({
          tone: 'success',
          title: 'Campaign deleted',
          message: `${campaign.name} has been removed.`,
        });
        router.refresh();
      } else if (result.error) {
        onToast({
          tone: 'error',
          title: 'Unable to delete campaign',
          message: result.error,
        });
      }
      return result;
    },
    INITIAL_CAMPAIGN_FORM_STATE
  );
  const progress = campaign.budget > 0 ? (Number(campaign.spent) / Number(campaign.budget)) * 100 : 0;
  const progressLabel = `${Math.min(Math.round(progress), 100)}% spent`;
  const editNameId = `edit-campaign-name-${campaign.id}`;
  const editDescriptionId = `edit-campaign-description-${campaign.id}`;
  const editBudgetId = `edit-campaign-budget-${campaign.id}`;
  const editStartDateId = `edit-campaign-start-date-${campaign.id}`;
  const editEndDateId = `edit-campaign-end-date-${campaign.id}`;
  const editStatusId = `edit-campaign-status-${campaign.id}`;
  const nameErrorId = `${editNameId}-error`;
  const descriptionErrorId = `${editDescriptionId}-error`;
  const budgetErrorId = `${editBudgetId}-error`;
  const startDateErrorId = `${editStartDateId}-error`;
  const endDateErrorId = `${editEndDateId}-error`;
  const statusErrorId = `${editStatusId}-error`;

  return (
    <article className="overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-background)] p-4 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md active:scale-[0.99] motion-reduce:active:scale-100">
      <div className="mb-3 flex items-start justify-between gap-2">
        <h3 className="text-base font-semibold text-[var(--color-foreground)]">{campaign.name}</h3>
        <span
          className={`rounded-full px-2.5 py-1 text-xs font-medium ${statusColors[campaign.status] || 'bg-gray-100 text-gray-700'}`}
        >
          {campaign.status}
        </span>
      </div>

      {campaign.description && (
        <p className="mb-4 line-clamp-2 text-sm text-[var(--color-muted)]">{campaign.description}</p>
      )}

      <div className="mb-3 rounded-lg bg-[var(--color-surface-muted)] p-3">
        <div className="flex justify-between text-sm">
          <span className="text-[var(--color-muted)]">Budget</span>
          <span>{formatPrice(Number(campaign.spent))} / {formatPrice(Number(campaign.budget))}</span>
        </div>
        <div className="mt-1 h-1.5 rounded-full bg-gray-200">
          <div
            className="h-1.5 rounded-full bg-[var(--color-primary)] transition-all duration-300"
            style={{ width: `${Math.min(progress, 100)}%` }}
            aria-label={progressLabel}
          />
        </div>
        <p className="mt-1 text-xs text-[var(--color-muted)]">{progressLabel}</p>
      </div>

      <div className="text-xs text-[var(--color-muted)]">
        {new Date(campaign.startDate).toLocaleDateString()} -{' '}
        {new Date(campaign.endDate).toLocaleDateString()}
      </div>

      {deleteState.error && (
        <p role="alert" className="mt-3 text-sm text-red-600">
          {deleteState.error}
        </p>
      )}

      {isEditing ? (
        <form
          action={updateAction}
          className="mt-4 space-y-3 border-t border-[var(--color-border)] pt-4"
          aria-busy={isUpdatePending}
        >
          {updateState.error && (
            <div role="alert" className="rounded border border-red-200 bg-red-50 p-2 text-sm text-red-700">
              {updateState.error}
            </div>
          )}

          <input type="hidden" name="id" value={campaign.id} />

          <div>
            <label htmlFor={editNameId} className="block text-xs font-medium">
              Name
            </label>
            <input
              id={editNameId}
              name="name"
              required
              maxLength={120}
              defaultValue={updateState.values?.name ?? campaign.name}
              aria-invalid={Boolean(updateState.fieldErrors?.name)}
              aria-describedby={updateState.fieldErrors?.name ? nameErrorId : undefined}
              className={`mt-1 w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-1 ${
                updateState.fieldErrors?.name
                  ? 'border-red-300 focus:border-red-500 focus:ring-red-500'
                  : 'border-[var(--color-border)] focus:border-[var(--color-primary)] focus:ring-[var(--color-primary)]'
              }`}
            />
            {updateState.fieldErrors?.name && (
              <p id={nameErrorId} className="mt-1 text-xs text-red-600">
                {updateState.fieldErrors.name}
              </p>
            )}
          </div>

          <div>
            <label htmlFor={editDescriptionId} className="block text-xs font-medium">
              Description
            </label>
            <textarea
              id={editDescriptionId}
              name="description"
              rows={2}
              maxLength={1000}
              defaultValue={updateState.values?.description ?? (campaign.description || '')}
              aria-invalid={Boolean(updateState.fieldErrors?.description)}
              aria-describedby={updateState.fieldErrors?.description ? descriptionErrorId : undefined}
              className={`mt-1 w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-1 ${
                updateState.fieldErrors?.description
                  ? 'border-red-300 focus:border-red-500 focus:ring-red-500'
                  : 'border-[var(--color-border)] focus:border-[var(--color-primary)] focus:ring-[var(--color-primary)]'
              }`}
            />
            {updateState.fieldErrors?.description && (
              <p id={descriptionErrorId} className="mt-1 text-xs text-red-600">
                {updateState.fieldErrors.description}
              </p>
            )}
          </div>

          <div>
            <label htmlFor={editBudgetId} className="block text-xs font-medium">
              Budget
            </label>
            <input
              id={editBudgetId}
              name="budget"
              type="number"
              required
              min="0.01"
              step="0.01"
              defaultValue={updateState.values?.budget ?? Number(campaign.budget)}
              aria-invalid={Boolean(updateState.fieldErrors?.budget)}
              aria-describedby={updateState.fieldErrors?.budget ? budgetErrorId : undefined}
              className={`mt-1 w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-1 ${
                updateState.fieldErrors?.budget
                  ? 'border-red-300 focus:border-red-500 focus:ring-red-500'
                  : 'border-[var(--color-border)] focus:border-[var(--color-primary)] focus:ring-[var(--color-primary)]'
              }`}
            />
            {updateState.fieldErrors?.budget && (
              <p id={budgetErrorId} className="mt-1 text-xs text-red-600">
                {updateState.fieldErrors.budget}
              </p>
            )}
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label htmlFor={editStartDateId} className="block text-xs font-medium">
                Start Date
              </label>
              <input
                id={editStartDateId}
                name="startDate"
                type="date"
                required
                defaultValue={updateState.values?.startDate ?? toDateInputValue(campaign.startDate)}
                aria-invalid={Boolean(updateState.fieldErrors?.startDate)}
                aria-describedby={updateState.fieldErrors?.startDate ? startDateErrorId : undefined}
                className={`mt-1 w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-1 ${
                  updateState.fieldErrors?.startDate
                    ? 'border-red-300 focus:border-red-500 focus:ring-red-500'
                    : 'border-[var(--color-border)] focus:border-[var(--color-primary)] focus:ring-[var(--color-primary)]'
                }`}
              />
              {updateState.fieldErrors?.startDate && (
                <p id={startDateErrorId} className="mt-1 text-xs text-red-600">
                  {updateState.fieldErrors.startDate}
                </p>
              )}
            </div>

            <div>
              <label htmlFor={editEndDateId} className="block text-xs font-medium">
                End Date
              </label>
              <input
                id={editEndDateId}
                name="endDate"
                type="date"
                required
                defaultValue={updateState.values?.endDate ?? toDateInputValue(campaign.endDate)}
                aria-invalid={Boolean(updateState.fieldErrors?.endDate)}
                aria-describedby={updateState.fieldErrors?.endDate ? endDateErrorId : undefined}
                className={`mt-1 w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-1 ${
                  updateState.fieldErrors?.endDate
                    ? 'border-red-300 focus:border-red-500 focus:ring-red-500'
                    : 'border-[var(--color-border)] focus:border-[var(--color-primary)] focus:ring-[var(--color-primary)]'
                }`}
              />
              {updateState.fieldErrors?.endDate && (
                <p id={endDateErrorId} className="mt-1 text-xs text-red-600">
                  {updateState.fieldErrors.endDate}
                </p>
              )}
            </div>
          </div>

          <div>
            <label htmlFor={editStatusId} className="block text-xs font-medium">
              Status
            </label>
            <select
              id={editStatusId}
              name="status"
              defaultValue={updateState.values?.status ?? campaign.status}
              aria-invalid={Boolean(updateState.fieldErrors?.status)}
              aria-describedby={updateState.fieldErrors?.status ? statusErrorId : undefined}
              className={`mt-1 w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-1 ${
                updateState.fieldErrors?.status
                  ? 'border-red-300 focus:border-red-500 focus:ring-red-500'
                  : 'border-[var(--color-border)] focus:border-[var(--color-primary)] focus:ring-[var(--color-primary)]'
              }`}
            >
              {CAMPAIGN_STATUSES.map((statusOption) => (
                <option key={statusOption} value={statusOption}>
                  {statusOption}
                </option>
              ))}
            </select>
            {updateState.fieldErrors?.status && (
              <p id={statusErrorId} className="mt-1 text-xs text-red-600">
                {updateState.fieldErrors.status}
              </p>
            )}
          </div>

          <div className="flex items-center gap-2">
            <SaveCampaignButton />
            <button
              type="button"
              onClick={() => setIsEditing(false)}
              className="rounded-lg border border-[var(--color-border)] px-3 py-1.5 text-sm font-medium transition-colors hover:bg-slate-100"
            >
              Cancel
            </button>
          </div>
        </form>
      ) : (
        <div className="mt-4 flex items-center gap-2 border-t border-[var(--color-border)] pt-4">
          <button
            type="button"
            onClick={() => {
              setIsEditing(true);
            }}
            className="rounded-lg border border-[var(--color-border)] px-3 py-1.5 text-sm font-medium transition-colors hover:bg-slate-100"
          >
            Edit
          </button>
          <form
            ref={deleteFormRef}
            action={deleteAction}
            onSubmit={(event) => {
              if (!allowDeleteSubmitRef.current) {
                event.preventDefault();
                setIsDeleteDialogOpen(true);
                return;
              }
              allowDeleteSubmitRef.current = false;
            }}
          >
            <input type="hidden" name="id" value={campaign.id} />
            <DeleteCampaignButton buttonRef={deleteButtonRef} />
          </form>
        </div>
      )}

      <ConfirmDialog
        isOpen={isDeleteDialogOpen}
        title="Delete campaign?"
        description="This action cannot be undone and will permanently remove this campaign."
        confirmLabel="Delete campaign"
        isPending={isDeletePending}
        onCancel={() => setIsDeleteDialogOpen(false)}
        onConfirm={() => {
          allowDeleteSubmitRef.current = true;
          setIsDeleteDialogOpen(false);
          deleteFormRef.current?.requestSubmit();
        }}
      />
    </article>
  );
}
