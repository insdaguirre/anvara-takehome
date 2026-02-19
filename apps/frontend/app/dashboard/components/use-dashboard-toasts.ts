'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

export type DashboardToastTone = 'success' | 'error';

export interface DashboardToastInput {
  tone: DashboardToastTone;
  title: string;
  message?: string;
}

export interface DashboardToast extends DashboardToastInput {
  id: number;
  exiting?: boolean;
}

const TOAST_DURATION_MS = 4200;
const TOAST_EXIT_DURATION_MS = 180;

export function useDashboardToasts() {
  const [toasts, setToasts] = useState<DashboardToast[]>([]);
  const nextToastIdRef = useRef(1);
  const timeoutMapRef = useRef<Map<number, number>>(new Map());
  const exitTimeoutMapRef = useRef<Map<number, number>>(new Map());

  const dismissToast = useCallback((id: number) => {
    const timeoutId = timeoutMapRef.current.get(id);
    if (typeof timeoutId === 'number') {
      window.clearTimeout(timeoutId);
      timeoutMapRef.current.delete(id);
    }

    if (exitTimeoutMapRef.current.has(id)) return;

    const prefersReducedMotion =
      typeof window !== 'undefined' &&
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (prefersReducedMotion) {
      setToasts((current) => current.filter((toast) => toast.id !== id));
      return;
    }

    setToasts((current) =>
      current.map((toast) => (toast.id === id ? { ...toast, exiting: true } : toast))
    );

    const exitTimeoutId = window.setTimeout(() => {
      exitTimeoutMapRef.current.delete(id);
      setToasts((current) => current.filter((toast) => toast.id !== id));
    }, TOAST_EXIT_DURATION_MS);

    exitTimeoutMapRef.current.set(id, exitTimeoutId);
  }, []);

  const pushToast = useCallback(
    (toast: DashboardToastInput) => {
      const id = nextToastIdRef.current;
      nextToastIdRef.current += 1;

      setToasts((current) => [...current, { id, exiting: false, ...toast }]);

      const timeoutId = window.setTimeout(() => {
        dismissToast(id);
      }, TOAST_DURATION_MS);

      timeoutMapRef.current.set(id, timeoutId);
    },
    [dismissToast]
  );

  useEffect(() => {
    return () => {
      for (const timeoutId of timeoutMapRef.current.values()) {
        window.clearTimeout(timeoutId);
      }
      timeoutMapRef.current.clear();
      for (const timeoutId of exitTimeoutMapRef.current.values()) {
        window.clearTimeout(timeoutId);
      }
      exitTimeoutMapRef.current.clear();
    };
  }, []);

  return {
    toasts,
    pushToast,
    dismissToast,
  };
}
