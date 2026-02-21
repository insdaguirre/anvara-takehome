import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';
import { GoogleAnalytics } from '@next/third-parties/google';
import './globals.css';
import { AnalyticsListener } from './components/analytics-listener';
import { Nav } from './components/nav';
import { Footer } from './components/footer';

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

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  const GA_MEASUREMENT_ID = (globalThis.process?.env.NEXT_PUBLIC_GA_MEASUREMENT_ID ?? '').trim();
  const shouldEnableGA = /^G-[A-Z0-9]+$/i.test(GA_MEASUREMENT_ID);
  const themeInitScript = `(() => {
  try {
    const storedTheme = localStorage.getItem('theme');
    const root = document.documentElement;
    const systemIsDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    if (storedTheme === 'light' || storedTheme === 'dark') {
      root.dataset.theme = storedTheme;
      root.classList.toggle('dark', storedTheme === 'dark');
    } else {
      root.removeAttribute('data-theme');
      root.classList.toggle('dark', systemIsDark);
    }
  } catch {
    const root = document.documentElement;
    root.removeAttribute('data-theme');
    root.classList.toggle('dark', window.matchMedia('(prefers-color-scheme: dark)').matches);
  }
})();`;

  // HINT: If using React Query, you would wrap children with QueryClientProvider here
  // See: https://tanstack.com/query/latest/docs/framework/react/guides/advanced-ssr
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body className="flex min-h-screen flex-col antialiased">
        <AnalyticsListener />
        <Nav />
        <main className="mx-auto w-full max-w-6xl flex-1 p-4 motion-safe:animate-[page-enter_300ms_ease-out]">
          {children}
        </main>
        <Footer />
        {shouldEnableGA ? <GoogleAnalytics gaId={GA_MEASUREMENT_ID} /> : null}
      </body>
    </html>
  );
}
