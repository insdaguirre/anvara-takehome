'use client';

import { useActionState, useState } from 'react';
import { useFormStatus } from 'react-dom';
import type { Campaign } from '@/lib/types';
import { deleteCampaign, updateCampaign } from '../actions';
import { INITIAL_CAMPAIGN_FORM_STATE, type CampaignFormState } from '../form-state';

interface CampaignCardProps {
  campaign: Campaign;
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
      className="rounded bg-indigo-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {pending ? 'Saving...' : 'Save'}
    </button>
  );
}

function DeleteCampaignButton() {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded border border-red-300 px-3 py-1.5 text-sm text-red-700 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {pending ? 'Deleting...' : 'Delete'}
    </button>
  );
}

export function CampaignCard({ campaign }: CampaignCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [updateState, updateAction] = useActionState(async (prevState: CampaignFormState, formData: FormData) => {
    const result = await updateCampaign(prevState, formData);
    if (result.success) {
      setIsEditing(false);
      setFeedback('Campaign updated.');
    }
    return result;
  }, INITIAL_CAMPAIGN_FORM_STATE);
  const [deleteState, deleteAction] = useActionState(async (prevState: CampaignFormState, formData: FormData) => {
    const result = await deleteCampaign(prevState, formData);
    if (result.success) {
      setFeedback('Campaign deleted.');
    }
    return result;
  }, INITIAL_CAMPAIGN_FORM_STATE);
  const progress =
    campaign.budget > 0 ? (Number(campaign.spent) / Number(campaign.budget)) * 100 : 0;

  return (
    <div className="rounded-lg border border-[var(--color-border)] p-4">
      <div className="mb-2 flex items-start justify-between">
        <h3 className="font-semibold">{campaign.name}</h3>
        <span
          className={`rounded px-2 py-0.5 text-xs ${statusColors[campaign.status] || 'bg-gray-100'}`}
        >
          {campaign.status}
        </span>
      </div>

      {campaign.description && (
        <p className="mb-3 text-sm text-[var(--color-muted)] line-clamp-2">{campaign.description}</p>
      )}

      <div className="mb-2">
        <div className="flex justify-between text-sm">
          <span className="text-[var(--color-muted)]">Budget</span>
          <span>
            ${Number(campaign.spent).toLocaleString()} / ${Number(campaign.budget).toLocaleString()}
          </span>
        </div>
        <div className="mt-1 h-1.5 rounded-full bg-gray-200">
          <div
            className="h-1.5 rounded-full bg-[var(--color-primary)]"
            style={{ width: `${Math.min(progress, 100)}%` }}
          />
        </div>
      </div>

      <div className="text-xs text-[var(--color-muted)]">
        {new Date(campaign.startDate).toLocaleDateString()} -{' '}
        {new Date(campaign.endDate).toLocaleDateString()}
      </div>

      {feedback && <p className="mt-3 text-sm text-green-600">{feedback}</p>}
      {deleteState.error && <p className="mt-3 text-sm text-red-600">{deleteState.error}</p>}

      {isEditing ? (
        <form action={updateAction} className="mt-4 space-y-3 border-t border-[var(--color-border)] pt-4">
          {updateState.error && (
            <div className="rounded border border-red-200 bg-red-50 p-2 text-sm text-red-700">
              {updateState.error}
            </div>
          )}

          <input type="hidden" name="id" value={campaign.id} />

          <div>
            <label htmlFor={`edit-campaign-name-${campaign.id}`} className="block text-xs font-medium">
              Name
            </label>
            <input
              id={`edit-campaign-name-${campaign.id}`}
              name="name"
              defaultValue={updateState.values?.name ?? campaign.name}
              className="mt-1 w-full rounded border border-[var(--color-border)] px-3 py-2 text-sm"
            />
            {updateState.fieldErrors?.name && (
              <p className="mt-1 text-xs text-red-600">{updateState.fieldErrors.name}</p>
            )}
          </div>

          <div>
            <label htmlFor={`edit-campaign-description-${campaign.id}`} className="block text-xs font-medium">
              Description
            </label>
            <textarea
              id={`edit-campaign-description-${campaign.id}`}
              name="description"
              rows={2}
              defaultValue={updateState.values?.description ?? (campaign.description || '')}
              className="mt-1 w-full rounded border border-[var(--color-border)] px-3 py-2 text-sm"
            />
            {updateState.fieldErrors?.description && (
              <p className="mt-1 text-xs text-red-600">{updateState.fieldErrors.description}</p>
            )}
          </div>

          <div>
            <label htmlFor={`edit-campaign-budget-${campaign.id}`} className="block text-xs font-medium">
              Budget
            </label>
            <input
              id={`edit-campaign-budget-${campaign.id}`}
              name="budget"
              type="number"
              min="0"
              step="0.01"
              defaultValue={updateState.values?.budget ?? Number(campaign.budget)}
              className="mt-1 w-full rounded border border-[var(--color-border)] px-3 py-2 text-sm"
            />
            {updateState.fieldErrors?.budget && (
              <p className="mt-1 text-xs text-red-600">{updateState.fieldErrors.budget}</p>
            )}
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label
                htmlFor={`edit-campaign-start-date-${campaign.id}`}
                className="block text-xs font-medium"
              >
                Start Date
              </label>
              <input
                id={`edit-campaign-start-date-${campaign.id}`}
                name="startDate"
                type="date"
                defaultValue={updateState.values?.startDate ?? toDateInputValue(campaign.startDate)}
                className="mt-1 w-full rounded border border-[var(--color-border)] px-3 py-2 text-sm"
              />
              {updateState.fieldErrors?.startDate && (
                <p className="mt-1 text-xs text-red-600">{updateState.fieldErrors.startDate}</p>
              )}
            </div>

            <div>
              <label htmlFor={`edit-campaign-end-date-${campaign.id}`} className="block text-xs font-medium">
                End Date
              </label>
              <input
                id={`edit-campaign-end-date-${campaign.id}`}
                name="endDate"
                type="date"
                defaultValue={updateState.values?.endDate ?? toDateInputValue(campaign.endDate)}
                className="mt-1 w-full rounded border border-[var(--color-border)] px-3 py-2 text-sm"
              />
              {updateState.fieldErrors?.endDate && (
                <p className="mt-1 text-xs text-red-600">{updateState.fieldErrors.endDate}</p>
              )}
            </div>
          </div>

          <div>
            <label htmlFor={`edit-campaign-status-${campaign.id}`} className="block text-xs font-medium">
              Status
            </label>
            <select
              id={`edit-campaign-status-${campaign.id}`}
              name="status"
              defaultValue={updateState.values?.status ?? campaign.status}
              className="mt-1 w-full rounded border border-[var(--color-border)] px-3 py-2 text-sm"
            >
              {CAMPAIGN_STATUSES.map((statusOption) => (
                <option key={statusOption} value={statusOption}>
                  {statusOption}
                </option>
              ))}
            </select>
            {updateState.fieldErrors?.status && (
              <p className="mt-1 text-xs text-red-600">{updateState.fieldErrors.status}</p>
            )}
          </div>

          <div className="flex items-center gap-2">
            <SaveCampaignButton />
            <button
              type="button"
              onClick={() => setIsEditing(false)}
              className="rounded border border-[var(--color-border)] px-3 py-1.5 text-sm"
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
              setFeedback(null);
              setIsEditing(true);
            }}
            className="rounded border border-[var(--color-border)] px-3 py-1.5 text-sm hover:bg-gray-50"
          >
            Edit
          </button>
          <form
            action={deleteAction}
            onSubmit={(event) => {
              const confirmed = window.confirm('Delete this campaign? This action cannot be undone.');
              if (!confirmed) {
                event.preventDefault();
              }
            }}
          >
            <input type="hidden" name="id" value={campaign.id} />
            <DeleteCampaignButton />
          </form>
        </div>
      )}
    </div>
  );
}
