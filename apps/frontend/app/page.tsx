import Link from 'next/link';

// TODO: This should be a marketing landing page, not just a simple welcome screen
// TODO: Add proper metadata for SEO (title, description, Open Graph)
// TODO: Add hero section, features, testimonials, etc.
// HINT: Check out the bonus challenge for marketing landing page!

export default function Home() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center text-center">
      <h1 className="mb-4 text-4xl font-bold">Welcome to Anvara</h1>
      <p className="mb-8 max-w-md text-[var(--color-muted)]">
        The sponsorship marketplace connecting sponsors with publishers.
      </p>

      <div className="flex gap-4">
        <a
          href="/login"
          className="rounded-lg bg-[var(--color-primary)] px-6 py-3 text-white hover:bg-[var(--color-primary-hover)]"
        >
          Get Started
        </a>
      </div>

      <div className="mt-16 grid gap-8 text-left sm:grid-cols-2">
        <div className="rounded-lg border border-[var(--color-border)] p-6">
          <h2 className="mb-2 text-lg font-semibold text-[var(--color-primary)]">For Sponsors</h2>
          <p className="text-sm text-[var(--color-muted)]">
            Create campaigns, set budgets, and reach your target audience through premium
            publishers.
          </p>
        </div>
        <div className="rounded-lg border border-[var(--color-border)] p-6">
          <h2 className="mb-2 text-lg font-semibold text-[var(--color-secondary)]">For Publishers</h2>
          <p className="text-sm text-[var(--color-muted)]">
            List your ad slots, set your rates, and connect with sponsors looking for your audience.
          </p>
        </div>
      </div>
    </div>
  );
}
