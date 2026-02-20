'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { ErrorState } from '@/app/components/ErrorState';
import { GrainientPageShell } from '@/app/components/grainient-page-shell';
import { analytics } from '@/lib/analytics';

interface MarketplaceDetailErrorProps {
  error: Error;
  reset: () => void;
}

function extractListingId(pathname: string): string {
  const match = pathname.match(/^\/marketplace\/([^/]+)$/);
  return match?.[1] ?? 'unknown';
}

export default function MarketplaceDetailError({ error, reset }: MarketplaceDetailErrorProps) {
  const pathname = usePathname();

  useEffect(() => {
    analytics.listingError(extractListingId(pathname), error.message);
  }, [error, pathname]);

  return (
    <GrainientPageShell>
      <ErrorState
        title="Slot details unavailable"
        message="This listing couldn't be loaded right now. Please try again."
        onRetry={reset}
        showBackButton
        backButtonHref="/marketplace"
        backButtonLabel="Back to Marketplace"
        technicalDetails={error.stack}
        variant="error"
      />
    </GrainientPageShell>
  );
}
