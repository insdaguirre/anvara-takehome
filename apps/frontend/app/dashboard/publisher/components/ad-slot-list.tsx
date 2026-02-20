'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Inbox } from 'lucide-react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { EmptyState } from '@/app/components/EmptyState';
import { ErrorState } from '@/app/components/ErrorState';
import { analytics } from '@/lib/analytics';
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
  const shouldReduceMotion = useReducedMotion();
  const handleScrollToCreateButton = () => {
    const createButton = document.querySelector<HTMLButtonElement>(
      '[aria-controls="create-ad-slot-form"]'
    );
    if (!createButton) return;
    createButton.scrollIntoView({ behavior: 'smooth', block: 'center' });
    createButton.focus();
  };

  useEffect(() => {
    if (!error) return;
    analytics.dashboardError('publisher', 'adSlots', error);
  }, [error]);

  // Server-provided error state
  if (error) {
    return (
      <ErrorState
        title="Unable to load ad slots"
        message={error}
        onRetry={() => {
          onToast({
            tone: 'error',
            title: 'Refresh requested',
            message: 'Trying to load your ad slots again.',
          });
          router.refresh();
        }}
        variant="error"
      />
    );
  }

  // No loading state — data resolved server-side
  if (adSlots.length === 0) {
    return (
      <EmptyState
        icon={Inbox}
        title="No ad slots yet"
        description="Create your first slot to start accepting sponsor bookings."
        action={{ label: 'Create Ad Slot', onClick: handleScrollToCreateButton }}
      />
    );
  }
  // Presentation only rendering
  return (
    <motion.div
      className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
      layout={!shouldReduceMotion}
      transition={shouldReduceMotion ? { duration: 0 } : { duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
    >
      <AnimatePresence initial={false}>
        {adSlots.map((slot) => (
          <motion.div
            key={slot.id}
            layout={!shouldReduceMotion}
            initial={shouldReduceMotion ? false : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: -6 }}
            transition={
              shouldReduceMotion
                ? { duration: 0 }
                : { duration: 0.2, ease: [0.22, 1, 0.36, 1] as const }
            }
          >
            <AdSlotCard adSlot={slot} onToast={onToast} />
          </motion.div>
        ))}
      </AnimatePresence>
    </motion.div>
  );
}
