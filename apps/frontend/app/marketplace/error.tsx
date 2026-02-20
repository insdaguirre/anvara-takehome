'use client';

import { useEffect } from 'react';
import { ErrorState } from '@/app/components/ErrorState';
import { GrainientPageShell } from '@/app/components/grainient-page-shell';
import { analytics } from '@/lib/analytics';

interface MarketplaceErrorProps {
  error: Error;
  reset: () => void;
}

export default function MarketplaceError({ error, reset }: MarketplaceErrorProps) {
  useEffect(() => {
    analytics.marketplaceError(error.message);
  }, [error]);

  return (
    <GrainientPageShell>
      <ErrorState
        title="Unable to load marketplace listings"
        message="We couldn't load listings right now. Please try again in a moment."
        onRetry={reset}
        showBackButton
        backButtonLabel="Return Home"
        backButtonHref="/"
        technicalDetails={error.stack}
        variant="network"
      />
    </GrainientPageShell>
  );
}
