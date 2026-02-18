import type { AdSlot } from '@/lib/types';
import { AdSlotCard } from './ad-slot-card';

/**
 * Props come from page.tsx (server component).
 * Keeps data fetching out of the client layer.
 */
interface AdSlotListProps {
  adSlots: AdSlot[];
  error?: string | null;
}

export function AdSlotList({ adSlots, error }: AdSlotListProps) {
  // Server-provided error state
  if (error) {
    return <div className="rounded border border-red-200 bg-red-50 p-4 text-red-600">{error}</div>;
  }

  // No loading state — data resolved server-side
  if (adSlots.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-[var(--color-border)] p-8 text-center text-[var(--color-muted)]">
        No ad slots yet. Create your first ad slot to start earning.
      </div>
    );
  }
  // Presentation only rendering
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {adSlots.map((slot) => (
        <AdSlotCard key={slot.id} adSlot={slot} />
      ))}
    </div>
  );
}
