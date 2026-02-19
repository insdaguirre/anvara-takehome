'use client';

import { AlertCircle, CheckCircle2, X } from 'lucide-react';
import type { DashboardToast } from './use-dashboard-toasts';

interface DashboardToastRegionProps {
  toasts: DashboardToast[];
  onDismiss(toastId: number): void;
}

export function DashboardToastRegion({ toasts, onDismiss }: DashboardToastRegionProps) {
  if (toasts.length === 0) {
    return null;
  }

  return (
    <div className="pointer-events-none fixed right-4 top-24 z-[70] flex w-[min(92vw,360px)] flex-col gap-2">
      {toasts.map((toast) => {
        const isError = toast.tone === 'error';

        return (
          <div
            key={toast.id}
            className={`pointer-events-auto rounded-xl border p-3 shadow-lg backdrop-blur-sm motion-safe:animate-[dashboard-toast-in_180ms_ease-out] ${
              isError
                ? 'border-red-200 bg-red-50/95 text-red-900'
                : 'border-emerald-200 bg-emerald-50/95 text-emerald-900'
            }`}
            role={isError ? 'alert' : 'status'}
            aria-live={isError ? 'assertive' : 'polite'}
          >
            <div className="flex items-start gap-2">
              <span aria-hidden="true" className="mt-0.5">
                {isError ? <AlertCircle size={18} /> : <CheckCircle2 size={18} />}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold">{toast.title}</p>
                {toast.message ? <p className="text-sm opacity-90">{toast.message}</p> : null}
              </div>
              <button
                type="button"
                onClick={() => onDismiss(toast.id)}
                className="rounded p-0.5 opacity-70 transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-offset-2"
                aria-label="Dismiss notification"
              >
                <X size={16} />
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
