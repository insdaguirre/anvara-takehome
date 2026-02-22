'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronLeft, ChevronRight, Inbox } from 'lucide-react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { EmptyState } from '@/app/components/EmptyState';
import { ErrorState } from '@/app/components/ErrorState';
import { analytics } from '@/lib/analytics';
import { buildPageWindows } from '@/lib/pagination';
import type { Campaign } from '@/lib/types';
import type { DashboardToastInput } from '../../components/use-dashboard-toasts';
import {
  CAMPAIGN_PAGE_SIZE_OPTIONS,
  CAMPAIGN_SORT_OPTIONS,
  CAMPAIGN_STATUS_FILTERS,
  toCampaignQueryParams,
  type CampaignQueryState,
  type CampaignSortBy,
  type CampaignStatusFilter,
} from '../query-state';
import { CampaignCard } from './campaign-card';

interface CampaignListProps {
  campaigns: Campaign[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
  queryState: CampaignQueryState;
  error?: string | null;
  onToast(toast: DashboardToastInput): void;
}

function formatStatusLabel(status: CampaignStatusFilter): string {
  if (status === 'ALL') return 'All statuses';
  return status
    .split('_')
    .map((segment) => segment.charAt(0) + segment.slice(1).toLowerCase())
    .join(' ');
}

function formatSortLabel(sortBy: CampaignSortBy): string {
  if (sortBy === 'newest') return 'Newest';
  if (sortBy === 'oldest') return 'Oldest';
  if (sortBy === 'budget-high') return 'Budget: High to Low';
  if (sortBy === 'budget-low') return 'Budget: Low to High';
  if (sortBy === 'name') return 'Name';
  return 'Status';
}

export function CampaignList({ campaigns, pagination, queryState, error, onToast }: CampaignListProps) {
  const router = useRouter();
  const shouldReduceMotion = useReducedMotion();
  const currentPage = pagination.page;
  const totalPages = pagination.totalPages;
  const hasVisibleResults = campaigns.length > 0;
  const from = hasVisibleResults ? (currentPage - 1) * pagination.limit + 1 : 0;
  const to = hasVisibleResults ? Math.min(currentPage * pagination.limit, pagination.total) : 0;
  const pages = buildPageWindows(currentPage, totalPages);

  const btnBase =
    'inline-flex h-8 min-w-[2rem] items-center justify-center rounded-md px-2 text-sm transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]';
  const btnActive = `${btnBase} bg-[var(--color-primary)] text-white font-semibold`;
  const btnInactive = `${btnBase} border border-[var(--color-border)] bg-[var(--color-background)] text-[var(--color-foreground)] hover:bg-[var(--color-border)] disabled:cursor-not-allowed disabled:opacity-60`;

  const handleScrollToCreateButton = () => {
    const createButton = document.querySelector<HTMLButtonElement>(
      '[aria-controls="create-campaign-form"]'
    );
    if (!createButton) return;
    createButton.scrollIntoView({ behavior: 'smooth', block: 'center' });
    createButton.focus();
  };

  function navigate(next: Partial<CampaignQueryState>) {
    const shouldResetPage =
      next.sortBy !== undefined || next.status !== undefined || next.limit !== undefined;
    const nextState: CampaignQueryState = {
      ...queryState,
      ...(shouldResetPage ? { page: 1 } : {}),
      ...next,
    };

    const params = toCampaignQueryParams(nextState).toString();
    router.push(`/dashboard/sponsor${params ? `?${params}` : ''}`);
  }

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

  if (pagination.total === 0) {
    if (queryState.status !== 'ALL') {
      return (
        <EmptyState
          icon={Inbox}
          title="No matching campaigns"
          description={`No campaigns found with status ${formatStatusLabel(queryState.status)}.`}
          action={{ label: 'Clear filters', onClick: () => navigate({ status: 'ALL' }) }}
        />
      );
    }

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
      <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-background)] px-4 py-3 shadow-sm">
        <div className="flex flex-wrap items-center gap-3 lg:justify-between">
          <div className="flex flex-wrap items-center gap-3">
            <label htmlFor="campaign-status" className="text-sm font-medium text-[var(--color-muted)]">
              Status
            </label>
            <select
              id="campaign-status"
              value={queryState.status}
              onChange={(event) => navigate({ status: event.target.value as CampaignStatusFilter })}
              className="rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2 text-sm text-[var(--color-foreground)]"
            >
              {CAMPAIGN_STATUS_FILTERS.map((status) => (
                <option key={status} value={status}>
                  {formatStatusLabel(status)}
                </option>
              ))}
            </select>

            <label htmlFor="campaign-sort" className="text-sm font-medium text-[var(--color-muted)]">
              Sort
            </label>
            <select
              id="campaign-sort"
              value={queryState.sortBy}
              onChange={(event) => navigate({ sortBy: event.target.value as CampaignSortBy })}
              className="rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2 text-sm text-[var(--color-foreground)]"
            >
              {CAMPAIGN_SORT_OPTIONS.map((sortBy) => (
                <option key={sortBy} value={sortBy}>
                  {formatSortLabel(sortBy)}
                </option>
              ))}
            </select>
          </div>

          <div className="ml-auto flex items-center gap-2 text-sm">
            <span className="font-medium text-[var(--color-muted)]">VIEW:</span>
            <div className="inline-flex items-center gap-1">
              {CAMPAIGN_PAGE_SIZE_OPTIONS.map((option) => {
                const isActive = option === queryState.limit;
                return (
                  <button
                    key={option}
                    type="button"
                    onClick={() => navigate({ limit: option })}
                    disabled={isActive}
                    aria-pressed={isActive}
                    className={`rounded-md px-2 py-1 text-sm transition-colors ${
                      isActive
                        ? 'bg-[var(--color-primary)] text-white'
                        : 'text-[var(--color-foreground)] hover:bg-[var(--color-border)]'
                    } disabled:cursor-not-allowed disabled:opacity-60`}
                  >
                    {option}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      <p className="text-sm text-[var(--color-showing-text)]">
        Showing {from}-{to} of {pagination.total} campaigns
      </p>

      <motion.div
        className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
        layout={!shouldReduceMotion}
        transition={
          shouldReduceMotion ? { duration: 0 } : { duration: 0.2, ease: [0.22, 1, 0.36, 1] }
        }
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

      <div className="relative flex items-center justify-center">
        <nav aria-label="Campaign pagination" className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => navigate({ page: Math.max(1, currentPage - 1) })}
            disabled={currentPage <= 1}
            aria-label="Previous page"
            className={btnInactive}
          >
            <ChevronLeft className="h-4 w-4" />
          </button>

          {pages.map((pageNumber, index) =>
            pageNumber === 'ellipsis' ? (
              <span
                key={`ellipsis-${index}`}
                className="inline-flex h-8 w-8 items-center justify-center text-sm text-[var(--color-muted)]"
              >
                …
              </span>
            ) : (
              <button
                key={pageNumber}
                type="button"
                onClick={() => navigate({ page: pageNumber })}
                aria-label={`Page ${pageNumber}`}
                aria-current={pageNumber === currentPage ? 'page' : undefined}
                className={pageNumber === currentPage ? btnActive : btnInactive}
              >
                {pageNumber}
              </button>
            )
          )}

          <button
            type="button"
            onClick={() => navigate({ page: Math.min(Math.max(1, totalPages), currentPage + 1) })}
            disabled={currentPage >= totalPages}
            aria-label="Next page"
            className={btnInactive}
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </nav>

        <div className="absolute right-0 hidden items-center gap-2 text-sm sm:flex">
          <span className="font-medium text-[var(--color-muted)]">VIEW:</span>
          <div className="inline-flex items-center gap-1">
            {CAMPAIGN_PAGE_SIZE_OPTIONS.map((option) => {
              const isActive = option === queryState.limit;
              return (
                <button
                  key={option}
                  type="button"
                  onClick={() => navigate({ limit: option })}
                  disabled={isActive}
                  aria-pressed={isActive}
                  aria-label={`Show ${option} per page`}
                  className={`rounded-md px-2 py-1 text-sm transition-colors ${
                    isActive
                      ? 'bg-[var(--color-primary)] text-white'
                      : 'text-[var(--color-foreground)] hover:bg-[var(--color-border)]'
                  } disabled:cursor-not-allowed disabled:opacity-60`}
                >
                  {option}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
