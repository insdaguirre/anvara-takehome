'use client';

import { useEffect, useMemo, useState } from 'react';
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

type SortBy = 'newest' | 'oldest' | 'budget-high' | 'budget-low' | 'name' | 'status';

const PAGE_SIZE_OPTIONS = [6, 12, 24] as const;

function getCreatedAtValue(campaign: Campaign): number {
  const createdAt = (campaign as Campaign & { createdAt?: string }).createdAt ?? campaign.startDate;
  const time = new Date(createdAt).getTime();
  return Number.isNaN(time) ? 0 : time;
}

export function CampaignList({ campaigns, error, onToast }: CampaignListProps) {
  const router = useRouter();
  const shouldReduceMotion = useReducedMotion();
  const [sortBy, setSortBy] = useState<SortBy>('newest');
  const [page, setPage] = useState(1);
  const [pageContext, setPageContext] = useState(() => `newest:${campaigns.length}`);
  const [pageSize, setPageSize] = useState<(typeof PAGE_SIZE_OPTIONS)[number]>(12);
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

  useEffect(() => {
    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        router.refresh();
      }
    };

    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, [router]);

  // TODO: Add optimistic updates when creating/editing campaigns

  const sortedCampaigns = useMemo(() => {
    const sorted = [...campaigns];
    sorted.sort((a, b) => {
      switch (sortBy) {
        case 'oldest':
          return getCreatedAtValue(a) - getCreatedAtValue(b);
        case 'budget-high':
          return Number(b.budget) - Number(a.budget);
        case 'budget-low':
          return Number(a.budget) - Number(b.budget);
        case 'name':
          return a.name.localeCompare(b.name, undefined, { sensitivity: 'base' });
        case 'status':
          return a.status.localeCompare(b.status);
        case 'newest':
        default:
          return getCreatedAtValue(b) - getCreatedAtValue(a);
      }
    });
    return sorted;
  }, [campaigns, sortBy]);

  const currentPageContext = `${sortBy}:${campaigns.length}`;
  const isPageContextStale = pageContext !== currentPageContext;
  const totalPages = Math.max(1, Math.ceil(sortedCampaigns.length / pageSize));
  const currentPage = Math.min(isPageContextStale ? 1 : page, totalPages);
  const visibleCampaigns = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return sortedCampaigns.slice(start, start + pageSize);
  }, [currentPage, pageSize, sortedCampaigns]);

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

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <label htmlFor="campaign-sort" className="text-sm font-medium text-[var(--color-muted)]">
          Sort by
        </label>
        <select
          id="campaign-sort"
          value={sortBy}
          onChange={(event) => {
            const nextSortBy = event.target.value as SortBy;
            setSortBy(nextSortBy);
            setPage(1);
            setPageContext(`${nextSortBy}:${campaigns.length}`);
          }}
          className="rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2 text-sm text-[var(--color-foreground)]"
        >
          <option value="newest">Newest</option>
          <option value="oldest">Oldest</option>
          <option value="budget-high">Budget: High to Low</option>
          <option value="budget-low">Budget: Low to High</option>
          <option value="name">Name</option>
          <option value="status">Status</option>
        </select>
      </div>

      <motion.div
        className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
        layout={!shouldReduceMotion}
        transition={
          shouldReduceMotion ? { duration: 0 } : { duration: 0.2, ease: [0.22, 1, 0.36, 1] }
        }
      >
        <AnimatePresence initial={false}>
          {visibleCampaigns.map((campaign) => (
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

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <label htmlFor="campaign-page-size" className="text-sm font-medium text-[var(--color-muted)]">
            Campaigns per page
          </label>
          <select
            id="campaign-page-size"
            value={pageSize}
            onChange={(event) => {
              setPageSize(Number(event.target.value) as (typeof PAGE_SIZE_OPTIONS)[number]);
              setPageContext(currentPageContext);
            }}
            className="rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2 text-sm text-[var(--color-foreground)]"
          >
            {PAGE_SIZE_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              setPage(Math.max(1, currentPage - 1));
              setPageContext(currentPageContext);
            }}
            disabled={currentPage <= 1}
            className="rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-60"
          >
            Prev
          </button>
          <span aria-live="polite" className="text-sm text-[var(--color-muted)]">
            Page {currentPage} of {totalPages}
          </span>
          <button
            type="button"
            onClick={() => {
              setPage(Math.min(totalPages, currentPage + 1));
              setPageContext(currentPageContext);
            }}
            disabled={currentPage >= totalPages}
            className="rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-60"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}
