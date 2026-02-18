'use client';

import { useEffect, useRef, useState, type FormEvent } from 'react';
import { analytics } from '@/lib/analytics';
import { formatPrice } from '@/lib/format';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4291';

interface BookingModalAdSlot {
  id: string;
  name: string;
  basePrice: number;
  publisher?: {
    name?: string | null;
  } | null;
}

interface BookingModalProps {
  isOpen: boolean;
  onClose(): void;
  onSuccess(): void;
  adSlot: BookingModalAdSlot;
  sponsorName?: string | null;
  returnFocusElement?: HTMLElement | null;
}

export function BookingModal({
  isOpen,
  onClose,
  onSuccess,
  adSlot,
  sponsorName,
  returnFocusElement,
}: BookingModalProps) {
  const [message, setMessage] = useState('');
  const [booking, setBooking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const companyInputRef = useRef<HTMLInputElement | null>(null);
  const messageRef = useRef<HTMLTextAreaElement | null>(null);
  const lastActiveElementRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    setMessage('');
    setError(null);
    setBooking(false);
    lastActiveElementRef.current = document.activeElement as HTMLElement | null;

    const focusTimeout = window.setTimeout(() => {
      if (sponsorName && companyInputRef.current) {
        companyInputRef.current.focus();
        return;
      }
      messageRef.current?.focus();
    }, 0);

    analytics.bookingStart(adSlot.id, adSlot.name, Number(adSlot.basePrice));

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
      }
    };

    window.addEventListener('keydown', onKeyDown);

    return () => {
      window.clearTimeout(focusTimeout);
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [adSlot.basePrice, adSlot.id, adSlot.name, isOpen, onClose, sponsorName]);

  useEffect(() => {
    if (isOpen) return;

    const focusTarget = returnFocusElement ?? lastActiveElementRef.current;
    focusTarget?.focus();
  }, [isOpen, returnFocusElement]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setBooking(true);
    setError(null);

    analytics.bookingSubmit(adSlot.id, adSlot.name, Number(adSlot.basePrice), Boolean(message.trim()));

    try {
      const response = await fetch(`${API_URL}/api/ad-slots/${adSlot.id}/book`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          message: message.trim() || undefined,
        }),
      });

      if (!response.ok) {
        let payload: unknown;
        try {
          payload = await response.json();
        } catch {
          payload = null;
        }

        const errorMessage =
          typeof payload === 'object' && payload !== null && 'error' in payload
            ? String(payload.error)
            : 'Failed to book placement';
        throw new Error(errorMessage);
      }

      analytics.bookingSuccess(adSlot.id, adSlot.name, Number(adSlot.basePrice));
      setMessage('');
      onSuccess();
      onClose();
    } catch (submitError) {
      const errorMessage =
        submitError instanceof Error ? submitError.message : 'Failed to book placement';
      setError(errorMessage);
      analytics.bookingFail(adSlot.id, adSlot.name, errorMessage);
    } finally {
      setBooking(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="w-full max-w-md rounded-xl border border-[var(--color-border)] bg-[var(--color-background)] p-6 shadow-xl"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="booking-modal-title"
      >
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h2 id="booking-modal-title" className="text-lg font-semibold">
              Request: {adSlot.name}
            </h2>
            <p className="text-sm text-[var(--color-muted)]">
              {adSlot.publisher?.name || 'Publisher'} · {formatPrice(adSlot.basePrice)}/mo
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded p-1 text-[var(--color-muted)] hover:bg-gray-100 hover:text-[var(--color-foreground)]"
            aria-label="Close booking modal"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {sponsorName && (
            <div>
              <label
                htmlFor="booking-company"
                className="mb-1 block text-sm font-medium text-[var(--color-muted)]"
              >
                Your Company
              </label>
              <input
                id="booking-company"
                ref={companyInputRef}
                value={sponsorName}
                readOnly
                className="w-full rounded-lg border border-[var(--color-border)] bg-gray-50 px-3 py-2 text-sm text-[var(--color-foreground)]"
              />
            </div>
          )}

          <div>
            <label
              htmlFor="booking-message"
              className="mb-1 block text-sm font-medium text-[var(--color-muted)]"
            >
              Message to Publisher (optional)
            </label>
            <textarea
              id="booking-message"
              ref={messageRef}
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              rows={4}
              placeholder="e.g., We're launching our developer tool and want to reach your audience."
              className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2 text-[var(--color-foreground)] placeholder:text-[var(--color-muted)] focus:border-[var(--color-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--color-primary)]"
            />
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <button
            type="submit"
            disabled={booking}
            className="w-full rounded-lg bg-[var(--color-primary)] px-4 py-3 font-semibold text-white transition-colors hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {booking ? 'Requesting...' : 'Confirm Booking Request'}
          </button>

          <p className="text-xs text-[var(--color-muted)]">
            By requesting, you agree to our terms. The publisher will review your request and
            respond via email.
          </p>
        </form>
      </div>
    </div>
  );
}
