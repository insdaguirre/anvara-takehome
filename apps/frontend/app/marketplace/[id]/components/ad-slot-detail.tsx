'use client';

import { useEffect, useRef, useState, type MouseEvent } from 'react';
import Link from 'next/link';
import { getMarketplaceAdSlot } from '@/lib/api';
import { authClient } from '@/auth-client';
import { useABTest } from '@/hooks/use-ab-test';
import { analytics } from '@/lib/analytics';
import { formatCompactNumber, formatPrice } from '@/lib/format';
import { BookingModal } from './booking-modal';
import { QuoteModal } from './quote-modal';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4291';

interface AdSlotDetail {
  id: string;
  name: string;
  description?: string | null;
  type: 'DISPLAY' | 'VIDEO' | 'NATIVE' | 'NEWSLETTER' | 'PODCAST';
  position?: string | null;
  width?: number | null;
  height?: number | null;
  basePrice: number;
  isAvailable: boolean;
  _count?: {
    placements?: number;
  };
  placements?: Array<{ id: string }>;
  publisher?: {
    id: string;
    name: string;
    website?: string | null;
    category?: string | null;
    monthlyViews?: number | null;
    subscriberCount?: number | null;
    isVerified?: boolean | null;
    bio?: string | null;
  } | null;
}

interface User {
  id: string;
  name: string;
  email: string;
}

interface RoleInfo {
  role: 'sponsor' | 'publisher' | null;
  sponsorId?: string;
  publisherId?: string;
  name?: string;
}

const typeColors: Record<string, string> = {
  DISPLAY: 'bg-blue-100 text-blue-700',
  VIDEO: 'bg-red-100 text-red-700',
  NATIVE: 'bg-emerald-100 text-emerald-700',
  NEWSLETTER: 'bg-purple-100 text-purple-700',
  PODCAST: 'bg-orange-100 text-orange-700',
};

interface Props {
  id: string;
}

export function AdSlotDetail({ id }: Props) {
  const { variant: ctaButtonTextVariant, trackOutcome } = useABTest('cta-button-text');
  const [adSlot, setAdSlot] = useState<AdSlotDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [roleInfo, setRoleInfo] = useState<RoleInfo | null>(null);
  const [roleLoading, setRoleLoading] = useState(true);
  const [bookingSuccess, setBookingSuccess] = useState(false);
  const [quoteSuccess, setQuoteSuccess] = useState(false);
  const [quoteRequestId, setQuoteRequestId] = useState<string | null>(null);
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
  const [isQuoteModalOpen, setIsQuoteModalOpen] = useState(false);
  const [isFooterVisible, setIsFooterVisible] = useState(false);
  const [returnFocusElement, setReturnFocusElement] = useState<HTMLElement | null>(null);
  const [resetting, setResetting] = useState(false);
  const hasTrackedListingView = useRef(false);
  const pageLoadTimeRef = useRef<number>(Date.now());
  const maxScrollDepthRef = useRef<number>(0);
  const hasTrackedCtaImpressionRef = useRef<{ book: boolean; quote: boolean }>({
    book: false,
    quote: false,
  });

  useEffect(() => {
    getMarketplaceAdSlot(id)
      .then((slot) => setAdSlot(slot as AdSlotDetail))
      .catch(() => setError('Failed to load ad slot details'))
      .finally(() => setLoading(false));

    authClient
      .getSession()
      .then(({ data }) => {
        if (!data?.user) {
          setRoleLoading(false);
          return;
        }

        const sessionUser = data.user as User;
        setUser(sessionUser);

        fetch(`${API_URL}/api/auth/role/${sessionUser.id}`, { credentials: 'include' })
          .then((response) => response.json())
          .then((payload) => setRoleInfo(payload as RoleInfo))
          .catch(() => setRoleInfo(null))
          .finally(() => setRoleLoading(false));
      })
      .catch(() => setRoleLoading(false));
  }, [id]);

  useEffect(() => {
    if (!adSlot || hasTrackedListingView.current) return;
    hasTrackedListingView.current = true;
    analytics.listingView(
      adSlot.id,
      adSlot.name,
      adSlot.type,
      Number(adSlot.basePrice),
      Boolean(adSlot.isAvailable)
    );
  }, [adSlot?.id]);

  useEffect(() => {
    const slotId = adSlot?.id;
    if (!slotId) return;

    const viewStartTime = Date.now();
    pageLoadTimeRef.current = viewStartTime;
    maxScrollDepthRef.current = 0;
    let hasTrackedScrollDepth = false;
    let hasTrackedViewDuration = false;

    const trackViewDuration = () => {
      if (hasTrackedViewDuration) return;
      const durationSeconds = Math.floor((Date.now() - viewStartTime) / 1000);
      if (durationSeconds < 10) return;
      hasTrackedViewDuration = true;
      analytics.listingViewDuration(slotId, durationSeconds);
    };

    const handleScroll = () => {
      const scrollableHeight = document.documentElement.scrollHeight - window.innerHeight;
      if (scrollableHeight <= 0) return;

      const currentScroll = window.scrollY || document.documentElement.scrollTop;
      const scrollPercent = (currentScroll / scrollableHeight) * 100;

      if (scrollPercent > maxScrollDepthRef.current) {
        maxScrollDepthRef.current = scrollPercent;
      }

      if (scrollPercent >= 50) {
        if (hasTrackedScrollDepth) return;
        hasTrackedScrollDepth = true;
        analytics.listingScrollDepth(slotId, 50);
      }
    };

    const handlePageHide = () => {
      trackViewDuration();
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        trackViewDuration();
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('pagehide', handlePageHide);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    handleScroll();

    return () => {
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('pagehide', handlePageHide);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      trackViewDuration();
    };
  }, [adSlot?.id]);

  useEffect(() => {
    if (!adSlot || typeof IntersectionObserver === 'undefined') return;

    hasTrackedCtaImpressionRef.current = { book: false, quote: false };
    const desktopCtas = document.querySelectorAll<HTMLElement>('[data-cta-sidebar]');
    if (desktopCtas.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;

          const ctaType = entry.target.getAttribute('data-cta-type');
          if (ctaType !== 'book' && ctaType !== 'quote') continue;
          if (hasTrackedCtaImpressionRef.current[ctaType]) continue;

          hasTrackedCtaImpressionRef.current[ctaType] = true;
          analytics.ctaImpression(ctaType, 'desktop_sidebar', adSlot.id);
        }
      },
      { threshold: 0.5 }
    );

    for (const cta of desktopCtas) {
      observer.observe(cta);
    }

    return () => observer.disconnect();
  }, [adSlot?.id]);

  useEffect(() => {
    const footer = document.querySelector('footer');
    if (!footer || typeof IntersectionObserver === 'undefined') return;

    const observer = new IntersectionObserver(
      (entries) => {
        setIsFooterVisible(entries[0]?.isIntersecting ?? false);
      },
      { threshold: 0.01 }
    );

    observer.observe(footer);
    return () => observer.disconnect();
  }, []);

  const handleOpenModal = (event: MouseEvent<HTMLElement>) => {
    if (!adSlot) return;

    const ctaLocation =
      event.currentTarget.dataset.location === 'mobile_footer' ? 'mobile_footer' : 'desktop_sidebar';
    trackOutcome('book_click', { cta_location: ctaLocation });
    analytics.ctaClick('book', ctaLocation, adSlot.id, adSlot.name, adSlot.isAvailable);
    setReturnFocusElement(event.currentTarget);
    setIsBookingModalOpen(true);
  };

  const handleOpenQuoteModal = (event: MouseEvent<HTMLElement>) => {
    if (!adSlot || !adSlot.isAvailable) return;

    const ctaLocation =
      event.currentTarget.dataset.location === 'mobile_footer' ? 'mobile_footer' : 'desktop_sidebar';
    trackOutcome('quote_click', { cta_location: ctaLocation });
    analytics.ctaClick('quote', ctaLocation, adSlot.id, adSlot.name, adSlot.isAvailable);
    setReturnFocusElement(event.currentTarget);
    setIsQuoteModalOpen(true);
  };

  const handleBackToMarketplace = () => {
    const timeOnPageSeconds = Math.floor((Date.now() - pageLoadTimeRef.current) / 1000);
    analytics.backToMarketplaceClick(
      window.location.pathname,
      timeOnPageSeconds,
      Math.floor(maxScrollDepthRef.current)
    );
  };

  const handleBookingSuccess = () => {
    setBookingSuccess(true);
    setAdSlot((current) => (current ? { ...current, isAvailable: false } : current));
  };

  const handleQuoteSuccess = (quoteId: string) => {
    setQuoteSuccess(true);
    setQuoteRequestId(quoteId);
  };

  const handleUnbook = async () => {
    if (!adSlot) return;

    setResetting(true);
    try {
      const response = await fetch(`${API_URL}/api/ad-slots/${adSlot.id}/unbook`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to reset booking');
      }

      setBookingSuccess(false);
      setAdSlot({ ...adSlot, isAvailable: true });
    } catch (resetError) {
      console.error('Failed to reset booking:', resetError);
    } finally {
      setResetting(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6 pb-24 lg:pb-0" role="status" aria-live="polite" aria-busy="true">
        <span className="sr-only">Loading listing details...</span>
        <div className="h-5 w-40 rounded bg-gray-200 motion-safe:animate-pulse motion-reduce:animate-none" />

        <div className="space-y-8 lg:grid lg:grid-cols-3 lg:gap-8 lg:space-y-0">
          <div className="space-y-6 lg:col-span-2">
            <section className="rounded-xl border border-[var(--color-border)] bg-[var(--color-background)] p-6">
              <div className="mb-4 flex items-start justify-between gap-3">
                <div className="w-full space-y-3">
                  <div className="h-8 w-2/3 rounded bg-gray-200 motion-safe:animate-pulse motion-reduce:animate-none" />
                  <div className="h-4 w-1/2 rounded bg-gray-200 motion-safe:animate-pulse motion-reduce:animate-none" />
                </div>
                <div className="h-8 w-20 rounded bg-gray-200 motion-safe:animate-pulse motion-reduce:animate-none" />
              </div>
              <div className="space-y-2">
                <div className="h-4 w-full rounded bg-gray-200 motion-safe:animate-pulse motion-reduce:animate-none" />
                <div className="h-4 w-5/6 rounded bg-gray-200 motion-safe:animate-pulse motion-reduce:animate-none" />
              </div>
            </section>

            <section className="rounded-xl border border-[var(--color-border)] bg-[var(--color-background)] p-6">
              <div className="mb-4 h-6 w-40 rounded bg-gray-200 motion-safe:animate-pulse motion-reduce:animate-none" />
              <div className="grid gap-3 sm:grid-cols-3">
                {Array.from({ length: 3 }).map((_, index) => (
                  <div key={index} className="rounded-lg border border-[var(--color-border)] p-4">
                    <div className="h-4 w-20 rounded bg-gray-200 motion-safe:animate-pulse motion-reduce:animate-none" />
                    <div className="mt-2 h-8 w-16 rounded bg-gray-200 motion-safe:animate-pulse motion-reduce:animate-none" />
                  </div>
                ))}
              </div>
            </section>
          </div>

          <aside className="lg:col-span-1">
            <div className="space-y-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-background)] p-6 lg:sticky lg:top-24">
              <div className="h-10 w-28 rounded bg-gray-200 motion-safe:animate-pulse motion-reduce:animate-none" />
              <div className="h-4 w-24 rounded bg-gray-200 motion-safe:animate-pulse motion-reduce:animate-none" />
              <div className="space-y-2">
                <div className="h-11 w-full rounded-lg bg-gray-200 motion-safe:animate-pulse motion-reduce:animate-none" />
                <div className="h-11 w-full rounded-lg bg-gray-200 motion-safe:animate-pulse motion-reduce:animate-none" />
              </div>
            </div>
          </aside>
        </div>
      </div>
    );
  }

  if (error || !adSlot) {
    return (
      <div className="space-y-4">
        <Link
          href="/marketplace"
          onClick={handleBackToMarketplace}
          className="text-[var(--color-primary)] hover:underline"
        >
          ← Back to Marketplace
        </Link>
        <div className="rounded border border-red-200 bg-red-50 p-4 text-red-600">
          {error || 'Ad slot not found'}
        </div>
      </div>
    );
  }

  const publisher = adSlot.publisher;
  const placementCount = adSlot._count?.placements ?? adSlot.placements?.length ?? 0;
  const sponsorName = roleInfo?.name || user?.name || null;
  const loginHref = `/login?redirect=${encodeURIComponent(`/marketplace/${adSlot.id}`)}`;

  const canBook = adSlot.isAvailable && roleInfo?.role === 'sponsor' && Boolean(roleInfo?.sponsorId);
  const shouldShowLogin = adSlot.isAvailable && !roleLoading && !user;
  const isPublisherViewer = !roleLoading && roleInfo?.role === 'publisher';
  const isPublisherRole = adSlot.isAvailable && !roleLoading && roleInfo?.role === 'publisher';
  const isUnknownRole = adSlot.isAvailable && !roleLoading && user && roleInfo?.role !== 'sponsor';
  const canRequestQuote = adSlot.isAvailable && (!user || !roleLoading) && !isPublisherViewer;

  const ctaClassName =
    'inline-flex w-full items-center justify-center rounded-lg px-4 py-3 font-semibold transition-colors';
  const secondaryCtaClassName =
    'inline-flex w-full items-center justify-center rounded-lg border border-[var(--color-primary)] px-4 py-3 font-semibold text-[var(--color-primary)] transition-colors hover:bg-[var(--color-primary)]/10';
  const bookCtaLabel = ctaButtonTextVariant === 'B' ? 'Get Started Now' : 'Book This Placement';

  return (
    <div className="space-y-6 pb-24 lg:pb-0">
      <Link
        href="/marketplace"
        onClick={handleBackToMarketplace}
        className="text-[var(--color-primary)] hover:text-[var(--color-primary-hover)] hover:underline dark:text-white dark:hover:text-white/80"
      >
        ← Back to Marketplace
      </Link>

      <div className="space-y-8 lg:grid lg:grid-cols-3 lg:gap-8 lg:space-y-0">
        <main className="space-y-6 lg:col-span-2">
          <section className="rounded-xl border border-[var(--color-border)] bg-[var(--color-background)] p-6">
            <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
              <div className="space-y-1">
                <h1 className="text-2xl font-bold">{adSlot.name}</h1>
                {publisher && (
                  <p className="text-[var(--color-muted)]">
                    by {publisher.name}{' '}
                    {publisher.isVerified && (
                      <span className="inline-flex items-center gap-1 text-xs text-blue-600">
                        <span className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-blue-100 text-[10px]">
                          ✓
                        </span>
                        Verified
                      </span>
                    )}
                  </p>
                )}
                {publisher?.website && (
                  <a
                    href={publisher.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-[var(--color-primary)] hover:underline"
                  >
                    {publisher.website}
                  </a>
                )}
              </div>
              <span
                className={`rounded px-3 py-1 text-sm font-medium ${typeColors[adSlot.type] || 'bg-gray-100 text-gray-700'}`}
              >
                {adSlot.type}
              </span>
            </div>
            <p className="text-[var(--color-muted)]">
              {adSlot.description || 'No description has been provided for this placement yet.'}
            </p>
          </section>

          {bookingSuccess && (
            <section className="rounded-xl border border-green-200 bg-green-50 p-6 motion-safe:animate-[page-enter_240ms_ease-out]">
              <h2 className="text-lg font-semibold text-green-800">Booking Request Submitted!</h2>
              <p className="mt-2 text-sm text-green-700">What happens next:</p>
              <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm text-green-700">
                <li>Publisher reviews your request.</li>
                <li>You&apos;ll receive a confirmation email once approved.</li>
                <li>Your ad goes live on the agreed start date.</li>
              </ol>

              <div className="mt-4 flex flex-wrap gap-4">
                <Link href="/dashboard/sponsor" className="text-sm font-medium text-green-800 hover:underline">
                  Go to My Campaigns →
                </Link>
                <Link href="/marketplace" className="text-sm font-medium text-green-800 hover:underline">
                  Browse More Listings
                </Link>
              </div>

              {process.env.NODE_ENV === 'development' && (
                <button
                  type="button"
                  onClick={handleUnbook}
                  disabled={resetting}
                  className="mt-4 text-sm text-green-800 underline hover:opacity-80 disabled:opacity-50"
                >
                  {resetting ? 'Resetting...' : 'Reset booking (development only)'}
                </button>
              )}
            </section>
          )}

          {quoteSuccess && (
            <section className="rounded-xl border border-blue-200 bg-blue-50 p-6 motion-safe:animate-[page-enter_240ms_ease-out]">
              <h2 className="text-lg font-semibold text-blue-800">Quote Request Submitted!</h2>
              <p className="mt-2 text-sm text-blue-700">What happens next:</p>
              <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm text-blue-700">
                <li>Our team reviews your request and listing details.</li>
                <li>You&apos;ll receive a tailored quote with next steps by email.</li>
                <li>Approve when ready and we&apos;ll coordinate launch timing.</li>
              </ol>

              {quoteRequestId && (
                <p className="mt-3 text-sm text-blue-700">
                  Reference ID: <span className="font-semibold">{quoteRequestId}</span>
                </p>
              )}

              <div className="mt-4 flex flex-wrap gap-4">
                <button
                  type="button"
                  onClick={(event) => {
                    setQuoteSuccess(false);
                    setQuoteRequestId(null);
                    handleOpenQuoteModal(event);
                  }}
                  className="text-sm font-medium text-blue-800 hover:underline"
                >
                  Request Another Quote
                </button>
                <Link href="/marketplace" className="text-sm font-medium text-blue-800 hover:underline">
                  Back to Marketplace
                </Link>
              </div>
            </section>
          )}

          <section className="rounded-xl border border-[var(--color-border)] bg-[var(--color-background)] p-6">
            <h2 className="text-lg font-semibold">Audience &amp; Reach</h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              <div className="rounded-lg border border-[var(--color-border)] p-4">
                <p className="text-sm text-[var(--color-muted)]">Monthly Views</p>
                <p className="mt-1 text-2xl font-semibold">
                  {publisher?.monthlyViews && publisher.monthlyViews > 0
                    ? formatCompactNumber(publisher.monthlyViews)
                    : 'New'}
                </p>
              </div>
              <div className="rounded-lg border border-[var(--color-border)] p-4">
                <p className="text-sm text-[var(--color-muted)]">Subscribers</p>
                <p className="mt-1 text-2xl font-semibold">
                  {publisher?.subscriberCount && publisher.subscriberCount > 0
                    ? formatCompactNumber(publisher.subscriberCount)
                    : 'Growing'}
                </p>
              </div>
              <div className="rounded-lg border border-[var(--color-border)] p-4">
                <p className="text-sm text-[var(--color-muted)]">Category</p>
                <p className="mt-1 text-2xl font-semibold">{publisher?.category || 'General'}</p>
              </div>
            </div>
          </section>

          <section className="rounded-xl border border-[var(--color-border)] bg-[var(--color-background)] p-6">
            <h2 className="text-lg font-semibold">Placement Details</h2>
            <dl className="mt-4 space-y-3">
              <div className="flex items-center justify-between border-b border-[var(--color-border)] pb-3">
                <dt className="text-[var(--color-muted)]">Position</dt>
                <dd className="font-medium">{adSlot.position || 'Standard'}</dd>
              </div>
              <div className="flex items-center justify-between border-b border-[var(--color-border)] pb-3">
                <dt className="text-[var(--color-muted)]">Ad Type</dt>
                <dd className="font-medium">{adSlot.type}</dd>
              </div>
              {adSlot.width && adSlot.height && (
                <div className="flex items-center justify-between border-b border-[var(--color-border)] pb-3">
                  <dt className="text-[var(--color-muted)]">Dimensions</dt>
                  <dd className="font-medium">
                    {adSlot.width}×{adSlot.height}px
                  </dd>
                </div>
              )}
              <div className="flex items-center justify-between">
                <dt className="text-[var(--color-muted)]">Pricing</dt>
                <dd className="font-medium">{formatPrice(adSlot.basePrice)}/month (flat rate)</dd>
              </div>
            </dl>
          </section>

          <section className="rounded-xl border border-[var(--color-border)] bg-[var(--color-background)] p-6">
            <h2 className="text-lg font-semibold">How It Works</h2>
            <ol className="mt-4 space-y-3 text-sm text-[var(--color-muted)]">
              <li>
                <span className="font-semibold text-[var(--color-foreground)]">1. Request</span> - Submit
                your booking request with an optional message.
              </li>
              <li>
                <span className="font-semibold text-[var(--color-foreground)]">2. Review</span> - The
                publisher reviews and approves within 24h.
              </li>
              <li>
                <span className="font-semibold text-[var(--color-foreground)]">3. Go Live</span> - Your ad
                goes live on the agreed start date.
              </li>
            </ol>
          </section>

          <section className="rounded-xl border border-[var(--color-border)] bg-[var(--color-background)] p-6">
            <h2 className="text-lg font-semibold">About {publisher?.name || 'the Publisher'}</h2>
            <p className="mt-3 text-[var(--color-muted)]">
              {publisher?.bio ||
                `${publisher?.name || 'This publisher'} is a ${(publisher?.category || 'digital').toLowerCase()} publisher.`}
            </p>
            {publisher?.website && (
              <a
                href={publisher.website}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-4 inline-flex text-sm font-medium text-[var(--color-primary)] hover:underline"
              >
                Visit website →
              </a>
            )}
          </section>
        </main>

        <aside className="lg:col-span-1">
          <div className="space-y-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-background)] p-6 lg:sticky lg:top-24">
            <div>
              <p className="text-3xl font-bold text-[var(--color-primary)]">{formatPrice(adSlot.basePrice)}</p>
              <p className="text-sm text-[var(--color-muted)]">per month</p>
            </div>

            <p
              className={`text-sm font-medium ${adSlot.isAvailable ? 'text-green-600' : 'text-[var(--color-muted)]'}`}
            >
              {adSlot.isAvailable ? '● Available' : '○ Currently Booked'}
            </p>

            <div className="space-y-2">
              {!adSlot.isAvailable ? (
                <button
                  type="button"
                  disabled
                  className={`${ctaClassName} cursor-not-allowed bg-gray-300 text-gray-600`}
                >
                  Currently Booked
                </button>
              ) : roleLoading ? (
                <button
                  type="button"
                  disabled
                  className={`${ctaClassName} cursor-not-allowed bg-gray-300 text-gray-600`}
                >
                  Loading...
                </button>
              ) : canBook ? (
                <button
                  type="button"
                  onClick={handleOpenModal}
                  data-location="desktop_sidebar"
                  data-cta-sidebar
                  data-cta-type="book"
                  className={`${ctaClassName} bg-[var(--color-primary)] text-white hover:opacity-90`}
                >
                  {bookCtaLabel}
                </button>
              ) : shouldShowLogin ? (
                <Link
                  href={loginHref}
                  onClick={() =>
                    analytics.ctaClick('login', 'desktop_sidebar', adSlot.id, adSlot.name, adSlot.isAvailable)
                  }
                  className={`${ctaClassName} bg-[var(--color-primary)] text-white hover:opacity-90`}
                >
                  Log in to Book
                </Link>
              ) : isPublisherRole || isUnknownRole ? (
                <button
                  type="button"
                  disabled
                  className={`${ctaClassName} cursor-not-allowed bg-gray-300 text-gray-600`}
                >
                  Only sponsors can book
                </button>
              ) : (
                <button
                  type="button"
                  disabled
                  className={`${ctaClassName} cursor-not-allowed bg-gray-300 text-gray-600`}
                >
                  Unavailable
                </button>
              )}

              {canRequestQuote && (
                <button
                  type="button"
                  onClick={handleOpenQuoteModal}
                  data-location="desktop_sidebar"
                  data-cta-sidebar
                  data-cta-type="quote"
                  className={secondaryCtaClassName}
                >
                  Request a Quote
                </button>
              )}
            </div>

            <div className="space-y-2 border-t border-[var(--color-border)] pt-4 text-sm text-[var(--color-muted)]">
              <p>✓ This is a request, not a binding purchase</p>
              <p>✓ Publisher typically responds within 24h</p>
              <p>✓ Cancel anytime before your placement goes live</p>
            </div>

            {placementCount > 0 && (
              <p className="border-t border-[var(--color-border)] pt-4 text-sm text-[var(--color-muted)]">
                {placementCount} sponsors have booked this slot.
              </p>
            )}

            {publisher?.isVerified && (
              <p className="text-sm font-medium text-blue-600">✓ Verified publisher</p>
            )}
          </div>
        </aside>
      </div>

      {!bookingSuccess && !quoteSuccess && !isFooterVisible && (
        <div className="fixed inset-x-0 bottom-0 z-50 border-t border-[var(--color-border)] bg-[var(--color-background)] px-4 py-3 shadow-lg lg:hidden">
          <div className="mx-auto flex max-w-6xl items-center justify-between gap-3">
            <div>
              <p className="text-lg font-semibold">{formatPrice(adSlot.basePrice)}</p>
              <p className="text-xs text-[var(--color-muted)]">per month</p>
            </div>

            <div className="flex w-full max-w-[16rem] flex-col gap-2 sm:w-auto sm:max-w-none sm:flex-row">
              {!adSlot.isAvailable ? (
                <button
                  type="button"
                  disabled
                  className={`${ctaClassName} w-full cursor-not-allowed bg-gray-300 px-4 py-2 text-sm text-gray-600 sm:w-auto`}
                >
                  Currently Booked
                </button>
              ) : roleLoading ? (
                <button
                  type="button"
                  disabled
                  className={`${ctaClassName} w-full cursor-not-allowed bg-gray-300 px-4 py-2 text-sm text-gray-600 sm:w-auto`}
                >
                  Loading...
                </button>
              ) : canBook ? (
                <button
                  type="button"
                  onClick={handleOpenModal}
                  data-location="mobile_footer"
                  className={`${ctaClassName} w-full bg-[var(--color-primary)] px-4 py-2 text-sm text-white sm:w-auto`}
                >
                  {bookCtaLabel}
                </button>
              ) : shouldShowLogin ? (
                <Link
                  href={loginHref}
                  onClick={() =>
                    analytics.ctaClick('login', 'mobile_footer', adSlot.id, adSlot.name, adSlot.isAvailable)
                  }
                  className={`${ctaClassName} w-full bg-[var(--color-primary)] px-4 py-2 text-sm text-white sm:w-auto`}
                >
                  Log in to Book
                </Link>
              ) : (
                <button
                  type="button"
                  disabled
                  className={`${ctaClassName} w-full cursor-not-allowed bg-gray-300 px-4 py-2 text-sm text-gray-600 sm:w-auto`}
                >
                  Only sponsors can book
                </button>
              )}

              {canRequestQuote && (
                <button
                  type="button"
                  onClick={handleOpenQuoteModal}
                  data-location="mobile_footer"
                  className={`${secondaryCtaClassName} w-full px-4 py-2 text-sm sm:w-auto`}
                >
                  Request a Quote
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      <BookingModal
        isOpen={isBookingModalOpen}
        onClose={() => setIsBookingModalOpen(false)}
        onSuccess={handleBookingSuccess}
        adSlot={adSlot}
        sponsorName={sponsorName}
        returnFocusElement={returnFocusElement}
      />

      <QuoteModal
        isOpen={isQuoteModalOpen}
        onClose={() => setIsQuoteModalOpen(false)}
        onSuccess={handleQuoteSuccess}
        adSlot={adSlot}
        userEmail={user?.email}
        companyName={sponsorName}
        isLoggedIn={Boolean(user)}
        returnFocusElement={returnFocusElement}
      />
    </div>
  );
}
