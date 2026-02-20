import { SkeletonCard } from '@/app/components/SkeletonCard';

export default function LoadingPublisherDashboard() {
  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-[var(--color-border)] bg-gradient-to-br from-indigo-50 via-white to-white p-6 shadow-sm">
        <div className="h-8 w-60 rounded bg-slate-200 dark:bg-slate-700 motion-safe:animate-pulse motion-reduce:animate-none" />
        <div className="mt-2 h-4 w-96 max-w-full rounded bg-slate-200 dark:bg-slate-700 motion-safe:animate-pulse motion-reduce:animate-none" />
        <div className="mt-5">
          <SkeletonCard variant="stat" count={3} gridClassName="grid gap-3 sm:grid-cols-3" />
        </div>
      </section>

      <SkeletonCard variant="adSlot" count={3} />
    </div>
  );
}
