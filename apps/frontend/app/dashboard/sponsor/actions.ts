'use server';

import { getCampaigns } from '@/lib/api';
import type { Campaign } from '@/lib/types';

export async function getSponsorCampaigns(sponsorId: string): Promise<Campaign[]> {
  return getCampaigns(sponsorId);
}
