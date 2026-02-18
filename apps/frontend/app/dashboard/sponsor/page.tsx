import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { getUserRole } from '@/lib/auth-helpers';
import type { Campaign } from '@/lib/types';
import { getSponsorCampaigns } from './actions';
import { CampaignList } from './components/campaign-list';

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
      campaigns = await getSponsorCampaigns(roleData.sponsorId);
    } catch {
      campaignError = 'Failed to load campaigns';
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">My Campaigns</h1>
        {/* TODO: Add CreateCampaignButton here */}
      </div>

      <CampaignList campaigns={campaigns} error={campaignError} />
    </div>
  );
}

