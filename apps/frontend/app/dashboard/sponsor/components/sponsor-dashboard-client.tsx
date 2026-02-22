'use client';

import { CircleDollarSign, PlayCircle, Target } from 'lucide-react';
import { formatPrice } from '@/lib/format';
import type { Campaign } from '@/lib/types';
import { DashboardToastRegion } from '../../components/dashboard-toast-region';
import overviewPanelStyles from '../../components/dashboard-overview-panel.module.css';
import { useDashboardToasts } from '../../components/use-dashboard-toasts';
import headingGradientStyles from '../../components/dashboard-heading-gradient.module.css';
import { CampaignList } from './campaign-list';
import { CreateCampaignButton } from './create-campaign-button';
import type { CampaignQueryState } from '../query-state';

interface DashboardPagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

interface SponsorDashboardStats {
  totalCampaigns: number;
  activeCampaigns: number;
  totalBudget: number;
  totalSpent: number;
}

interface SponsorDashboardClientProps {
  campaigns: Campaign[];
  pagination: DashboardPagination;
  queryState: CampaignQueryState;
  stats: SponsorDashboardStats;
  error?: string | null;
}

function StatCard({
  title,
  value,
  helperText,
  icon: Icon,
}: {
  title: string;
  value: string;
  helperText: string;
  icon: typeof Target;
}) {
  return (
    <div
      className={`rounded-xl border border-[var(--color-border)] bg-[var(--color-background)] p-4 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md ${overviewPanelStyles.statCard}`}
    >
      <div className="flex items-center justify-between">
        <p className="text-sm text-[var(--color-muted)]">{title}</p>
        <Icon className="h-4 w-4 text-[var(--color-primary)]" aria-hidden="true" />
      </div>
      <p className="mt-2 text-2xl font-semibold tracking-tight">{value}</p>
      <p className="mt-1 text-xs text-[var(--color-muted)]">{helperText}</p>
    </div>
  );
}

export function SponsorDashboardClient({
  campaigns,
  pagination,
  queryState,
  stats,
  error,
}: SponsorDashboardClientProps) {
  const { toasts, pushToast, dismissToast } = useDashboardToasts();

  return (
    <div className="space-y-6">
      <section
        className={`rounded-2xl border border-[var(--color-border)] p-6 shadow-sm ${overviewPanelStyles.overviewPanel}`}
      >
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-[var(--color-foreground)]">
              <span className={headingGradientStyles.landingCtaHeadingGradient}>
                Sponsor Dashboard
              </span>
            </h1>
            <p className="mt-1 text-sm text-[var(--color-muted)]">
              Launch campaigns, keep targeting aligned, and monitor budget pacing.
            </p>
          </div>
          <CreateCampaignButton onToast={pushToast} />
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          <StatCard
            title="Total Campaigns"
            value={String(stats.totalCampaigns)}
            helperText="All campaign records"
            icon={Target}
          />
          <StatCard
            title="Active"
            value={String(stats.activeCampaigns)}
            helperText="Currently delivering"
            icon={PlayCircle}
          />
          <StatCard
            title="Spent / Budget"
            value={`${formatPrice(Number(stats.totalSpent))} / ${formatPrice(Number(stats.totalBudget))}`}
            helperText="Across all campaigns"
            icon={CircleDollarSign}
          />
        </div>
      </section>

      <CampaignList
        campaigns={campaigns}
        pagination={pagination}
        queryState={queryState}
        error={error}
        onToast={pushToast}
      />
      <DashboardToastRegion toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
}
