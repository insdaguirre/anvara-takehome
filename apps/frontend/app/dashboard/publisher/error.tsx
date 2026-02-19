'use client';

interface PublisherDashboardErrorProps {
  error: Error;
  reset: () => void;
}

export default function PublisherDashboardError({ error: _error, reset }: PublisherDashboardErrorProps) {
  return (
    <div className="rounded-xl border border-red-200 bg-red-50 p-5 text-red-800">
      <p className="text-base font-semibold">Failed to load publisher dashboard.</p>
      <p className="mt-1 text-sm">The service is temporarily unavailable. Please try again.</p>
      <button
        type="button"
        onClick={reset}
        className="mt-4 rounded-lg bg-red-600 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-red-500"
      >
        Retry
      </button>
    </div>
  );
}
