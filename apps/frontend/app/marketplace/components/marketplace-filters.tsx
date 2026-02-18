'use client';

import { useEffect, useRef } from 'react';
import { analytics } from '@/lib/analytics';

export type MarketplaceFilterType =
  | 'ALL'
  | 'DISPLAY'
  | 'VIDEO'
  | 'NATIVE'
  | 'NEWSLETTER'
  | 'PODCAST';
export type MarketplaceFilterCategory =
  | 'ALL'
  | 'Technology'
  | 'Podcast'
  | 'Newsletter'
  | 'Video'
  | 'Business';
export type MarketplaceSortBy = 'price-desc' | 'price-asc' | 'name' | 'audience';

export interface FilterState {
  type: MarketplaceFilterType;
  category: MarketplaceFilterCategory;
  availableOnly: boolean;
  sortBy: MarketplaceSortBy;
  search: string;
}

interface MarketplaceFiltersProps {
  filters: FilterState;
  onChange(next: FilterState): void;
  resultCount?: number;
  totalCount?: number;
}

export const defaultFilters: FilterState = {
  type: 'ALL',
  category: 'ALL',
  availableOnly: true,
  sortBy: 'price-desc',
  search: '',
};

function isDefaultFilters(filters: FilterState): boolean {
  return (
    filters.type === defaultFilters.type &&
    filters.category === defaultFilters.category &&
    filters.availableOnly === defaultFilters.availableOnly &&
    filters.sortBy === defaultFilters.sortBy &&
    filters.search === defaultFilters.search
  );
}

export function MarketplaceFilters({
  filters,
  onChange,
  resultCount,
  totalCount,
}: MarketplaceFiltersProps) {
  const hasMountedRef = useRef(false);
  const latestResultCountRef = useRef(resultCount ?? 0);

  useEffect(() => {
    latestResultCountRef.current = resultCount ?? 0;
  }, [resultCount]);

  useEffect(() => {
    if (!hasMountedRef.current) {
      hasMountedRef.current = true;
      return;
    }

    const timeout = window.setTimeout(() => {
      analytics.searchQuery(filters.search, latestResultCountRef.current);
    }, 500);

    return () => {
      window.clearTimeout(timeout);
    };
  }, [filters.search]);

  const baseInputClass =
    'rounded-lg border bg-[var(--color-background)] px-3 py-2 text-sm text-[var(--color-foreground)] focus:outline-none focus:ring-1 focus:ring-[var(--color-primary)]';

  const typeClass =
    filters.type !== 'ALL'
      ? `${baseInputClass} border-[var(--color-primary)]`
      : `${baseInputClass} border-[var(--color-border)]`;
  const categoryClass =
    filters.category !== 'ALL'
      ? `${baseInputClass} border-[var(--color-primary)]`
      : `${baseInputClass} border-[var(--color-border)]`;
  const sortClass =
    filters.sortBy !== 'price-desc'
      ? `${baseInputClass} border-[var(--color-primary)]`
      : `${baseInputClass} border-[var(--color-border)]`;
  const searchClass =
    filters.search.trim()
      ? `${baseInputClass} border-[var(--color-primary)]`
      : `${baseInputClass} border-[var(--color-border)]`;

  return (
    <div className="space-y-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-background)] p-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <select
          aria-label="Filter by ad type"
          value={filters.type}
          onChange={(e) => {
            const next = { ...filters, type: e.target.value as FilterState['type'] };
            onChange(next);
            analytics.filterApply('type', next.type);
          }}
          className={typeClass}
        >
          <option value="ALL">All Types</option>
          <option value="DISPLAY">Display</option>
          <option value="VIDEO">Video</option>
          <option value="NATIVE">Native</option>
          <option value="NEWSLETTER">Newsletter</option>
          <option value="PODCAST">Podcast</option>
        </select>

        <select
          aria-label="Filter by publisher category"
          value={filters.category}
          onChange={(e) => {
            const next = { ...filters, category: e.target.value as FilterState['category'] };
            onChange(next);
            analytics.filterApply('category', next.category);
          }}
          className={categoryClass}
        >
          <option value="ALL">All Categories</option>
          <option value="Technology">Technology</option>
          <option value="Podcast">Podcast</option>
          <option value="Newsletter">Newsletter</option>
          <option value="Video">Video</option>
          <option value="Business">Business</option>
        </select>

        <label className="inline-flex items-center gap-2 rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm text-[var(--color-foreground)]">
          <input
            type="checkbox"
            checked={filters.availableOnly}
            onChange={(e) => {
              const next = { ...filters, availableOnly: e.target.checked };
              onChange(next);
              analytics.filterApply('available_only', String(next.availableOnly));
            }}
            className="accent-[var(--color-primary)]"
          />
          Available only
        </label>

        <select
          aria-label="Sort listings"
          value={filters.sortBy}
          onChange={(e) => {
            const next = { ...filters, sortBy: e.target.value as FilterState['sortBy'] };
            onChange(next);
            analytics.filterApply('sort_by', next.sortBy);
          }}
          className={sortClass}
        >
          <option value="price-desc">Sort: Price High-Low</option>
          <option value="price-asc">Sort: Price Low-High</option>
          <option value="name">Sort: Name</option>
          <option value="audience">Sort: Audience</option>
        </select>

        <input
          type="search"
          value={filters.search}
          onChange={(e) => {
            const next = { ...filters, search: e.target.value };
            onChange(next);
            analytics.filterApply('search', e.target.value.trim());
          }}
          placeholder="Search listings..."
          className={searchClass}
          aria-label="Search listings"
        />
      </div>

      <div className="flex items-center justify-between">
        <p className="text-sm text-[var(--color-muted)]">
          {typeof resultCount === 'number' && typeof totalCount === 'number'
            ? `Showing ${resultCount} of ${totalCount} ad slots`
            : 'Browse ad slots'}
        </p>

        {!isDefaultFilters(filters) && (
          <button
            type="button"
            onClick={() => onChange(defaultFilters)}
            className="text-sm font-medium text-[var(--color-primary)] hover:underline"
          >
            Clear all filters
          </button>
        )}
      </div>
    </div>
  );
}
