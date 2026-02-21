'use client';

import { useEffect } from 'react';
import { ErrorState } from '@/app/components/ErrorState';
import { analytics } from '@/lib/analytics';

interface AppErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function AppError({ error, reset }: AppErrorProps) {
  useEffect(() => {
    analytics.globalError(error.message, error.digest);
  }, [error]);

  return (
    <div className="mx-auto w-full max-w-xl py-8">
      <ErrorState
        title="Something went wrong"
        message="We're sorry, but an unexpected error occurred. Please try refreshing the page."
        onRetry={reset}
        showBackButton
        backButtonHref="/"
        backButtonLabel="Return Home"
        technicalDetails={error.stack}
      />
    </div>
  );
}
