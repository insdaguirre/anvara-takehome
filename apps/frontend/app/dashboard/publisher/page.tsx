import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { GrainientPageShell } from '@/app/components/grainient-page-shell';
import { getUserRole } from '@/lib/auth-helpers';
import { PublisherDashboardClient } from './components/publisher-dashboard-client';
import {
  getPublisherAdSlots,
  getPublisherDashboardStats,
  type PaginatedAdSlotResponse,
  type PublisherDashboardStats,
} from './actions';
import { parseAdSlotQueryState } from './query-state';

interface PublisherDashboardPageProps {
  searchParams?:
    | Promise<Record<string, string | string[] | undefined>>
    | Record<string, string | string[] | undefined>;
}

export default async function PublisherDashboard({ searchParams }: PublisherDashboardPageProps) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user) {
    redirect('/login');
  }

  // Verify user has 'publisher' role
  const roleData = await getUserRole(session.user.id);
  if (roleData.role !== 'publisher') {
    redirect('/');
  }

  const resolvedSearchParams = (await searchParams) ?? {};
  const queryState = parseAdSlotQueryState(resolvedSearchParams);

  let adSlotData: PaginatedAdSlotResponse = {
    data: [],
    pagination: {
      page: queryState.page,
      limit: queryState.limit,
      total: 0,
      totalPages: 0,
    },
  };
  let stats: PublisherDashboardStats = {
    role: 'PUBLISHER',
    totalSlots: 0,
    availableSlots: 0,
    inventoryValue: 0,
  };
  let adSlotError: string | null = null;

  if (roleData.publisherId) {
    const [statsResult, adSlotsResult] = await Promise.allSettled([
      getPublisherDashboardStats(),
      getPublisherAdSlots(queryState),
    ]);

    if (statsResult.status === 'fulfilled' && statsResult.value.role === 'PUBLISHER') {
      stats = statsResult.value;
    }

    if (adSlotsResult.status === 'fulfilled') {
      adSlotData = adSlotsResult.value;
    } else {
      adSlotError = 'Failed to load ad slots';
    }
  }

  return (
    <GrainientPageShell>
      <PublisherDashboardClient
        adSlots={adSlotData.data}
        pagination={adSlotData.pagination}
        queryState={queryState}
        stats={stats}
        error={adSlotError}
      />
    </GrainientPageShell>
  );
}
