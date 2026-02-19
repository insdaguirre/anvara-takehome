import { Compass, Rocket, UserRoundPlus } from 'lucide-react';
import Stepper, { Step } from './Stepper';

const steps = [
  {
    title: 'Create Your Profile',
    description:
      "Sign up as a sponsor or publisher. Tell us about your brand and what you're looking for.",
    icon: UserRoundPlus,
  },
  {
    title: 'Find Your Match',
    description:
      'Browse the marketplace, filter by category and budget, and discover the right partnership.',
    icon: Compass,
  },
  {
    title: 'Launch & Track',
    description:
      'Book a sponsorship, launch your campaign, and track results from your dashboard.',
    icon: Rocket,
  },
];

export function HowItWorksSection() {
  return (
    <section aria-label="How it works" className="py-16 md:py-24">
      <div className="mx-auto max-w-6xl rounded-2xl bg-[var(--color-primary)]/5 px-6 py-16 md:px-10 md:py-20">
        <h2 className="text-center text-3xl font-bold md:text-4xl">How It Works</h2>

        <div className="mt-10">
          <Stepper initialStep={1} backButtonText="Previous" nextButtonText="Next">
            {steps.map((step) => {
              const Icon = step.icon;
              return (
                <Step key={step.title}>
                  <div className="rounded-xl bg-[var(--color-background)] p-6 text-center">
                    <div className="mx-auto mt-4 mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-[var(--color-primary)]/10">
                      <Icon className="h-6 w-6 text-[var(--color-primary)]" aria-hidden="true" />
                    </div>
                    <h3 className="text-lg font-semibold md:text-xl">{step.title}</h3>
                    <p className="mt-2 text-[var(--color-muted)]">{step.description}</p>
                  </div>
                </Step>
              );
            })}
          </Stepper>
        </div>
      </div>
    </section>
  );
}
