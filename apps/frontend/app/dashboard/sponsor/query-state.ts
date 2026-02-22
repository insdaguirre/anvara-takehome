export const CAMPAIGN_PAGE_SIZE_OPTIONS = [6, 12, 24] as const;
export type CampaignPageSize = (typeof CAMPAIGN_PAGE_SIZE_OPTIONS)[number];

export const CAMPAIGN_SORT_OPTIONS = [
  'newest',
  'oldest',
  'budget-high',
  'budget-low',
  'name',
  'status',
] as const;
export type CampaignSortBy = (typeof CAMPAIGN_SORT_OPTIONS)[number];

export const CAMPAIGN_STATUS_FILTERS = [
  'ALL',
  'DRAFT',
  'PENDING_REVIEW',
  'APPROVED',
  'ACTIVE',
  'PAUSED',
  'COMPLETED',
  'CANCELLED',
] as const;
export type CampaignStatusFilter = (typeof CAMPAIGN_STATUS_FILTERS)[number];

export interface CampaignQueryState {
  page: number;
  limit: CampaignPageSize;
  sortBy: CampaignSortBy;
  status: CampaignStatusFilter;
}

type SearchParamRecord = Record<string, string | string[] | undefined>;
interface SearchParamGetter {
  get(name: string): string | null;
}
type SearchParamInput = SearchParamGetter | SearchParamRecord;

export const defaultCampaignQueryState: CampaignQueryState = {
  page: 1,
  limit: 12,
  sortBy: 'newest',
  status: 'ALL',
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

function parsePageSize(value: string | undefined): CampaignPageSize {
  const parsed = Number(value);
  if (CAMPAIGN_PAGE_SIZE_OPTIONS.includes(parsed as CampaignPageSize)) {
    return parsed as CampaignPageSize;
  }
  return defaultCampaignQueryState.limit;
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

export function parseCampaignQueryState(searchParams: SearchParamInput): CampaignQueryState {
  const rawPage = getFirstParamValue(searchParams, 'page');
  const rawLimit = getFirstParamValue(searchParams, 'limit');
  const rawSortBy = getFirstParamValue(searchParams, 'sortBy');
  const rawStatus = getFirstParamValue(searchParams, 'status');

  return {
    page: parsePositiveInteger(rawPage, defaultCampaignQueryState.page),
    limit: parsePageSize(rawLimit),
    sortBy: parseEnumValue(rawSortBy, CAMPAIGN_SORT_OPTIONS, defaultCampaignQueryState.sortBy),
    status: parseEnumValue(rawStatus, CAMPAIGN_STATUS_FILTERS, defaultCampaignQueryState.status),
  };
}

export function toCampaignQueryParams(state: CampaignQueryState): URLSearchParams {
  const params = new URLSearchParams();

  if (state.page !== defaultCampaignQueryState.page) {
    params.set('page', String(state.page));
  }

  if (state.limit !== defaultCampaignQueryState.limit) {
    params.set('limit', String(state.limit));
  }

  if (state.sortBy !== defaultCampaignQueryState.sortBy) {
    params.set('sortBy', state.sortBy);
  }

  if (state.status !== defaultCampaignQueryState.status) {
    params.set('status', state.status);
  }

  return params;
}
