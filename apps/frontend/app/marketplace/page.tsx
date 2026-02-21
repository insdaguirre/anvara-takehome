import { GrainientPageShell } from '@/app/components/grainient-page-shell';
import { getMarketplaceAdSlots } from '@/lib/api';
import { AdSlotGrid, type MarketplaceAdSlot } from './components/ad-slot-grid';
import { parseMarketplaceQueryState } from './query-state';

interface MarketplacePageProps {
  searchParams?:
    | Promise<Record<string, string | string[] | undefined>>
    | Record<string, string | string[] | undefined>;
}

export default async function MarketplacePage({ searchParams }: MarketplacePageProps) {
  const resolvedSearchParams = (await searchParams) ?? {};
  const initialQueryState = parseMarketplaceQueryState(resolvedSearchParams);
  const initialResponse = await getMarketplaceAdSlots<MarketplaceAdSlot>(
    {
      page: initialQueryState.page,
      limit: initialQueryState.limit,
      type: initialQueryState.type,
      category: initialQueryState.category,
      available: initialQueryState.availableOnly,
      search: initialQueryState.search,
      sortBy: initialQueryState.sortBy,
    },
    { cache: 'no-store' }
  );

  return (
    <GrainientPageShell>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Find the perfect ad placement for your brand</h1>
          <p className="text-[var(--color-muted)]">
            Compare publishers, audience reach, and pricing to book your next campaign.
          </p>
        </div>

        <AdSlotGrid initialResponse={initialResponse} initialQueryState={initialQueryState} />
      </div>
    </GrainientPageShell>
  );
}
