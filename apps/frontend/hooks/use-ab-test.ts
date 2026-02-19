'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { analytics } from '@/lib/analytics';
import { AB_TESTS, type ABTestKey, type ABTestVariant } from '@/lib/ab-tests';
import { getCookie, setCookie } from '@/lib/ab-cookie';

type ABOutcomeExtra = Record<string, string | number | boolean | null>;

function getCookieName(testKey: ABTestKey): string {
  return `ab_${testKey}`;
}

function getDebugStorageKey(testKey: ABTestKey): string {
  return `ab_debug_${testKey}`;
}

function isAllowedVariant<K extends ABTestKey>(
  testKey: K,
  value: string | null
): value is ABTestVariant<K> {
  if (!value) return false;
  return AB_TESTS[testKey].variants.some((variant) => variant.name === value);
}

function pickWeightedVariant<K extends ABTestKey>(testKey: K): ABTestVariant<K> {
  const variants = AB_TESTS[testKey].variants;
  const lastVariant = variants[variants.length - 1].name;

  const totalWeight = variants.reduce((sum, variant) => {
    if (!Number.isFinite(variant.weight) || variant.weight <= 0) return sum;
    return sum + variant.weight;
  }, 0);

  if (totalWeight <= 0) return lastVariant;

  const randomValue = Math.random() * totalWeight;
  let cumulativeWeight = 0;

  for (const variant of variants) {
    if (Number.isFinite(variant.weight) && variant.weight > 0) {
      cumulativeWeight += variant.weight;
    }
    if (randomValue < cumulativeWeight) {
      return variant.name;
    }
  }

  return lastVariant;
}

function getDebugVariant<K extends ABTestKey>(testKey: K): ABTestVariant<K> | null {
  if (process.env.NODE_ENV !== 'development' || typeof window === 'undefined') {
    return null;
  }

  const queryParamName = getCookieName(testKey);
  const storageKey = getDebugStorageKey(testKey);
  const params = new URLSearchParams(window.location.search);
  const queryVariant = params.get(queryParamName);

  if (isAllowedVariant(testKey, queryVariant)) {
    try {
      window.localStorage.setItem(storageKey, queryVariant);
    } catch {}
    return queryVariant;
  }

  let storedVariant: string | null = null;
  try {
    storedVariant = window.localStorage.getItem(storageKey);
  } catch {}

  if (isAllowedVariant(testKey, storedVariant)) {
    return storedVariant;
  }

  if (storedVariant) {
    try {
      window.localStorage.removeItem(storageKey);
    } catch {}
  }

  return null;
}

function getInitialVariant<K extends ABTestKey>(testKey: K): ABTestVariant<K> {
  const fallbackVariant = AB_TESTS[testKey].variants[0].name;

  if (typeof document === 'undefined') {
    return fallbackVariant;
  }

  const debugVariant = getDebugVariant(testKey);
  if (debugVariant) return debugVariant;

  const cookieVariant = getCookie(getCookieName(testKey));
  if (isAllowedVariant(testKey, cookieVariant)) return cookieVariant;

  return pickWeightedVariant(testKey);
}

interface UseABTestResult<K extends ABTestKey> {
  variant: ABTestVariant<K>;
  trackOutcome: (outcome: string, extra?: ABOutcomeExtra) => void;
}

export function useABTest<K extends ABTestKey>(testKey: K): UseABTestResult<K> {
  const [variant, setVariant] = useState<ABTestVariant<K>>(() => getInitialVariant(testKey));
  const hasTrackedExposureRef = useRef(false);
  const hasReconciledRef = useRef(false);

  useEffect(() => {
    hasTrackedExposureRef.current = false;
    hasReconciledRef.current = false;
  }, [testKey]);

  useEffect(() => {
    if (typeof document === 'undefined') return;

    const debugVariant = getDebugVariant(testKey);
    if (debugVariant) {
      setVariant((currentVariant) => (currentVariant === debugVariant ? currentVariant : debugVariant));
      hasReconciledRef.current = true;
      return;
    }

    const cookieName = getCookieName(testKey);
    const cookieVariant = getCookie(cookieName);
    if (isAllowedVariant(testKey, cookieVariant)) {
      setVariant((currentVariant) => (currentVariant === cookieVariant ? currentVariant : cookieVariant));
      hasReconciledRef.current = true;
      return;
    }

    const assignedVariant = isAllowedVariant(testKey, variant) ? variant : pickWeightedVariant(testKey);
    setCookie(cookieName, assignedVariant, {
      maxAgeSeconds: AB_TESTS[testKey].cookieMaxAgeSeconds,
      path: '/',
      sameSite: 'Lax',
    });
    analytics.abAssigned(testKey, assignedVariant);
    hasReconciledRef.current = true;
    setVariant((currentVariant) => (currentVariant === assignedVariant ? currentVariant : assignedVariant));
  }, [testKey, variant]);

  useEffect(() => {
    if (!hasReconciledRef.current || hasTrackedExposureRef.current) return;
    hasTrackedExposureRef.current = true;
    analytics.abExposed(testKey, variant);
  }, [testKey, variant]);

  const trackOutcome = useCallback(
    (outcome: string, extra: ABOutcomeExtra = {}) => {
      analytics.abOutcome(testKey, variant, outcome, extra);
    },
    [testKey, variant]
  );

  return { variant, trackOutcome };
}
