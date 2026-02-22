import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { GrainientPageShell } from '@/app/components/grainient-page-shell';
import { getUserRole } from '@/lib/auth-helpers';
import {
  getSponsorCampaigns,
  getSponsorDashboardStats,
  type PaginatedCampaignResponse,
  type SponsorDashboardStats,
} from './actions';
import { SponsorDashboardClient } from './components/sponsor-dashboard-client';
import { parseCampaignQueryState } from './query-state';

interface SponsorDashboardPageProps {
  searchParams?:
    | Promise<Record<string, string | string[] | undefined>>
    | Record<string, string | string[] | undefined>;
}

export default async function SponsorDashboard({ searchParams }: SponsorDashboardPageProps) {
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

  const resolvedSearchParams = (await searchParams) ?? {};
  const queryState = parseCampaignQueryState(resolvedSearchParams);

  let campaignData: PaginatedCampaignResponse = {
    data: [],
    pagination: {
      page: queryState.page,
      limit: queryState.limit,
      total: 0,
      totalPages: 0,
    },
  };
  let stats: SponsorDashboardStats = {
    role: 'SPONSOR',
    totalCampaigns: 0,
    activeCampaigns: 0,
    totalBudget: 0,
    totalSpent: 0,
  };
  let campaignError: string | null = null;

  if (roleData.sponsorId) {
    const [statsResult, campaignsResult] = await Promise.allSettled([
      getSponsorDashboardStats(),
      getSponsorCampaigns(queryState),
    ]);

    if (statsResult.status === 'fulfilled' && statsResult.value.role === 'SPONSOR') {
      stats = statsResult.value;
    }

    if (campaignsResult.status === 'fulfilled') {
      campaignData = campaignsResult.value;
    } else {
      campaignError = 'Failed to load campaigns';
    }
  }

  return (
    <GrainientPageShell>
      <SponsorDashboardClient
        campaigns={campaignData.data}
        pagination={campaignData.pagination}
        queryState={queryState}
        stats={stats}
        error={campaignError}
      />
    </GrainientPageShell>
  );
}
