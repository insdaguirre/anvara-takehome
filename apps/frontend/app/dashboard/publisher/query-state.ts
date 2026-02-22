export const AD_SLOT_PAGE_SIZE_OPTIONS = [6, 12, 24] as const;
export type AdSlotPageSize = (typeof AD_SLOT_PAGE_SIZE_OPTIONS)[number];

export const AD_SLOT_SORT_OPTIONS = [
  'newest',
  'oldest',
  'price-high',
  'price-low',
  'name',
  'availability',
] as const;
export type AdSlotSortBy = (typeof AD_SLOT_SORT_OPTIONS)[number];

export const AD_SLOT_TYPE_FILTERS = [
  'ALL',
  'DISPLAY',
  'VIDEO',
  'NATIVE',
  'NEWSLETTER',
  'PODCAST',
] as const;
export type AdSlotTypeFilter = (typeof AD_SLOT_TYPE_FILTERS)[number];

export const AD_SLOT_AVAILABILITY_FILTERS = ['ALL', 'available', 'booked'] as const;
export type AdSlotAvailabilityFilter = (typeof AD_SLOT_AVAILABILITY_FILTERS)[number];

export interface AdSlotQueryState {
  page: number;
  limit: AdSlotPageSize;
  sortBy: AdSlotSortBy;
  type: AdSlotTypeFilter;
  availability: AdSlotAvailabilityFilter;
}

type SearchParamRecord = Record<string, string | string[] | undefined>;
interface SearchParamGetter {
  get(name: string): string | null;
}
type SearchParamInput = SearchParamGetter | SearchParamRecord;

export const defaultAdSlotQueryState: AdSlotQueryState = {
  page: 1,
  limit: 12,
  sortBy: 'newest',
  type: 'ALL',
  availability: 'ALL',
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

function parsePageSize(value: string | undefined): AdSlotPageSize {
  const parsed = Number(value);
  if (AD_SLOT_PAGE_SIZE_OPTIONS.includes(parsed as AdSlotPageSize)) {
    return parsed as AdSlotPageSize;
  }
  return defaultAdSlotQueryState.limit;
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

export function parseAdSlotQueryState(searchParams: SearchParamInput): AdSlotQueryState {
  const rawPage = getFirstParamValue(searchParams, 'page');
  const rawLimit = getFirstParamValue(searchParams, 'limit');
  const rawSortBy = getFirstParamValue(searchParams, 'sortBy');
  const rawType = getFirstParamValue(searchParams, 'type');
  const rawAvailable = getFirstParamValue(searchParams, 'available');

  const availability: AdSlotAvailabilityFilter =
    rawAvailable === 'true'
      ? 'available'
      : rawAvailable === 'false'
        ? 'booked'
        : defaultAdSlotQueryState.availability;

  return {
    page: parsePositiveInteger(rawPage, defaultAdSlotQueryState.page),
    limit: parsePageSize(rawLimit),
    sortBy: parseEnumValue(rawSortBy, AD_SLOT_SORT_OPTIONS, defaultAdSlotQueryState.sortBy),
    type: parseEnumValue(rawType, AD_SLOT_TYPE_FILTERS, defaultAdSlotQueryState.type),
    availability,
  };
}

export function toAdSlotQueryParams(state: AdSlotQueryState): URLSearchParams {
  const params = new URLSearchParams();

  if (state.page !== defaultAdSlotQueryState.page) {
    params.set('page', String(state.page));
  }

  if (state.limit !== defaultAdSlotQueryState.limit) {
    params.set('limit', String(state.limit));
  }

  if (state.sortBy !== defaultAdSlotQueryState.sortBy) {
    params.set('sortBy', state.sortBy);
  }

  if (state.type !== defaultAdSlotQueryState.type) {
    params.set('type', state.type);
  }

  if (state.availability === 'available') {
    params.set('available', 'true');
  } else if (state.availability === 'booked') {
    params.set('available', 'false');
  }

  return params;
}
