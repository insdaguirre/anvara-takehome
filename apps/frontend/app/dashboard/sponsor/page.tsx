import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { GrainientPageShell } from '@/app/components/grainient-page-shell';
import { getUserRole } from '@/lib/auth-helpers';
import type { Campaign } from '@/lib/types';
import { getSponsorCampaigns } from './actions';
import { SponsorDashboardClient } from './components/sponsor-dashboard-client';

export default async function SponsorDashboard() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user) {
    redirect('/login');
  }

  // Verify user has 'sponsor' role
  const roleData = await getUserRole(session.user.id, { throwOnUnavailable: true });
  if (roleData.role !== 'sponsor') {
    redirect('/');
  }

  // Fetch campaigns on the server before rendering.
  let campaigns: Campaign[] = [];
  let campaignError: string | null = null;

  if (roleData.sponsorId) {
    try {
      campaigns = await getSponsorCampaigns();
    } catch {
      campaignError = 'Failed to load campaigns';
    }
  }

  return (
    <GrainientPageShell>
      <SponsorDashboardClient campaigns={campaigns} error={campaignError} />
    </GrainientPageShell>
  );
}
