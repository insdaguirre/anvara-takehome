'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronLeft, ChevronRight, Inbox } from 'lucide-react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { EmptyState } from '@/app/components/EmptyState';
import { ErrorState } from '@/app/components/ErrorState';
import { analytics } from '@/lib/analytics';
import { buildPageWindows } from '@/lib/pagination';
import type { AdSlot } from '@/lib/types';
import type { DashboardToastInput } from '../../components/use-dashboard-toasts';
import {
  AD_SLOT_AVAILABILITY_FILTERS,
  AD_SLOT_PAGE_SIZE_OPTIONS,
  AD_SLOT_SORT_OPTIONS,
  AD_SLOT_TYPE_FILTERS,
  toAdSlotQueryParams,
  type AdSlotAvailabilityFilter,
  type AdSlotQueryState,
  type AdSlotSortBy,
  type AdSlotTypeFilter,
} from '../query-state';
import { AdSlotCard } from './ad-slot-card';

interface AdSlotListProps {
  adSlots: AdSlot[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
  queryState: AdSlotQueryState;
  totalSlots: number;
  error?: string | null;
  onToast(toast: DashboardToastInput): void;
}

function formatTypeLabel(type: AdSlotTypeFilter): string {
  if (type === 'ALL') return 'All types';
  return type.charAt(0) + type.slice(1).toLowerCase();
}

function formatAvailabilityLabel(filter: AdSlotAvailabilityFilter): string {
  if (filter === 'ALL') return 'All availability';
  if (filter === 'available') return 'Available';
  return 'Booked';
}

function formatSortLabel(sortBy: AdSlotSortBy): string {
  if (sortBy === 'newest') return 'Newest';
  if (sortBy === 'oldest') return 'Oldest';
  if (sortBy === 'price-high') return 'Price: High to Low';
  if (sortBy === 'price-low') return 'Price: Low to High';
  if (sortBy === 'name') return 'Name';
  return 'Availability';
}

export function AdSlotList({
  adSlots,
  pagination,
  queryState,
  totalSlots,
  error,
  onToast,
}: AdSlotListProps) {
  const router = useRouter();
  const shouldReduceMotion = useReducedMotion();
  const currentPage = pagination.page;
  const totalPages = pagination.totalPages;
  const hasVisibleResults = adSlots.length > 0;
  const from = hasVisibleResults ? (currentPage - 1) * pagination.limit + 1 : 0;
  const to = hasVisibleResults ? Math.min(currentPage * pagination.limit, pagination.total) : 0;
  const pages = buildPageWindows(currentPage, totalPages);

  const btnBase =
    'inline-flex h-8 min-w-[2rem] items-center justify-center rounded-md px-2 text-sm transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]';
  const btnActive = `${btnBase} bg-[var(--color-primary)] text-white font-semibold`;
  const btnInactive = `${btnBase} border border-[var(--color-border)] bg-[var(--color-background)] text-[var(--color-foreground)] hover:bg-[var(--color-border)] disabled:cursor-not-allowed disabled:opacity-60`;

  const handleScrollToCreateButton = () => {
    const createButton = document.querySelector<HTMLButtonElement>(
      '[aria-controls="create-ad-slot-form"]'
    );
    if (!createButton) return;
    createButton.scrollIntoView({ behavior: 'smooth', block: 'center' });
    createButton.focus();
  };

  function navigate(next: Partial<AdSlotQueryState>) {
    const shouldResetPage =
      next.type !== undefined ||
      next.availability !== undefined ||
      next.sortBy !== undefined ||
      next.limit !== undefined;

    const nextState: AdSlotQueryState = {
      ...queryState,
      ...(shouldResetPage ? { page: 1 } : {}),
      ...next,
    };

    const params = toAdSlotQueryParams(nextState).toString();
    router.push(`/dashboard/publisher${params ? `?${params}` : ''}`);
  }

  useEffect(() => {
    if (!error) return;
    analytics.dashboardError('publisher', 'adSlots', error);
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

  if (pagination.total === 0) {
    if (totalSlots > 0 && (queryState.type !== 'ALL' || queryState.availability !== 'ALL')) {
      return (
        <EmptyState
          icon={Inbox}
          title="No slots match your filters"
          description="Try broadening your filters to see more inventory."
          action={{
            label: 'Clear filters',
            onClick: () => navigate({ type: 'ALL', availability: 'ALL' }),
          }}
        />
      );
    }

    return (
      <EmptyState
        icon={Inbox}
        title="No ad slots yet"
        description="Create your first slot to start accepting sponsor bookings."
        action={{ label: 'Create Ad Slot', onClick: handleScrollToCreateButton }}
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-background)] px-4 py-3 shadow-sm">
        <div className="flex flex-wrap items-center gap-3 lg:justify-between">
          <div className="flex flex-wrap items-center gap-3">
            <label htmlFor="ad-slot-type" className="text-sm font-medium text-[var(--color-muted)]">
              Type
            </label>
            <select
              id="ad-slot-type"
              value={queryState.type}
              onChange={(event) => navigate({ type: event.target.value as AdSlotTypeFilter })}
              className="rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2 text-sm text-[var(--color-foreground)]"
            >
              {AD_SLOT_TYPE_FILTERS.map((type) => (
                <option key={type} value={type}>
                  {formatTypeLabel(type)}
                </option>
              ))}
            </select>

            <label
              htmlFor="ad-slot-availability"
              className="text-sm font-medium text-[var(--color-muted)]"
            >
              Availability
            </label>
            <select
              id="ad-slot-availability"
              value={queryState.availability}
              onChange={(event) =>
                navigate({ availability: event.target.value as AdSlotAvailabilityFilter })
              }
              className="rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2 text-sm text-[var(--color-foreground)]"
            >
              {AD_SLOT_AVAILABILITY_FILTERS.map((availability) => (
                <option key={availability} value={availability}>
                  {formatAvailabilityLabel(availability)}
                </option>
              ))}
            </select>

            <label htmlFor="ad-slot-sort" className="text-sm font-medium text-[var(--color-muted)]">
              Sort
            </label>
            <select
              id="ad-slot-sort"
              value={queryState.sortBy}
              onChange={(event) => navigate({ sortBy: event.target.value as AdSlotSortBy })}
              className="rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2 text-sm text-[var(--color-foreground)]"
            >
              {AD_SLOT_SORT_OPTIONS.map((sortBy) => (
                <option key={sortBy} value={sortBy}>
                  {formatSortLabel(sortBy)}
                </option>
              ))}
            </select>
          </div>

          <div className="ml-auto flex items-center gap-2 text-sm">
            <span className="font-medium text-[var(--color-muted)]">VIEW:</span>
            <div className="inline-flex items-center gap-1">
              {AD_SLOT_PAGE_SIZE_OPTIONS.map((option) => {
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
        Showing {from}-{to} of {pagination.total} ad slots
      </p>

      <motion.div
        className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
        layout={!shouldReduceMotion}
        transition={
          shouldReduceMotion ? { duration: 0 } : { duration: 0.2, ease: [0.22, 1, 0.36, 1] }
        }
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

      <div className="relative flex items-center justify-center">
        <nav aria-label="Ad slot pagination" className="flex items-center gap-1">
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
            {AD_SLOT_PAGE_SIZE_OPTIONS.map((option) => {
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
