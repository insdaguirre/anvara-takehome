'use client';

import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { analytics } from '@/lib/analytics';

function buildPage(pathname: string): string {
  if (typeof window === 'undefined') return pathname;
  const query = window.location.search.replace(/^\?/, '');
  return query ? `${pathname}?${query}` : pathname;
}

function getMarketplaceListingId(pathname: string): string | null {
  const match = pathname.match(/^\/marketplace\/([^/]+)$/);
  return match ? match[1] : null;
}

export function AnalyticsListener() {
  const pathname = usePathname();
  const previousPageRef = useRef<string | null>(null);
  const previousPathnameRef = useRef<string | null>(null);
  const pendingPopstateRef = useRef(false);
  const lastNavigationKeyRef = useRef<string | null>(null);
  const lastTransitionRef = useRef<{ from: string; to: string } | null>(null);

  useEffect(() => {
    const handlePopstate = () => {
      pendingPopstateRef.current = true;
    };

    window.addEventListener('popstate', handlePopstate);
    return () => window.removeEventListener('popstate', handlePopstate);
  }, []);

  useEffect(() => {
    const currentPage = buildPage(pathname);
    const previousPage = previousPageRef.current;
    const previousPathname = previousPathnameRef.current;

    if (!previousPage || !previousPathname) {
      previousPageRef.current = currentPage;
      previousPathnameRef.current = pathname;
      return;
    }

    if (previousPage === currentPage) {
      return;
    }

    const lastTransition = lastTransitionRef.current;
    const isReverseTransition = Boolean(
      lastTransition &&
        lastTransition.from === currentPage &&
        lastTransition.to === previousPage
    );
    const navigationType =
      pendingPopstateRef.current || isReverseTransition ? 'back_forward' : 'spa_route_change';
    pendingPopstateRef.current = false;
    const navigationKey = `${previousPage}->${currentPage}:${navigationType}`;
    if (lastNavigationKeyRef.current === navigationKey) {
      previousPageRef.current = currentPage;
      previousPathnameRef.current = pathname;
      return;
    }
    lastNavigationKeyRef.current = navigationKey;

    analytics.navigation(previousPage, currentPage, navigationType);

    if (previousPathname === '/marketplace') {
      const listingId = getMarketplaceListingId(pathname);
      if (listingId) {
        analytics.marketplaceToDetailNavigation(listingId);
      }
    }

    lastTransitionRef.current = { from: previousPage, to: currentPage };
    previousPageRef.current = currentPage;
    previousPathnameRef.current = pathname;
  }, [pathname]);

  return null;
}
