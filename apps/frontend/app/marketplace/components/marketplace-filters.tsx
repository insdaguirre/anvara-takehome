'use client';

import { analytics } from '@/lib/analytics';
import {
  MARKETPLACE_PAGE_SIZE_OPTIONS,
  defaultMarketplaceFilters,
  type MarketplaceFilterState,
  type MarketplacePageSize,
  type MarketplaceSearchMode,
} from '../query-state';

export type FilterState = MarketplaceFilterState;

interface MarketplaceFiltersProps {
  filters: FilterState;
  mode: MarketplaceSearchMode;
  pageSize: MarketplacePageSize;
  onPageSizeChange(next: MarketplacePageSize): void;
  onChange(next: FilterState): void;
  disabled?: boolean;
}

export const defaultFilters: FilterState = defaultMarketplaceFilters;

function isDefaultFilters(filters: FilterState, mode: MarketplaceSearchMode): boolean {
  const matchesSharedDefaults =
    filters.type === defaultFilters.type &&
    filters.category === defaultFilters.category &&
    filters.availableOnly === defaultFilters.availableOnly;

  if (mode === 'rag') {
    return matchesSharedDefaults;
  }

  return (
    matchesSharedDefaults &&
    filters.sortBy === defaultFilters.sortBy &&
    filters.search === defaultFilters.search
  );
}

export function MarketplaceFilters({
  filters,
  mode,
  pageSize,
  onPageSizeChange,
  onChange,
  disabled = false,
}: MarketplaceFiltersProps) {
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

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
        <div
          className={`grid flex-1 gap-3 sm:grid-cols-2 ${
            mode === 'keyword' ? 'lg:grid-cols-4' : 'lg:grid-cols-3'
          }`}
        >
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

          {mode === 'keyword' && (
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
          )}
        </div>

        {mode === 'keyword' && (
          <div className="flex items-center justify-end gap-2 text-sm">
            <span className="font-medium text-[var(--color-muted)]">VIEW:</span>
            <div className="inline-flex items-center gap-1">
              {MARKETPLACE_PAGE_SIZE_OPTIONS.map((option) => {
                const isActive = option === pageSize;
                return (
                  <button
                    key={option}
                    type="button"
                    onClick={() => onPageSizeChange(option)}
                    disabled={disabled || isActive}
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
        )}
      </div>

      {!isDefaultFilters(filters, mode) && (
        <div className="flex justify-end">
          <button
            type="button"
            onClick={() => onChange(defaultFilters)}
            className="text-sm font-medium text-[var(--color-primary)] hover:underline"
          >
            Clear all filters
          </button>
        </div>
      )}
    </div>
  );
}
