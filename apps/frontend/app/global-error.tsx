'use client';

import { useEffect } from 'react';
import { ErrorState } from '@/app/components/ErrorState';
import { analytics } from '@/lib/analytics';

interface GlobalErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function GlobalError({ error, reset }: GlobalErrorProps) {
  useEffect(() => {
    analytics.globalError(error.message, error.digest);
  }, [error]);

  return (
    <html lang="en">
      <body>
        <div className="flex min-h-screen items-center justify-center p-4">
          <div className="w-full max-w-xl">
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
        </div>
      </body>
    </html>
  );
}
