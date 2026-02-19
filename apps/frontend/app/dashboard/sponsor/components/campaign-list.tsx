'use client';

import { useRouter } from 'next/navigation';
import { AlertCircle, Inbox } from 'lucide-react';
import type { Campaign } from '@/lib/types';
import type { DashboardToastInput } from '../../components/use-dashboard-toasts';
import { CampaignCard } from './campaign-card';

// UI-only component. Expects fully resolved data from parent.
interface CampaignListProps {
  campaigns: Campaign[];
  error?: string | null;
  onToast(toast: DashboardToastInput): void;
}

export function CampaignList({ campaigns, error, onToast }: CampaignListProps) {
  const router = useRouter();

  // TODO: Add refetch on tab focus for better UX
  // TODO: Add optimistic updates when creating/editing campaigns

  if (error) {
    return (
      <div
        className="rounded-xl border border-red-200 bg-red-50 p-5 text-red-700"
        role="alert"
        aria-live="assertive"
      >
        <div className="flex items-start gap-3">
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
          <div>
            <p className="font-semibold">Unable to load campaigns</p>
            <p className="mt-1 text-sm">{error}</p>
            <button
              type="button"
              onClick={() => {
                onToast({
                  tone: 'error',
                  title: 'Refresh requested',
                  message: 'Trying to load your campaigns again.',
                });
                router.refresh();
              }}
              className="mt-3 rounded-lg border border-red-300 px-3 py-1.5 text-sm font-medium transition-colors hover:bg-red-100"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (campaigns.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-[var(--color-border)] bg-[var(--color-background)] p-10 text-center">
        <Inbox className="mx-auto h-9 w-9 text-[var(--color-muted)]" aria-hidden="true" />
        <p className="mt-3 text-lg font-medium text-[var(--color-foreground)]">No campaigns yet</p>
        <p className="mt-1 text-sm text-[var(--color-muted)]">
          Create your first campaign to start reaching publisher audiences.
        </p>
      </div>
    );
  }

  // TODO: Add sorting options (by date, budget, status)
  // TODO: Add pagination if campaigns list gets large
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {campaigns.map((campaign) => (
        <CampaignCard key={campaign.id} campaign={campaign} onToast={onToast} />
      ))}
    </div>
  );
}
