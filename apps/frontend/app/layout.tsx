import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { GoogleAnalytics } from '@next/third-parties/google';
import './globals.css';
import { AnalyticsListener } from './components/analytics-listener';
import { Nav } from './components/nav';
import { Footer } from './components/footer';

// TODO: Add ErrorBoundary wrapper for graceful error handling
// TODO: Consider adding a loading.tsx for Suspense boundaries

export const metadata: Metadata = {
  title: {
    default: 'Anvara Marketplace',
    template: '%s | Anvara',
  },
  description: 'Sponsorship marketplace connecting sponsors with publishers',
  metadataBase: new URL('https://anvara.com'),
  openGraph: {
    type: 'website',
    siteName: 'Anvara',
    locale: 'en_US',
  },
  twitter: {
    card: 'summary',
  },
  icons: {
    icon: '/favicon.ico',
    apple: '/apple-touch-icon.png',
  },
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
