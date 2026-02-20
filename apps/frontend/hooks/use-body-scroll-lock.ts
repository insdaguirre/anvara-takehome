'use client';

import { useEffect } from 'react';

const LOCK_COUNT_DATA_KEY = 'scrollLockCount';
const PREV_BODY_OVERFLOW_DATA_KEY = 'scrollLockPrevBodyOverflow';
const PREV_HTML_OVERFLOW_DATA_KEY = 'scrollLockPrevHtmlOverflow';

function getScrollLockCount(): number {
  if (typeof document === 'undefined') return 0;
  const rawCount = document.body.dataset[LOCK_COUNT_DATA_KEY];
  const parsed = Number.parseInt(rawCount ?? '0', 10);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function lockBodyScroll(): void {
  if (typeof document === 'undefined') return;

  const { body, documentElement } = document;
  const currentCount = getScrollLockCount();

  if (currentCount === 0) {
    body.dataset[PREV_BODY_OVERFLOW_DATA_KEY] = body.style.overflow;
    body.style.overflow = 'hidden';

    documentElement.dataset[PREV_HTML_OVERFLOW_DATA_KEY] = documentElement.style.overflow;
    documentElement.style.overflow = 'hidden';
  }

  body.dataset[LOCK_COUNT_DATA_KEY] = String(currentCount + 1);
}

export function unlockBodyScroll(): void {
  if (typeof document === 'undefined') return;

  const { body, documentElement } = document;
  const currentCount = getScrollLockCount();

  if (currentCount <= 1) {
    body.style.overflow = body.dataset[PREV_BODY_OVERFLOW_DATA_KEY] ?? '';
    delete body.dataset[PREV_BODY_OVERFLOW_DATA_KEY];
    delete body.dataset[LOCK_COUNT_DATA_KEY];

    documentElement.style.overflow = documentElement.dataset[PREV_HTML_OVERFLOW_DATA_KEY] ?? '';
    delete documentElement.dataset[PREV_HTML_OVERFLOW_DATA_KEY];
    return;
  }

  body.dataset[LOCK_COUNT_DATA_KEY] = String(currentCount - 1);
}

export function useBodyScrollLock(isLocked: boolean): void {
  useEffect(() => {
    if (!isLocked) return;

    lockBodyScroll();
    return () => {
      unlockBodyScroll();
    };
  }, [isLocked]);
}
