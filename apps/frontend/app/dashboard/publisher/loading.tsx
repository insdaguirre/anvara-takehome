function SkeletonCard() {
  return (
    <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-background)] p-4 shadow-sm">
      <div className="mb-3 h-4 w-1/3 animate-pulse rounded bg-slate-200" />
      <div className="mb-2 h-5 w-2/3 animate-pulse rounded bg-slate-200" />
      <div className="mb-4 h-4 w-full animate-pulse rounded bg-slate-200" />
      <div className="h-10 animate-pulse rounded bg-slate-200" />
    </div>
  );
}

export default function LoadingPublisherDashboard() {
  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-[var(--color-border)] bg-gradient-to-br from-indigo-50 via-white to-white p-6 shadow-sm">
        <div className="h-8 w-60 animate-pulse rounded bg-slate-200" />
        <div className="mt-2 h-4 w-96 max-w-full animate-pulse rounded bg-slate-200" />
        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          <div className="h-24 animate-pulse rounded-xl bg-slate-200" />
          <div className="h-24 animate-pulse rounded-xl bg-slate-200" />
          <div className="h-24 animate-pulse rounded-xl bg-slate-200" />
        </div>
      </section>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <SkeletonCard />
        <SkeletonCard />
        <SkeletonCard />
      </div>
    </div>
  );
}
