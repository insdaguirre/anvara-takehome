import Link from 'next/link';
import { CheckCircle2 } from 'lucide-react';
import GradientText from './GradientText';

const socialProofItems = [
  'No setup fees — free to list and browse',
  'Trusted by 500+ publishers and sponsors',
  'Average campaign launched in under 24 hours',
];

export function CtaSection() {
  return (
    <section
      aria-label="Get started"
      className="relative left-1/2 w-screen -translate-x-1/2 py-16 md:py-24"
    >
      <div className="mx-auto max-w-6xl px-4">
        <div className="rounded-2xl bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-primary-hover)] px-6 py-16 text-center text-white md:px-12 md:py-20">
          <h2 className="text-3xl font-bold md:text-4xl">
            <GradientText
              colors={['#5227FF', '#FF9FFC', '#B19EEF']}
              animationSpeed={8}
              showBorder={false}
              className="!font-bold"
            >
              Ready to Grow Your Reach?
            </GradientText>
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-white/90">
            Join Anvara today and start connecting with the right partners.
          </p>

          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row sm:gap-4">
            <Link
              href="/login"
              className="inline-flex w-full items-center justify-center rounded-lg bg-white px-6 py-3 font-semibold text-[var(--color-primary)] transition-all duration-200 hover:bg-gray-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white sm:w-auto md:px-8 md:py-4"
            >
              Get Started Free
            </Link>
          </div>

          <ul className="mx-auto mt-10 w-fit space-y-3 text-left">
            {socialProofItems.map((item) => (
              <li key={item} className="grid grid-cols-[1.25rem_auto] items-start gap-3 text-white/90">
                <CheckCircle2 className="mt-0.5 h-5 w-5 text-white" aria-hidden="true" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
