'use server';

import { cookies } from 'next/headers';
import { headers } from 'next/headers';
import type { AdSlot } from '@/lib/types';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4291';

export async function getPublisherAdSlots(): Promise<AdSlot[]> {
  const cookieStore = await cookies();
  const requestHeaders = await headers();
  const cookieHeader = requestHeaders.get('cookie');

  if (!cookieStore.getAll().length || !cookieHeader) {
    throw new Error('Not authenticated');
  }

  const response = await fetch(`${API_URL}/api/ad-slots`, {
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
