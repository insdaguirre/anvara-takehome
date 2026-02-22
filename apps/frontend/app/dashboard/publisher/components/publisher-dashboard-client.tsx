'use client';

import { BadgeCheck, DollarSign, LayoutGrid } from 'lucide-react';
import { formatPrice } from '@/lib/format';
import type { AdSlot } from '@/lib/types';
import { DashboardToastRegion } from '../../components/dashboard-toast-region';
import overviewPanelStyles from '../../components/dashboard-overview-panel.module.css';
import { useDashboardToasts } from '../../components/use-dashboard-toasts';
import headingGradientStyles from '../../components/dashboard-heading-gradient.module.css';
import { AdSlotList } from './ad-slot-list';
import { CreateAdSlotButton } from './create-ad-slot-button';
import type { AdSlotQueryState } from '../query-state';

interface DashboardPagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

interface PublisherDashboardStats {
  totalSlots: number;
  availableSlots: number;
  inventoryValue: number;
}

interface PublisherDashboardClientProps {
  adSlots: AdSlot[];
  pagination: DashboardPagination;
  queryState: AdSlotQueryState;
  stats: PublisherDashboardStats;
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
  icon: typeof LayoutGrid;
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

export function PublisherDashboardClient({
  adSlots,
  pagination,
  queryState,
  stats,
  error,
}: PublisherDashboardClientProps) {
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
                Publisher Dashboard
              </span>
            </h1>
            <p className="mt-1 text-sm text-[var(--color-muted)]">
              Manage your ad inventory, keep listings current, and track availability at a glance.
            </p>
          </div>
          <CreateAdSlotButton onToast={pushToast} />
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          <StatCard
            title="Total Slots"
            value={String(stats.totalSlots)}
            helperText="All inventory records"
            icon={LayoutGrid}
          />
          <StatCard
            title="Available"
            value={String(stats.availableSlots)}
            helperText="Open for sponsor bookings"
            icon={BadgeCheck}
          />
          <StatCard
            title="Monthly Inventory"
            value={formatPrice(Number(stats.inventoryValue))}
            helperText="Combined listing value"
            icon={DollarSign}
          />
        </div>
      </section>

      <AdSlotList
        adSlots={adSlots}
        pagination={pagination}
        queryState={queryState}
        totalSlots={stats.totalSlots}
        error={error}
        onToast={pushToast}
      />
      <DashboardToastRegion toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
}
