📊 GA4 Integration Implementation Plan
Analytics Challenge 1: Google Analytics Setup

Assumptions / Repo Findings
Architecture
Router Type: App Router (Next.js 13+) — confirmed by presence of app/layout.tsx
Root Layout: apps/frontend/app/layout.tsx
No Pages Router: No _app.tsx found
Next.js Version: 16.1.3 (confirmed in apps/frontend/package.json)
Existing Analytics Infrastructure
Custom Event System: apps/frontend/lib/analytics.ts
Already tracking marketplace funnel: marketplace_view, listing_card_click, listing_view
Already tracking booking funnel: booking_start, booking_submit, booking_success, booking_fail
Already tracking quote funnel: quote_start, quote_submit, quote_success, quote_fail
Console logs in development, queues events (but doesn't send anywhere yet)
Gap: Not connected to GA4
Key User Journeys (Instrumented)
Marketplace Browse Flow:

Grid page: apps/frontend/app/marketplace/page.tsx
Grid component: apps/frontend/app/marketplace/components/ad-slot-grid.tsx
Already fires: marketplace_view, listing_card_click
Listing Detail Flow:

Detail page: apps/frontend/app/marketplace/[id]/page.tsx
Detail component: apps/frontend/app/marketplace/[id]/components/ad-slot-detail.tsx
Already fires: listing_view
Booking Flow:

Modal: apps/frontend/app/marketplace/[id]/components/booking-modal.tsx
Already fires: booking_start, booking_submit, booking_success, booking_fail
Quote Request Flow:

Modal: apps/frontend/app/marketplace/[id]/components/quote-modal.tsx
Already fires: quote_start, quote_submit, quote_success, quote_fail
Newsletter Signup Flow (missing analytics):

Footer: apps/frontend/app/components/footer.tsx
Server action: apps/frontend/app/components/footer-actions.ts
Gap: No tracking for newsletter signup events
Environment & Build
Env File: .env at repo root
Next Config: apps/frontend/next.config.ts
Package Manager: pnpm 10.28.0
Implementation Plan
Step 1: Install @next/third-parties
Action: Add GA4 package to frontend dependencies


# From project root
cd apps/frontend
pnpm add @next/third-parties
Files touched: apps/frontend/package.json

Step 2: Configure Environment Variable
Action: Add GA4 Measurement ID to environment configuration

Files to modify:

.env.example — add documentation
.env — add actual value (developer will provide real GA_ID)
New env var:


# Google Analytics 4
# Get this from https://analytics.google.com → Admin → Data Streams → Measurement ID
NEXT_PUBLIC_GA_MEASUREMENT_ID=G-XXXXXXXXXX
Behavior:

If NEXT_PUBLIC_GA_MEASUREMENT_ID is set → GA4 enabled
If not set → GA4 disabled (graceful degradation)
Works in both dev and prod (allows DebugView testing in dev)
Step 3: Integrate GA4 in Root Layout
Action: Add <GoogleAnalytics /> component to root layout

File to modify: apps/frontend/app/layout.tsx

Changes:

Import GoogleAnalytics from @next/third-parties/google
Read NEXT_PUBLIC_GA_MEASUREMENT_ID from env
Conditionally render <GoogleAnalytics gaId={...} /> in <html> tag (not inside <body>)
Add to <head> section for optimal loading
Implementation details:


import { GoogleAnalytics } from '@next/third-parties/google'

const GA_MEASUREMENT_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        {/* existing nav/main/footer */}
      </body>
      {GA_MEASUREMENT_ID && <GoogleAnalytics gaId={GA_MEASUREMENT_ID} />}
    </html>
  )
}
Why this approach:

@next/third-parties/google is Next.js recommended (automatic script optimization, no manual next/script needed)
Loads GA4 with Partytown for off-main-thread execution (performance win)
Auto page views handled by GA4
Step 4: Create GA4 Bridge Utility
Action: Create a utility to pipe custom analytics events to window.gtag

File to create: apps/frontend/lib/ga4-bridge.ts

Purpose:

Safely call window.gtag() only on client
Type-safe event tracking
Guardrails: never throws on SSR, doesn't block UI
Key functions:


// Type-safe GA4 event sender
export function sendGA4Event(
  eventName: string, 
  params?: Record<string, string | number | boolean>
): void

// Check if GA4 is available
function isGA4Available(): boolean
Implementation notes:

Check typeof window !== 'undefined' and typeof window.gtag === 'function'
Silently no-op if GA4 not loaded (e.g., ad blockers)
Console log in dev mode for debugging
Step 5: Enhance analytics.ts to Pipe to GA4
Action: Modify existing analytics utility to bridge events to GA4

File to modify: apps/frontend/lib/analytics.ts

Changes:

Import sendGA4Event from ga4-bridge.ts
Update track() function to call sendGA4Event() in addition to console logging
Map custom event names to GA4 recommended naming (snake_case)
Example:


export function track(event: string, properties: EventProperties = {}): void {
  // ... existing console log and queue logic ...
  
  // Bridge to GA4
  sendGA4Event(event, properties)
}
No changes needed to existing analytics calls in components — they automatically flow through to GA4.

Step 6: Add Newsletter Tracking
Action: Track newsletter signup events

Files to modify:

apps/frontend/lib/analytics.ts — add new methods:


export const analytics = {
  // ... existing methods ...
  
  newsletterSignupStart: () => 
    track('newsletter_signup_start', {}),
    
  newsletterSignupSubmit: (email: string) => 
    track('newsletter_signup_submit', { 
      email_domain: email.split('@')[1] || 'unknown' 
    }),
    
  newsletterSignupSuccess: (email: string) => 
    track('newsletter_signup_success', { 
      email_domain: email.split('@')[1] || 'unknown' 
    }),
    
  newsletterSignupFail: (error: string) => 
    track('newsletter_signup_fail', { error }),
}
apps/frontend/app/components/footer.tsx — add tracking calls:

Track newsletter_signup_start when user focuses email input (useEffect on mount or focus)
Track newsletter_signup_submit when form submits (before server action)
Track newsletter_signup_success when state.success === true
Track newsletter_signup_fail when state.error is set
Trigger points:

newsletter_signup_start: On first input focus (useRef to prevent duplicate fires)
newsletter_signup_submit: In form onSubmit before formAction call (client-side)
newsletter_signup_success: In useEffect watching state.success
newsletter_signup_fail: In useEffect watching state.error
Step 7: Add Route Change Tracking
Action: Track SPA-style navigation between pages

File to create: apps/frontend/app/components/analytics-listener.tsx

Purpose:

Listen to route changes in App Router
Fire custom page_view event on navigation (separate from GA4's auto page views)
Track specific high-value navigations (marketplace → detail, detail → booking)
Implementation:


'use client'

import { useEffect, useRef } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'
import { sendGA4Event } from '@/lib/ga4-bridge'

export function AnalyticsListener() {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const previousPathRef = useRef<string | null>(null)
  
  useEffect(() => {
    const currentPath = pathname + (searchParams?.toString() ? `?${searchParams}` : '')
    
    // Skip initial page load (GA4 auto page_view handles it)
    if (previousPathRef.current === null) {
      previousPathRef.current = currentPath
      return
    }
    
    // Track navigation event
    const from = previousPathRef.current
    const to = currentPath
    
    sendGA4Event('navigation', {
      from_page: from,
      to_page: to,
      navigation_type: 'spa_route_change'
    })
    
    // Track specific high-value transitions
    if (from.startsWith('/marketplace') && to.startsWith('/marketplace/') && to.match(/^\/marketplace\/[^\/]+$/)) {
      sendGA4Event('marketplace_to_detail_navigation', { listing_id: to.split('/')[2] })
    }
    
    previousPathRef.current = currentPath
  }, [pathname, searchParams])
  
  return null
}
File to modify: apps/frontend/app/layout.tsx

Import and render <AnalyticsListener /> inside <body> (client component, needs DOM)
Step 8: Add Engagement Tracking (Scroll Depth)
Action: Track simple engagement metric without high-frequency events

File to modify: apps/frontend/app/marketplace/[id]/components/ad-slot-detail.tsx

Changes:

Add scroll depth tracker (fires once at 50% scroll)
Track time spent on listing (fire event on unmount if > 10s)
Implementation:


// In AdSlotDetail component
useEffect(() => {
  if (!adSlot) return
  
  const hasTracked50Percent = { current: false }
  const viewStartTime = Date.now()
  
  const handleScroll = () => {
    if (hasTracked50Percent.current) return
    
    const scrollPercent = (window.scrollY / (document.body.scrollHeight - window.innerHeight)) * 100
    
    if (scrollPercent >= 50) {
      hasTracked50Percent.current = true
      analytics.listingScrollDepth(adSlot.id, 50)
      window.removeEventListener('scroll', handleScroll)
    }
  }
  
  window.addEventListener('scroll', handleScroll, { passive: true })
  
  return () => {
    window.removeEventListener('scroll', handleScroll)
    
    const viewDurationSeconds = Math.floor((Date.now() - viewStartTime) / 1000)
    if (viewDurationSeconds >= 10) {
      analytics.listingViewDuration(adSlot.id, viewDurationSeconds)
    }
  }
}, [adSlot])
Add to apps/frontend/lib/analytics.ts:


listingScrollDepth: (slotId: string, depth: number) =>
  track('listing_scroll_depth', { slot_id: slotId, depth_percent: depth }),

listingViewDuration: (slotId: string, durationSeconds: number) =>
  track('listing_view_duration', { slot_id: slotId, duration_seconds: durationSeconds }),
Performance note:

Scroll listener is passive
Fires max once per page
Cleanup on unmount
Event Specification Table
Event Name	Trigger	Location (File:Line)	Parameters	Notes
marketplace_view	User lands on marketplace grid	ad-slot-grid.tsx:98	slot_count (number)	Already implemented ✅
listing_card_click	Click on listing card	ad-slot-grid.tsx:199	slot_id, slot_name, slot_type, price	Already implemented ✅
listing_view	Detail page loads	ad-slot-detail.tsx:110	slot_id, slot_name, slot_type, price, is_available	Already implemented ✅
listing_scroll_depth	User scrolls 50% on detail page	ad-slot-detail.tsx (new)	slot_id, depth_percent	NEW — Step 8
listing_view_duration	User spends 10+ seconds on detail	ad-slot-detail.tsx (new)	slot_id, duration_seconds	NEW — Step 8
booking_start	Booking modal opens	booking-modal.tsx:58	slot_id, slot_name, price	Already implemented ✅
booking_submit	Booking form submitted	booking-modal.tsx:87	slot_id, slot_name, price, has_message	Already implemented ✅
booking_success	Booking request successful	booking-modal.tsx:114	slot_id, slot_name, price	Already implemented ✅
booking_fail	Booking request failed	booking-modal.tsx:122	slot_id, slot_name, error	Already implemented ✅
quote_start	Quote modal opens	quote-modal.tsx:192	slot_id, slot_name, price	Already implemented ✅
quote_submit	Quote form submitted	quote-modal.tsx:308	slot_id, slot_name, price, has_company, has_phone, has_budget, has_goals, has_timeline, message_length, has_attachments, attachment_count, is_logged_in	Already implemented ✅
quote_success	Quote request successful	quote-modal.tsx:340	slot_id, slot_name, price, quote_id	Already implemented ✅
quote_fail	Quote request failed	quote-modal.tsx:353	slot_id, slot_name, error	Already implemented ✅
newsletter_signup_start	User focuses newsletter email	footer.tsx (new)	none	NEW — Step 6
newsletter_signup_submit	Newsletter form submitted	footer.tsx (new)	email_domain	NEW — Step 6
newsletter_signup_success	Newsletter signup successful	footer.tsx (new)	email_domain	NEW — Step 6
newsletter_signup_fail	Newsletter signup failed	footer.tsx (new)	error	NEW — Step 6
navigation	SPA route change	analytics-listener.tsx (new)	from_page, to_page, navigation_type	NEW — Step 7
marketplace_to_detail_navigation	Navigate grid → detail	analytics-listener.tsx (new)	listing_id	NEW — Step 7 (high-value path)
Event naming convention: GA4 recommended style (lowercase snake_case, no spaces, descriptive)

Parameter naming: GA4 recommended style (lowercase snake_case)

Deduplication strategy:

Use useRef to track "already fired" state for one-time events (e.g., listing_view, newsletter_signup_start)
Scroll depth fires max once per page load
Route changes use previous path comparison to avoid duplicate fires
Verification Steps
1. DevTools Network Verification
What to do:

Open Chrome DevTools → Network tab
Filter by: google-analytics or analytics or collect
Perform user actions (click CTA, submit form, navigate)
Verify requests to:
https://www.google-analytics.com/g/collect?... (GA4 endpoint)
Query params include: en= (event name), ep. (event parameters)
What to look for:

Event names in en= param: booking_start, quote_submit, etc.
Parameters in ep.slot_id=, ep.price=, etc.
Measurement ID in tid= param matches your NEXT_PUBLIC_GA_MEASUREMENT_ID
2. GA4 DebugView Verification
Setup:

Enable debug mode by adding this to apps/frontend/lib/ga4-bridge.ts:


sendGA4Event(eventName, { ...params, debug_mode: true })
Or via browser extension: GA Debugger Chrome Extension

Open GA4 property → Admin → DebugView (left sidebar under "Configure")

What to verify:

Real-time events appear in DebugView within 10-30 seconds
Custom events show with correct parameters
Event count matches your test actions
No errors in event payload
3. Manual Test Script
Run through this checklist (5 minutes):

Marketplace Browse:

 Navigate to /marketplace
 Verify marketplace_view fires (check Network tab)
 Click a listing card
 Verify listing_card_click fires with slot_id, slot_name, slot_type, price
Listing Detail:

 Land on /marketplace/[id]
 Verify listing_view fires
 Scroll down 50%
 Verify listing_scroll_depth fires with depth_percent: 50
 Stay on page for 10+ seconds, then navigate away
 Verify listing_view_duration fires
Booking Flow:

 Click "Book This Placement" CTA
 Verify booking_start fires
 Fill form and submit
 Verify booking_submit fires
 On success, verify booking_success fires
 (Test failure case separately if possible)
Quote Request Flow:

 Click "Request a Quote" CTA
 Verify quote_start fires
 Fill form and submit
 Verify quote_submit fires with metadata (has_company, has_phone, etc.)
 On success, verify quote_success fires with quote_id
Newsletter Signup:

 Scroll to footer
 Focus email input
 Verify newsletter_signup_start fires
 Enter email and submit
 Verify newsletter_signup_submit fires
 On success, verify newsletter_signup_success fires
Navigation:

 Navigate from /marketplace to /marketplace/[id]
 Verify navigation event fires with from_page and to_page
 Verify marketplace_to_detail_navigation fires with listing_id
Production Build:

 Run pnpm build in apps/frontend
 Run pnpm start
 Verify GA4 loads in production mode (no debug_mode param)
 Verify events still fire
Console validation (dev mode only):

All events should also log to console with [Analytics] prefix
Check for any errors in browser console
Open Questions / Risks
Q1: Do we have a GA4 property created?
Impact: Cannot test without a real G-XXXXXXXXXX Measurement ID

Mitigation: Developer can use a personal GA4 property for testing, or create one at analytics.google.com

Q2: Should GA4 be enabled in development?
Recommendation: YES — enables DebugView testing

Trade-off: Dev events may pollute analytics (can filter by hostname in GA4)

Alternative: Use separate GA4 properties for dev (NEXT_PUBLIC_GA_MEASUREMENT_ID_DEV) and prod (NEXT_PUBLIC_GA_MEASUREMENT_ID_PROD)

Q3: Newsletter tracking in Server Actions
Challenge: Newsletter signup uses Server Actions (footer-actions.ts), which run on server

Solution: Track on client side in footer.tsx before/after form submission using useActionState hooks

Note: Cannot track inside server action itself (no window.gtag on server)

Q4: Ad Blockers
Risk: GA4 scripts blocked by privacy extensions (10-30% of users)

Mitigation: ga4-bridge.ts gracefully handles missing window.gtag (no-op, no errors)

Note: Analytics will undercount, but won't break UX

Q5: Performance Impact
Risk: Too many events slow down UI

Mitigation:

GA4 runs in Partytown (web worker, off main thread)
Event tracking is async, non-blocking
Scroll listener is passive
All event fires are debounced (one-time) or on user action (not high-frequency)
Estimated impact: < 5ms per event, negligible on modern browsers

Summary of Deliverables
New Files to Create (3)
apps/frontend/lib/ga4-bridge.ts — GA4 event sender utility
apps/frontend/app/components/analytics-listener.tsx — Route change tracker
Files to Modify (6)
apps/frontend/package.json — add @next/third-parties
.env.example + .env — add NEXT_PUBLIC_GA_MEASUREMENT_ID
apps/frontend/app/layout.tsx — render <GoogleAnalytics /> + <AnalyticsListener />
apps/frontend/lib/analytics.ts — bridge to GA4 + add newsletter/engagement methods
apps/frontend/app/components/footer.tsx — add newsletter tracking
apps/frontend/app/marketplace/[id]/components/ad-slot-detail.tsx — add scroll depth + view duration tracking
Total Events Tracked: 18
Existing (10): marketplace_view, listing_card_click, listing_view, booking_* (4), quote_* (4)
New (8): newsletter_signup_* (4), navigation (2), listing engagement (2)
Estimated Implementation Time
Step 1-3 (Install + Config + Layout): 15 minutes
Step 4-5 (Bridge Utility + Pipe Events): 30 minutes
Step 6 (Newsletter Tracking): 20 minutes
Step 7 (Route Change Tracking): 25 minutes
Step 8 (Engagement Tracking): 20 minutes
Verification: 15 minutes
Total: ~2 hours for experienced Next.js developer
End of Plan — Ready for implementation approval ✅
