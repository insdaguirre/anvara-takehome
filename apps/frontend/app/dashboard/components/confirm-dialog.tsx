'use client';

import { useEffect, useId, useRef } from 'react';
import { useBodyScrollLock } from '@/hooks/use-body-scroll-lock';

interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  description: string;
  confirmLabel: string;
  cancelLabel?: string;
  isPending?: boolean;
  returnFocusElement?: HTMLElement | null;
  onCancel(): void;
  onConfirm(): void;
}

export function ConfirmDialog({
  isOpen,
  title,
  description,
  confirmLabel,
  cancelLabel = 'Cancel',
  isPending = false,
  returnFocusElement,
  onCancel,
  onConfirm,
}: ConfirmDialogProps) {
  const modalRef = useRef<HTMLDivElement | null>(null);
  const cancelButtonRef = useRef<HTMLButtonElement | null>(null);
  const lastActiveElementRef = useRef<HTMLElement | null>(null);
  const titleId = useId();
  const descriptionId = useId();

  useBodyScrollLock(isOpen);

  useEffect(() => {
    if (!isOpen) {
      const focusTarget = returnFocusElement ?? lastActiveElementRef.current;
      focusTarget?.focus();
      return;
    }

    lastActiveElementRef.current = document.activeElement as HTMLElement | null;

    const focusTimeout = window.setTimeout(() => {
      cancelButtonRef.current?.focus();
    }, 0);

    const onKeyDown = (event: KeyboardEvent) => {
      if (!modalRef.current) return;

      if (event.key === 'Escape' && !isPending) {
        event.preventDefault();
        onCancel();
        return;
      }

      if (event.key !== 'Tab') return;

      const focusableElements = Array.from(
        modalRef.current.querySelectorAll<HTMLElement>(
          'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
        )
      );

      if (focusableElements.length === 0) return;

      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];
      const activeElement = document.activeElement as HTMLElement | null;

      if (event.shiftKey && activeElement === firstElement) {
        event.preventDefault();
        lastElement.focus();
      } else if (!event.shiftKey && activeElement === lastElement) {
        event.preventDefault();
        firstElement.focus();
      }
    };

    window.addEventListener('keydown', onKeyDown);

    return () => {
      window.clearTimeout(focusTimeout);
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [isOpen, isPending, onCancel, returnFocusElement]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center overflow-hidden bg-slate-900/45 p-0 backdrop-blur-sm lg:items-center lg:p-4"
      role="presentation"
      onClick={(event) => {
        if (isPending) return;
        if (event.target === event.currentTarget) {
          onCancel();
        }
      }}
    >
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        className="flex h-full w-full flex-col overflow-y-auto bg-[var(--color-background)] p-4 pt-[max(1rem,env(safe-area-inset-top))] pb-[max(1rem,env(safe-area-inset-bottom))] motion-safe:animate-[dashboard-dialog-in_180ms_ease-out] lg:h-auto lg:max-w-md lg:rounded-2xl lg:border lg:border-[var(--color-border)] lg:p-6 lg:shadow-xl"
      >
        <h2 id={titleId} className="text-lg font-semibold text-[var(--color-foreground)]">
          {title}
        </h2>
        <p id={descriptionId} className="mt-2 text-sm text-[var(--color-muted)]">
          {description}
        </p>

        <div className="mt-5 flex justify-end gap-2">
          <button
            ref={cancelButtonRef}
            type="button"
            onClick={onCancel}
            disabled={isPending}
            className="min-h-[44px] rounded-lg border border-[var(--color-border)] px-4 py-2 text-sm font-medium text-[var(--color-foreground)] transition-colors hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isPending}
            className="min-h-[44px] rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-red-500 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isPending ? 'Processing...' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
