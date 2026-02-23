'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { ChevronLeft, ChevronRight, Filter, Search, Sparkles, Store } from 'lucide-react';
import { motion, useReducedMotion } from 'motion/react';
import { EmptyState } from '@/app/components/EmptyState';
import { ErrorState } from '@/app/components/ErrorState';
import { SkeletonCard } from '@/app/components/SkeletonCard';
import {
  getMarketplaceAdSlots,
  getMarketplaceRagStatus,
  isApiError,
  ragSearchMarketplace,
  type MarketplacePagination,
  type MarketplaceRagSearchResponse,
  type MarketplaceRagSearchResult,
  type PaginatedMarketplaceResponse,
} from '@/lib/api';
import { analytics } from '@/lib/analytics';
import { formatCompactNumber, formatPrice } from '@/lib/format';
import { buildPageWindows } from '@/lib/pagination';
import { MarketplaceFilters, defaultFilters, type FilterState } from './marketplace-filters';
import {
  MARKETPLACE_PAGE_SIZE_OPTIONS,
  isMarketplaceQueryStateEqual,
  parseMarketplaceQueryState,
  toMarketplaceQueryString,
  type MarketplacePageSize,
  type MarketplaceQueryState,
  type MarketplaceSearchMode,
} from '../query-state';

const PAGE_SIZE_OPTIONS = MARKETPLACE_PAGE_SIZE_OPTIONS;
type PageSize = MarketplacePageSize;

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

export interface MarketplaceAdSlot {
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

interface AdSlotGridProps {
  initialResponse: PaginatedMarketplaceResponse<MarketplaceAdSlot>;
  initialQueryState: MarketplaceQueryState;
}

interface RagUiState {
  results: MarketplaceRagSearchResult<MarketplaceAdSlot>[];
  retrievalCount: number;
  generationFailed: boolean;
  hasSearched: boolean;
}

const defaultRagUiState: RagUiState = {
  results: [],
  retrievalCount: 0,
  generationFailed: false,
  hasSearched: false,
};

interface PaginationProps {
  pagination: MarketplacePagination;
  onPageChange: (page: number) => void;
  disabled: boolean;
}

function PaginationControls({ pagination, onPageChange, disabled }: PaginationProps) {
  const { page, totalPages } = pagination;
  const pages = buildPageWindows(page, totalPages);

  const btnBase =
    'inline-flex h-8 min-w-[2rem] items-center justify-center rounded-md px-2 text-sm transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]';
  const btnActive = `${btnBase} bg-[var(--color-primary)] text-white font-semibold`;
  const btnInactive = `${btnBase} border border-[var(--color-border)] bg-[var(--color-background)] text-[var(--color-foreground)] hover:bg-[var(--color-border)] disabled:opacity-40 disabled:cursor-not-allowed`;

  return (
    <nav aria-label="Pagination" className="flex items-center justify-center gap-1">
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
  );
}

function queryStateToFilterState(state: MarketplaceQueryState): FilterState {
  return {
    type: state.type,
    category: state.category,
    availableOnly: state.availableOnly,
    sortBy: state.sortBy,
    search: state.search,
  };
}

function buildQueryState(
  page: number,
  pageSize: PageSize,
  filters: FilterState,
  mode: MarketplaceSearchMode,
  ragQuery: string
): MarketplaceQueryState {
  return {
    page,
    limit: pageSize,
    type: filters.type,
    category: filters.category,
    availableOnly: filters.availableOnly,
    sortBy: filters.sortBy,
    search: filters.search,
    mode,
    ragQuery,
  };
}

function toRagFilters(filters: FilterState) {
  return {
    ...(filters.type !== 'ALL' ? { type: filters.type } : {}),
    ...(filters.category !== 'ALL' ? { category: filters.category } : {}),
    available: filters.availableOnly,
  };
}

export function AdSlotGrid({ initialResponse, initialQueryState }: AdSlotGridProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [slots, setSlots] = useState<MarketplaceAdSlot[]>(initialResponse.data);
  const [pagination, setPagination] = useState<MarketplacePagination>(initialResponse.pagination);
  const [filters, setFilters] = useState<FilterState>(queryStateToFilterState(initialQueryState));
  const [page, setPage] = useState(initialQueryState.page);
  const [pageSize, setPageSize] = useState<PageSize>(initialQueryState.limit);
  const [mode, setMode] = useState<MarketplaceSearchMode>(initialQueryState.mode);
  const [ragQuery, setRagQuery] = useState(initialQueryState.ragQuery);
  const [rag, setRag] = useState<RagUiState>(defaultRagUiState);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<{ message: string; isOffline: boolean } | null>(null);
  const [isOffline, setIsOffline] = useState(
    typeof navigator !== 'undefined' ? !navigator.onLine : false
  );

  const [ragEnabled, setRagEnabled] = useState(false);

  const hasTrackedView = useRef(false);
  const hasMountedSearchRef = useRef(false);
  const latestResultCountRef = useRef(initialResponse.pagination.total);
  const shouldReduceMotion = useReducedMotion();
  const fetchIdRef = useRef(0);
  const lastNavigationQueryRef = useRef<string | null>(null);
  const localQueryStateRef = useRef<MarketplaceQueryState>(initialQueryState);

  const loadKeywordPage = useCallback(
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
          if (fetchId !== fetchIdRef.current) return;
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

  const loadRagResults = useCallback((query: string, activeFilters: FilterState) => {
    const trimmed = query.trim();
    if (trimmed.length === 0) {
      setRag(defaultRagUiState);
      setError(null);
      setLoading(false);
      return;
    }

    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      setLoading(false);
      setError({ message: 'You appear to be offline. Reconnect and try again.', isOffline: true });
      setIsOffline(true);
      return;
    }

    const fetchId = ++fetchIdRef.current;
    setLoading(true);
    setError(null);

    ragSearchMarketplace<MarketplaceAdSlot>({
      query: trimmed,
      filters: toRagFilters(activeFilters),
    })
      .then((res: MarketplaceRagSearchResponse<MarketplaceAdSlot>) => {
        if (fetchId !== fetchIdRef.current) return;
        setRag({
          results: res.results,
          retrievalCount: res.retrievalCount,
          generationFailed: res.generationFailed,
          hasSearched: true,
        });
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
              : 'Unable to load AI search results. Please try again.',
          isOffline: offline,
        });
      })
      .finally(() => {
        if (fetchId !== fetchIdRef.current) return;
        setLoading(false);
      });
  }, []);

  const syncUrl = useCallback(
    (nextState: MarketplaceQueryState) => {
      const nextQuery = toMarketplaceQueryString(nextState);
      const currentQuery = searchParams.toString();
      if (nextQuery === currentQuery) return;

      lastNavigationQueryRef.current = nextQuery;
      const href = nextQuery.length > 0 ? `${pathname}?${nextQuery}` : pathname;
      router.push(href, { scroll: false });
    },
    [pathname, router, searchParams]
  );

  const applyQueryState = useCallback(
    (
      nextState: MarketplaceQueryState,
      options?: { syncUrl?: boolean; fetch?: boolean; scrollToTop?: boolean }
    ) => {
      const nextFilters = queryStateToFilterState(nextState);
      setFilters(nextFilters);
      setPage(nextState.page);
      setPageSize(nextState.limit);
      setMode(nextState.mode);
      setRagQuery(nextState.ragQuery);

      if (options?.syncUrl) {
        syncUrl(nextState);
      }

      if (options?.fetch) {
        if (nextState.mode === 'rag') {
          loadRagResults(nextState.ragQuery, nextFilters);
        } else {
          loadKeywordPage(nextState.page, nextState.limit, nextFilters);
        }
      }

      if (options?.scrollToTop && typeof window !== 'undefined') {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    },
    [loadKeywordPage, loadRagResults, syncUrl]
  );

  useEffect(() => {
    localQueryStateRef.current = buildQueryState(page, pageSize, filters, mode, ragQuery);
  }, [filters, mode, page, pageSize, ragQuery]);

  useEffect(() => {
    const nextState = parseMarketplaceQueryState(searchParams);
    const nextQuery = toMarketplaceQueryString(nextState);

    if (lastNavigationQueryRef.current === nextQuery) {
      lastNavigationQueryRef.current = null;
      return;
    }

    const currentState = localQueryStateRef.current;
    if (isMarketplaceQueryStateEqual(nextState, currentState)) {
      return;
    }

    // Defer both applyQueryState calls to avoid synchronous setState within the effect body.
    if (nextState.mode === 'rag' && !ragEnabled) {
      const fallback = { ...nextState, mode: 'keyword' as const, ragQuery: '' };
      // URL back/forward should force keyword mode when AI search is disabled.
      setTimeout(() => applyQueryState(fallback, { syncUrl: true, fetch: true }), 0);
      return;
    }

    setTimeout(() => applyQueryState(nextState, { fetch: true }), 0);
  }, [applyQueryState, ragEnabled, searchParams]);

  useEffect(() => {
    let cancelled = false;

    getMarketplaceRagStatus()
      .then((status) => {
        if (cancelled) return;

        setRagEnabled(status.enabled);

        if (!status.enabled) {
          const current = localQueryStateRef.current;
          if (current.mode === 'rag') {
            applyQueryState({ ...current, mode: 'keyword', ragQuery: '' }, { syncUrl: true, fetch: true });
          }
          return;
        }

        const current = localQueryStateRef.current;
        if (current.mode === 'rag' && current.ragQuery.trim().length > 0) {
          loadRagResults(current.ragQuery, queryStateToFilterState(current));
        }
      })
      .catch(() => {
        if (cancelled) return;

        setRagEnabled(false);

        const current = localQueryStateRef.current;
        if (current.mode === 'rag') {
          applyQueryState({ ...current, mode: 'keyword', ragQuery: '' }, { syncUrl: true, fetch: true });
        }
      });

    return () => {
      cancelled = true;
    };
  }, [applyQueryState, loadRagResults]);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const onOnline = () => {
      setIsOffline(false);
      const current = localQueryStateRef.current;
      if (current.mode === 'rag') {
        loadRagResults(current.ragQuery, queryStateToFilterState(current));
      } else {
        loadKeywordPage(current.page, current.limit, queryStateToFilterState(current));
      }
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
  }, [loadKeywordPage, loadRagResults]);

  useEffect(() => {
    if (!loading && !error && mode === 'keyword' && !hasTrackedView.current) {
      analytics.marketplaceView(pagination.total);
      hasTrackedView.current = true;
    }
  }, [error, loading, mode, pagination.total]);

  useEffect(() => {
    latestResultCountRef.current = mode === 'rag' ? rag.results.length : pagination.total;
  }, [mode, pagination.total, rag.results.length]);

  useEffect(() => {
    if (!hasMountedSearchRef.current) {
      hasMountedSearchRef.current = true;
      return;
    }

    if (mode !== 'keyword') {
      return;
    }

    const timeout = window.setTimeout(() => {
      analytics.searchQuery(filters.search, latestResultCountRef.current);
    }, 500);

    return () => {
      window.clearTimeout(timeout);
    };
  }, [filters.search, mode]);

  useEffect(() => {
    if (error) analytics.marketplaceError(error.message);
  }, [error]);

  const handleFilterChange = useCallback(
    (next: FilterState) => {
      const nextState = buildQueryState(1, pageSize, next, mode, ragQuery);
      applyQueryState(nextState, {
        syncUrl: true,
        fetch: mode === 'keyword' || nextState.ragQuery.trim().length > 0,
      });
    },
    [applyQueryState, mode, pageSize, ragQuery]
  );

  const handleSearchChange = useCallback(
    (search: string) => {
      const next = { ...filters, search };
      applyQueryState(buildQueryState(1, pageSize, next, 'keyword', ragQuery), {
        syncUrl: true,
        fetch: true,
      });
      analytics.filterApply('search', search.trim());
    },
    [applyQueryState, filters, pageSize, ragQuery]
  );

  const handleRagQueryChange = useCallback(
    (nextRagQuery: string) => {
      applyQueryState(buildQueryState(1, pageSize, filters, 'rag', nextRagQuery), {
        syncUrl: false,
        fetch: false,
      });
    },
    [applyQueryState, filters, pageSize]
  );

  const handleRagSearch = useCallback(() => {
    applyQueryState(buildQueryState(1, pageSize, filters, 'rag', ragQuery), {
      syncUrl: true,
      fetch: true,
    });
  }, [applyQueryState, filters, pageSize, ragQuery]);

  const handleModeChange = useCallback(
    (nextMode: MarketplaceSearchMode) => {
      if (nextMode === mode) return;
      if (nextMode === 'rag' && !ragEnabled) return;

      const nextState = buildQueryState(1, pageSize, filters, nextMode, ragQuery);
      applyQueryState(nextState, {
        syncUrl: true,
        fetch: nextMode === 'keyword' || nextState.ragQuery.trim().length > 0,
      });
      analytics.filterApply('search_mode', nextMode);
    },
    [applyQueryState, filters, mode, pageSize, ragEnabled, ragQuery]
  );

  const handlePageChange = useCallback(
    (next: number) => {
      const bounded = Math.max(1, next);
      applyQueryState(buildQueryState(bounded, pageSize, filters, 'keyword', ragQuery), {
        syncUrl: true,
        fetch: true,
        scrollToTop: true,
      });
    },
    [applyQueryState, filters, pageSize, ragQuery]
  );

  const handlePageSizeChange = useCallback(
    (next: PageSize) => {
      applyQueryState(buildQueryState(1, next, filters, mode, ragQuery), {
        syncUrl: true,
        fetch: mode === 'keyword',
      });
    },
    [applyQueryState, filters, mode, ragQuery]
  );

  const handleRetry = useCallback(() => {
    if (mode === 'rag') {
      loadRagResults(ragQuery, filters);
      return;
    }

    loadKeywordPage(page, pageSize, filters);
  }, [filters, loadKeywordPage, loadRagResults, mode, page, pageSize, ragQuery]);

  const isRagMode = mode === 'rag' && ragEnabled;
  const isShowingRagResults = isRagMode && rag.hasSearched;
  const ragResultsById = useMemo(() => {
    const map = new Map<string, MarketplaceRagSearchResult<MarketplaceAdSlot>>();
    for (const result of rag.results) {
      map.set(result.adSlot.id, result);
    }
    return map;
  }, [rag.results]);

  const displayedSlots = isShowingRagResults ? rag.results.map((result) => result.adSlot) : slots;

  const hasKeywordResults = pagination.total > 0;
  const keywordFrom = hasKeywordResults ? (pagination.page - 1) * pageSize + 1 : 0;
  const keywordTo = hasKeywordResults ? Math.min(pagination.page * pageSize, pagination.total) : 0;

  const hasErrorWithoutResults = !displayedSlots.length && error !== null;

  return (
    <div className="space-y-4">
      <div
        className={`rounded-xl border bg-[var(--color-background)] ${
          isRagMode ? (ragQuery.trim() ? 'border-[var(--color-primary)]' : 'border-[var(--color-border)]') : filters.search.trim() ? 'border-[var(--color-primary)]' : 'border-[var(--color-border)]'
        }`}
      >
        {(ragEnabled || mode === 'keyword') && (
          <div className="flex items-center gap-2 border-b border-[var(--color-border)] p-3">
            <button
              type="button"
              onClick={() => handleModeChange('keyword')}
              className={`inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                !isRagMode
                  ? 'bg-[var(--color-primary)] text-white'
                  : 'text-[var(--color-foreground)] hover:bg-[var(--color-border)]'
              }`}
              aria-pressed={!isRagMode}
            >
              <Search className="h-4 w-4" />
              Search
            </button>

            {ragEnabled && (
              <button
                type="button"
                onClick={() => handleModeChange('rag')}
                className={`inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                  isRagMode
                    ? 'bg-[var(--color-primary)] text-white'
                    : 'text-[var(--color-foreground)] hover:bg-[var(--color-border)]'
                }`}
                aria-pressed={isRagMode}
              >
                <Sparkles className="h-4 w-4" />
                AI Search
              </button>
            )}
          </div>
        )}

        {!isRagMode ? (
          <div className="relative">
            <input
              type="search"
              value={filters.search}
              onChange={(event) => handleSearchChange(event.target.value)}
              placeholder="Search listings..."
              aria-label="Search listings"
              disabled={loading}
              className="w-full border-b border-[var(--color-border)] bg-transparent py-3 pl-4 pr-10 text-sm text-[var(--color-foreground)] focus:outline-none focus:ring-1 focus:ring-[var(--color-primary)] disabled:cursor-not-allowed disabled:opacity-50"
            />
            <Search
              className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--color-muted)]"
              aria-hidden="true"
            />
          </div>
        ) : (
          <div className="space-y-2 border-b border-[var(--color-border)] p-4">
            <textarea
              value={ragQuery}
              onChange={(event) => {
                if (event.target.value.length <= 500) {
                  handleRagQueryChange(event.target.value);
                }
              }}
              onKeyDown={(event) => {
                if (event.key === 'Enter' && !event.shiftKey) {
                  event.preventDefault();
                  handleRagSearch();
                }
              }}
              placeholder="Describe what you're looking for..."
              rows={3}
              maxLength={500}
              disabled={loading}
              aria-label="AI search prompt"
              className="w-full resize-y rounded-lg border border-[var(--color-border)] bg-transparent px-3 py-2 text-sm text-[var(--color-foreground)] focus:outline-none focus:ring-1 focus:ring-[var(--color-primary)] disabled:cursor-not-allowed disabled:opacity-50"
            />
            <div className="flex items-center justify-between">
              <p className="text-xs text-[var(--color-muted)]">{ragQuery.length}/500 characters</p>
              <button
                type="button"
                onClick={handleRagSearch}
                disabled={loading || ragQuery.trim().length === 0}
                className="inline-flex items-center gap-2 rounded-lg bg-[var(--color-primary)] px-3 py-1.5 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Sparkles className="h-4 w-4" />
                Search
              </button>
            </div>
          </div>
        )}

        <div className="p-4">
          <MarketplaceFilters
            filters={filters}
            mode={isRagMode ? 'rag' : 'keyword'}
            pageSize={pageSize}
            onPageSizeChange={handlePageSizeChange}
            onChange={handleFilterChange}
            disabled={loading}
          />
        </div>
      </div>

      {!isShowingRagResults && hasKeywordResults && (
        <p className="text-sm text-[var(--color-showing-text)]">
          Showing {keywordFrom}-{keywordTo} of {pagination.total.toLocaleString()} ad slots
        </p>
      )}

      {isShowingRagResults && !loading && !error && (
        <p className="text-sm text-[var(--color-showing-text)]">
          Showing {rag.results.length.toLocaleString()} AI matches from {rag.retrievalCount.toLocaleString()} retrieved listings
        </p>
      )}

      {isRagMode && rag.generationFailed && rag.results.length > 0 && (
        <div
          role="status"
          className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800"
        >
          AI explanations unavailable. Showing closest matches.
        </div>
      )}

      {error && displayedSlots.length > 0 && (
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

      {hasErrorWithoutResults ? (
        <ErrorState
          variant="network"
          title={isRagMode ? 'Unable to run AI search' : 'Unable to load marketplace listings'}
          message={isOffline ? 'Check your internet connection and try again.' : error.message}
          onRetry={handleRetry}
        />
      ) : loading ? (
        <div className="space-y-3">
          {isRagMode && <p className="text-sm text-[var(--color-muted)]">Searching with AI…</p>}
          <SkeletonCard
            variant="marketplace"
            count={isRagMode ? 10 : pageSize}
            gridClassName="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
          />
        </div>
      ) : isRagMode && rag.hasSearched && displayedSlots.length === 0 ? (
        <EmptyState
          variant="filter"
          icon={Sparkles}
          title="No matches found"
          description="Try rephrasing your query."
          action={{ label: 'Try Again', onClick: handleRagSearch }}
        />
      ) : !isShowingRagResults && displayedSlots.length === 0 && pagination.total === 0 && !error ? (
        <EmptyState
          icon={Store}
          title="The marketplace is launching soon"
          description="We're stocking fresh listings. Check back soon, or contact us to list your ad inventory."
          action={{ label: 'Contact Us', href: '/contact' }}
          secondaryAction={{ label: 'List Your Inventory', href: '/dashboard/publisher' }}
        />
      ) : !isShowingRagResults && displayedSlots.length === 0 && !error ? (
        <EmptyState
          variant="filter"
          icon={Filter}
          title="No listings match your filters"
          description="Try broadening your search or clearing active filters."
          action={{ label: 'Clear Filters', onClick: () => handleFilterChange(defaultFilters) }}
        />
      ) : (
        <motion.div
          key={`${mode}-${page}-${pageSize}-${filters.type}-${filters.category}-${filters.availableOnly}-${filters.search}-${filters.sortBy}-${ragQuery}`}
          className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
          variants={shouldReduceMotion ? undefined : gridEntranceVariants}
          initial={shouldReduceMotion ? false : 'hidden'}
          animate={shouldReduceMotion ? undefined : 'visible'}
        >
          {displayedSlots.map((slot) => {
            const category = slot.publisher?.category ?? '';
            const stripeColor = categoryColors[category] || 'bg-gray-400';
            const views = slot.publisher?.monthlyViews ?? 0;
            const subscribers = slot.publisher?.subscriberCount ?? 0;
            const placementCount = slot._count?.placements ?? 0;
            const ragResult = isShowingRagResults ? ragResultsById.get(slot.id) : null;

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

                    {ragResult?.explanation && (
                      <p className="rounded-md border border-blue-100 bg-blue-50 px-2.5 py-2 text-xs text-blue-800">
                        {ragResult.explanation}
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

      {!isRagMode && (pagination.total > 0 || pagination.totalPages > 0) && (
        <div className="relative flex items-center justify-center">
          <PaginationControls pagination={pagination} onPageChange={handlePageChange} disabled={loading} />
          <div className="absolute right-0 hidden items-center gap-2 text-sm sm:flex">
            <span className="font-medium text-[var(--color-muted)]">VIEW:</span>
            <div className="inline-flex items-center gap-1">
              {PAGE_SIZE_OPTIONS.map((option) => {
                const isActive = option === pageSize;
                return (
                  <button
                    key={option}
                    type="button"
                    onClick={() => handlePageSizeChange(option)}
                    disabled={loading || isActive}
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
      )}
    </div>
  );
}
