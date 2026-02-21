import { GrainientPageShell } from './components/grainient-page-shell';
import { SkeletonCard } from './components/SkeletonCard';

export default function RootLoading() {
  return (
    <GrainientPageShell>
      <div className="space-y-4">
        <div className="h-12 rounded-xl border border-[var(--color-border)] bg-[var(--color-background)] p-3">
          <div className="h-full w-1/3 rounded bg-slate-200 dark:bg-slate-700 motion-safe:animate-pulse motion-reduce:animate-none" />
        </div>
        <SkeletonCard variant="marketplace" count={6} gridClassName="grid gap-4 sm:grid-cols-2 lg:grid-cols-3" />
      </div>
    </GrainientPageShell>
  );
}
