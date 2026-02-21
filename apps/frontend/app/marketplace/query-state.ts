export const MARKETPLACE_PAGE_SIZE_OPTIONS = [12, 24, 48] as const;
export type MarketplacePageSize = (typeof MARKETPLACE_PAGE_SIZE_OPTIONS)[number];

export const MARKETPLACE_FILTER_TYPES = [
  'ALL',
  'DISPLAY',
  'VIDEO',
  'NATIVE',
  'NEWSLETTER',
  'PODCAST',
] as const;
export type MarketplaceFilterType = (typeof MARKETPLACE_FILTER_TYPES)[number];

export const MARKETPLACE_FILTER_CATEGORIES = [
  'ALL',
  'Technology',
  'Podcast',
  'Newsletter',
  'Video',
  'Business',
] as const;
export type MarketplaceFilterCategory = (typeof MARKETPLACE_FILTER_CATEGORIES)[number];

export const MARKETPLACE_SORT_OPTIONS = ['price-desc', 'price-asc', 'name', 'audience'] as const;
export type MarketplaceSortBy = (typeof MARKETPLACE_SORT_OPTIONS)[number];

export interface MarketplaceFilterState {
  type: MarketplaceFilterType;
  category: MarketplaceFilterCategory;
  availableOnly: boolean;
  sortBy: MarketplaceSortBy;
  search: string;
}

export interface MarketplaceQueryState extends MarketplaceFilterState {
  page: number;
  limit: MarketplacePageSize;
}

type SearchParamRecord = Record<string, string | string[] | undefined>;
interface SearchParamGetter {
  get(name: string): string | null;
}
type SearchParamInput = SearchParamGetter | SearchParamRecord;

export const defaultMarketplaceFilters: MarketplaceFilterState = {
  type: 'ALL',
  category: 'ALL',
  availableOnly: true,
  sortBy: 'price-desc',
  search: '',
};

export const defaultMarketplaceQueryState: MarketplaceQueryState = {
  ...defaultMarketplaceFilters,
  page: 1,
  limit: 12,
};

function isSearchParamGetter(searchParams: SearchParamInput): searchParams is SearchParamGetter {
  return typeof (searchParams as SearchParamGetter).get === 'function';
}

function getFirstParamValue(searchParams: SearchParamInput, key: string): string | undefined {
  if (isSearchParamGetter(searchParams)) {
    return searchParams.get(key) ?? undefined;
  }

  const value = searchParams[key];
  if (Array.isArray(value)) return value[0];
  return value;
}

function parsePositiveInteger(value: string | undefined, fallback: number): number {
  if (!value) return fallback;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) return fallback;
  return parsed;
}

function parsePageSize(value: string | undefined): MarketplacePageSize {
  const parsed = Number(value);
  if (MARKETPLACE_PAGE_SIZE_OPTIONS.includes(parsed as MarketplacePageSize)) {
    return parsed as MarketplacePageSize;
  }
  return defaultMarketplaceQueryState.limit;
}

function parseEnumValue<T extends readonly string[]>(
  value: string | undefined,
  options: T,
  fallback: T[number]
): T[number] {
  if (value && options.includes(value)) {
    return value as T[number];
  }
  return fallback;
}

export function parseMarketplaceQueryState(searchParams: SearchParamInput): MarketplaceQueryState {
  const rawPage = getFirstParamValue(searchParams, 'page');
  const rawLimit = getFirstParamValue(searchParams, 'limit');
  const rawType = getFirstParamValue(searchParams, 'type');
  const rawCategory = getFirstParamValue(searchParams, 'category');
  const rawAvailable = getFirstParamValue(searchParams, 'available');
  const rawSortBy = getFirstParamValue(searchParams, 'sortBy');
  const rawSearch = getFirstParamValue(searchParams, 'search');

  return {
    page: parsePositiveInteger(rawPage, defaultMarketplaceQueryState.page),
    limit: parsePageSize(rawLimit),
    type: parseEnumValue(rawType, MARKETPLACE_FILTER_TYPES, defaultMarketplaceQueryState.type),
    category: parseEnumValue(
      rawCategory,
      MARKETPLACE_FILTER_CATEGORIES,
      defaultMarketplaceQueryState.category
    ),
    availableOnly: rawAvailable === 'false' ? false : defaultMarketplaceQueryState.availableOnly,
    sortBy: parseEnumValue(rawSortBy, MARKETPLACE_SORT_OPTIONS, defaultMarketplaceQueryState.sortBy),
    search: rawSearch?.trim() ?? defaultMarketplaceQueryState.search,
  };
}

export function toMarketplaceQueryParams(state: MarketplaceQueryState): URLSearchParams {
  const params = new URLSearchParams();

  if (state.page !== defaultMarketplaceQueryState.page) {
    params.set('page', String(state.page));
  }

  if (state.limit !== defaultMarketplaceQueryState.limit) {
    params.set('limit', String(state.limit));
  }

  if (state.type !== defaultMarketplaceQueryState.type) {
    params.set('type', state.type);
  }

  if (state.category !== defaultMarketplaceQueryState.category) {
    params.set('category', state.category);
  }

  if (state.availableOnly !== defaultMarketplaceQueryState.availableOnly) {
    params.set('available', String(state.availableOnly));
  }

  if (state.sortBy !== defaultMarketplaceQueryState.sortBy) {
    params.set('sortBy', state.sortBy);
  }

  const trimmedSearch = state.search.trim();
  if (trimmedSearch.length > 0) {
    params.set('search', trimmedSearch);
  }

  return params;
}

export function toMarketplaceQueryString(state: MarketplaceQueryState): string {
  return toMarketplaceQueryParams(state).toString();
}

export function isMarketplaceQueryStateEqual(
  first: MarketplaceQueryState,
  second: MarketplaceQueryState
): boolean {
  return toMarketplaceQueryString(first) === toMarketplaceQueryString(second);
}
