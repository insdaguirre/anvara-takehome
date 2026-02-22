'use server';

import { headers } from 'next/headers';
import { revalidatePath } from 'next/cache';
import type { AdSlot } from '@/lib/types';
import type { AdSlotFormState, AdSlotFormValues } from './form-state';
import { toAdSlotQueryParams, type AdSlotQueryState } from './query-state';

const API_URL = globalThis.process?.env.NEXT_PUBLIC_API_URL || 'http://localhost:4291';
const AD_SLOT_TYPES = ['DISPLAY', 'VIDEO', 'NATIVE', 'NEWSLETTER', 'PODCAST'] as const;

async function getRequestCookieHeader(): Promise<string> {
  const requestHeaders = await headers();
  const cookieHeader = requestHeaders.get('cookie');

  if (!cookieHeader) {
    throw new Error('Not authenticated');
  }

  return cookieHeader;
}

async function parseApiError(response: Response, fallbackMessage: string): Promise<string> {
  try {
    const payload = (await response.json()) as { error?: unknown };
    if (typeof payload.error === 'string' && payload.error.length > 0) {
      return payload.error;
    }
  } catch {
    // Ignore and fall back to generic message.
  }

  return fallbackMessage;
}

function parsePositiveNumber(value: unknown): number | null {
  if (typeof value !== 'string') {
    return null;
  }

  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return null;
  }

  return parsed;
}

function getStringField(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === 'string' ? value : '';
}

function getAdSlotFormValues(formData: FormData): AdSlotFormValues {
  return {
    id: getStringField(formData, 'id'),
    name: getStringField(formData, 'name'),
    description: getStringField(formData, 'description'),
    type: getStringField(formData, 'type'),
    basePrice: getStringField(formData, 'basePrice'),
    isAvailable: formData.get('isAvailable') === 'on',
  };
}

export interface DashboardPagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface PaginatedAdSlotResponse {
  data: AdSlot[];
  pagination: DashboardPagination;
}

export interface PublisherDashboardStats {
  role: 'PUBLISHER';
  totalSlots: number;
  availableSlots: number;
  inventoryValue: number;
}

export async function getPublisherAdSlots(
  params: AdSlotQueryState
): Promise<PaginatedAdSlotResponse> {
  const cookieHeader = await getRequestCookieHeader();
  const query = toAdSlotQueryParams(params).toString();

  const response = await fetch(`${API_URL}/api/ad-slots${query ? `?${query}` : ''}`, {
    headers: {
      Cookie: cookieHeader,
    },
    cache: 'no-store',
  });

  if (!response.ok) {
    throw new Error('Failed to load ad slots');
  }

  return response.json();
}

export async function getPublisherDashboardStats(): Promise<PublisherDashboardStats> {
  const cookieHeader = await getRequestCookieHeader();

  const response = await fetch(`${API_URL}/api/dashboard`, {
    headers: {
      Cookie: cookieHeader,
    },
    cache: 'no-store',
  });

  if (!response.ok) {
    throw new Error('Failed to load dashboard stats');
  }

  return response.json();
}

export async function createAdSlot(
  _prevState: AdSlotFormState,
  formData: FormData
): Promise<AdSlotFormState> {
  const values = getAdSlotFormValues(formData);

  const fieldErrors: Record<string, string> = {};

  if (values.name.trim().length === 0) {
    fieldErrors.name = 'Name is required';
  }

  if (!AD_SLOT_TYPES.includes(values.type as (typeof AD_SLOT_TYPES)[number])) {
    fieldErrors.type = 'Select a valid ad slot type';
  }

  const parsedBasePrice = parsePositiveNumber(values.basePrice);
  if (parsedBasePrice === null) {
    fieldErrors.basePrice = 'Base price must be greater than 0';
  }

  if (Object.keys(fieldErrors).length > 0) {
    return { fieldErrors, values };
  }

  try {
    const cookieHeader = await getRequestCookieHeader();
    const response = await fetch(`${API_URL}/api/ad-slots`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: cookieHeader,
      },
      body: JSON.stringify({
        name: values.name.trim(),
        description: values.description.trim() || undefined,
        type: values.type,
        basePrice: parsedBasePrice,
        isAvailable: values.isAvailable,
      }),
    });

    if (!response.ok) {
      const errorMessage = await parseApiError(response, 'Failed to create ad slot');
      return { error: errorMessage, values };
    }

    revalidatePath('/dashboard/publisher');
    return { success: true };
  } catch {
    return { error: 'Failed to create ad slot', values };
  }
}

export async function updateAdSlot(
  _prevState: AdSlotFormState,
  formData: FormData
): Promise<AdSlotFormState> {
  const values = getAdSlotFormValues(formData);

  const fieldErrors: Record<string, string> = {};

  if (!values.id) {
    return { error: 'Invalid ad slot id', values };
  }

  if (values.name.trim().length === 0) {
    fieldErrors.name = 'Name is required';
  }

  if (!AD_SLOT_TYPES.includes(values.type as (typeof AD_SLOT_TYPES)[number])) {
    fieldErrors.type = 'Select a valid ad slot type';
  }

  const parsedBasePrice = parsePositiveNumber(values.basePrice);
  if (parsedBasePrice === null) {
    fieldErrors.basePrice = 'Base price must be greater than 0';
  }

  if (Object.keys(fieldErrors).length > 0) {
    return { fieldErrors, values };
  }

  try {
    const cookieHeader = await getRequestCookieHeader();
    const response = await fetch(`${API_URL}/api/ad-slots/${values.id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Cookie: cookieHeader,
      },
      body: JSON.stringify({
        name: values.name.trim(),
        description: values.description.trim() || null,
        type: values.type,
        basePrice: parsedBasePrice,
        isAvailable: values.isAvailable,
      }),
    });

    if (!response.ok) {
      const errorMessage = await parseApiError(response, 'Failed to update ad slot');
      return { error: errorMessage, values };
    }

    revalidatePath('/dashboard/publisher');
    return { success: true };
  } catch {
    return { error: 'Failed to update ad slot', values };
  }
}

export async function deleteAdSlot(
  _prevState: AdSlotFormState,
  formData: FormData
): Promise<AdSlotFormState> {
  const id = formData.get('id');

  if (typeof id !== 'string' || id.length === 0) {
    return { error: 'Invalid ad slot id' };
  }

  try {
    const cookieHeader = await getRequestCookieHeader();
    const response = await fetch(`${API_URL}/api/ad-slots/${id}`, {
      method: 'DELETE',
      headers: {
        Cookie: cookieHeader,
      },
    });

    if (!response.ok) {
      const errorMessage = await parseApiError(response, 'Failed to delete ad slot');
      return { error: errorMessage };
    }

    revalidatePath('/dashboard/publisher');
    return { success: true };
  } catch {
    return { error: 'Failed to delete ad slot' };
  }
}
