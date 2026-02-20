'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ErrorState } from '@/app/components/ErrorState';
import { analytics } from '@/lib/analytics';

export default function NotFound() {
  const pathname = usePathname();

  useEffect(() => {
    if (!pathname) return;
    analytics.notFound(pathname);
  }, [pathname]);

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-xl space-y-3">
        <ErrorState
          title="Page not found"
          message="The page you're looking for doesn't exist or has been moved."
          showBackButton
          backButtonHref="/"
          backButtonLabel="Return Home"
          variant="warning"
        />
        <div className="text-center">
          <Link
            href="/marketplace"
            className="inline-flex text-sm font-medium text-[var(--color-primary)] underline-offset-4 hover:underline"
          >
            Browse Marketplace
          </Link>
        </div>
      </div>
    </div>
  );
}

