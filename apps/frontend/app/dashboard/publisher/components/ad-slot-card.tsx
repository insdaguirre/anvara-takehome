'use client';

import { useActionState, useRef, useState, type RefObject } from 'react';
import { useRouter } from 'next/navigation';
import { useFormStatus } from 'react-dom';
import { formatPrice } from '@/lib/format';
import type { AdSlot } from '@/lib/types';
import { ConfirmDialog } from '../../components/confirm-dialog';
import type { DashboardToastInput } from '../../components/use-dashboard-toasts';
import { deleteAdSlot, updateAdSlot } from '../actions';
import { INITIAL_AD_SLOT_FORM_STATE, type AdSlotFormState } from '../form-state';

// Use shared AdSlot domain type to stay aligned with server data contracts and avoid UI-level type duplication.
interface AdSlotCardProps {
  adSlot: AdSlot;
  onToast(toast: DashboardToastInput): void;
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
      className="rounded-lg bg-[var(--color-primary)] px-3 py-1.5 text-sm font-semibold text-white transition-colors hover:bg-[var(--color-primary-hover)] disabled:cursor-not-allowed disabled:opacity-60"
    >
      {pending ? 'Saving...' : 'Save'}
    </button>
  );
}

function DeleteAdSlotButton({ buttonRef }: { buttonRef: RefObject<HTMLButtonElement | null> }) {
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

export function AdSlotCard({ adSlot, onToast }: AdSlotCardProps) {
  const router = useRouter();
  const [isEditing, setIsEditing] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const allowDeleteSubmitRef = useRef(false);
  const deleteFormRef = useRef<HTMLFormElement | null>(null);
  const deleteButtonRef = useRef<HTMLButtonElement | null>(null);
  const [updateState, updateAction, isUpdatePending] = useActionState(
    async (prevState: AdSlotFormState, formData: FormData) => {
      const result = await updateAdSlot(prevState, formData);
      if (result.success) {
        setIsEditing(false);
        onToast({
          tone: 'success',
          title: 'Ad slot updated',
          message: `${adSlot.name} has been updated.`,
        });
        router.refresh();
      } else if (result.error) {
        onToast({
          tone: 'error',
          title: 'Unable to update ad slot',
          message: result.error,
        });
      }
      return result;
    },
    INITIAL_AD_SLOT_FORM_STATE
  );
  const [deleteState, deleteAction, isDeletePending] = useActionState(
    async (prevState: AdSlotFormState, formData: FormData) => {
      const result = await deleteAdSlot(prevState, formData);
      if (result.success) {
        onToast({
          tone: 'success',
          title: 'Ad slot deleted',
          message: `${adSlot.name} was removed from your inventory.`,
        });
        router.refresh();
      } else if (result.error) {
        onToast({
          tone: 'error',
          title: 'Unable to delete ad slot',
          message: result.error,
        });
      }
      return result;
    },
    INITIAL_AD_SLOT_FORM_STATE
  );

  const editNameId = `edit-slot-name-${adSlot.id}`;
  const editDescriptionId = `edit-slot-description-${adSlot.id}`;
  const editTypeId = `edit-slot-type-${adSlot.id}`;
  const editPriceId = `edit-slot-price-${adSlot.id}`;
  const nameErrorId = `${editNameId}-error`;
  const descriptionErrorId = `${editDescriptionId}-error`;
  const typeErrorId = `${editTypeId}-error`;
  const basePriceErrorId = `${editPriceId}-error`;

  return (
    <article className="overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-background)] p-4 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md">
      <div className="mb-3 flex items-start justify-between gap-2">
        <h3 className="text-base font-semibold text-[var(--color-foreground)]">{adSlot.name}</h3>
        <span
          className={`rounded-full px-2.5 py-1 text-xs font-medium ${typeColors[adSlot.type] || 'bg-gray-100 text-gray-700'}`}
        >
          {adSlot.type}
        </span>
      </div>

      {adSlot.description && (
        <p className="mb-4 line-clamp-2 text-sm text-[var(--color-muted)]">{adSlot.description}</p>
      )}

      <div className="flex items-center justify-between rounded-lg bg-slate-50 p-3 text-sm">
        <span
          className={`${adSlot.isAvailable ? 'text-emerald-700' : 'text-[var(--color-muted)]'}`}
        >
          {adSlot.isAvailable ? 'Available for booking' : 'Currently booked'}
        </span>
        <span className="font-semibold text-[var(--color-primary)]">
          {formatPrice(Number(adSlot.basePrice))}/mo
        </span>
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

          <input type="hidden" name="id" value={adSlot.id} />

          <div>
            <label htmlFor={editNameId} className="block text-xs font-medium">
              Name
            </label>
            <input
              id={editNameId}
              name="name"
              required
              maxLength={120}
              defaultValue={updateState.values?.name ?? adSlot.name}
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
              defaultValue={updateState.values?.description ?? (adSlot.description || '')}
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
            <label htmlFor={editTypeId} className="block text-xs font-medium">
              Type
            </label>
            <select
              id={editTypeId}
              name="type"
              defaultValue={updateState.values?.type ?? adSlot.type}
              aria-invalid={Boolean(updateState.fieldErrors?.type)}
              aria-describedby={updateState.fieldErrors?.type ? typeErrorId : undefined}
              className={`mt-1 w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-1 ${
                updateState.fieldErrors?.type
                  ? 'border-red-300 focus:border-red-500 focus:ring-red-500'
                  : 'border-[var(--color-border)] focus:border-[var(--color-primary)] focus:ring-[var(--color-primary)]'
              }`}
            >
              {AD_SLOT_TYPES.map((slotType) => (
                <option key={slotType} value={slotType}>
                  {slotType}
                </option>
              ))}
            </select>
            {updateState.fieldErrors?.type && (
              <p id={typeErrorId} className="mt-1 text-xs text-red-600">
                {updateState.fieldErrors.type}
              </p>
            )}
          </div>

          <div>
            <label htmlFor={editPriceId} className="block text-xs font-medium">
              Base Price
            </label>
            <input
              id={editPriceId}
              name="basePrice"
              type="number"
              required
              min="0.01"
              step="0.01"
              defaultValue={updateState.values?.basePrice ?? Number(adSlot.basePrice)}
              aria-invalid={Boolean(updateState.fieldErrors?.basePrice)}
              aria-describedby={updateState.fieldErrors?.basePrice ? basePriceErrorId : undefined}
              className={`mt-1 w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-1 ${
                updateState.fieldErrors?.basePrice
                  ? 'border-red-300 focus:border-red-500 focus:ring-red-500'
                  : 'border-[var(--color-border)] focus:border-[var(--color-primary)] focus:ring-[var(--color-primary)]'
              }`}
            />
            {updateState.fieldErrors?.basePrice && (
              <p id={basePriceErrorId} className="mt-1 text-xs text-red-600">
                {updateState.fieldErrors.basePrice}
              </p>
            )}
          </div>

          <label className="inline-flex items-center gap-2 text-sm">
            <input
              name="isAvailable"
              type="checkbox"
              defaultChecked={updateState.values?.isAvailable ?? adSlot.isAvailable}
              className="h-4 w-4 rounded border-[var(--color-border)] text-[var(--color-primary)]"
            />
            Available for booking
          </label>

          <div className="flex items-center gap-2">
            <SaveAdSlotButton />
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
            <input type="hidden" name="id" value={adSlot.id} />
            <DeleteAdSlotButton buttonRef={deleteButtonRef} />
          </form>
        </div>
      )}

      <ConfirmDialog
        isOpen={isDeleteDialogOpen}
        title="Delete ad slot?"
        description="This action cannot be undone and will permanently remove this listing."
        confirmLabel="Delete ad slot"
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
