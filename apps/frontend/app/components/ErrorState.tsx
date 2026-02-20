'use client';

import { useEffect, useRef } from 'react';
import Link from 'next/link';
import { AlertCircle, AlertTriangle, WifiOff } from 'lucide-react';

interface ErrorStateProps {
  title: string;
  message: string;
  onRetry?: () => void;
  showBackButton?: boolean;
  backButtonLabel?: string;
  backButtonHref?: string;
  onBackButtonClick?: () => void;
  technicalDetails?: string;
  variant?: 'error' | 'warning' | 'network';
}

const variantStyles: Record<NonNullable<ErrorStateProps['variant']>, string> = {
  error:
    'border-red-200 bg-red-50 text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-200',
  warning:
    'border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-200',
  network:
    'border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900/50 dark:bg-blue-950/30 dark:text-blue-200',
};

export function ErrorState({
  title,
  message,
  onRetry,
  showBackButton = false,
  backButtonLabel = 'Go back',
  backButtonHref = '/',
  onBackButtonClick,
  technicalDetails,
  variant = 'error',
}: ErrorStateProps) {
  const retryButtonRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (!onRetry) return;
    retryButtonRef.current?.focus();
  }, [onRetry, title, message, variant]);

  const Icon = variant === 'warning' ? AlertTriangle : variant === 'network' ? WifiOff : AlertCircle;
  const isCritical = variant !== 'warning';
  const actionButtonClassName =
    variant === 'warning'
      ? 'border-amber-300 hover:bg-amber-100 dark:border-amber-800 dark:hover:bg-amber-900/50'
      : variant === 'network'
        ? 'border-blue-300 hover:bg-blue-100 dark:border-blue-800 dark:hover:bg-blue-900/50'
        : 'border-red-300 hover:bg-red-100 dark:border-red-800 dark:hover:bg-red-900/50';

  return (
    <div
      className={`rounded-xl border p-5 ${variantStyles[variant]}`}
      role={isCritical ? 'alert' : 'status'}
      aria-live={isCritical ? 'assertive' : 'polite'}
    >
      <div className="flex items-start gap-3">
        <Icon className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
        <div>
          <p className="font-semibold">{title}</p>
          <p className="mt-1 text-sm">{message}</p>

          <div className="mt-3 flex flex-wrap gap-2">
            {onRetry ? (
              <button
                ref={retryButtonRef}
                type="button"
                onClick={onRetry}
                className={`rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors ${actionButtonClassName}`}
              >
                Try again
              </button>
            ) : null}

            {showBackButton ? (
              <Link
                href={backButtonHref}
                onClick={onBackButtonClick}
                className={`rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors ${actionButtonClassName}`}
              >
                {backButtonLabel}
              </Link>
            ) : null}
          </div>

          {globalThis.process?.env.NODE_ENV === 'development' && technicalDetails ? (
            <details className="mt-3 text-xs opacity-75">
              <summary className="cursor-pointer">Technical details</summary>
              <pre className="mt-1 overflow-auto whitespace-pre-wrap break-words">
                {technicalDetails}
              </pre>
            </details>
          ) : null}
        </div>
      </div>
    </div>
  );
}
