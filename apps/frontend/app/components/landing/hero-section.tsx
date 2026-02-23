import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

export function HeroSection() {
  return (
    <section
      aria-label="Hero"
      className="relative left-1/2 flex min-h-[calc(100svh-15rem)] w-screen -translate-x-1/2 items-start overflow-hidden sm:min-h-[calc(100vh-5rem)] lg:min-h-[calc(100vh-14rem)] lg:items-start"
    >
      <div className="mx-auto max-w-6xl px-4 pt-10 pb-8 text-center sm:py-20 md:py-24 lg:mt-16 lg:pt-16 lg:pb-10 xl:mt-24">
        <h1 className="text-4xl font-bold leading-tight tracking-tight md:text-5xl lg:text-6xl">
          Connect Sponsors with the Right Publishers
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-lg text-[rgb(var(--landing-support-text-rgb))] md:text-xl">
          Anvara is the marketplace that makes sponsorship deals simple. Find your perfect match,
          negotiate terms, and launch campaigns — all in one place.
        </p>

        <div className="mt-7 flex flex-col justify-center gap-3 sm:mt-10 sm:flex-row sm:gap-4">
          <Link
            href="/marketplace"
            className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-[var(--color-primary)] px-6 py-3 font-semibold text-white transition-all duration-200 hover:bg-[var(--color-primary-hover)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-primary)] sm:w-auto md:px-8 md:py-4"
          >
            Browse Marketplace
            <ArrowRight className="h-5 w-5" aria-hidden="true" />
          </Link>
          <Link
            href="/login"
            className="inline-flex w-full items-center justify-center rounded-lg border border-[var(--color-border)] bg-white px-6 py-3 font-semibold text-slate-900 transition-all duration-200 hover:border-[var(--color-primary)]/30 hover:shadow-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-primary)] sm:w-auto md:px-8 md:py-4"
          >
            Get Started Free
          </Link>
        </div>

      </div>
    </section>
  );
}
