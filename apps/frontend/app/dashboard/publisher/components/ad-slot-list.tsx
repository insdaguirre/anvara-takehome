'use client';

import { useRouter } from 'next/navigation';
import { AlertCircle, Inbox } from 'lucide-react';
import type { AdSlot } from '@/lib/types';
import type { DashboardToastInput } from '../../components/use-dashboard-toasts';
import { AdSlotCard } from './ad-slot-card';

/**
 * Props come from page.tsx (server component).
 * Keeps data fetching out of the client layer.
 */
interface AdSlotListProps {
  adSlots: AdSlot[];
  error?: string | null;
  onToast(toast: DashboardToastInput): void;
}

export function AdSlotList({ adSlots, error, onToast }: AdSlotListProps) {
  const router = useRouter();

  // Server-provided error state
  if (error) {
    return (
      <div
        className="rounded-xl border border-red-200 bg-red-50 p-5 text-red-700"
        role="alert"
        aria-live="assertive"
      >
        <div className="flex items-start gap-3">
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
          <div>
            <p className="font-semibold">Unable to load ad slots</p>
            <p className="mt-1 text-sm">{error}</p>
            <button
              type="button"
              onClick={() => {
                onToast({
                  tone: 'error',
                  title: 'Refresh requested',
                  message: 'Trying to load your ad slots again.',
                });
                router.refresh();
              }}
              className="mt-3 rounded-lg border border-red-300 px-3 py-1.5 text-sm font-medium transition-colors hover:bg-red-100"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  // No loading state — data resolved server-side
  if (adSlots.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-[var(--color-border)] bg-[var(--color-background)] p-10 text-center">
        <Inbox className="mx-auto h-9 w-9 text-[var(--color-muted)]" aria-hidden="true" />
        <p className="mt-3 text-lg font-medium text-[var(--color-foreground)]">No ad slots yet</p>
        <p className="mt-1 text-sm text-[var(--color-muted)]">
          Create your first slot to start accepting sponsor bookings.
        </p>
      </div>
    );
  }
  // Presentation only rendering
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {adSlots.map((slot) => (
        <AdSlotCard key={slot.id} adSlot={slot} onToast={onToast} />
      ))}
    </div>
  );
}
