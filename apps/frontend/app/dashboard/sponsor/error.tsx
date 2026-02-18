'use client';

import { useEffect } from 'react';

interface SponsorDashboardErrorProps {
  error: Error;
  reset: () => void;
}

export default function SponsorDashboardError({ error, reset }: SponsorDashboardErrorProps) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="rounded border border-red-200 bg-red-50 p-4 text-red-700">
      <p className="mb-1 font-semibold">Failed to load sponsor dashboard.</p>
      <p className="mb-3 text-sm">The backend service may be unavailable. Please try again.</p>
      <button
        type="button"
        onClick={reset}
        className="rounded bg-red-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-700"
      >
        Try again
      </button>
    </div>
  );
}
