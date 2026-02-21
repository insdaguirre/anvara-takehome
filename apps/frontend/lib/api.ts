const API_URL = globalThis.process?.env.NEXT_PUBLIC_API_URL || 'http://localhost:4291';

export type ApiErrorType = 'network' | 'auth' | 'not_found' | 'server' | 'validation' | 'unknown';

interface ApiErrorOptions {
  type: ApiErrorType;
  statusCode?: number;
  fieldErrors?: Record<string, string>;
}

interface ApiErrorPayload {
  error?: unknown;
  fieldErrors?: unknown;
}

export class ApiError extends Error {
  type: ApiErrorType;
  statusCode?: number;
  fieldErrors?: Record<string, string>;

  constructor(message: string, options: ApiErrorOptions) {
    super(message);
    this.name = 'ApiError';
    this.type = options.type;
    this.statusCode = options.statusCode;
    this.fieldErrors = options.fieldErrors;
  }
}

function parseFieldErrors(value: unknown): Record<string, string> | undefined {
  if (!value || typeof value !== 'object') return undefined;

  const entries = Object.entries(value).filter((entry): entry is [string, string] => {
    const [, message] = entry;
    return typeof message === 'string' && message.length > 0;
  });

  if (entries.length === 0) return undefined;
  return Object.fromEntries(entries);
}

function mapStatusToErrorType(status: number): ApiErrorType {
  if (status === 400) return 'validation';
  if (status === 401 || status === 403) return 'auth';
  if (status === 404) return 'not_found';
  if (status >= 500) return 'server';
  return 'unknown';
}

function getFallbackMessage(type: ApiErrorType): string {
  if (type === 'network') return 'Check your internet connection and try again.';
  if (type === 'auth') return 'Please sign in and try again.';
  if (type === 'not_found') return 'This resource could not be found.';
  if (type === 'server') return 'Our servers are temporarily unavailable. Please try again in a moment.';
  if (type === 'validation') return 'Please review your input and try again.';
  return 'Something went wrong. Please try again.';
}

function toPayloadErrorMessage(payload: unknown): string | null {
  if (!payload || typeof payload !== 'object') return null;
  if (!('error' in payload)) return null;
  const message = payload.error;
  if (typeof message !== 'string' || message.length === 0) return null;
  return message;
}

export function isApiError(value: unknown): value is ApiError {
  return value instanceof ApiError;
}

type ApiRequestOptions = Parameters<typeof fetch>[1];

export async function api<T>(endpoint: string, options?: ApiRequestOptions): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${API_URL}${endpoint}`, {
      headers: { 'Content-Type': 'application/json', ...options?.headers },
      credentials: 'include',
      ...options,
    });
  } catch {
    throw new ApiError(getFallbackMessage('network'), { type: 'network' });
  }

  if (!res.ok) {
    let payload: ApiErrorPayload | null = null;
    try {
      payload = (await res.json()) as ApiErrorPayload;
    } catch {
      payload = null;
    }

    const type = mapStatusToErrorType(res.status);
    const message = toPayloadErrorMessage(payload) ?? getFallbackMessage(type);
    const fieldErrors = parseFieldErrors(payload?.fieldErrors);

    throw new ApiError(message, {
      type,
      statusCode: res.status,
      fieldErrors,
    });
  }

  return res.json();
}

// Campaigns
export const getCampaigns = () => api<unknown[]>('/api/campaigns');
export const getCampaign = (id: string) => api<unknown>(`/api/campaigns/${id}`);
export const createCampaign = (data: unknown) =>
  api('/api/campaigns', { method: 'POST', body: JSON.stringify(data) });

// Ad Slots
export const getAdSlots = () => api<unknown[]>('/api/ad-slots');
export const getAdSlot = (id: string) => api<unknown>(`/api/ad-slots/${id}`);
export const createAdSlot = (data: unknown) =>
  api('/api/ad-slots', { method: 'POST', body: JSON.stringify(data) });

// Public marketplace routes
export interface MarketplacePagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface PaginatedMarketplaceResponse<T> {
  data: T[];
  pagination: MarketplacePagination;
}

export interface MarketplaceAdSlotParams {
  page?: number;
  limit?: number;
  type?: string;
  category?: string;
  available?: boolean;
  search?: string;
  sortBy?: string;
}

export function getMarketplaceAdSlots<T = unknown>(
  params: MarketplaceAdSlotParams = {},
  options?: ApiRequestOptions
): Promise<PaginatedMarketplaceResponse<T>> {
  const qs = new URLSearchParams();
  if (params.page !== undefined) qs.set('page', String(params.page));
  if (params.limit !== undefined) qs.set('limit', String(params.limit));
  if (params.type && params.type !== 'ALL') qs.set('type', params.type);
  if (params.category && params.category !== 'ALL') qs.set('category', params.category);
  if (params.available) qs.set('available', 'true');
  if (params.search?.trim()) qs.set('search', params.search.trim());
  if (params.sortBy) qs.set('sortBy', params.sortBy);
  const query = qs.toString();
  return api<PaginatedMarketplaceResponse<T>>(
    `/api/marketplace/ad-slots${query ? `?${query}` : ''}`,
    options
  );
}

export const getMarketplaceAdSlot = (id: string) => api<unknown>(`/api/marketplace/ad-slots/${id}`);

// Placements
export const getPlacements = () => api<unknown[]>('/api/placements');
export const createPlacement = (data: unknown) =>
  api('/api/placements', { method: 'POST', body: JSON.stringify(data) });

// Dashboard
export const getStats = () => api<unknown>('/api/dashboard/stats');
