📊 Analytics Challenge 2: Client-Side Conversion Tracking
Implementation Plan
1️⃣ REPO FINDINGS
Analytics Architecture (Files Reviewed)
File Path	Purpose	Status
apps/frontend/lib/analytics.ts	Core analytics module with track() function and helper methods	✅ Exists
apps/frontend/lib/ga4-bridge.ts	GA4 integration via window.gtag	✅ Exists
apps/frontend/app/components/analytics-listener.tsx	SPA route change tracking	✅ Exists
apps/frontend/app/layout.tsx	GoogleAnalytics component integration	✅ Exists
apps/frontend/app/marketplace/components/ad-slot-grid.tsx	Marketplace grid events	✅ Instrumented
apps/frontend/app/marketplace/[id]/components/ad-slot-detail.tsx	Listing detail events	✅ Instrumented
apps/frontend/app/marketplace/[id]/components/booking-modal.tsx	Booking funnel events	✅ Instrumented
apps/frontend/app/marketplace/[id]/components/quote-modal.tsx	Quote funnel events	✅ Instrumented
apps/frontend/app/components/footer.tsx	Newsletter signup events	✅ Instrumented
apps/frontend/app/marketplace/components/marketplace-filters.tsx	Filter/search events	✅ Instrumented
Existing Analytics Conventions
✅ Well-Established Patterns:

Event naming: snake_case (e.g., marketplace_view, booking_start)
Parameter naming: snake_case with typed values (string | number | boolean | null)
Deduplication: useRef pattern to prevent double-firing one-time events
Development logging: console.log('[Analytics] event_name', properties) when NODE_ENV === 'development'
GA4 integration: sendGA4Event(eventName, params) called from track() function
Session tracking: Auto-appended sessionId, timestamp, path, referrer to all events
Event queue: All events stored in eventQueue array for potential debugging/replay
Non-blocking: Fire-and-forget pattern, no awaits blocking UI thread
Current Event Inventory (18 Events Already Implemented)
Marketplace Browse (5 events)
Event Name	Trigger	Location	Parameters
marketplace_view	Grid page loads	ad-slot-grid.tsx:98	slot_count
listing_card_click	Card clicked	ad-slot-grid.tsx:199	slot_id, slot_name, slot_type, price
filterApply	Filter changed	marketplace-filters.tsx:112+	filter_type, filter_value
searchQuery	Search input (500ms debounce)	marketplace-filters.tsx:75	query, result_count
listing_card_impression	Card visible (helper exists)	Not currently fired	slot_id, slot_name, position
Listing Detail (3 events)
Event Name	Trigger	Location	Parameters
listing_view	Detail page loads	ad-slot-detail.tsx:111	slot_id, slot_name, slot_type, price, is_available
listing_scroll_depth	50% scroll depth	ad-slot-detail.tsx:147	slot_id, depth_percent
listing_view_duration	10+ seconds on page	ad-slot-detail.tsx:133	slot_id, duration_seconds
Booking Funnel (4 events)
Event Name	Trigger	Location	Parameters
booking_start	Modal opens	booking-modal.tsx:58	slot_id, slot_name, price
booking_submit	Form submitted	booking-modal.tsx:87	slot_id, slot_name, price, has_message
booking_success	Request succeeds	booking-modal.tsx:114	slot_id, slot_name, price
booking_fail	Request fails	booking-modal.tsx:122	slot_id, slot_name, error
Quote Funnel (4 events)
Event Name	Trigger	Location	Parameters
quote_start	Modal opens	quote-modal.tsx:192	slot_id, slot_name, price
quote_submit	Form submitted	quote-modal.tsx:308	slot_id, slot_name, price, has_company, has_phone, has_budget, has_goals, has_timeline, message_length, has_attachments, attachment_count, is_logged_in
quote_success	Request succeeds	quote-modal.tsx:340	slot_id, slot_name, price, quote_id
quote_fail	Request fails	quote-modal.tsx:353+	slot_id, slot_name, error
Newsletter Funnel (4 events)
Event Name	Trigger	Location	Parameters
newsletter_signup_start	Email input focused	footer.tsx:63	none
newsletter_signup_submit	Form submitted	footer.tsx:72	email_domain
newsletter_signup_success	Signup succeeds	footer.tsx:48	none
newsletter_signup_fail	Signup fails	footer.tsx:55	error
Navigation (2 events)
Event Name	Trigger	Location	Parameters
navigation	SPA route change	analytics-listener.tsx:38	from_page, to_page, navigation_type
marketplace_to_detail_navigation	Grid → Detail nav	analytics-listener.tsx:43	listing_id
2️⃣ EVENT TAXONOMY (Gaps & Additions)
Identified Gaps for "Client-Side Conversion Tracking"
Despite comprehensive existing instrumentation, the following micro/macro conversions are missing or incomplete:

A. CTA Engagement Tracking (Micro-conversions)
Gap: CTA button clicks on detail page are only tracked indirectly via modal opens (booking_start, quote_start). We need explicit CTA click events to:

Differentiate between primary vs secondary CTAs
Track desktop vs mobile sticky footer interactions
Capture "Log in to Book" CTA clicks (no modal, just navigation)
Measure CTA visibility/exposure
New Events Needed:

Event Name	Trigger	Required Parameters
cta_click	Any CTA button clicked	cta_type (book | quote | login), cta_location (desktop_sidebar | mobile_footer), slot_id, slot_name, is_available
cta_impression	CTA scrolls into viewport	cta_type, cta_location, slot_id
B. Modal Abandonment Tracking (Macro-conversion drop-off)
Gap: We track modal opens and submissions, but not when users abandon (close without submitting). Critical for funnel optimization.

New Events Needed:

Event Name	Trigger	Required Parameters
booking_cancel	Booking modal closed without submit	slot_id, slot_name, time_in_modal_seconds, message_filled
quote_cancel	Quote modal closed without submit	slot_id, slot_name, time_in_modal_seconds, fields_filled_count
C. Form Field Engagement (Micro-conversions)
Gap: Quote form tracks metadata on submit, but we don't track in-progress engagement (which fields get focus, validation errors shown).

New Events Needed:

Event Name	Trigger	Required Parameters
quote_field_interaction	Optional field receives input	field_name (phone | budget | goals | timeline | attachments), slot_id
quote_validation_error	Client-side validation fails	field_name, error_message, slot_id
D. Conversion Attribution (Macro-conversion context)
Gap: We don't capture the source that led to conversions (did user come from marketplace grid, direct URL, external link?).

Enhancement Needed:

Add source_page and referrer_type to all *_submit and *_success events
Track initial landing page in session
Enhanced Parameters for Existing Events:

Existing Event	New Parameters
booking_submit	entry_page, referrer_type (internal | external | direct)
quote_submit	entry_page, referrer_type
newsletter_signup_submit	signup_page, referrer_type
E. Return Navigation (Micro-conversions)
Gap: "Back to Marketplace" link clicks not tracked. Important for understanding browse behavior and bounce rates.

New Events Needed:

Event Name	Trigger	Required Parameters
back_to_marketplace_click	"Back to Marketplace" link clicked	from_page, time_on_page_seconds, scroll_depth_percent
F. Error Visibility (Micro-conversions)
Gap: Track when validation/API errors are shown to users. Important for UX debugging.

New Events Needed:

Event Name	Trigger	Required Parameters
booking_error_shown	Booking error message displayed	error_type (validation | api), error_message, slot_id
quote_error_shown	Quote error message displayed	error_type, error_message, slot_id
3️⃣ IMPLEMENTATION PLAN (Step-by-Step)
Prerequisites
✅ GA4 already integrated (@next/third-parties v16.1.6)
✅ Analytics infrastructure exists (analytics.ts, ga4-bridge.ts)
✅ Core funnel events already firing
⚠️ Need to add: CTA clicks, modal abandonment, form engagement, attribution, error tracking
Step 1: Enhance analytics.ts with New Event Helpers
File: apps/frontend/lib/analytics.ts

Changes:

Add new analytics helper methods to the analytics export object
Add session-level attribution tracking utilities
New Code to Add:


// Add to existing analytics export object (after line 192)

// CTA Engagement
ctaClick: (
  ctaType: 'book' | 'quote' | 'login',
  ctaLocation: 'desktop_sidebar' | 'mobile_footer',
  slotId: string,
  slotName: string,
  isAvailable: boolean
) =>
  track('cta_click', {
    cta_type: ctaType,
    cta_location: ctaLocation,
    slot_id: slotId,
    slot_name: slotName,
    is_available: isAvailable,
  }),

ctaImpression: (
  ctaType: 'book' | 'quote',
  ctaLocation: 'desktop_sidebar' | 'mobile_footer',
  slotId: string
) =>
  track('cta_impression', {
    cta_type: ctaType,
    cta_location: ctaLocation,
    slot_id: slotId,
  }),

// Modal Abandonment
bookingCancel: (slotId: string, slotName: string, timeInModalSeconds: number, messageFilled: boolean) =>
  track('booking_cancel', {
    slot_id: slotId,
    slot_name: slotName,
    time_in_modal_seconds: timeInModalSeconds,
    message_filled: messageFilled,
  }),

quoteCancel: (slotId: string, slotName: string, timeInModalSeconds: number, fieldsFilledCount: number) =>
  track('quote_cancel', {
    slot_id: slotId,
    slot_name: slotName,
    time_in_modal_seconds: timeInModalSeconds,
    fields_filled_count: fieldsFilledCount,
  }),

// Form Field Engagement
quoteFieldInteraction: (fieldName: string, slotId: string) =>
  track('quote_field_interaction', { field_name: fieldName, slot_id: slotId }),

quoteValidationError: (fieldName: string, errorMessage: string, slotId: string) =>
  track('quote_validation_error', {
    field_name: fieldName,
    error_message: errorMessage,
    slot_id: slotId,
  }),

// Return Navigation
backToMarketplaceClick: (fromPage: string, timeOnPageSeconds: number, scrollDepthPercent: number) =>
  track('back_to_marketplace_click', {
    from_page: fromPage,
    time_on_page_seconds: timeOnPageSeconds,
    scroll_depth_percent: scrollDepthPercent,
  }),

// Error Visibility
bookingErrorShown: (errorType: 'validation' | 'api', errorMessage: string, slotId: string) =>
  track('booking_error_shown', { error_type: errorType, error_message: errorMessage, slot_id: slotId }),

quoteErrorShown: (errorType: 'validation' | 'api', errorMessage: string, slotId: string) =>
  track('quote_error_shown', { error_type: errorType, error_message: errorMessage, slot_id: slotId }),
New Utility Functions for Attribution:


// Add before the analytics export (around line 56)

// Session attribution tracking
function getEntryPage(): string {
  if (typeof window === 'undefined') return '';
  try {
    const stored = sessionStorage.getItem('_entry_page');
    if (stored) return stored;
    
    const currentPath = window.location.pathname;
    sessionStorage.setItem('_entry_page', currentPath);
    return currentPath;
  } catch {
    return '';
  }
}

function getReferrerType(): 'internal' | 'external' | 'direct' {
  if (typeof document === 'undefined') return 'direct';
  
  const referrer = document.referrer;
  if (!referrer) return 'direct';
  
  try {
    const referrerHost = new URL(referrer).hostname;
    const currentHost = window.location.hostname;
    return referrerHost === currentHost ? 'internal' : 'external';
  } catch {
    return 'direct';
  }
}

// Modify existing track() function to include attribution on conversion events
export function track(event: string, properties: EventProperties = {}): void {
  const analyticsEvent: AnalyticsEvent = {
    event,
    properties: {
      ...properties,
      path: getPath(),
      referrer: getReferrer(),
      // Add attribution to conversion events
      ...(event.includes('_submit') || event.includes('_success')) && {
        entry_page: getEntryPage(),
        referrer_type: getReferrerType(),
      },
    },
    timestamp: new Date().toISOString(),
    sessionId: getSessionId(),
  };
  
  // ... rest of existing track() code
}
Step 2: Add CTA Click Tracking to Detail Page
File: apps/frontend/app/marketplace/[id]/components/ad-slot-detail.tsx

Changes:

Track clicks on "Book This Placement" button (desktop + mobile)
Track clicks on "Request a Quote" button (desktop + mobile)
Track clicks on "Log in to Book" link
Track CTA impressions when CTAs scroll into view
Implementation:


// Add to existing imports (line 7)
import { analytics } from '@/lib/analytics';

// Modify handleOpenModal (line 190)
const handleOpenModal = (event: MouseEvent<HTMLElement>) => {
  const ctaLocation = event.currentTarget.dataset.location as 'desktop_sidebar' | 'mobile_footer';
  analytics.ctaClick('book', ctaLocation, adSlot.id, adSlot.name, adSlot.isAvailable);
  
  setReturnFocusElement(event.currentTarget);
  setIsBookingModalOpen(true);
};

// Modify handleOpenQuoteModal (line 195)
const handleOpenQuoteModal = (event: MouseEvent<HTMLElement>) => {
  if (!adSlot || !adSlot.isAvailable) return;
  
  const ctaLocation = event.currentTarget.dataset.location as 'desktop_sidebar' | 'mobile_footer';
  analytics.ctaClick('quote', ctaLocation, adSlot.id, adSlot.name, adSlot.isAvailable);
  
  setReturnFocusElement(event.currentTarget);
  setIsQuoteModalOpen(true);
};

// Add CTA impression tracking (new useEffect after line 188)
useEffect(() => {
  if (!adSlot || typeof IntersectionObserver === 'undefined') return;
  
  const desktopCtas = document.querySelectorAll('[data-cta-sidebar]');
  const hasTrackedImpression = { book: false, quote: false };
  
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const ctaType = entry.target.getAttribute('data-cta-type') as 'book' | 'quote';
          if (ctaType && !hasTrackedImpression[ctaType]) {
            hasTrackedImpression[ctaType] = true;
            analytics.ctaImpression(ctaType, 'desktop_sidebar', adSlot.id);
          }
        }
      });
    },
    { threshold: 0.5 }
  );
  
  desktopCtas.forEach((cta) => observer.observe(cta));
  
  return () => observer.disconnect();
}, [adSlot?.id]);

// Update button markup to include data attributes:
// Desktop "Book This Placement" button (line 505)
<button
  type="button"
  onClick={handleOpenModal}
  data-location="desktop_sidebar"
  data-cta-sidebar
  data-cta-type="book"
  className={`${ctaClassName} bg-[var(--color-primary)] text-white hover:opacity-90`}
>
  Book This Placement
</button>

// Desktop "Request a Quote" button (line 537)
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

// Mobile sticky footer "Book This Placement" button (line 591)
<button
  type="button"
  onClick={handleOpenModal}
  data-location="mobile_footer"
  className={`${ctaClassName} w-full bg-[var(--color-primary)] px-4 py-2 text-sm text-white sm:w-auto`}
>
  Book This Placement
</button>

// Mobile sticky footer "Request a Quote" button (line 618)
<button
  type="button"
  onClick={handleOpenQuoteModal}
  data-location="mobile_footer"
  className={`${secondaryCtaClassName} w-full px-4 py-2 text-sm sm:w-auto`}
>
  Request a Quote
</button>

// Track "Log in to Book" link clicks (line 511-516 and 599-604)
// Add onClick handler:
<Link
  href={loginHref}
  onClick={() => analytics.ctaClick('login', 'desktop_sidebar', adSlot.id, adSlot.name, adSlot.isAvailable)}
  className={`${ctaClassName} bg-[var(--color-primary)] text-white hover:opacity-90`}
>
  Log in to Book
</Link>

// Mobile version:
<Link
  href={loginHref}
  onClick={() => analytics.ctaClick('login', 'mobile_footer', adSlot.id, adSlot.name, adSlot.isAvailable)}
  className={`${ctaClassName} w-full bg-[var(--color-primary)] px-4 py-2 text-sm text-white sm:w-auto`}
>
  Log in to Book
</Link>
Step 3: Add Modal Abandonment Tracking
Files:

apps/frontend/app/marketplace/[id]/components/booking-modal.tsx
apps/frontend/app/marketplace/[id]/components/quote-modal.tsx
A. Booking Modal Abandonment
File: apps/frontend/app/marketplace/[id]/components/booking-modal.tsx

Changes:


// Add state to track modal open time (after line 37)
const modalOpenTimeRef = useRef<number>(0);

// Update useEffect that runs when modal opens (line 42)
useEffect(() => {
  if (!isOpen) return;

  setMessage('');
  setError(null);
  setBooking(false);
  lastActiveElementRef.current = document.activeElement as HTMLElement | null;
  modalOpenTimeRef.current = Date.now(); // Track open time

  const focusTimeout = window.setTimeout(() => {
    if (sponsorName && companyInputRef.current) {
      companyInputRef.current.focus();
      return;
    }
    messageRef.current?.focus();
  }, 0);

  analytics.bookingStart(adSlot.id, adSlot.name, Number(adSlot.basePrice));

  const onKeyDown = (event: KeyboardEvent) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      handleModalClose(); // Use new close handler
    }
  };

  window.addEventListener('keydown', onKeyDown);

  return () => {
    window.clearTimeout(focusTimeout);
    window.removeEventListener('keydown', onKeyDown);
  };
}, [adSlot.basePrice, adSlot.id, adSlot.name, isOpen, onClose, sponsorName]);

// Add new close handler (before handleSubmit, around line 75)
const handleModalClose = () => {
  // Only track cancel if modal was open and form not submitting
  if (modalOpenTimeRef.current > 0 && !booking) {
    const timeInModalSeconds = Math.floor((Date.now() - modalOpenTimeRef.current) / 1000);
    analytics.bookingCancel(
      adSlot.id,
      adSlot.name,
      timeInModalSeconds,
      Boolean(message.trim())
    );
  }
  modalOpenTimeRef.current = 0;
  onClose();
};

// Modify successful submit to NOT track cancel (in handleSubmit success path, line 115)
analytics.bookingSuccess(adSlot.id, adSlot.name, Number(adSlot.basePrice));
setMessage('');
modalOpenTimeRef.current = 0; // Reset so cancel doesn't fire
onSuccess();
onClose();

// Update close button to use new handler (line 153)
<button
  type="button"
  onClick={handleModalClose}
  className="rounded p-1 text-[var(--color-muted)] hover:bg-gray-100 hover:text-[var(--color-foreground)]"
  aria-label="Close booking modal"
>
  ✕
</button>

// Update backdrop click to use new handler (line 133)
<div
  className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
  onClick={handleModalClose}
  role="presentation"
>
B. Quote Modal Abandonment
File: apps/frontend/app/marketplace/[id]/components/quote-modal.tsx

Changes:


// Add state to track modal open time and field count (after line 165)
const modalOpenTimeRef = useRef<number>(0);

// Update useEffect that runs when modal opens (line 171)
useEffect(() => {
  if (!isOpen) return;

  setValues({
    ...INITIAL_VALUES,
    email: userEmail ?? '',
    companyName: companyName ?? '',
  });
  setAttachments([]);
  if (fileInputRef.current) {
    fileInputRef.current.value = '';
  }
  setSubmitting(false);
  setFormError(null);
  setFieldErrors({});
  lastActiveElementRef.current = document.activeElement as HTMLElement | null;
  modalOpenTimeRef.current = Date.now(); // Track open time

  const focusTimeout = window.setTimeout(() => {
    emailInputRef.current?.focus();
  }, 0);

  analytics.quoteStart(adSlot.id, adSlot.name, Number(adSlot.basePrice));

  const onKeyDown = (event: KeyboardEvent) => {
    if (!modalRef.current) return;

    if (event.key === 'Escape' && !submittingRef.current) {
      event.preventDefault();
      handleModalClose(); // Use new close handler
      return;
    }
    // ... rest of tab trap logic
  };

  window.addEventListener('keydown', onKeyDown);

  return () => {
    window.clearTimeout(focusTimeout);
    window.removeEventListener('keydown', onKeyDown);
  };
}, [adSlot.basePrice, adSlot.id, adSlot.name, companyName, isOpen, onClose, userEmail]);

// Add helper to count filled fields
const getFilledFieldsCount = (): number => {
  let count = 0;
  if (values.email.trim()) count++;
  if (values.companyName.trim()) count++;
  if (values.phone.trim()) count++;
  if (values.budget) count++;
  if (values.goals.trim()) count++;
  if (values.timeline) count++;
  if (values.message.trim()) count++;
  if (attachments.length > 0) count++;
  return count;
};

// Add new close handler (before handleSubmit, around line 240)
const handleModalClose = () => {
  // Only track cancel if modal was open and form not submitting
  if (modalOpenTimeRef.current > 0 && !submitting) {
    const timeInModalSeconds = Math.floor((Date.now() - modalOpenTimeRef.current) / 1000);
    analytics.quoteCancel(
      adSlot.id,
      adSlot.name,
      timeInModalSeconds,
      getFilledFieldsCount()
    );
  }
  modalOpenTimeRef.current = 0;
  onClose();
};

// Modify successful submit to NOT track cancel (in handleSubmit success path, line 339)
onSuccess(quoteId);
analytics.quoteSuccess(adSlot.id, adSlot.name, Number(adSlot.basePrice), quoteId);
modalOpenTimeRef.current = 0; // Reset so cancel doesn't fire
onClose();

// Update close button to use new handler (line 408)
<button
  type="button"
  onClick={handleModalClose}
  disabled={submitting}
  className="rounded p-1 text-[var(--color-muted)] hover:bg-gray-100 hover:text-[var(--color-foreground)] disabled:cursor-not-allowed disabled:opacity-50"
  aria-label="Close quote request modal"
>
  ✕
</button>

// Update backdrop click to use new handler (line 382)
onClick={(event) => {
  if (submitting) return;
  if (event.target === event.currentTarget) {
    handleModalClose();
  }
}}
Step 4: Add Form Field Engagement Tracking (Quote Modal)
File: apps/frontend/app/marketplace/[id]/components/quote-modal.tsx

Changes:


// Track optional field interactions (modify handleFieldChange, line 243)
const handleFieldChange = <K extends keyof QuoteFormValues>(field: K, value: QuoteFormValues[K]) => {
  setValues((current) => ({ ...current, [field]: value }));
  setFieldErrors((current) => {
    if (!current[field]) return current;
    const next = { ...current };
    delete next[field];
    return next;
  });
  
  // Track optional field interactions (not email/companyName which are required)
  const optionalFields = ['phone', 'budget', 'goals', 'timeline'];
  if (optionalFields.includes(field) && value) {
    analytics.quoteFieldInteraction(field, adSlot.id);
  }
};

// Track attachment field interaction (modify handleAttachmentChange, line 253)
const handleAttachmentChange = (event: ChangeEvent<HTMLInputElement>) => {
  const selectedFiles = Array.from(event.target.files ?? []);
  const attachmentError = validateAttachments(selectedFiles);

  if (attachmentError) {
    setAttachments([]);
    setFieldErrors((current) => ({ ...current, attachments: attachmentError }));
    analytics.quoteValidationError('attachments', attachmentError, adSlot.id);
    return;
  }

  setAttachments(selectedFiles);
  setFieldErrors((current) => {
    if (!current.attachments) return current;
    const next = { ...current };
    delete next.attachments;
    return next;
  });
  
  if (selectedFiles.length > 0) {
    analytics.quoteFieldInteraction('attachments', adSlot.id);
  }
};

// Track validation errors shown to user (in handleSubmit, line 345)
if (response.status === 400) {
  const parsedErrors = parseFieldErrors(responsePayload?.fieldErrors);
  const errorMessage =
    typeof responsePayload?.error === 'string' && responsePayload.error.length > 0
      ? responsePayload.error
      : 'Please review the highlighted fields and try again.';
  setFieldErrors(parsedErrors);
  setFormError(errorMessage);
  
  // Track validation errors
  Object.entries(parsedErrors).forEach(([field, message]) => {
    analytics.quoteValidationError(field, message, adSlot.id);
  });
  
  analytics.quoteFail(adSlot.id, adSlot.name, errorMessage);
  return;
}

// Track API errors
if (response.status === 404) {
  const errorMessage = 'This listing is no longer available. Please browse other placements.';
  setFormError(errorMessage);
  analytics.quoteErrorShown('api', errorMessage, adSlot.id);
  analytics.quoteFail(adSlot.id, adSlot.name, errorMessage);
  return;
}

const errorMessage = 'Failed to submit quote request. Please try again.';
setFormError(errorMessage);
analytics.quoteErrorShown('api', errorMessage, adSlot.id);
analytics.quoteFail(adSlot.id, adSlot.name, errorMessage);
Step 5: Add Booking Modal Error Tracking
File: apps/frontend/app/marketplace/[id]/components/booking-modal.tsx

Changes:


// Track error visibility (in handleSubmit catch block, line 118)
} catch (submitError) {
  const errorMessage =
    submitError instanceof Error ? submitError.message : 'Failed to book placement';
  setError(errorMessage);
  analytics.bookingErrorShown('api', errorMessage, adSlot.id);
  analytics.bookingFail(adSlot.id, adSlot.name, errorMessage);
} finally {
  setBooking(false);
}
Step 6: Add "Back to Marketplace" Click Tracking
File: apps/frontend/app/marketplace/[id]/components/ad-slot-detail.tsx

Changes:


// Add state to track page metrics (after line 79)
const pageLoadTimeRef = useRef<number>(Date.now());
const maxScrollDepthRef = useRef<number>(0);

// Track scroll depth continuously (modify existing scroll tracking useEffect, line 120)
useEffect(() => {
  const slotId = adSlot?.id;
  if (!slotId) return;

  const viewStartTime = Date.now();
  pageLoadTimeRef.current = viewStartTime;
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
    
    // Update max scroll depth
    if (scrollPercent > maxScrollDepthRef.current) {
      maxScrollDepthRef.current = scrollPercent;
    }

    if (!hasTrackedScrollDepth && scrollPercent >= 50) {
      hasTrackedScrollDepth = true;
      analytics.listingScrollDepth(slotId, 50);
      window.removeEventListener('scroll', handleScroll);
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

// Add handler for "Back to Marketplace" clicks
const handleBackToMarketplace = () => {
  const timeOnPageSeconds = Math.floor((Date.now() - pageLoadTimeRef.current) / 1000);
  analytics.backToMarketplaceClick(
    window.location.pathname,
    timeOnPageSeconds,
    Math.floor(maxScrollDepthRef.current)
  );
};

// Update "Back to Marketplace" links (line 243 and 271)
<Link
  href="/marketplace"
  onClick={handleBackToMarketplace}
  className="text-[var(--color-primary)] hover:underline"
>
  ← Back to Marketplace
</Link>
Step 7: Prevent Double-Firing with Enhanced Deduplication
Context: Some events might fire multiple times due to React strict mode, component re-renders, or user rapid clicks.

File: apps/frontend/lib/analytics.ts

Changes:


// Add deduplication helper (before track function, around line 44)
const recentEvents = new Map<string, number>();
const DEDUPE_WINDOW_MS = 1000; // Prevent same event firing within 1 second

function shouldDedupeEvent(eventKey: string): boolean {
  const now = Date.now();
  const lastFired = recentEvents.get(eventKey);
  
  if (lastFired && now - lastFired < DEDUPE_WINDOW_MS) {
    return true; // Skip this event (duplicate)
  }
  
  recentEvents.set(eventKey, now);
  
  // Clean up old entries (older than 5 seconds)
  if (recentEvents.size > 100) {
    const cutoff = now - 5000;
    for (const [key, timestamp] of recentEvents.entries()) {
      if (timestamp < cutoff) {
        recentEvents.delete(key);
      }
    }
  }
  
  return false;
}

// Modify track() function to use deduplication (line 56)
export function track(event: string, properties: EventProperties = {}): void {
  // Create dedupe key from event name + critical properties
  const dedupeKey = `${event}:${properties.slot_id || ''}:${properties.cta_type || ''}`;
  
  // Skip if duplicate within time window
  if (shouldDedupeEvent(dedupeKey)) {
    if (process.env.NODE_ENV === 'development') {
      console.log(`[Analytics] [DEDUPE] ${event}`, properties);
    }
    return;
  }
  
  const analyticsEvent: AnalyticsEvent = {
    event,
    properties: {
      ...properties,
      path: getPath(),
      referrer: getReferrer(),
      ...(event.includes('_submit') || event.includes('_success')) && {
        entry_page: getEntryPage(),
        referrer_type: getReferrerType(),
      },
    },
    timestamp: new Date().toISOString(),
    sessionId: getSessionId(),
  };

  if (process.env.NODE_ENV === 'development') {
    console.log(`[Analytics] ${event}`, analyticsEvent.properties);
  }

  const ga4Properties = Object.fromEntries(
    Object.entries(analyticsEvent.properties).filter(
      (entry): entry is [string, string | number | boolean] => {
        const value = entry[1];
        return typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean';
      }
    )
  );

  sendGA4Event(event, ga4Properties);
  eventQueue.push(analyticsEvent);
}
Step 8: Handle SPA Navigation Edge Cases
File: apps/frontend/app/components/analytics-listener.tsx

Changes: Improve existing route change tracking to handle back/forward navigation


// Enhance existing useEffect (line 23)
useEffect(() => {
  const currentPage = buildPage(pathname, searchParams);
  const previousPage = previousPageRef.current;
  const previousPathname = previousPathnameRef.current;

  // Skip initial mount
  if (!previousPage || !previousPathname) {
    previousPageRef.current = currentPage;
    previousPathnameRef.current = pathname;
    return;
  }

  // Skip if page didn't actually change
  if (previousPage === currentPage) {
    return;
  }

  // Detect navigation type (forward, back, or new navigation)
  const navigationType = 
    performance?.getEntriesByType?.('navigation')?.[0]?.type === 'back_forward'
      ? 'back_forward'
      : 'spa_route_change';

  analytics.navigation(previousPage, currentPage, navigationType as 'spa_route_change');

  // Track specific high-value navigation: marketplace → detail
  if (previousPathname === '/marketplace') {
    const listingId = getMarketplaceListingId(pathname);
    if (listingId) {
      analytics.marketplaceToDetailNavigation(listingId);
    }
  }

  previousPageRef.current = currentPage;
  previousPathnameRef.current = pathname;
}, [pathname, searchParams]);
4️⃣ QA CHECKLIST (Manual Testing Steps)
Setup
Enable GA4 Debug Mode:

Set NEXT_PUBLIC_GA_MEASUREMENT_ID in .env
Open Chrome DevTools → Network tab, filter by collect
Open GA4 property → Admin → DebugView
Expected Console Logs (Development):

All events should log: [Analytics] event_name {properties}
Duplicate events should log: [Analytics] [DEDUPE] event_name {properties}
Test Cases (15-20 minutes)
Test 1: CTA Click Tracking
Action	Expected Event	Expected Parameters
Navigate to /marketplace/[any-id]	listing_view	slot_id, slot_name, slot_type, price, is_available
Scroll down to see desktop CTA buttons	cta_impression (fires once per CTA type)	cta_type: 'book', cta_location: 'desktop_sidebar', slot_id
Click "Book This Placement" (desktop)	cta_click	cta_type: 'book', cta_location: 'desktop_sidebar', slot_id, slot_name, is_available: true
Close modal	booking_cancel	slot_id, time_in_modal_seconds, message_filled: false
Scroll to mobile sticky footer	—	—
Click "Request a Quote" (mobile)	cta_click	cta_type: 'quote', cta_location: 'mobile_footer'
Validation:

✅ cta_click fires BEFORE modal opens
✅ Desktop vs mobile CTAs have correct cta_location
✅ cta_impression fires only once per CTA type (no duplicates on scroll)
Test 2: Modal Abandonment Tracking
Action	Expected Event	Expected Parameters
Click "Book This Placement"	cta_click + booking_start	slot_id, slot_name, price
Wait 5 seconds	—	—
Type in message field	—	—
Click backdrop to close (or press Esc)	booking_cancel	time_in_modal_seconds: 5, message_filled: true
Re-open booking modal	cta_click + booking_start	—
Submit form successfully	booking_submit + booking_success	NO booking_cancel should fire
Validation:

✅ booking_cancel fires when modal closed without submit
✅ time_in_modal_seconds is accurate (±1 second)
✅ message_filled reflects whether user typed in textarea
✅ NO booking_cancel fires on successful submit
Repeat for Quote Modal:

Action	Expected Event	Expected Parameters
Click "Request a Quote"	cta_click + quote_start	—
Fill email + company (2 fields)	—	—
Close modal after 10 seconds	quote_cancel	time_in_modal_seconds: 10, fields_filled_count: 2
Test 3: Form Field Engagement (Quote Modal)
Action	Expected Event	Expected Parameters
Open quote modal	quote_start	—
Fill email (required)	—	NO event (required field)
Fill company name (required)	—	NO event (required field)
Fill phone number (optional)	quote_field_interaction	field_name: 'phone', slot_id
Select budget dropdown (optional)	quote_field_interaction	field_name: 'budget'
Type in goals field	quote_field_interaction	field_name: 'goals'
Upload 2 attachments	quote_field_interaction	field_name: 'attachments'
Submit form with missing required field	quote_validation_error	field_name: 'message', error_message: '...'
Validation:

✅ Only OPTIONAL fields trigger quote_field_interaction
✅ Each field fires only ONCE (dedupe on subsequent edits)
✅ Validation errors trigger quote_validation_error
Test 4: Conversion Attribution
Action	Expected Event	Expected Parameters
Clear session storage, navigate directly to /marketplace/[id] (no referrer)	listing_view	entry_page: '/marketplace/[id]', referrer_type: 'direct'
Submit booking	booking_submit + booking_success	entry_page: '/marketplace/[id]', referrer_type: 'direct'
Repeat with different entry points:

Entry Point	Expected entry_page	Expected referrer_type
Click from /marketplace grid	/marketplace	internal
Paste URL from external site	URL pasted	external
Type URL directly	URL typed	direct
Validation:

✅ entry_page persists for entire session (stored in sessionStorage)
✅ referrer_type accurately detects internal vs external vs direct
Test 5: Back to Marketplace Navigation
Action	Expected Event	Expected Parameters
Navigate to detail page	listing_view	—
Scroll down 75%	listing_scroll_depth	depth_percent: 50
Wait 5 seconds	—	—
Click "← Back to Marketplace"	back_to_marketplace_click	from_page: '/marketplace/[id]', time_on_page_seconds: 5, scroll_depth_percent: 75
Validation:

✅ time_on_page_seconds is accurate
✅ scroll_depth_percent reflects maximum scroll depth (not current)
✅ Event fires BEFORE navigation completes (onClick)
Test 6: Error Visibility Tracking
Action	Expected Event	Expected Parameters
Open booking modal, submit empty form	booking_error_shown + booking_fail	error_type: 'api', error_message: '...'
Open quote modal, upload 10MB file	quote_validation_error	field_name: 'attachments', error_message: '... exceeds ...'
Validation:

✅ Client-side validation errors trigger quote_validation_error
✅ Server-side API errors trigger *_error_shown events
✅ Error messages are human-readable (not raw exception text)
Test 7: Deduplication (Edge Cases)
Action	Expected Behavior
Rapidly click "Book This Placement" 5 times	Only 1 cta_click event fires (within 1 second window)
Close and re-open booking modal quickly	Both booking_cancel and booking_start fire (different events)
Scroll up/down rapidly on detail page	Only 1 cta_impression per CTA type (IntersectionObserver handles this)
Validation:

✅ Check console for [DEDUPE] logs
✅ Network tab shows only 1 GA4 request per unique event
Test 8: SPA Navigation (Back/Forward)
Action	Expected Event	Expected Parameters
Navigate: /marketplace → /marketplace/abc	navigation	from_page: '/marketplace', to_page: '/marketplace/abc', navigation_type: 'spa_route_change'
Click browser back button	navigation	navigation_type: 'back_forward'
Click browser forward button	navigation	navigation_type: 'back_forward'
Validation:

✅ navigation_type correctly differentiates new navigation vs back/forward
✅ No duplicate navigation events on mount
Test 9: Production Build

cd apps/frontend
pnpm build
pnpm start
Check	Expected Result
GA4 script loads	✅ <script> tag in <head> with https://www.googletagmanager.com/gtag/js?id=G-...
Events fire to GA4	✅ Network tab shows POST requests to https://www.google-analytics.com/g/collect
Console logs disabled	✅ NO [Analytics] logs in production (unless NODE_ENV=development)
No errors	✅ No console errors related to analytics
Expected Event Counts (Per Full Test Run)
Funnel	Events
CTA Engagement	6 events (cta_impression × 2, cta_click × 4)
Modal Abandonment	2 events (booking_cancel, quote_cancel)
Form Engagement	4-6 events (quote_field_interaction × 4-6)
Conversions	4 events (booking_success, quote_success, newsletter_signup_success)
Attribution	Embedded in all *_submit/*_success events
Navigation	3-5 events (navigation, back_to_marketplace_click)
Errors	2-3 events (quote_validation_error, *_error_shown)
Total: ~25-30 unique events per comprehensive test run

5️⃣ EDGE CASES & FAILURE MODES
Edge Case 1: Ad Blockers
Scenario: User has uBlock Origin or Privacy Badger installed

Expected Behavior:

window.gtag is undefined
sendGA4Event() in ga4-bridge.ts safely no-ops (line 14: if (typeof window === 'undefined') return;)
No console errors
No UI blocking or delays
Test: Install uBlock Origin, perform all actions, verify no errors in console

Edge Case 2: sessionStorage Unavailable
Scenario: User in Private/Incognito mode with strict cookie blocking, or Safari blocking 3rd-party storage

Expected Behavior:

getSessionId() falls back to in-memory cachedSessionId (line 39: catch block)
getEntryPage() returns empty string (new catch block)
Attribution params (entry_page, referrer_type) still included but may be empty
No crashes
Test: Block localStorage/sessionStorage via DevTools → Application → Storage, verify analytics still fires

Edge Case 3: Rapid Component Unmount (React Strict Mode)
Scenario: React 19 Strict Mode mounts/unmounts components twice in development

Expected Behavior:

useRef prevents double-firing of one-time events (listing_view, booking_start)
Modal open time tracked correctly (doesn't reset on strict mode re-mount)
Deduplication window (1 second) catches double-fires
Test: Enable React Strict Mode (already enabled in Next.js dev), verify no duplicate events in console

Edge Case 4: User Navigates Away Mid-Event
Scenario: User closes tab or navigates to external site while modal is open

Expected Behavior:

pagehide event listener fires listing_view_duration (line 164)
Modal cancel tracking MAY NOT fire (user left page before modal cleanup)
Acceptable: We track what we can, but full funnel may be incomplete
Test: Open modal, immediately close browser tab, verify listing_view_duration fires (check Network tab)

Edge Case 5: Missing Listing ID (Malformed URL)
Scenario: User navigates to /marketplace/invalid-id that doesn't exist

Expected Behavior:

listing_view does NOT fire (component shows error state, never reaches tracking code)
No crashes or undefined errors
Error boundary (if added) catches failed data fetch
Test: Navigate to /marketplace/nonexistent, verify no analytics errors in console

Edge Case 6: Form Submit While Network Offline
Scenario: User fills quote form, goes offline, submits

Expected Behavior:

quote_submit fires (client-side event)
API call fails (network error)
quote_fail fires with error: 'Failed to submit quote request'
quote_error_shown fires
NO quote_success fires
Test: Open DevTools → Network → Offline, submit quote form, verify fail events fire

6️⃣ IMPLEMENTATION SUMMARY
Files to Modify (4)
File Path	Changes	Complexity
apps/frontend/lib/analytics.ts	Add 10 new helper methods + attribution utilities + deduplication	Medium
apps/frontend/app/marketplace/[id]/components/ad-slot-detail.tsx	Add CTA click tracking, impression tracking, back navigation tracking	Medium
apps/frontend/app/marketplace/[id]/components/booking-modal.tsx	Add modal abandonment + error tracking	Low
apps/frontend/app/marketplace/[id]/components/quote-modal.tsx	Add modal abandonment + field engagement + error tracking	Medium
Files to Create
None (all infrastructure already exists)

New Events Added (14)
Category	Events
CTA Engagement	cta_click, cta_impression
Modal Abandonment	booking_cancel, quote_cancel
Form Engagement	quote_field_interaction, quote_validation_error
Navigation	back_to_marketplace_click
Error Visibility	booking_error_shown, quote_error_shown
Enhanced Existing	Add entry_page + referrer_type to: booking_submit, booking_success, quote_submit, quote_success, newsletter_signup_submit, newsletter_signup_success
Total Events Tracked: 32 (18 existing + 14 new)

Estimated Implementation Time
Step	Time
1. Enhance analytics.ts	45 min
2. CTA click tracking (detail page)	30 min
3. Modal abandonment (booking + quote)	30 min
4. Form field engagement (quote)	20 min
5. Booking error tracking	10 min
6. Back navigation tracking	15 min
7. Deduplication enhancements	20 min
8. SPA navigation edge cases	10 min
Implementation Total	3 hours
QA Testing	30 min
Grand Total	3.5 hours
7️⃣ SUCCESS CRITERIA
✅ All micro-conversions tracked:

Listing detail views ✅ (already done)
CTA clicks (Book, Quote, Login) ✅ (new)
Form field interactions ✅ (new)
Navigation between pages ✅ (already done)
✅ All macro-conversions tracked:

Placement request submit/success/fail ✅ (already done)
Newsletter signup submit/success/fail ✅ (already done)
Modal abandonment (drop-off points) ✅ (new)
✅ Conversion attribution:

Entry page tracked ✅ (new)
Referrer type tracked ✅ (new)
Source path preserved for session ✅ (new)
✅ Event quality:

No double-firing (deduplication) ✅ (enhanced)
Non-blocking (fire-and-forget) ✅ (already done)
Correct timing (not too early, not too late) ✅ (already done)
Useful metadata (IDs, types, duration, etc.) ✅ (already done + enhanced)
✅ SPA compatibility:

Route changes tracked ✅ (already done)
Back/forward navigation detected ✅ (enhanced)
Modal state tracked correctly ✅ (new)
✅ Production ready:

Works in production build ✅ (GA4 already integrated)
Handles ad blockers gracefully ✅ (already done)
No console errors ✅ (error boundaries in place)
GA4 DebugView shows all events ✅ (testable)
