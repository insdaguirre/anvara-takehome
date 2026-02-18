'use client';

import { useActionState, useState } from 'react';
import { useFormStatus } from 'react-dom';
import type { AdSlot } from '@/lib/types';
import { deleteAdSlot, updateAdSlot } from '../actions';
import { INITIAL_AD_SLOT_FORM_STATE, type AdSlotFormState } from '../form-state';

// Use shared AdSlot domain type to stay aligned with server data contracts and avoid UI-level type duplication.
interface AdSlotCardProps {
  adSlot: AdSlot;
}

const typeColors: Record<string, string> = {
  DISPLAY: 'bg-blue-100 text-blue-700',
  VIDEO: 'bg-red-100 text-red-700',
  NATIVE: 'bg-emerald-100 text-emerald-700',
  NEWSLETTER: 'bg-purple-100 text-purple-700',
  PODCAST: 'bg-orange-100 text-orange-700',
};

const AD_SLOT_TYPES = ['DISPLAY', 'VIDEO', 'NATIVE', 'NEWSLETTER', 'PODCAST'] as const;

function SaveAdSlotButton() {
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

function DeleteAdSlotButton() {
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

export function AdSlotCard({ adSlot }: AdSlotCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [updateState, updateAction] = useActionState(async (prevState: AdSlotFormState, formData: FormData) => {
    const result = await updateAdSlot(prevState, formData);
    if (result.success) {
      setIsEditing(false);
      setFeedback('Ad slot updated.');
    }
    return result;
  }, INITIAL_AD_SLOT_FORM_STATE);
  const [deleteState, deleteAction] = useActionState(async (prevState: AdSlotFormState, formData: FormData) => {
    const result = await deleteAdSlot(prevState, formData);
    if (result.success) {
      setFeedback('Ad slot deleted.');
    }
    return result;
  }, INITIAL_AD_SLOT_FORM_STATE);

  return (
    <div className="rounded-lg border border-[var(--color-border)] p-4">
      <div className="mb-2 flex items-start justify-between">
        <h3 className="font-semibold">{adSlot.name}</h3>
        <span className={`rounded px-2 py-0.5 text-xs ${typeColors[adSlot.type] || 'bg-gray-100'}`}>
          {adSlot.type}
        </span>
      </div>

      {adSlot.description && (
        <p className="mb-3 text-sm text-[var(--color-muted)] line-clamp-2">{adSlot.description}</p>
      )}

      <div className="flex items-center justify-between">
        <span
          className={`text-sm ${adSlot.isAvailable ? 'text-green-600' : 'text-[var(--color-muted)]'}`}
        >
          {adSlot.isAvailable ? 'Available' : 'Booked'}
        </span>
        <span className="font-semibold text-[var(--color-primary)]">
          ${Number(adSlot.basePrice).toLocaleString()}/mo
        </span>
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

          <input type="hidden" name="id" value={adSlot.id} />

          <div>
            <label htmlFor={`edit-slot-name-${adSlot.id}`} className="block text-xs font-medium">
              Name
            </label>
            <input
              id={`edit-slot-name-${adSlot.id}`}
              name="name"
              defaultValue={updateState.values?.name ?? adSlot.name}
              className="mt-1 w-full rounded border border-[var(--color-border)] px-3 py-2 text-sm"
            />
            {updateState.fieldErrors?.name && (
              <p className="mt-1 text-xs text-red-600">{updateState.fieldErrors.name}</p>
            )}
          </div>

          <div>
            <label htmlFor={`edit-slot-description-${adSlot.id}`} className="block text-xs font-medium">
              Description
            </label>
            <textarea
              id={`edit-slot-description-${adSlot.id}`}
              name="description"
              rows={2}
              defaultValue={updateState.values?.description ?? (adSlot.description || '')}
              className="mt-1 w-full rounded border border-[var(--color-border)] px-3 py-2 text-sm"
            />
            {updateState.fieldErrors?.description && (
              <p className="mt-1 text-xs text-red-600">{updateState.fieldErrors.description}</p>
            )}
          </div>

          <div>
            <label htmlFor={`edit-slot-type-${adSlot.id}`} className="block text-xs font-medium">
              Type
            </label>
            <select
              id={`edit-slot-type-${adSlot.id}`}
              name="type"
              defaultValue={updateState.values?.type ?? adSlot.type}
              className="mt-1 w-full rounded border border-[var(--color-border)] px-3 py-2 text-sm"
            >
              {AD_SLOT_TYPES.map((slotType) => (
                <option key={slotType} value={slotType}>
                  {slotType}
                </option>
              ))}
            </select>
            {updateState.fieldErrors?.type && (
              <p className="mt-1 text-xs text-red-600">{updateState.fieldErrors.type}</p>
            )}
          </div>

          <div>
            <label htmlFor={`edit-slot-price-${adSlot.id}`} className="block text-xs font-medium">
              Base Price
            </label>
            <input
              id={`edit-slot-price-${adSlot.id}`}
              name="basePrice"
              type="number"
              min="0"
              step="0.01"
              defaultValue={updateState.values?.basePrice ?? Number(adSlot.basePrice)}
              className="mt-1 w-full rounded border border-[var(--color-border)] px-3 py-2 text-sm"
            />
            {updateState.fieldErrors?.basePrice && (
              <p className="mt-1 text-xs text-red-600">{updateState.fieldErrors.basePrice}</p>
            )}
          </div>

          <label className="inline-flex items-center gap-2 text-sm">
            <input
              name="isAvailable"
              type="checkbox"
              defaultChecked={updateState.values?.isAvailable ?? adSlot.isAvailable}
              className="h-4 w-4 rounded border-[var(--color-border)]"
            />
            Available for booking
          </label>

          <div className="flex items-center gap-2">
            <SaveAdSlotButton />
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
              const confirmed = window.confirm('Delete this ad slot? This action cannot be undone.');
              if (!confirmed) {
                event.preventDefault();
              }
            }}
          >
            <input type="hidden" name="id" value={adSlot.id} />
            <DeleteAdSlotButton />
          </form>
        </div>
      )}
    </div>
  );
}
