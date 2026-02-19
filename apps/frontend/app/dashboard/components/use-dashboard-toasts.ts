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
}

const TOAST_DURATION_MS = 4200;

export function useDashboardToasts() {
  const [toasts, setToasts] = useState<DashboardToast[]>([]);
  const nextToastIdRef = useRef(1);
  const timeoutMapRef = useRef<Map<number, number>>(new Map());

  const dismissToast = useCallback((id: number) => {
    const timeoutId = timeoutMapRef.current.get(id);
    if (typeof timeoutId === 'number') {
      window.clearTimeout(timeoutId);
      timeoutMapRef.current.delete(id);
    }

    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const pushToast = useCallback(
    (toast: DashboardToastInput) => {
      const id = nextToastIdRef.current;
      nextToastIdRef.current += 1;

      setToasts((current) => [...current, { id, ...toast }]);

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
    };
  }, []);

  return {
    toasts,
    pushToast,
    dismissToast,
  };
}
