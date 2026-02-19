'use client';

import { useCallback, useEffect, useRef, useState, type ChangeEvent, type FormEvent } from 'react';
import { analytics } from '@/lib/analytics';
import { formatPrice } from '@/lib/format';

const API_URL = globalThis.process?.env.NEXT_PUBLIC_API_URL || 'http://localhost:4291';

const BUDGET_OPTIONS = ['<$5k', '$5k-$10k', '$10k-$25k', '$25k+', 'Custom'] as const;
const TIMELINE_OPTIONS = ['ASAP', '1-2 weeks', '1 month', '2-3 months', 'Flexible'] as const;
const MAX_ATTACHMENT_COUNT = 3;
const MAX_ATTACHMENT_SIZE_BYTES = 5 * 1024 * 1024;
const MAX_TOTAL_ATTACHMENTS_SIZE_BYTES = 15 * 1024 * 1024;
const ALLOWED_ATTACHMENT_TYPES = [
  'application/pdf',
  'image/png',
  'image/jpeg',
  'image/webp',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
] as const;

type BudgetValue = (typeof BUDGET_OPTIONS)[number];
type TimelineValue = (typeof TIMELINE_OPTIONS)[number];

interface QuoteModalAdSlot {
  id: string;
  name: string;
  basePrice: number;
  publisher?: {
    name?: string | null;
  } | null;
}

interface QuoteFormValues {
  email: string;
  companyName: string;
  phone: string;
  budget: '' | BudgetValue;
  goals: string;
  timeline: '' | TimelineValue;
  message: string;
}

interface QuoteAttachmentPayload {
  name: string;
  type: string;
  size: number;
  base64Data: string;
}

interface QuoteModalProps {
  isOpen: boolean;
  onClose(): void;
  onSuccess(quoteId: string): void;
  adSlot: QuoteModalAdSlot;
  userEmail?: string | null;
  companyName?: string | null;
  isLoggedIn?: boolean;
  returnFocusElement?: HTMLElement | null;
}

interface QuoteRequestPayload {
  success?: boolean;
  quoteId?: string;
  message?: string;
  error?: string;
  fieldErrors?: Record<string, string>;
}

const INITIAL_VALUES: QuoteFormValues = {
  email: '',
  companyName: '',
  phone: '',
  budget: '',
  goals: '',
  timeline: '',
  message: '',
};

type QuoteInteractionField =
  | 'phone'
  | 'budget'
  | 'goals'
  | 'timeline'
  | 'attachments'
  | 'special_requirements';

function parseFieldErrors(value: unknown): Record<string, string> {
  if (!value || typeof value !== 'object') return {};
  const parsedEntries = Object.entries(value).filter((entry): entry is [string, string] => {
    const [, fieldMessage] = entry;
    return typeof fieldMessage === 'string' && fieldMessage.length > 0;
  });

  return Object.fromEntries(parsedEntries);
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => {
      if (typeof reader.result !== 'string') {
        reject(new Error('Failed to process attachment'));
        return;
      }

      const [, base64Data = ''] = reader.result.split(',', 2);
      if (!base64Data) {
        reject(new Error('Failed to process attachment'));
        return;
      }

      resolve(base64Data);
    };

    reader.onerror = () => reject(new Error('Failed to process attachment'));
    reader.readAsDataURL(file);
  });
}

function formatBytes(bytes: number): string {
  if (bytes >= 1024 * 1024) {
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  return `${Math.ceil(bytes / 1024)} KB`;
}

function validateAttachments(selectedFiles: File[]): string | null {
  if (selectedFiles.length > MAX_ATTACHMENT_COUNT) {
    return `You can upload up to ${MAX_ATTACHMENT_COUNT} files.`;
  }

  const totalBytes = selectedFiles.reduce((total, file) => total + file.size, 0);
  if (totalBytes > MAX_TOTAL_ATTACHMENTS_SIZE_BYTES) {
    return `Total attachment size must be ${formatBytes(MAX_TOTAL_ATTACHMENTS_SIZE_BYTES)} or less.`;
  }

  for (const file of selectedFiles) {
    if (file.size > MAX_ATTACHMENT_SIZE_BYTES) {
      return `${file.name} exceeds the ${formatBytes(MAX_ATTACHMENT_SIZE_BYTES)} limit.`;
    }

    if (!ALLOWED_ATTACHMENT_TYPES.includes(file.type as (typeof ALLOWED_ATTACHMENT_TYPES)[number])) {
      return `${file.name} has an unsupported file type.`;
    }
  }

  return null;
}

export function QuoteModal({
  isOpen,
  onClose,
  onSuccess,
  adSlot,
  userEmail,
  companyName,
  isLoggedIn,
  returnFocusElement,
}: QuoteModalProps) {
  const [values, setValues] = useState<QuoteFormValues>(INITIAL_VALUES);
  const [attachments, setAttachments] = useState<File[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const modalRef = useRef<HTMLDivElement | null>(null);
  const emailInputRef = useRef<HTMLInputElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const lastActiveElementRef = useRef<HTMLElement | null>(null);
  const submittingRef = useRef(false);
  const modalOpenTimeRef = useRef(0);
  const valuesRef = useRef<QuoteFormValues>(INITIAL_VALUES);
  const attachmentsRef = useRef<File[]>([]);
  const interactedOptionalFieldsRef = useRef<Set<QuoteInteractionField>>(new Set());

  useEffect(() => {
    submittingRef.current = submitting;
  }, [submitting]);

  const getFilledFieldsCount = useCallback((): number => {
    const currentValues = valuesRef.current;
    let count = 0;

    if (currentValues.email.trim()) count += 1;
    if (currentValues.companyName.trim()) count += 1;
    if (currentValues.phone.trim()) count += 1;
    if (currentValues.budget) count += 1;
    if (currentValues.goals.trim()) count += 1;
    if (currentValues.timeline) count += 1;
    if (currentValues.message.trim()) count += 1;
    if (attachmentsRef.current.length > 0) count += 1;

    return count;
  }, []);

  const handleModalClose = useCallback(() => {
    if (modalOpenTimeRef.current > 0 && !submittingRef.current) {
      const timeInModalSeconds = Math.floor((Date.now() - modalOpenTimeRef.current) / 1000);
      analytics.quoteCancel(adSlot.id, adSlot.name, timeInModalSeconds, getFilledFieldsCount());
    }

    modalOpenTimeRef.current = 0;
    onClose();
  }, [adSlot.id, adSlot.name, getFilledFieldsCount, onClose]);

  useEffect(() => {
    if (!isOpen) return;

    const initialValues = {
      ...INITIAL_VALUES,
      email: userEmail ?? '',
      companyName: companyName ?? '',
    };
    setValues(initialValues);
    valuesRef.current = initialValues;
    setAttachments([]);
    attachmentsRef.current = [];
    interactedOptionalFieldsRef.current.clear();
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    setSubmitting(false);
    submittingRef.current = false;
    setFormError(null);
    setFieldErrors({});
    lastActiveElementRef.current = document.activeElement as HTMLElement | null;
    modalOpenTimeRef.current = Date.now();

    const focusTimeout = window.setTimeout(() => {
      emailInputRef.current?.focus();
    }, 0);

    analytics.quoteStart(adSlot.id, adSlot.name, Number(adSlot.basePrice));

    const onKeyDown = (event: KeyboardEvent) => {
      if (!modalRef.current) return;

      if (event.key === 'Escape' && !submittingRef.current) {
        event.preventDefault();
        handleModalClose();
        return;
      }

      if (event.key !== 'Tab') return;

      const focusableElements = Array.from(
        modalRef.current.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'
        )
      );

      if (focusableElements.length === 0) return;

      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];
      const activeElement = document.activeElement as HTMLElement | null;

      if (event.shiftKey && activeElement === firstElement) {
        event.preventDefault();
        lastElement.focus();
        return;
      }

      if (!event.shiftKey && activeElement === lastElement) {
        event.preventDefault();
        firstElement.focus();
      }
    };

    window.addEventListener('keydown', onKeyDown);

    return () => {
      window.clearTimeout(focusTimeout);
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [adSlot.basePrice, adSlot.id, adSlot.name, companyName, handleModalClose, isOpen, userEmail]);

  useEffect(() => {
    if (isOpen) return;
    const focusTarget = returnFocusElement ?? lastActiveElementRef.current;
    focusTarget?.focus();
  }, [isOpen, returnFocusElement]);

  const handleFieldChange = <K extends keyof QuoteFormValues>(field: K, value: QuoteFormValues[K]) => {
    setValues((current) => {
      const next = { ...current, [field]: value };
      valuesRef.current = next;
      return next;
    });
    setFieldErrors((current) => {
      if (!current[field]) return current;
      const next = { ...current };
      delete next[field];
      return next;
    });

    const optionalFields: Array<keyof QuoteFormValues> = ['phone', 'budget', 'goals', 'timeline'];
    if (
      optionalFields.includes(field) &&
      Boolean(value) &&
      !interactedOptionalFieldsRef.current.has(field as QuoteInteractionField)
    ) {
      interactedOptionalFieldsRef.current.add(field as QuoteInteractionField);
      analytics.quoteFieldInteraction(field as QuoteInteractionField, adSlot.id);
    }

    if (
      field === 'message' &&
      Boolean(value) &&
      !interactedOptionalFieldsRef.current.has('special_requirements')
    ) {
      interactedOptionalFieldsRef.current.add('special_requirements');
      analytics.quoteFieldInteraction('special_requirements', adSlot.id);
    }
  };

  const handleAttachmentChange = (event: ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(event.target.files ?? []);
    const attachmentError = validateAttachments(selectedFiles);

    if (attachmentError) {
      setAttachments([]);
      attachmentsRef.current = [];
      setFieldErrors((current) => ({ ...current, attachments: attachmentError }));
      analytics.quoteValidationError('attachments', attachmentError, adSlot.id);
      return;
    }

    setAttachments(selectedFiles);
    attachmentsRef.current = selectedFiles;
    setFieldErrors((current) => {
      if (!current.attachments) return current;
      const next = { ...current };
      delete next.attachments;
      return next;
    });

    if (selectedFiles.length > 0 && !interactedOptionalFieldsRef.current.has('attachments')) {
      interactedOptionalFieldsRef.current.add('attachments');
      analytics.quoteFieldInteraction('attachments', adSlot.id);
    }
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (submitting) return;

    const attachmentError = validateAttachments(attachments);
    if (attachmentError) {
      setFieldErrors((current) => ({ ...current, attachments: attachmentError }));
      analytics.quoteValidationError('attachments', attachmentError, adSlot.id);
      return;
    }

    setSubmitting(true);
    submittingRef.current = true;
    setFormError(null);
    setFieldErrors({});

    try {
      const serializedAttachments: QuoteAttachmentPayload[] = await Promise.all(
        attachments.map(async (file) => ({
          name: file.name,
          type: file.type,
          size: file.size,
          base64Data: await fileToBase64(file),
        }))
      );

      const payload = {
        adSlotId: adSlot.id,
        email: values.email.trim(),
        companyName: values.companyName.trim(),
        phone: values.phone.trim() || undefined,
        budget: values.budget || undefined,
        goals: values.goals.trim() || undefined,
        timeline: values.timeline || undefined,
        message: values.message.trim(),
        attachments: serializedAttachments.length > 0 ? serializedAttachments : undefined,
      };

      analytics.quoteSubmit(adSlot.id, adSlot.name, Number(adSlot.basePrice), {
        hasCompany: Boolean(payload.companyName),
        hasPhone: Boolean(payload.phone),
        hasBudget: Boolean(payload.budget),
        hasGoals: Boolean(payload.goals),
        hasTimeline: Boolean(payload.timeline),
        messageLength: payload.message.length,
        hasAttachments: serializedAttachments.length > 0,
        attachmentCount: serializedAttachments.length,
        isLoggedIn,
      });

      const response = await fetch(`${API_URL}/api/quotes/request`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload),
      });

      let responsePayload: QuoteRequestPayload | null = null;
      try {
        responsePayload = (await response.json()) as QuoteRequestPayload;
      } catch {
        responsePayload = null;
      }

      if (response.ok) {
        const quoteId =
          typeof responsePayload?.quoteId === 'string' && responsePayload.quoteId.length > 0
            ? responsePayload.quoteId
            : `quote_${Date.now()}`;
        onSuccess(quoteId);
        analytics.quoteSuccess(adSlot.id, adSlot.name, Number(adSlot.basePrice), quoteId);
        modalOpenTimeRef.current = 0;
        onClose();
        return;
      }

      if (response.status === 400) {
        const parsedErrors = parseFieldErrors(responsePayload?.fieldErrors);
        const errorMessage =
          typeof responsePayload?.error === 'string' && responsePayload.error.length > 0
            ? responsePayload.error
            : 'Please review the highlighted fields and try again.';
        setFieldErrors(parsedErrors);
        setFormError(errorMessage);
        for (const [fieldName, message] of Object.entries(parsedErrors)) {
          analytics.quoteValidationError(fieldName, message, adSlot.id);
        }
        analytics.quoteFail(adSlot.id, adSlot.name, errorMessage);
        return;
      }

      if (response.status === 404) {
        const errorMessage = 'This listing is no longer available. Please browse other placements.';
        setFormError(errorMessage);
        analytics.quoteErrorShown('api', errorMessage, adSlot.id);
        analytics.quoteFail(adSlot.id, adSlot.name, errorMessage);
        return;
      }

      const errorMessage = 'Failed to submit quote request. Please try again.';
      setFormError(errorMessage);
      analytics.quoteErrorShown('api', errorMessage, adSlot.id);
      analytics.quoteFail(adSlot.id, adSlot.name, errorMessage);
    } catch {
      const errorMessage = 'Failed to submit quote request. Please try again.';
      setFormError(errorMessage);
      analytics.quoteErrorShown('api', errorMessage, adSlot.id);
      analytics.quoteFail(adSlot.id, adSlot.name, errorMessage);
    } finally {
      setSubmitting(false);
      submittingRef.current = false;
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm motion-safe:animate-[backdrop-fade-in_180ms_ease-out]"
      role="presentation"
      onClick={(event) => {
        if (submitting) return;
        if (event.target === event.currentTarget) {
          handleModalClose();
        }
      }}
    >
      <div
        ref={modalRef}
        className="w-full max-w-2xl rounded-xl border border-[var(--color-border)] bg-[var(--color-background)] p-6 shadow-xl motion-safe:animate-[dashboard-dialog-in_200ms_ease-out]"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="quote-modal-title"
      >
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h2 id="quote-modal-title" className="text-lg font-semibold">
              Request a Quote: {adSlot.name}
            </h2>
            <p className="text-sm text-[var(--color-muted)]">
              {adSlot.publisher?.name || 'Publisher'} · {formatPrice(adSlot.basePrice)}/mo
            </p>
          </div>
          <button
            type="button"
            onClick={handleModalClose}
            disabled={submitting}
            className="rounded p-1 text-[var(--color-muted)] hover:bg-gray-100 hover:text-[var(--color-foreground)] disabled:cursor-not-allowed disabled:opacity-50"
            aria-label="Close quote request modal"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4" aria-busy={submitting}>
          {formError && (
            <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {formError}
            </div>
          )}

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="quote-email" className="mb-1 block text-sm font-medium text-[var(--color-muted)]">
                Contact Email
              </label>
              <input
                id="quote-email"
                ref={emailInputRef}
                type="email"
                required
                maxLength={254}
                autoComplete="email"
                value={values.email}
                onChange={(event) => handleFieldChange('email', event.target.value)}
                aria-invalid={Boolean(fieldErrors.email)}
                aria-describedby={fieldErrors.email ? 'quote-email-error' : undefined}
                className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2 text-sm text-[var(--color-foreground)] placeholder:text-[var(--color-muted)] focus:border-[var(--color-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--color-primary)]"
              />
              {fieldErrors.email && (
                <p id="quote-email-error" className="mt-1 text-sm text-red-600">
                  {fieldErrors.email}
                </p>
              )}
            </div>

            <div>
              <label htmlFor="quote-company-name" className="mb-1 block text-sm font-medium text-[var(--color-muted)]">
                Company Name
              </label>
              <input
                id="quote-company-name"
                type="text"
                required
                maxLength={200}
                autoComplete="organization"
                value={values.companyName}
                onChange={(event) => handleFieldChange('companyName', event.target.value)}
                aria-invalid={Boolean(fieldErrors.companyName)}
                aria-describedby={fieldErrors.companyName ? 'quote-company-name-error' : undefined}
                className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2 text-sm text-[var(--color-foreground)] placeholder:text-[var(--color-muted)] focus:border-[var(--color-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--color-primary)]"
              />
              {fieldErrors.companyName && (
                <p id="quote-company-name-error" className="mt-1 text-sm text-red-600">
                  {fieldErrors.companyName}
                </p>
              )}
            </div>

            <div>
              <label htmlFor="quote-phone" className="mb-1 block text-sm font-medium text-[var(--color-muted)]">
                Phone (optional)
              </label>
              <input
                id="quote-phone"
                type="tel"
                autoComplete="tel"
                value={values.phone}
                onChange={(event) => handleFieldChange('phone', event.target.value)}
                aria-invalid={Boolean(fieldErrors.phone)}
                aria-describedby={fieldErrors.phone ? 'quote-phone-error' : undefined}
                className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2 text-sm text-[var(--color-foreground)] placeholder:text-[var(--color-muted)] focus:border-[var(--color-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--color-primary)]"
              />
              {fieldErrors.phone && <p id="quote-phone-error" className="mt-1 text-sm text-red-600">{fieldErrors.phone}</p>}
            </div>

            <div>
              <label htmlFor="quote-budget" className="mb-1 block text-sm font-medium text-[var(--color-muted)]">
                Budget (optional)
              </label>
              <select
                id="quote-budget"
                value={values.budget}
                onChange={(event) => handleFieldChange('budget', event.target.value as QuoteFormValues['budget'])}
                aria-invalid={Boolean(fieldErrors.budget)}
                aria-describedby={fieldErrors.budget ? 'quote-budget-error' : undefined}
                className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2 text-sm text-[var(--color-foreground)] focus:border-[var(--color-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--color-primary)]"
              >
                <option value="">Select budget range</option>
                {BUDGET_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
              {fieldErrors.budget && (
                <p id="quote-budget-error" className="mt-1 text-sm text-red-600">
                  {fieldErrors.budget}
                </p>
              )}
            </div>

            <div>
              <label htmlFor="quote-goals" className="mb-1 block text-sm font-medium text-[var(--color-muted)]">
                Campaign Goals (optional)
              </label>
              <input
                id="quote-goals"
                type="text"
                maxLength={500}
                value={values.goals}
                onChange={(event) => handleFieldChange('goals', event.target.value)}
                aria-invalid={Boolean(fieldErrors.goals)}
                aria-describedby={fieldErrors.goals ? 'quote-goals-error' : undefined}
                className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2 text-sm text-[var(--color-foreground)] placeholder:text-[var(--color-muted)] focus:border-[var(--color-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--color-primary)]"
                placeholder="e.g., Brand awareness, lead generation"
              />
              {fieldErrors.goals && (
                <p id="quote-goals-error" className="mt-1 text-sm text-red-600">
                  {fieldErrors.goals}
                </p>
              )}
            </div>

            <div>
              <label htmlFor="quote-timeline" className="mb-1 block text-sm font-medium text-[var(--color-muted)]">
                Timeline (optional)
              </label>
              <select
                id="quote-timeline"
                value={values.timeline}
                onChange={(event) => handleFieldChange('timeline', event.target.value as QuoteFormValues['timeline'])}
                aria-invalid={Boolean(fieldErrors.timeline)}
                aria-describedby={fieldErrors.timeline ? 'quote-timeline-error' : undefined}
                className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2 text-sm text-[var(--color-foreground)] focus:border-[var(--color-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--color-primary)]"
              >
                <option value="">Select timeline</option>
                {TIMELINE_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
              {fieldErrors.timeline && (
                <p id="quote-timeline-error" className="mt-1 text-sm text-red-600">
                  {fieldErrors.timeline}
                </p>
              )}
            </div>

            <div className="sm:col-span-2">
              <label htmlFor="quote-message" className="mb-1 block text-sm font-medium text-[var(--color-muted)]">
                Special Requirements
              </label>
              <textarea
                id="quote-message"
                required
                minLength={10}
                maxLength={2000}
                rows={5}
                value={values.message}
                onChange={(event) => handleFieldChange('message', event.target.value)}
                aria-invalid={Boolean(fieldErrors.message)}
                aria-describedby={fieldErrors.message ? 'quote-message-error' : undefined}
                placeholder="Tell us what you need, your campaign context, and any custom requirements."
                className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2 text-[var(--color-foreground)] placeholder:text-[var(--color-muted)] focus:border-[var(--color-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--color-primary)]"
              />
              {fieldErrors.message && (
                <p id="quote-message-error" className="mt-1 text-sm text-red-600">
                  {fieldErrors.message}
                </p>
              )}
            </div>

            <div className="sm:col-span-2">
              <label htmlFor="quote-attachments" className="mb-1 block text-sm font-medium text-[var(--color-muted)]">
                Attachments (optional)
              </label>
              <input
                id="quote-attachments"
                ref={fileInputRef}
                type="file"
                multiple
                accept=".pdf,.png,.jpg,.jpeg,.webp,.doc,.docx"
                onChange={handleAttachmentChange}
                disabled={submitting}
                aria-invalid={Boolean(fieldErrors.attachments)}
                aria-describedby={fieldErrors.attachments ? 'quote-attachments-error' : 'quote-attachments-help'}
                className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2 text-sm text-[var(--color-foreground)] file:mr-3 file:rounded-md file:border-0 file:bg-[var(--color-primary)] file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-white"
              />
              <p id="quote-attachments-help" className="mt-1 text-xs text-[var(--color-muted)]">
                Up to {MAX_ATTACHMENT_COUNT} files. PDF, DOC/DOCX, PNG, JPG, WEBP. Max {formatBytes(MAX_ATTACHMENT_SIZE_BYTES)} each.
              </p>
              {attachments.length > 0 && (
                <ul className="mt-2 space-y-1 text-xs text-[var(--color-muted)]">
                  {attachments.map((file) => (
                    <li key={`${file.name}-${file.size}`}>{file.name} ({formatBytes(file.size)})</li>
                  ))}
                </ul>
              )}
              {fieldErrors.attachments && (
                <p id="quote-attachments-error" className="mt-1 text-sm text-red-600">
                  {fieldErrors.attachments}
                </p>
              )}
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-lg bg-[var(--color-primary)] px-4 py-3 font-semibold text-white transition-colors hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting ? 'Submitting...' : 'Submit Quote Request'}
          </button>

          <p className="text-xs text-[var(--color-muted)]">
            We typically respond within 24 hours with availability and recommended options.
          </p>
        </form>
      </div>
    </div>
  );
}
