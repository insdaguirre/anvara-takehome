'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { ChevronLeft, ChevronRight, Filter, Store } from 'lucide-react';
import { motion, useReducedMotion } from 'motion/react';
import { EmptyState } from '@/app/components/EmptyState';
import { ErrorState } from '@/app/components/ErrorState';
import { SkeletonCard } from '@/app/components/SkeletonCard';
import {
  getMarketplaceAdSlots,
  isApiError,
  type MarketplacePagination,
} from '@/lib/api';
import { analytics } from '@/lib/analytics';
import { formatCompactNumber, formatPrice } from '@/lib/format';
import {
  MarketplaceFilters,
  defaultFilters,
  type FilterState,
} from './marketplace-filters';

const PAGE_SIZE_OPTIONS = [12, 24, 48] as const;
type PageSize = (typeof PAGE_SIZE_OPTIONS)[number];

const typeColors: Record<string, string> = {
  DISPLAY: 'bg-blue-100 text-blue-700',
  VIDEO: 'bg-red-100 text-red-700',
  NATIVE: 'bg-emerald-100 text-emerald-700',
  NEWSLETTER: 'bg-purple-100 text-purple-700',
  PODCAST: 'bg-orange-100 text-orange-700',
};

const categoryColors: Record<string, string> = {
  Technology: 'bg-indigo-500',
  Podcast: 'bg-orange-500',
  Newsletter: 'bg-purple-500',
  Video: 'bg-red-500',
  Business: 'bg-emerald-500',
};

const gridEntranceVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.06, delayChildren: 0.04 },
  },
};

const gridItemVariants = {
  hidden: { opacity: 0, y: 8 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.2, ease: [0.22, 1, 0.36, 1] as const },
  },
};

interface MarketplaceAdSlot {
  id: string;
  name: string;
  description?: string | null;
  type: 'DISPLAY' | 'VIDEO' | 'NATIVE' | 'NEWSLETTER' | 'PODCAST';
  position?: string | null;
  width?: number | null;
  height?: number | null;
  basePrice: number;
  isAvailable: boolean;
  publisher?: {
    id: string;
    name: string;
    website?: string | null;
    category?: string | null;
    monthlyViews?: number | null;
    subscriberCount?: number | null;
    isVerified?: boolean | null;
  } | null;
  _count?: { placements?: number };
}

// --- Pagination controls ---

interface PaginationProps {
  pagination: MarketplacePagination;
  pageSize: PageSize;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: PageSize) => void;
  disabled: boolean;
}

function buildPageWindows(current: number, total: number): (number | 'ellipsis')[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);

  const pages: (number | 'ellipsis')[] = [1];

  const left = Math.max(2, current - 1);
  const right = Math.min(total - 1, current + 1);

  if (left > 2) pages.push('ellipsis');
  for (let p = left; p <= right; p++) pages.push(p);
  if (right < total - 1) pages.push('ellipsis');

  pages.push(total);
  return pages;
}

function PaginationControls({
  pagination,
  pageSize,
  onPageChange,
  onPageSizeChange,
  disabled,
}: PaginationProps) {
  const { page, total, totalPages } = pagination;
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);
  const pages = buildPageWindows(page, totalPages);

  const btnBase =
    'inline-flex h-8 min-w-[2rem] items-center justify-center rounded-md px-2 text-sm transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]';
  const btnActive = `${btnBase} bg-[var(--color-primary)] text-white font-semibold`;
  const btnInactive = `${btnBase} border border-[var(--color-border)] bg-[var(--color-background)] text-[var(--color-foreground)] hover:bg-[var(--color-border)] disabled:opacity-40 disabled:cursor-not-allowed`;

  return (
    <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-between">
      {/* result summary + per-page selector */}
      <div className="flex items-center gap-3 text-sm text-[var(--color-muted)]">
        <span className="text-black">
          {total === 0
            ? 'No results'
            : `Showing ${from}–${to} of ${total.toLocaleString()} ad slots`}
        </span>
        <label className="flex items-center gap-1.5">
          <span className="sr-only">Results per page</span>
          <select
            aria-label="Results per page"
            value={pageSize}
            onChange={(e) => onPageSizeChange(Number(e.target.value) as PageSize)}
            disabled={disabled}
            className="rounded-md border border-[var(--color-border)] bg-[var(--color-background)] px-2 py-1 text-sm text-[var(--color-foreground)] focus:outline-none focus:ring-1 focus:ring-[var(--color-primary)] disabled:opacity-50"
          >
            {PAGE_SIZE_OPTIONS.map((n) => (
              <option key={n} value={n}>
                {n} / page
              </option>
            ))}
          </select>
        </label>
      </div>

      {/* page buttons */}
      {totalPages > 1 && (
        <nav aria-label="Pagination" className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => onPageChange(page - 1)}
            disabled={disabled || page <= 1}
            aria-label="Previous page"
            className={btnInactive}
          >
            <ChevronLeft className="h-4 w-4" />
          </button>

          {pages.map((p, i) =>
            p === 'ellipsis' ? (
              <span
                key={`ellipsis-${i}`}
                className="inline-flex h-8 w-8 items-center justify-center text-sm text-[var(--color-muted)]"
              >
                …
              </span>
            ) : (
              <button
                key={p}
                type="button"
                onClick={() => onPageChange(p)}
                disabled={disabled}
                aria-label={`Page ${p}`}
                aria-current={p === page ? 'page' : undefined}
                className={p === page ? btnActive : btnInactive}
              >
                {p}
              </button>
            )
          )}

          <button
            type="button"
            onClick={() => onPageChange(page + 1)}
            disabled={disabled || page >= totalPages}
            aria-label="Next page"
            className={btnInactive}
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </nav>
      )}
    </div>
  );
}

// --- Main grid ---

export function AdSlotGrid() {
  const [slots, setSlots] = useState<MarketplaceAdSlot[]>([]);
  const [pagination, setPagination] = useState<MarketplacePagination>({
    page: 1,
    limit: 12,
    total: 0,
    totalPages: 0,
  });
  const [filters, setFilters] = useState<FilterState>(defaultFilters);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<PageSize>(12);

  const [loading, setLoading] = useState(true);
  // 'page' errors replace the grid; 'partial' errors show an inline notice above controls
  const [error, setError] = useState<{ message: string; isOffline: boolean } | null>(null);
  const [isOffline, setIsOffline] = useState(
    typeof navigator !== 'undefined' ? !navigator.onLine : false
  );

  const hasTrackedView = useRef(false);
  const shouldReduceMotion = useReducedMotion();
  // track the latest request so stale responses are ignored
  const fetchIdRef = useRef(0);

  const loadPage = useCallback(
    (targetPage: number, targetSize: PageSize, activeFilters: FilterState) => {
      if (typeof navigator !== 'undefined' && !navigator.onLine) {
        setLoading(false);
        setError({ message: 'You appear to be offline. Reconnect and try again.', isOffline: true });
        setIsOffline(true);
        return;
      }

      const fetchId = ++fetchIdRef.current;
      setLoading(true);
      setError(null);

      getMarketplaceAdSlots<MarketplaceAdSlot>({
        page: targetPage,
        limit: targetSize,
        type: activeFilters.type,
        category: activeFilters.category,
        available: activeFilters.availableOnly,
        search: activeFilters.search,
        sortBy: activeFilters.sortBy,
      })
        .then((res) => {
          if (fetchId !== fetchIdRef.current) return; // stale
          setSlots(res.data);
          setPagination(res.pagination);
        })
        .catch((err) => {
          if (fetchId !== fetchIdRef.current) return;
          const offline = isApiError(err) && err.type === 'network';
          if (offline) setIsOffline(true);
          setError({
            message: isApiError(err)
              ? err.message
              : err instanceof Error
                ? err.message
                : 'Unable to load marketplace listings. Please try again.',
            isOffline: offline,
          });
        })
        .finally(() => {
          if (fetchId !== fetchIdRef.current) return;
          setLoading(false);
        });
    },
    []
  );

  // initial load
  useEffect(() => {
    loadPage(page, pageSize, filters);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // online/offline listeners
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const onOnline = () => {
      setIsOffline(false);
      loadPage(page, pageSize, filters);
    };
    const onOffline = () => {
      setIsOffline(true);
      setError({ message: 'You appear to be offline. Reconnect and try again.', isOffline: true });
    };

    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
    // intentionally only re-register when loadPage identity changes (never)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadPage]);

  // analytics: track first successful view
  useEffect(() => {
    if (!loading && !error && !hasTrackedView.current) {
      analytics.marketplaceView(pagination.total);
      hasTrackedView.current = true;
    }
  }, [error, loading, pagination.total]);

  // analytics: track errors
  useEffect(() => {
    if (error) analytics.marketplaceError(error.message);
  }, [error]);

  const handleFilterChange = useCallback(
    (next: FilterState) => {
      setFilters(next);
      setPage(1);
      loadPage(1, pageSize, next);
    },
    [loadPage, pageSize]
  );

  const handlePageChange = useCallback(
    (next: number) => {
      setPage(next);
      loadPage(next, pageSize, filters);
      // scroll to top of grid smoothly
      window.scrollTo({ top: 0, behavior: 'smooth' });
    },
    [filters, loadPage, pageSize]
  );

  const handlePageSizeChange = useCallback(
    (next: PageSize) => {
      setPageSize(next);
      setPage(1);
      loadPage(1, next, filters);
    },
    [filters, loadPage]
  );

  const handleRetry = useCallback(() => {
    loadPage(page, pageSize, filters);
  }, [filters, loadPage, page, pageSize]);

  // --- Render ---

  if (loading && slots.length === 0) {
    // first load — show skeleton with filter bar
    return (
      <div className="space-y-4">
        <MarketplaceFilters filters={filters} onChange={handleFilterChange} />
        <SkeletonCard
          variant="marketplace"
          count={pageSize}
          gridClassName="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
        />
      </div>
    );
  }

  if (error && slots.length === 0) {
    // hard error with no prior data — show full-page error state
    return (
      <ErrorState
        variant="network"
        title="Unable to load marketplace listings"
        message={
          isOffline ? 'Check your internet connection and try again.' : error.message
        }
        onRetry={handleRetry}
      />
    );
  }

  return (
    <div className="space-y-4">
      <MarketplaceFilters filters={filters} onChange={handleFilterChange} />

      {/* inline error banner when a subsequent page fetch fails but we have prior data */}
      {error && slots.length > 0 && (
        <div
          role="alert"
          className="flex items-center justify-between gap-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
        >
          <span>{isOffline ? 'You appear to be offline.' : error.message}</span>
          <button
            type="button"
            onClick={handleRetry}
            className="shrink-0 font-medium underline hover:no-underline"
          >
            Retry
          </button>
        </div>
      )}

      {/* grid area */}
      {loading ? (
        <SkeletonCard
          variant="marketplace"
          count={pageSize}
          gridClassName="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
        />
      ) : slots.length === 0 && pagination.total === 0 && !error ? (
        // no listings at all in the DB
        <EmptyState
          icon={Store}
          title="The marketplace is launching soon"
          description="We're stocking fresh listings. Check back soon, or contact us to list your ad inventory."
          action={{ label: 'Contact Us', href: '/contact' }}
          secondaryAction={{ label: 'List Your Inventory', href: '/dashboard/publisher' }}
        />
      ) : slots.length === 0 && !error ? (
        // filters narrowed everything to zero
        <EmptyState
          variant="filter"
          icon={Filter}
          title="No listings match your filters"
          description="Try broadening your search or clearing active filters."
          action={{ label: 'Clear Filters', onClick: () => handleFilterChange(defaultFilters) }}
        />
      ) : (
        <motion.div
          key={`${page}-${pageSize}-${filters.type}-${filters.category}-${filters.availableOnly}-${filters.search}-${filters.sortBy}`}
          className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
          variants={shouldReduceMotion ? undefined : gridEntranceVariants}
          initial={shouldReduceMotion ? false : 'hidden'}
          animate={shouldReduceMotion ? undefined : 'visible'}
        >
          {slots.map((slot) => {
            const category = slot.publisher?.category ?? '';
            const stripeColor = categoryColors[category] || 'bg-gray-400';
            const views = slot.publisher?.monthlyViews ?? 0;
            const subscribers = slot.publisher?.subscriberCount ?? 0;
            const placementCount = slot._count?.placements ?? 0;

            return (
              <motion.div key={slot.id} variants={shouldReduceMotion ? undefined : gridItemVariants}>
                <Link
                  href={`/marketplace/${slot.id}`}
                  onClick={() =>
                    analytics.listingCardClick(slot.id, slot.name, slot.type, Number(slot.basePrice))
                  }
                  className={`group relative block overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-background)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg active:scale-[0.98] motion-reduce:active:scale-100 ${!slot.isAvailable ? 'opacity-60' : ''}`}
                >
                  <div className={`h-1 w-full ${stripeColor}`} />

                  {!slot.isAvailable && (
                    <span className="absolute right-3 top-3 rounded-full bg-gray-900 px-2 py-0.5 text-xs font-medium text-white">
                      Booked
                    </span>
                  )}

                  <div className="space-y-3 p-4">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="line-clamp-2 font-semibold">{slot.name}</h3>
                      <span
                        className={`shrink-0 rounded px-2 py-0.5 text-xs ${typeColors[slot.type] || 'bg-gray-100 text-gray-700'}`}
                      >
                        {slot.type}
                      </span>
                    </div>

                    {slot.publisher && (
                      <p className="text-sm text-[var(--color-muted)]">
                        by {slot.publisher.name}{' '}
                        {slot.publisher.isVerified && (
                          <span className="inline-flex items-center gap-1 text-xs text-blue-600">
                            <span className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-blue-100 text-[10px]">
                              ✓
                            </span>
                            Verified
                          </span>
                        )}
                      </p>
                    )}

                    {slot.description && (
                      <p className="line-clamp-2 text-sm text-[var(--color-muted)]">
                        {slot.description}
                      </p>
                    )}

                    <div className="border-y border-[var(--color-border)] py-2 text-xs text-[var(--color-muted)]">
                      <p className="line-clamp-1">
                        {views > 0 ? `${formatCompactNumber(views)} views` : 'New publisher'} ·{' '}
                        {subscribers > 0
                          ? `${formatCompactNumber(subscribers)} subscribers`
                          : 'Growing audience'}{' '}
                        · {slot.position || 'Standard'}
                      </p>
                    </div>

                    {placementCount > 0 && (
                      <p className="text-xs text-[var(--color-muted)]">
                        {placementCount} past bookings
                      </p>
                    )}

                    <div className="flex items-end justify-between">
                      <div>
                        <span
                          className={`text-sm ${slot.isAvailable ? 'text-green-600' : 'text-[var(--color-muted)]'}`}
                        >
                          {slot.isAvailable ? '● Available' : '○ Booked'}
                        </span>
                        <p className="font-semibold text-[var(--color-primary)]">
                          {formatPrice(slot.basePrice)}/mo
                        </p>
                      </div>
                      <span className="text-sm font-medium text-[var(--color-primary)] group-hover:underline">
                        View Details →
                      </span>
                    </div>
                  </div>
                </Link>
              </motion.div>
            );
          })}
        </motion.div>
      )}

      {/* pagination controls — shown whenever we have data or totalPages > 0 */}
      {(pagination.total > 0 || pagination.totalPages > 0) && (
        <PaginationControls
          pagination={pagination}
          pageSize={pageSize}
          onPageChange={handlePageChange}
          onPageSizeChange={handlePageSizeChange}
          disabled={loading}
        />
      )}
    </div>
  );
}
