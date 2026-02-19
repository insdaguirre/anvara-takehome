import type { Metadata } from 'next';
import { CtaSection } from './components/landing/cta-section';
import { FeaturesSection } from './components/landing/features-section';
import { HeroSection } from './components/landing/hero-section';
import { HowItWorksSection } from './components/landing/how-it-works-section';
import { LandingBackground } from './components/landing/landing-background';

export const metadata: Metadata = {
  title: 'Anvara — The Sponsorship Marketplace for Publishers & Sponsors',
  description:
    'Find your perfect sponsorship match. Anvara connects sponsors with verified publishers across newsletters, podcasts, video, and display. Browse listings, book campaigns, and grow your reach.',
  openGraph: {
    title: 'Anvara — The Sponsorship Marketplace',
    description:
      'Connect with the right sponsors and publishers. Browse, book, and launch sponsorship campaigns in one place.',
    url: 'https://anvara.com',
    siteName: 'Anvara',
    type: 'website',
    locale: 'en_US',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Anvara — The Sponsorship Marketplace',
    description:
      'Connect sponsors with verified publishers. Browse and book sponsorship campaigns.',
  },
};

export default function Home() {
  return (
    <>
      <LandingBackground />
      <HeroSection />
      <FeaturesSection />
      <HowItWorksSection />
      <CtaSection />
    </>
  );
}
