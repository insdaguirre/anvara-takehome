import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { GoogleAnalytics } from '@next/third-parties/google';
import './globals.css';
import { AnalyticsListener } from './components/analytics-listener';
import { Nav } from './components/nav';
import { Footer } from './components/footer';

// TODO: Add ErrorBoundary wrapper for graceful error handling
// TODO: Consider adding a loading.tsx for Suspense boundaries
// TODO: Add Open Graph metadata for social media sharing
// TODO: Add Twitter Card metadata
// TODO: Consider adding favicon and app icons

export const metadata: Metadata = {
  title: 'Anvara Marketplace',
  description: 'Sponsorship marketplace connecting sponsors with publishers',
  // Missing: openGraph, twitter, icons, viewport, etc.
};

export default function RootLayout({ children }: { children: ReactNode }) {
  const GA_MEASUREMENT_ID = (globalThis.process?.env.NEXT_PUBLIC_GA_MEASUREMENT_ID ?? '').trim();
  const shouldEnableGA = /^G-[A-Z0-9]+$/i.test(GA_MEASUREMENT_ID);

  // HINT: If using React Query, you would wrap children with QueryClientProvider here
  // See: https://tanstack.com/query/latest/docs/framework/react/guides/advanced-ssr
  return (
    <html lang="en">
      <body className="min-h-screen antialiased">
        <AnalyticsListener />
        <Nav />
        <main className="mx-auto max-w-6xl p-4">{children}</main>
        <Footer />
        {shouldEnableGA ? <GoogleAnalytics gaId={GA_MEASUREMENT_ID} /> : null}
      </body>
    </html>
  );
}
