import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { getUserRole } from '@/lib/auth-helpers';
import type { AdSlot } from '@/lib/types';
import { AdSlotList } from './components/ad-slot-list';
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
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">My Ad Slots</h1>
        {/* TODO: Add CreateAdSlotButton here */}
      </div>

      <AdSlotList adSlots={adSlots} error={adSlotError} />
    </div>
  );
}
