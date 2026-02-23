'use client';

import { useActionState, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useFormStatus } from 'react-dom';
import type { DashboardToastInput } from '../../components/use-dashboard-toasts';
import { useAgent } from '@/app/components/agent/agent-provider';
import { createCampaign } from '../actions';
import { INITIAL_CAMPAIGN_FORM_STATE, type CampaignFormState } from '../form-state';

function CreateCampaignSubmitButton() {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-lg bg-[var(--color-primary)] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[var(--color-primary-hover)] disabled:cursor-not-allowed disabled:opacity-60"
    >
      {pending ? 'Creating...' : 'Create Campaign'}
    </button>
  );
}

interface CreateCampaignButtonProps {
  onToast(toast: DashboardToastInput): void;
}

export function CreateCampaignButton({ onToast }: CreateCampaignButtonProps) {
  const router = useRouter();
  const { pendingCampaignPrefill, consumeCampaignPrefill } = useAgent();
  const [isOpen, setIsOpen] = useState(false);
  const nameInputRef = useRef<HTMLInputElement | null>(null);
  const descriptionInputRef = useRef<HTMLTextAreaElement | null>(null);
  const budgetInputRef = useRef<HTMLInputElement | null>(null);
  const startDateInputRef = useRef<HTMLInputElement | null>(null);
  const endDateInputRef = useRef<HTMLInputElement | null>(null);
  const [state, formAction] = useActionState(async (prevState: CampaignFormState, formData: FormData) => {
    const result = await createCampaign(prevState, formData);
    if (result.success) {
      setIsOpen(false);
      onToast({
        tone: 'success',
        title: 'Campaign created',
        message: 'Your campaign was saved and the dashboard has been refreshed.',
      });
      router.refresh();
    } else if (result.error) {
      onToast({
        tone: 'error',
        title: 'Could not create campaign',
        message: result.error,
      });
    }
    return result;
  }, INITIAL_CAMPAIGN_FORM_STATE);

  useEffect(() => {
    if (!isOpen) return;

    const timeout = window.setTimeout(() => {
      nameInputRef.current?.focus();
    }, 0);

    return () => {
      window.clearTimeout(timeout);
    };
  }, [isOpen]);

  useEffect(() => {
    if (!pendingCampaignPrefill) return;

    const { requestId, values } = pendingCampaignPrefill;

    const timeout = window.setTimeout(() => {
      setIsOpen(true);

      if (typeof values.name === 'string' && nameInputRef.current) {
        nameInputRef.current.value = values.name;
      }

      if (typeof values.description === 'string' && descriptionInputRef.current) {
        descriptionInputRef.current.value = values.description;
      }

      if (typeof values.budget === 'number' && budgetInputRef.current) {
        budgetInputRef.current.value = String(values.budget);
      }

      if (typeof values.startDate === 'string' && startDateInputRef.current) {
        startDateInputRef.current.value = values.startDate;
      }

      if (typeof values.endDate === 'string' && endDateInputRef.current) {
        endDateInputRef.current.value = values.endDate;
      }

      consumeCampaignPrefill(requestId);
    }, 0);

    return () => {
      window.clearTimeout(timeout);
    };
  }, [consumeCampaignPrefill, pendingCampaignPrefill]);

  const nameErrorId = 'create-campaign-name-error';
  const descriptionErrorId = 'create-campaign-description-error';
  const budgetErrorId = 'create-campaign-budget-error';
  const startDateErrorId = 'create-campaign-start-date-error';
  const endDateErrorId = 'create-campaign-end-date-error';

  return (
    <div className="flex w-full flex-col gap-3">
      <button
        type="button"
        onClick={() => {
          setIsOpen((current) => !current);
        }}
        aria-expanded={isOpen}
        aria-controls="create-campaign-form"
        className="self-start rounded-lg bg-[var(--color-primary)] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[var(--color-primary-hover)] sm:self-end"
      >
        {isOpen ? 'Close Form' : 'New Campaign'}
      </button>

      <div
        className={`grid overflow-hidden transition-[grid-template-rows,opacity] duration-200 ease-out motion-reduce:transition-none ${
          isOpen ? 'grid-rows-[1fr] opacity-100' : 'pointer-events-none grid-rows-[0fr] opacity-0'
        }`}
      >
        <div className="min-h-0">
          <form
            id="create-campaign-form"
            action={formAction}
            aria-hidden={!isOpen}
            inert={!isOpen}
            className="mt-0 grid gap-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-background)] p-5 shadow-sm sm:grid-cols-2"
          >
            <fieldset disabled={!isOpen} className="contents">
              {state.error && (
                <div
                  role="alert"
                  className="rounded-lg border border-red-200 bg-red-50 p-2 text-sm text-red-700 sm:col-span-2"
                >
                  {state.error}
                </div>
              )}

              <div>
                <label htmlFor="create-campaign-name" className="block text-sm font-medium">
                  Name <span className="text-red-600">*</span>
                </label>
                <input
                  ref={nameInputRef}
                  id="create-campaign-name"
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
                <label htmlFor="create-campaign-description" className="block text-sm font-medium">
                  Description
                </label>
                <textarea
                  ref={descriptionInputRef}
                  id="create-campaign-description"
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
                <label htmlFor="create-campaign-budget" className="block text-sm font-medium">
                  Budget <span className="text-red-600">*</span>
                </label>
                <input
                  ref={budgetInputRef}
                  id="create-campaign-budget"
                  name="budget"
                  type="number"
                  required
                  min="0.01"
                  step="0.01"
                  defaultValue={state.values?.budget ?? ''}
                  aria-invalid={Boolean(state.fieldErrors?.budget)}
                  aria-describedby={state.fieldErrors?.budget ? budgetErrorId : undefined}
                  className={`mt-1 w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-1 ${
                    state.fieldErrors?.budget
                      ? 'border-red-300 focus:border-red-500 focus:ring-red-500'
                      : 'border-[var(--color-border)] focus:border-[var(--color-primary)] focus:ring-[var(--color-primary)]'
                  }`}
                />
                {state.fieldErrors?.budget && (
                  <p id={budgetErrorId} className="mt-1 text-sm text-red-600">
                    {state.fieldErrors.budget}
                  </p>
                )}
              </div>

              <div className="grid gap-3 sm:col-span-2 sm:grid-cols-2">
                <div>
                  <label htmlFor="create-campaign-start-date" className="block text-sm font-medium">
                    Start Date <span className="text-red-600">*</span>
                  </label>
                  <input
                    ref={startDateInputRef}
                    id="create-campaign-start-date"
                    name="startDate"
                    type="date"
                    required
                    defaultValue={state.values?.startDate ?? ''}
                    aria-invalid={Boolean(state.fieldErrors?.startDate)}
                    aria-describedby={state.fieldErrors?.startDate ? startDateErrorId : undefined}
                    className={`date-input-light-icon mt-1 w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-1 ${
                      state.fieldErrors?.startDate
                        ? 'border-red-300 focus:border-red-500 focus:ring-red-500'
                        : 'border-[var(--color-border)] focus:border-[var(--color-primary)] focus:ring-[var(--color-primary)]'
                    }`}
                  />
                  {state.fieldErrors?.startDate && (
                    <p id={startDateErrorId} className="mt-1 text-sm text-red-600">
                      {state.fieldErrors.startDate}
                    </p>
                  )}
                </div>
                <div>
                  <label htmlFor="create-campaign-end-date" className="block text-sm font-medium">
                    End Date <span className="text-red-600">*</span>
                  </label>
                  <input
                    ref={endDateInputRef}
                    id="create-campaign-end-date"
                    name="endDate"
                    type="date"
                    required
                    defaultValue={state.values?.endDate ?? ''}
                    aria-invalid={Boolean(state.fieldErrors?.endDate)}
                    aria-describedby={state.fieldErrors?.endDate ? endDateErrorId : undefined}
                    className={`date-input-light-icon mt-1 w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-1 ${
                      state.fieldErrors?.endDate
                        ? 'border-red-300 focus:border-red-500 focus:ring-red-500'
                        : 'border-[var(--color-border)] focus:border-[var(--color-primary)] focus:ring-[var(--color-primary)]'
                    }`}
                  />
                  {state.fieldErrors?.endDate && (
                    <p id={endDateErrorId} className="mt-1 text-sm text-red-600">
                      {state.fieldErrors.endDate}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2 sm:col-span-2 sm:justify-end">
                <CreateCampaignSubmitButton />
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
