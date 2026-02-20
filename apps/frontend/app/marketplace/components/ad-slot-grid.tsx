'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { Filter, Store } from 'lucide-react';
import { motion, useReducedMotion } from 'motion/react';
import { EmptyState } from '@/app/components/EmptyState';
import { ErrorState } from '@/app/components/ErrorState';
import { SkeletonCard } from '@/app/components/SkeletonCard';
import { getMarketplaceAdSlots, isApiError } from '@/lib/api';
import { analytics } from '@/lib/analytics';
import { formatCompactNumber, formatPrice } from '@/lib/format';
import {
  MarketplaceFilters,
  defaultFilters,
  type FilterState,
} from './marketplace-filters';

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
    transition: {
      staggerChildren: 0.06,
      delayChildren: 0.04,
    },
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
  _count?: {
    placements?: number;
  };
}

export function AdSlotGrid() {
  const [adSlots, setAdSlots] = useState<MarketplaceAdSlot[]>([]);
  const [filters, setFilters] = useState<FilterState>(defaultFilters);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isOffline, setIsOffline] = useState(
    typeof navigator !== 'undefined' ? !navigator.onLine : false
  );
  const hasTrackedView = useRef(false);
  const lastEmptyStateKeyRef = useRef<string | null>(null);
  const shouldReduceMotion = useReducedMotion();

  const loadAdSlots = useCallback(() => {
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      setLoading(false);
      setError('You appear to be offline. Reconnect and try again.');
      setIsOffline(true);
      return;
    }

    setLoading(true);
    setError(null);

    getMarketplaceAdSlots()
      .then((slots) => setAdSlots(slots as MarketplaceAdSlot[]))
      .catch((loadError) => {
        if (isApiError(loadError)) {
          if (loadError.type === 'network') {
            setIsOffline(true);
          }
          setError(loadError.message);
          return;
        }

        setError(
          loadError instanceof Error
            ? loadError.message
            : 'Unable to load marketplace listings. Please try again.'
        );
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    const loadTimeout = window.setTimeout(() => {
      loadAdSlots();
    }, 0);

    return () => {
      window.clearTimeout(loadTimeout);
    };
  }, [loadAdSlots]);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const onOnline = () => {
      setIsOffline(false);
      loadAdSlots();
    };

    const onOffline = () => {
      setIsOffline(true);
      setError('You appear to be offline. Reconnect and try again.');
    };

    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);

    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }, [loadAdSlots]);

  useEffect(() => {
    if (!loading && !error && !hasTrackedView.current) {
      analytics.marketplaceView(adSlots.length);
      hasTrackedView.current = true;
    }
  }, [adSlots.length, error, loading]);

  const filteredSlots = useMemo(() => {
    const query = filters.search.trim().toLowerCase();
    const slots = [...adSlots].filter((slot) => {
      if (filters.type !== 'ALL' && slot.type !== filters.type) return false;

      const category = slot.publisher?.category ?? '';
      if (filters.category !== 'ALL' && category !== filters.category) return false;

      if (filters.availableOnly && !slot.isAvailable) return false;

      if (!query) return true;

      const haystack = [slot.name, slot.description, slot.publisher?.name]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return haystack.includes(query);
    });

    slots.sort((a, b) => {
      if (filters.sortBy === 'price-asc') return a.basePrice - b.basePrice;
      if (filters.sortBy === 'price-desc') return b.basePrice - a.basePrice;
      if (filters.sortBy === 'name') return a.name.localeCompare(b.name);

      const audienceA = (a.publisher?.monthlyViews ?? 0) + (a.publisher?.subscriberCount ?? 0);
      const audienceB = (b.publisher?.monthlyViews ?? 0) + (b.publisher?.subscriberCount ?? 0);
      return audienceB - audienceA;
    });

    return slots;
  }, [adSlots, filters]);

  useEffect(() => {
    if (!error) return;
    analytics.marketplaceError(error);
  }, [error]);

  useEffect(() => {
    if (loading || error) return;

    if (adSlots.length === 0) {
      if (lastEmptyStateKeyRef.current !== 'no_listings') {
        analytics.marketplaceEmpty('no_listings');
        lastEmptyStateKeyRef.current = 'no_listings';
      }
      return;
    }

    if (filteredSlots.length === 0) {
      const activeFilterCount = [
        filters.type !== 'ALL',
        filters.category !== 'ALL',
        filters.availableOnly,
        filters.search.trim().length > 0,
        filters.sortBy !== defaultFilters.sortBy,
      ].filter(Boolean).length;
      const key = `filtered:${activeFilterCount}`;
      if (lastEmptyStateKeyRef.current !== key) {
        analytics.marketplaceEmpty('filtered', { filter_count: activeFilterCount });
        lastEmptyStateKeyRef.current = key;
      }
      return;
    }

    lastEmptyStateKeyRef.current = null;
  }, [adSlots.length, error, filteredSlots.length, filters, loading]);

  if (loading) {
    return (
      <div className="space-y-4">
        <MarketplaceFilters filters={filters} onChange={setFilters} resultCount={0} totalCount={0} />
        <SkeletonCard
          variant="marketplace"
          count={6}
          gridClassName="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
        />
      </div>
    );
  }

  if (error) {
    return (
      <ErrorState
        variant="network"
        title="Unable to load marketplace listings"
        message={
          isOffline
            ? 'Check your internet connection and try again.'
            : error
        }
        onRetry={loadAdSlots}
      />
    );
  }

  return (
    <div className="space-y-4">
      <MarketplaceFilters
        filters={filters}
        onChange={setFilters}
        resultCount={filteredSlots.length}
        totalCount={adSlots.length}
      />

      {adSlots.length === 0 ? (
        <EmptyState
          icon={Store}
          title="The marketplace is launching soon"
          description="We're stocking fresh listings. Check back soon, or contact us to list your ad inventory."
          action={{ label: 'Contact Us', href: '/contact' }}
          secondaryAction={{ label: 'List Your Inventory', href: '/dashboard/publisher' }}
        />
      ) : filteredSlots.length === 0 ? (
        <EmptyState
          variant="filter"
          icon={Filter}
          title="No listings match your filters"
          description="Try broadening your search or clearing active filters."
          action={{ label: 'Clear Filters', onClick: () => setFilters(defaultFilters) }}
        />
      ) : (
        <motion.div
          key={`${filters.type}-${filters.category}-${filters.availableOnly}-${filters.search}-${filters.sortBy}`}
          className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
          variants={shouldReduceMotion ? undefined : gridEntranceVariants}
          initial={shouldReduceMotion ? false : 'hidden'}
          animate={shouldReduceMotion ? undefined : 'visible'}
        >
          {filteredSlots.map((slot) => {
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
                      <p className="line-clamp-2 text-sm text-[var(--color-muted)]">{slot.description}</p>
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
                      <p className="text-xs text-[var(--color-muted)]">{placementCount} past bookings</p>
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
    </div>
  );
}
