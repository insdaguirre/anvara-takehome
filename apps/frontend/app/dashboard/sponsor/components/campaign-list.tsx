import type { Campaign } from '@/lib/types';
import { CampaignCard } from './campaign-card';

// UI-only component. Expects fully resolved data from parent.
interface CampaignListProps {
  campaigns: Campaign[];
  error?: string | null;
}

export function CampaignList({ campaigns, error }: CampaignListProps) {
  // TODO: Add refetch on tab focus for better UX
  // TODO: Add optimistic updates when creating/editing campaigns

  if (error) {
    return <div className="rounded border border-red-200 bg-red-50 p-4 text-red-600">{error}</div>;
  }

  if (campaigns.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-[var(--color-border)] p-8 text-center text-[var(--color-muted)]">
        No campaigns yet. Create your first campaign to get started.
      </div>
    );
  }

  // TODO: Add sorting options (by date, budget, status)
  // TODO: Add pagination if campaigns list gets large
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {campaigns.map((campaign) => (
        <CampaignCard key={campaign.id} campaign={campaign} />
      ))}
    </div>
  );
}
