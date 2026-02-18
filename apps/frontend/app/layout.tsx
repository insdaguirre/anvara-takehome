import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import './globals.css';
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
  // HINT: If using React Query, you would wrap children with QueryClientProvider here
  // See: https://tanstack.com/query/latest/docs/framework/react/guides/advanced-ssr
  return (
    <html lang="en">
      <body className="min-h-screen antialiased">
        <Nav />
        <main className="mx-auto max-w-6xl p-4">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
