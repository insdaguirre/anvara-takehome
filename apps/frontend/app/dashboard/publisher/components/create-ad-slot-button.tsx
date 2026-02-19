'use client';

import { useActionState, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useFormStatus } from 'react-dom';
import type { DashboardToastInput } from '../../components/use-dashboard-toasts';
import { createAdSlot } from '../actions';
import { INITIAL_AD_SLOT_FORM_STATE, type AdSlotFormState } from '../form-state';

const AD_SLOT_TYPES = ['DISPLAY', 'VIDEO', 'NATIVE', 'NEWSLETTER', 'PODCAST'] as const;

function CreateAdSlotSubmitButton() {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-lg bg-[var(--color-primary)] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[var(--color-primary-hover)] disabled:cursor-not-allowed disabled:opacity-60"
    >
      {pending ? 'Creating...' : 'Create Ad Slot'}
    </button>
  );
}

interface CreateAdSlotButtonProps {
  onToast(toast: DashboardToastInput): void;
}

export function CreateAdSlotButton({ onToast }: CreateAdSlotButtonProps) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const nameInputRef = useRef<HTMLInputElement | null>(null);
  const [state, formAction] = useActionState(async (prevState: AdSlotFormState, formData: FormData) => {
    const result = await createAdSlot(prevState, formData);
    if (result.success) {
      setIsOpen(false);
      onToast({
        tone: 'success',
        title: 'Ad slot created',
        message: 'Your new inventory listing is now live on this dashboard.',
      });
      router.refresh();
    } else if (result.error) {
      onToast({
        tone: 'error',
        title: 'Could not create ad slot',
        message: result.error,
      });
    }
    return result;
  }, INITIAL_AD_SLOT_FORM_STATE);

  useEffect(() => {
    if (!isOpen) return;
    const timeout = window.setTimeout(() => {
      nameInputRef.current?.focus();
    }, 0);

    return () => {
      window.clearTimeout(timeout);
    };
  }, [isOpen]);

  const nameErrorId = 'create-ad-slot-name-error';
  const descriptionErrorId = 'create-ad-slot-description-error';
  const typeErrorId = 'create-ad-slot-type-error';
  const basePriceErrorId = 'create-ad-slot-base-price-error';
  const hasErrorBanner = Boolean(state.error);

  return (
    <div className="flex w-full flex-col gap-3">
      <button
        type="button"
        onClick={() => {
          setIsOpen((current) => !current);
        }}
        aria-expanded={isOpen}
        aria-controls="create-ad-slot-form"
        className="self-start rounded-lg bg-[var(--color-primary)] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[var(--color-primary-hover)] sm:self-end"
      >
        {isOpen ? 'Close Form' : 'New Ad Slot'}
      </button>

      <div
        className={`grid overflow-hidden transition-[grid-template-rows,opacity] duration-200 ease-out motion-reduce:transition-none ${
          isOpen ? 'grid-rows-[1fr] opacity-100' : 'pointer-events-none grid-rows-[0fr] opacity-0'
        }`}
      >
        <div className="min-h-0">
          <form
            id="create-ad-slot-form"
            action={formAction}
            aria-hidden={!isOpen}
            inert={!isOpen}
            className="mt-0 grid gap-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-background)] p-5 shadow-sm sm:grid-cols-2"
          >
            <fieldset disabled={!isOpen} className="contents">
              {hasErrorBanner && (
                <div
                  role="alert"
                  className="rounded-lg border border-red-200 bg-red-50 p-2 text-sm text-red-700 sm:col-span-2"
                >
                  {state.error}
                </div>
              )}

              <div>
                <label htmlFor="create-ad-slot-name" className="block text-sm font-medium">
                  Name <span className="text-red-600">*</span>
                </label>
                <input
                  ref={nameInputRef}
                  id="create-ad-slot-name"
                  name="name"
                  type="text"
                  required
                  maxLength={120}
                  defaultValue={state.values?.name ?? ''}
                  aria-invalid={Boolean(state.fieldErrors?.name)}
                  aria-describedby={state.fieldErrors?.name ? nameErrorId : undefined}
                  className={`mt-1 w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-1 ${
                    state.fieldErrors?.name
                      ? 'border-red-300 focus:border-red-500 focus:ring-red-500'
                      : 'border-[var(--color-border)] focus:border-[var(--color-primary)] focus:ring-[var(--color-primary)]'
                  }`}
                />
                {state.fieldErrors?.name && (
                  <p id={nameErrorId} className="mt-1 text-sm text-red-600">
                    {state.fieldErrors.name}
                  </p>
                )}
              </div>

              <div className="sm:col-span-2">
                <label htmlFor="create-ad-slot-description" className="block text-sm font-medium">
                  Description
                </label>
                <textarea
                  id="create-ad-slot-description"
                  name="description"
                  rows={3}
                  defaultValue={state.values?.description ?? ''}
                  maxLength={1000}
                  aria-invalid={Boolean(state.fieldErrors?.description)}
                  aria-describedby={state.fieldErrors?.description ? descriptionErrorId : undefined}
                  className={`mt-1 w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-1 ${
                    state.fieldErrors?.description
                      ? 'border-red-300 focus:border-red-500 focus:ring-red-500'
                      : 'border-[var(--color-border)] focus:border-[var(--color-primary)] focus:ring-[var(--color-primary)]'
                  }`}
                />
                {state.fieldErrors?.description && (
                  <p id={descriptionErrorId} className="mt-1 text-sm text-red-600">
                    {state.fieldErrors.description}
                  </p>
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
                  aria-invalid={Boolean(state.fieldErrors?.type)}
                  aria-describedby={state.fieldErrors?.type ? typeErrorId : undefined}
                  className={`mt-1 w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-1 ${
                    state.fieldErrors?.type
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
                {state.fieldErrors?.type && (
                  <p id={typeErrorId} className="mt-1 text-sm text-red-600">
                    {state.fieldErrors.type}
                  </p>
                )}
              </div>

              <div>
                <label htmlFor="create-ad-slot-base-price" className="block text-sm font-medium">
                  Base Price (monthly) <span className="text-red-600">*</span>
                </label>
                <input
                  id="create-ad-slot-base-price"
                  name="basePrice"
                  type="number"
                  required
                  min="0.01"
                  step="0.01"
                  defaultValue={state.values?.basePrice ?? ''}
                  aria-invalid={Boolean(state.fieldErrors?.basePrice)}
                  aria-describedby={state.fieldErrors?.basePrice ? basePriceErrorId : undefined}
                  className={`mt-1 w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-1 ${
                    state.fieldErrors?.basePrice
                      ? 'border-red-300 focus:border-red-500 focus:ring-red-500'
                      : 'border-[var(--color-border)] focus:border-[var(--color-primary)] focus:ring-[var(--color-primary)]'
                  }`}
                />
                {state.fieldErrors?.basePrice && (
                  <p id={basePriceErrorId} className="mt-1 text-sm text-red-600">
                    {state.fieldErrors.basePrice}
                  </p>
                )}
              </div>

              <label className="inline-flex items-center gap-2 self-end pb-1 text-sm">
                <input
                  name="isAvailable"
                  type="checkbox"
                  defaultChecked={state.values?.isAvailable ?? true}
                  className="h-4 w-4 rounded border-[var(--color-border)] text-[var(--color-primary)]"
                />
                Available for booking
              </label>

              <div className="flex items-center gap-2 sm:col-span-2 sm:justify-end">
                <CreateAdSlotSubmitButton />
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="rounded-lg border border-[var(--color-border)] px-4 py-2 text-sm font-medium transition-colors hover:bg-slate-100"
                >
                  Cancel
                </button>
              </div>
            </fieldset>
          </form>
        </div>
      </div>
    </div>
  );
}
