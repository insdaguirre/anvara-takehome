'use client';

import React, { useActionState, useEffect, useRef } from 'react';
import { useFormStatus } from 'react-dom';
import { analytics } from '@/lib/analytics';
import {
  subscribeToNewsletter,
  type NewsletterSignupState,
} from './footer-actions';

const INITIAL_NEWSLETTER_SIGNUP_STATE: NewsletterSignupState = {
  resetKey: 0,
};

function NewsletterSubmitButton() {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      aria-disabled={pending}
      className="rounded bg-[var(--color-primary)] px-4 py-2 text-sm font-semibold text-white hover:bg-[var(--color-primary-hover)] disabled:cursor-not-allowed disabled:opacity-60"
    >
      {pending ? 'Subscribing...' : 'Subscribe'}
    </button>
  );
}

export function Footer() {
  const formRef = useRef<HTMLFormElement | null>(null);
  const hasTrackedNewsletterStart = useRef(false);
  const previousSuccess = useRef(false);
  const previousError = useRef<string | undefined>(undefined);
  const [state, formAction] = useActionState(
    subscribeToNewsletter,
    INITIAL_NEWSLETTER_SIGNUP_STATE
  );

  useEffect(() => {
    if (state.success) {
      formRef.current?.reset();
    }
  }, [state.success, state.resetKey]);

  useEffect(() => {
    if (state.success && !previousSuccess.current) {
      analytics.newsletterSignupSuccess();
    }
    previousSuccess.current = Boolean(state.success);
  }, [state.success]);

  useEffect(() => {
    if (state.error && state.error !== previousError.current) {
      analytics.newsletterSignupFail(state.error);
    }
    previousError.current = state.error;
  }, [state.error]);

  const handleNewsletterStart = () => {
    if (hasTrackedNewsletterStart.current) return;
    hasTrackedNewsletterStart.current = true;
    analytics.newsletterSignupStart();
  };

  const handleNewsletterSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    const formData = new FormData(event.currentTarget);
    const rawEmail = formData.get('email');
    const email = typeof rawEmail === 'string' ? rawEmail.trim().toLowerCase() : '';
    const atIndex = email.lastIndexOf('@');
    const emailDomain = atIndex > -1 ? email.slice(atIndex + 1) : 'unknown';
    analytics.newsletterSignupSubmit(emailDomain || 'unknown');
  };

  return (
    <footer className="border-t border-[var(--color-border)] bg-[var(--color-background)]">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-[var(--color-foreground)]">
            Get product updates
          </p>
          <p className="text-sm text-[var(--color-muted)]">
            Subscribe for marketplace news and release updates.
          </p>
        </div>

        <form
          ref={formRef}
          action={formAction}
          onSubmit={handleNewsletterSubmit}
          className="flex w-full max-w-md flex-col gap-2"
          aria-describedby="newsletter-form-status"
        >
          <div className="flex flex-col gap-2 sm:flex-row">
            <label htmlFor="newsletter-email" className="sr-only">
              Email address
            </label>
            <input
              id="newsletter-email"
              name="email"
              type="email"
              required
              maxLength={254}
              autoComplete="email"
              placeholder="you@example.com"
              aria-invalid={Boolean(state.fieldErrors?.email)}
              aria-describedby={state.fieldErrors?.email ? 'newsletter-email-error' : undefined}
              defaultValue={state.values?.email ?? ''}
              onFocus={handleNewsletterStart}
              className="w-full rounded border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2 text-sm text-[var(--color-foreground)] placeholder:text-[var(--color-muted)]"
            />
            <NewsletterSubmitButton />
          </div>

          {state.fieldErrors?.email && (
            <p id="newsletter-email-error" className="text-sm text-[var(--color-error)]" aria-live="polite">
              {state.fieldErrors.email}
            </p>
          )}

          <div id="newsletter-form-status" className="min-h-5" aria-live="polite" role="status">
            {state.success && state.message && (
              <p className="text-sm text-[var(--color-success)]">{state.message}</p>
            )}
            {!state.success && state.error && !state.fieldErrors?.email && (
              <p className="text-sm text-[var(--color-error)]">{state.error}</p>
            )}
          </div>
        </form>
      </div>
    </footer>
  );
}
