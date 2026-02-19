'use client';

import { useEffect, useRef } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { analytics } from '@/lib/analytics';

function buildPage(pathname: string, searchParams: { toString(): string }): string {
  const query = searchParams.toString();
  return query ? `${pathname}?${query}` : pathname;
}

function getMarketplaceListingId(pathname: string): string | null {
  const match = pathname.match(/^\/marketplace\/([^/]+)$/);
  return match ? match[1] : null;
}

export function AnalyticsListener() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const previousPageRef = useRef<string | null>(null);
  const previousPathnameRef = useRef<string | null>(null);

  useEffect(() => {
    const currentPage = buildPage(pathname, searchParams);
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

    analytics.navigation(previousPage, currentPage, 'spa_route_change');

    if (previousPathname === '/marketplace') {
      const listingId = getMarketplaceListingId(pathname);
      if (listingId) {
        analytics.marketplaceToDetailNavigation(listingId);
      }
    }

    previousPageRef.current = currentPage;
    previousPathnameRef.current = pathname;
  }, [pathname, searchParams]);

  return null;
}
