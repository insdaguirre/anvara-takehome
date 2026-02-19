import { BarChart3, DollarSign, Shield, Target, Users, Zap } from 'lucide-react';

const sponsorFeatures = [
  {
    title: 'Targeted Reach',
    description:
      'Find publishers whose audience matches your ideal customer profile. Filter by category, format, and price.',
    icon: Target,
  },
  {
    title: 'Campaign Analytics',
    description:
      'Track impressions, clicks, and conversions. See exactly how your sponsorship spend performs.',
    icon: BarChart3,
  },
  {
    title: 'Verified Publishers',
    description:
      'Every publisher on Anvara is reviewed for quality. Sponsor with confidence knowing your brand is in good hands.',
    icon: Shield,
  },
];

const publisherFeatures = [
  {
    title: 'Set Your Rates',
    description:
      'List your ad slots at the price you choose. Accept bookings or negotiate custom quotes.',
    icon: DollarSign,
  },
  {
    title: 'Quick Setup',
    description:
      'Create your listing in minutes. Add your formats, audience details, and go live the same day.',
    icon: Zap,
  },
  {
    title: 'Sponsor Network',
    description:
      'Access a growing network of sponsors actively looking for publishers in your niche.',
    icon: Users,
  },
];

const featureCardClassName =
  'rounded-xl border border-[var(--color-border)] bg-[rgb(var(--landing-overlay-rgb)/0.6)] p-6 transition-all duration-200 hover:border-[var(--color-primary)]/30 hover:shadow-md';

export function FeaturesSection() {
  return (
    <section aria-label="Features" className="py-16 md:py-24">
      <div className="mx-auto max-w-6xl">
        <h2 className="text-center text-3xl font-bold md:text-4xl">Why Anvara?</h2>
        <p className="mx-auto mt-4 max-w-2xl text-center text-lg text-[rgb(var(--landing-feature-label-rgb))]">
          Everything sponsors and publishers need to create successful partnerships.
        </p>

        <div className="mt-12 grid grid-cols-1 gap-6 sm:grid-cols-2 md:gap-8 lg:grid-cols-3">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-[rgb(var(--landing-feature-label-rgb))] sm:col-span-2 lg:col-span-3">
            For Sponsors
          </h3>
          {sponsorFeatures.map((feature) => {
            const Icon = feature.icon;
            return (
              <article key={feature.title} className={featureCardClassName}>
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-[var(--color-primary)]/10">
                  <Icon className="h-6 w-6 text-[var(--color-primary)]" aria-hidden="true" />
                </div>
                <h3 className="text-lg font-semibold md:text-xl">{feature.title}</h3>
                <p className="mt-2 text-[var(--color-muted)]">{feature.description}</p>
              </article>
            );
          })}

          <h3 className="mt-2 text-sm font-semibold uppercase tracking-wide text-[rgb(var(--landing-feature-label-rgb))] sm:col-span-2 lg:col-span-3">
            For Publishers
          </h3>
          {publisherFeatures.map((feature) => {
            const Icon = feature.icon;
            return (
              <article key={feature.title} className={featureCardClassName}>
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-[var(--color-secondary)]/10">
                  <Icon className="h-6 w-6 text-[var(--color-secondary)]" aria-hidden="true" />
                </div>
                <h3 className="text-lg font-semibold md:text-xl">{feature.title}</h3>
                <p className="mt-2 text-[var(--color-muted)]">{feature.description}</p>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
