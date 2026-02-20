'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Inbox } from 'lucide-react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { EmptyState } from '@/app/components/EmptyState';
import { ErrorState } from '@/app/components/ErrorState';
import { analytics } from '@/lib/analytics';
import type { Campaign } from '@/lib/types';
import type { DashboardToastInput } from '../../components/use-dashboard-toasts';
import { CampaignCard } from './campaign-card';

// UI-only component. Expects fully resolved data from parent.
interface CampaignListProps {
  campaigns: Campaign[];
  error?: string | null;
  onToast(toast: DashboardToastInput): void;
}

export function CampaignList({ campaigns, error, onToast }: CampaignListProps) {
  const router = useRouter();
  const shouldReduceMotion = useReducedMotion();
  const handleScrollToCreateButton = () => {
    const createButton = document.querySelector<HTMLButtonElement>(
      '[aria-controls="create-campaign-form"]'
    );
    if (!createButton) return;
    createButton.scrollIntoView({ behavior: 'smooth', block: 'center' });
    createButton.focus();
  };

  useEffect(() => {
    if (!error) return;
    analytics.dashboardError('sponsor', 'campaigns', error);
  }, [error]);

  // TODO: Add refetch on tab focus for better UX
  // TODO: Add optimistic updates when creating/editing campaigns

  if (error) {
    return (
      <ErrorState
        title="Unable to load campaigns"
        message={error}
        onRetry={() => {
          onToast({
            tone: 'error',
            title: 'Refresh requested',
            message: 'Trying to load your campaigns again.',
          });
          router.refresh();
        }}
        variant="error"
      />
    );
  }

  if (campaigns.length === 0) {
    return (
      <EmptyState
        icon={Inbox}
        title="No campaigns yet"
        description="Create your first campaign to start reaching publisher audiences."
        action={{ label: 'Create Campaign', onClick: handleScrollToCreateButton }}
      />
    );
  }

  // TODO: Add sorting options (by date, budget, status)
  // TODO: Add pagination if campaigns list gets large
  return (
    <motion.div
      className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
      layout={!shouldReduceMotion}
      transition={shouldReduceMotion ? { duration: 0 } : { duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
    >
      <AnimatePresence initial={false}>
        {campaigns.map((campaign) => (
          <motion.div
            key={campaign.id}
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
            <CampaignCard campaign={campaign} onToast={onToast} />
          </motion.div>
        ))}
      </AnimatePresence>
    </motion.div>
  );
}
