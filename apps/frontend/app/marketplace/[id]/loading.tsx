import { GrainientPageShell } from '@/app/components/grainient-page-shell';

const fillClassName =
  'rounded bg-slate-200 dark:bg-slate-700 motion-safe:animate-pulse motion-reduce:animate-none';

export default function MarketplaceDetailLoading() {
  return (
    <GrainientPageShell>
      <div className="space-y-6 pb-24 lg:pb-0" role="status" aria-live="polite" aria-busy="true">
        <span className="sr-only">Loading listing details...</span>
        <div className={`h-5 w-40 ${fillClassName}`} aria-hidden="true" />

        <div className="space-y-8 lg:grid lg:grid-cols-3 lg:gap-8 lg:space-y-0">
          <div className="space-y-6 lg:col-span-2">
            <section className="rounded-xl border border-[var(--color-border)] bg-[var(--color-background)] p-6">
              <div className="mb-4 flex items-start justify-between gap-3">
                <div className="w-full space-y-3">
                  <div className={`h-8 w-2/3 ${fillClassName}`} aria-hidden="true" />
                  <div className={`h-4 w-1/2 ${fillClassName}`} aria-hidden="true" />
                </div>
                <div className={`h-8 w-20 ${fillClassName}`} aria-hidden="true" />
              </div>
              <div className="space-y-2">
                <div className={`h-4 w-full ${fillClassName}`} aria-hidden="true" />
                <div className={`h-4 w-5/6 ${fillClassName}`} aria-hidden="true" />
              </div>
            </section>

            <section className="rounded-xl border border-[var(--color-border)] bg-[var(--color-background)] p-6">
              <div className={`mb-4 h-6 w-40 ${fillClassName}`} aria-hidden="true" />
              <div className="grid gap-3 sm:grid-cols-3">
                {Array.from({ length: 3 }).map((_, index) => (
                  <div key={index} className="rounded-lg border border-[var(--color-border)] p-4">
                    <div className={`h-4 w-20 ${fillClassName}`} aria-hidden="true" />
                    <div className={`mt-2 h-8 w-16 ${fillClassName}`} aria-hidden="true" />
                  </div>
                ))}
              </div>
            </section>
          </div>

          <aside className="lg:col-span-1">
            <div className="space-y-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-background)] p-6 lg:sticky lg:top-24">
              <div className={`h-10 w-28 ${fillClassName}`} aria-hidden="true" />
              <div className={`h-4 w-24 ${fillClassName}`} aria-hidden="true" />
              <div className="space-y-2">
                <div className={`h-11 w-full ${fillClassName}`} aria-hidden="true" />
                <div className={`h-11 w-full ${fillClassName}`} aria-hidden="true" />
              </div>
            </div>
          </aside>
        </div>
      </div>
    </GrainientPageShell>
  );
}
