interface SkeletonCardProps {
  variant?: 'campaign' | 'adSlot' | 'marketplace' | 'stat';
  count?: number;
  gridClassName?: string;
}

const skeletonFillClassName =
  'rounded bg-slate-200 dark:bg-slate-700 motion-safe:animate-pulse motion-reduce:animate-none';

function CampaignSkeleton() {
  return (
    <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-background)] p-4 shadow-sm">
      <div className={`mb-3 h-4 w-1/4 ${skeletonFillClassName}`} aria-hidden="true" />
      <div className={`mb-2 h-5 w-2/3 ${skeletonFillClassName}`} aria-hidden="true" />
      <div className={`mb-4 h-4 w-full ${skeletonFillClassName}`} aria-hidden="true" />
      <div className={`mb-2 h-4 w-1/2 ${skeletonFillClassName}`} aria-hidden="true" />
      <div className={`mb-4 h-4 w-2/3 ${skeletonFillClassName}`} aria-hidden="true" />
      <div className="flex gap-2">
        <div className={`h-8 flex-1 ${skeletonFillClassName}`} aria-hidden="true" />
        <div className={`h-8 w-20 ${skeletonFillClassName}`} aria-hidden="true" />
      </div>
    </div>
  );
}

function AdSlotSkeleton() {
  return (
    <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-background)] p-4 shadow-sm">
      <div className={`mb-3 h-4 w-1/3 ${skeletonFillClassName}`} aria-hidden="true" />
      <div className={`mb-2 h-5 w-3/4 ${skeletonFillClassName}`} aria-hidden="true" />
      <div className={`mb-3 h-4 w-full ${skeletonFillClassName}`} aria-hidden="true" />
      <div className={`mb-2 h-4 w-1/2 ${skeletonFillClassName}`} aria-hidden="true" />
      <div className={`mb-4 h-4 w-2/3 ${skeletonFillClassName}`} aria-hidden="true" />
      <div className="flex gap-2">
        <div className={`h-8 flex-1 ${skeletonFillClassName}`} aria-hidden="true" />
        <div className={`h-8 w-24 ${skeletonFillClassName}`} aria-hidden="true" />
      </div>
    </div>
  );
}

function MarketplaceSkeleton() {
  return (
    <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-background)] p-4">
      <div className={`mb-3 h-1 w-full ${skeletonFillClassName}`} aria-hidden="true" />
      <div className={`mb-3 h-5 w-3/4 ${skeletonFillClassName}`} aria-hidden="true" />
      <div className={`mb-2 h-4 w-1/2 ${skeletonFillClassName}`} aria-hidden="true" />
      <div className={`mb-2 h-4 w-full ${skeletonFillClassName}`} aria-hidden="true" />
      <div className={`mb-4 h-4 w-2/3 ${skeletonFillClassName}`} aria-hidden="true" />
      <div className={`mb-3 h-4 w-full ${skeletonFillClassName}`} aria-hidden="true" />
      <div className={`h-5 w-1/3 ${skeletonFillClassName}`} aria-hidden="true" />
    </div>
  );
}

function StatSkeleton() {
  return (
    <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-background)] p-4 shadow-sm">
      <div className={`mb-2 h-4 w-1/2 ${skeletonFillClassName}`} aria-hidden="true" />
      <div className={`mb-2 h-8 w-2/3 ${skeletonFillClassName}`} aria-hidden="true" />
      <div className={`h-3 w-3/4 ${skeletonFillClassName}`} aria-hidden="true" />
    </div>
  );
}

const variantToLabel: Record<NonNullable<SkeletonCardProps['variant']>, string> = {
  campaign: 'Loading campaigns',
  adSlot: 'Loading ad slots',
  marketplace: 'Loading marketplace listings',
  stat: 'Loading dashboard stats',
};

const variantToDefaultGrid: Record<NonNullable<SkeletonCardProps['variant']>, string> = {
  campaign: 'grid gap-4 sm:grid-cols-2 lg:grid-cols-3',
  adSlot: 'grid gap-4 sm:grid-cols-2 lg:grid-cols-3',
  marketplace: 'grid gap-4 sm:grid-cols-2 lg:grid-cols-3',
  stat: 'grid gap-3 sm:grid-cols-3',
};

export function SkeletonCard({ variant = 'campaign', count = 1, gridClassName }: SkeletonCardProps) {
  const renderVariant = () => {
    if (variant === 'adSlot') return <AdSlotSkeleton />;
    if (variant === 'marketplace') return <MarketplaceSkeleton />;
    if (variant === 'stat') return <StatSkeleton />;
    return <CampaignSkeleton />;
  };

  return (
    <div role="status" aria-live="polite" aria-busy="true" aria-label={variantToLabel[variant]}>
      <span className="sr-only">{variantToLabel[variant]}</span>
      <div className={gridClassName ?? variantToDefaultGrid[variant]}>
        {Array.from({ length: count }).map((_, index) => (
          <div key={index}>{renderVariant()}</div>
        ))}
      </div>
    </div>
  );
}

