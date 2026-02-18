'use server';

import { headers } from 'next/headers';
import { revalidatePath } from 'next/cache';
import type { Campaign } from '@/lib/types';
import type { CampaignFormState, CampaignFormValues } from './form-state';

const API_URL = globalThis.process?.env.NEXT_PUBLIC_API_URL || 'http://localhost:4291';
const CAMPAIGN_STATUSES = [
  'DRAFT',
  'PENDING_REVIEW',
  'APPROVED',
  'ACTIVE',
  'PAUSED',
  'COMPLETED',
  'CANCELLED',
] as const;

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

function parseDate(value: unknown): Date | null {
  if (typeof value !== 'string' || value.length === 0) {
    return null;
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return parsed;
}

function getStringField(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === 'string' ? value : '';
}

function getCampaignFormValues(formData: FormData): CampaignFormValues {
  return {
    id: getStringField(formData, 'id'),
    name: getStringField(formData, 'name'),
    description: getStringField(formData, 'description'),
    budget: getStringField(formData, 'budget'),
    startDate: getStringField(formData, 'startDate'),
    endDate: getStringField(formData, 'endDate'),
    status: getStringField(formData, 'status'),
  };
}

export async function getSponsorCampaigns(): Promise<Campaign[]> {
  const cookieHeader = await getRequestCookieHeader();

  const response = await fetch(`${API_URL}/api/campaigns`, {
    headers: {
      Cookie: cookieHeader,
    },
    cache: 'no-store',
  });

  if (!response.ok) {
    throw new Error('Failed to load campaigns');
  }

  return response.json();
}

export async function createCampaign(
  _prevState: CampaignFormState,
  formData: FormData
): Promise<CampaignFormState> {
  const values = getCampaignFormValues(formData);

  const fieldErrors: Record<string, string> = {};

  if (values.name.trim().length === 0) {
    fieldErrors.name = 'Name is required';
  }

  const parsedBudget = parsePositiveNumber(values.budget);
  if (parsedBudget === null) {
    fieldErrors.budget = 'Budget must be greater than 0';
  }

  const parsedStartDate = parseDate(values.startDate);
  if (!parsedStartDate) {
    fieldErrors.startDate = 'Start date is required';
  }

  const parsedEndDate = parseDate(values.endDate);
  if (!parsedEndDate) {
    fieldErrors.endDate = 'End date is required';
  }

  if (parsedStartDate && parsedEndDate && parsedEndDate < parsedStartDate) {
    fieldErrors.endDate = 'End date must be after start date';
  }

  if (Object.keys(fieldErrors).length > 0) {
    return { fieldErrors, values };
  }

  try {
    const cookieHeader = await getRequestCookieHeader();
    const response = await fetch(`${API_URL}/api/campaigns`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: cookieHeader,
      },
      body: JSON.stringify({
        name: values.name.trim(),
        description: values.description.trim() || undefined,
        budget: parsedBudget,
        startDate: parsedStartDate,
        endDate: parsedEndDate,
      }),
    });

    if (!response.ok) {
      const errorMessage = await parseApiError(response, 'Failed to create campaign');
      return { error: errorMessage, values };
    }

    revalidatePath('/dashboard/sponsor');
    return { success: true };
  } catch {
    return { error: 'Failed to create campaign', values };
  }
}

export async function updateCampaign(
  _prevState: CampaignFormState,
  formData: FormData
): Promise<CampaignFormState> {
  const values = getCampaignFormValues(formData);

  if (!values.id) {
    return { error: 'Invalid campaign id', values };
  }

  const fieldErrors: Record<string, string> = {};

  if (values.name.trim().length === 0) {
    fieldErrors.name = 'Name is required';
  }

  const parsedBudget = parsePositiveNumber(values.budget);
  if (parsedBudget === null) {
    fieldErrors.budget = 'Budget must be greater than 0';
  }

  const parsedStartDate = parseDate(values.startDate);
  if (!parsedStartDate) {
    fieldErrors.startDate = 'Start date is required';
  }

  const parsedEndDate = parseDate(values.endDate);
  if (!parsedEndDate) {
    fieldErrors.endDate = 'End date is required';
  }

  if (parsedStartDate && parsedEndDate && parsedEndDate < parsedStartDate) {
    fieldErrors.endDate = 'End date must be after start date';
  }

  if (
    !CAMPAIGN_STATUSES.includes(values.status as (typeof CAMPAIGN_STATUSES)[number])
  ) {
    fieldErrors.status = 'Select a valid campaign status';
  }

  if (Object.keys(fieldErrors).length > 0) {
    return { fieldErrors, values };
  }

  try {
    const cookieHeader = await getRequestCookieHeader();
    const response = await fetch(`${API_URL}/api/campaigns/${values.id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Cookie: cookieHeader,
      },
      body: JSON.stringify({
        name: values.name.trim(),
        description: values.description.trim() || null,
        budget: parsedBudget,
        startDate: parsedStartDate,
        endDate: parsedEndDate,
        status: values.status,
      }),
    });

    if (!response.ok) {
      const errorMessage = await parseApiError(response, 'Failed to update campaign');
      return { error: errorMessage, values };
    }

    revalidatePath('/dashboard/sponsor');
    return { success: true };
  } catch {
    return { error: 'Failed to update campaign', values };
  }
}

export async function deleteCampaign(
  _prevState: CampaignFormState,
  formData: FormData
): Promise<CampaignFormState> {
  const id = formData.get('id');

  if (typeof id !== 'string' || id.length === 0) {
    return { error: 'Invalid campaign id' };
  }

  try {
    const cookieHeader = await getRequestCookieHeader();
    const response = await fetch(`${API_URL}/api/campaigns/${id}`, {
      method: 'DELETE',
      headers: {
        Cookie: cookieHeader,
      },
    });

    if (!response.ok) {
      const errorMessage = await parseApiError(response, 'Failed to delete campaign');
      return { error: errorMessage };
    }

    revalidatePath('/dashboard/sponsor');
    return { success: true };
  } catch {
    return { error: 'Failed to delete campaign' };
  }
}
