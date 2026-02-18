'use client';

import { useActionState, useState } from 'react';
import { useFormStatus } from 'react-dom';
import { createCampaign } from '../actions';
import { INITIAL_CAMPAIGN_FORM_STATE, type CampaignFormState } from '../form-state';

function CreateCampaignSubmitButton() {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {pending ? 'Saving...' : 'Create Campaign'}
    </button>
  );
}

export function CreateCampaignButton() {
  const [isOpen, setIsOpen] = useState(false);
  const [flashMessage, setFlashMessage] = useState<string | null>(null);
  const [state, formAction] = useActionState(async (prevState: CampaignFormState, formData: FormData) => {
    const result = await createCampaign(prevState, formData);
    if (result.success) {
      setIsOpen(false);
      setFlashMessage('Campaign created successfully.');
    }
    return result;
  }, INITIAL_CAMPAIGN_FORM_STATE);

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
        {isOpen ? 'Close Form' : 'Create Campaign'}
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
            <label htmlFor="create-campaign-name" className="block text-sm font-medium">
              Name
            </label>
            <input
              id="create-campaign-name"
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
            <label htmlFor="create-campaign-description" className="block text-sm font-medium">
              Description
            </label>
            <textarea
              id="create-campaign-description"
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
            <label htmlFor="create-campaign-budget" className="block text-sm font-medium">
              Budget
            </label>
            <input
              id="create-campaign-budget"
              name="budget"
              type="number"
              min="0"
              step="0.01"
              defaultValue={state.values?.budget ?? ''}
              className="mt-1 w-full rounded border border-[var(--color-border)] px-3 py-2"
            />
            {state.fieldErrors?.budget && (
              <p className="mt-1 text-sm text-red-600">{state.fieldErrors.budget}</p>
            )}
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label htmlFor="create-campaign-start-date" className="block text-sm font-medium">
                Start Date
              </label>
              <input
                id="create-campaign-start-date"
                name="startDate"
                type="date"
                defaultValue={state.values?.startDate ?? ''}
                className="mt-1 w-full rounded border border-[var(--color-border)] px-3 py-2"
              />
              {state.fieldErrors?.startDate && (
                <p className="mt-1 text-sm text-red-600">{state.fieldErrors.startDate}</p>
              )}
            </div>
            <div>
              <label htmlFor="create-campaign-end-date" className="block text-sm font-medium">
                End Date
              </label>
              <input
                id="create-campaign-end-date"
                name="endDate"
                type="date"
                defaultValue={state.values?.endDate ?? ''}
                className="mt-1 w-full rounded border border-[var(--color-border)] px-3 py-2"
              />
              {state.fieldErrors?.endDate && (
                <p className="mt-1 text-sm text-red-600">{state.fieldErrors.endDate}</p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <CreateCampaignSubmitButton />
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
