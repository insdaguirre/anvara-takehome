'use client';

import { useActionState, useState } from 'react';
import { useFormStatus } from 'react-dom';
import { createAdSlot } from '../actions';
import { INITIAL_AD_SLOT_FORM_STATE, type AdSlotFormState } from '../form-state';

const AD_SLOT_TYPES = ['DISPLAY', 'VIDEO', 'NATIVE', 'NEWSLETTER', 'PODCAST'] as const;

function CreateAdSlotSubmitButton() {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {pending ? 'Saving...' : 'Create Ad Slot'}
    </button>
  );
}

export function CreateAdSlotButton() {
  const [isOpen, setIsOpen] = useState(false);
  const [flashMessage, setFlashMessage] = useState<string | null>(null);
  const [state, formAction] = useActionState(async (prevState: AdSlotFormState, formData: FormData) => {
    const result = await createAdSlot(prevState, formData);
    if (result.success) {
      setIsOpen(false);
      setFlashMessage('Ad slot created successfully.');
    }
    return result;
  }, INITIAL_AD_SLOT_FORM_STATE);

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={() => {
          setFlashMessage(null);
          setIsOpen((current) => !current);
        }}
        className="rounded bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500"
      >
        {isOpen ? 'Close Form' : 'Create Ad Slot'}
      </button>

      {flashMessage && <p className="text-sm text-green-600">{flashMessage}</p>}

      {isOpen && (
        <form action={formAction} className="grid gap-3 rounded-lg border border-[var(--color-border)] p-4">
          {state.error && (
            <div className="rounded border border-red-200 bg-red-50 p-2 text-sm text-red-700">
              {state.error}
            </div>
          )}

          <div>
            <label htmlFor="create-ad-slot-name" className="block text-sm font-medium">
              Name
            </label>
            <input
              id="create-ad-slot-name"
              name="name"
              type="text"
              defaultValue={state.values?.name ?? ''}
              className="mt-1 w-full rounded border border-[var(--color-border)] px-3 py-2"
            />
            {state.fieldErrors?.name && (
              <p className="mt-1 text-sm text-red-600">{state.fieldErrors.name}</p>
            )}
          </div>

          <div>
            <label htmlFor="create-ad-slot-description" className="block text-sm font-medium">
              Description
            </label>
            <textarea
              id="create-ad-slot-description"
              name="description"
              rows={3}
              defaultValue={state.values?.description ?? ''}
              className="mt-1 w-full rounded border border-[var(--color-border)] px-3 py-2"
            />
            {state.fieldErrors?.description && (
              <p className="mt-1 text-sm text-red-600">{state.fieldErrors.description}</p>
            )}
          </div>

          <div>
            <label htmlFor="create-ad-slot-type" className="block text-sm font-medium">
              Type
            </label>
            <select
              id="create-ad-slot-type"
              name="type"
              defaultValue={state.values?.type ?? 'DISPLAY'}
              className="mt-1 w-full rounded border border-[var(--color-border)] px-3 py-2"
            >
              {AD_SLOT_TYPES.map((slotType) => (
                <option key={slotType} value={slotType}>
                  {slotType}
                </option>
              ))}
            </select>
            {state.fieldErrors?.type && (
              <p className="mt-1 text-sm text-red-600">{state.fieldErrors.type}</p>
            )}
          </div>

          <div>
            <label htmlFor="create-ad-slot-base-price" className="block text-sm font-medium">
              Base Price (monthly)
            </label>
            <input
              id="create-ad-slot-base-price"
              name="basePrice"
              type="number"
              min="0"
              step="0.01"
              defaultValue={state.values?.basePrice ?? ''}
              className="mt-1 w-full rounded border border-[var(--color-border)] px-3 py-2"
            />
            {state.fieldErrors?.basePrice && (
              <p className="mt-1 text-sm text-red-600">{state.fieldErrors.basePrice}</p>
            )}
          </div>

          <label className="inline-flex items-center gap-2 text-sm">
            <input
              name="isAvailable"
              type="checkbox"
              defaultChecked={state.values?.isAvailable ?? true}
              className="h-4 w-4 rounded border-[var(--color-border)]"
            />
            Available for booking
          </label>

          <div className="flex items-center gap-2">
            <CreateAdSlotSubmitButton />
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="rounded border border-[var(--color-border)] px-4 py-2 text-sm"
            >
              Cancel
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
