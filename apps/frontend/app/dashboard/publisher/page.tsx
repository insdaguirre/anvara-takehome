import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { GrainientPageShell } from '@/app/components/grainient-page-shell';
import { getUserRole } from '@/lib/auth-helpers';
import type { AdSlot } from '@/lib/types';
import { PublisherDashboardClient } from './components/publisher-dashboard-client';
import { getPublisherAdSlots } from './actions';

export default async function PublisherDashboard() {
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

  // Fetch ad slots (server side)
  let adSlots: AdSlot[] = [];
  let adSlotError: string | null = null;

  if (roleData.publisherId) {
    try {
      adSlots = await getPublisherAdSlots();
    } catch {
      adSlotError = 'Failed to load ad slots';
    }
  }

  return (
    <GrainientPageShell>
      <PublisherDashboardClient adSlots={adSlots} error={adSlotError} />
    </GrainientPageShell>
  );
}
