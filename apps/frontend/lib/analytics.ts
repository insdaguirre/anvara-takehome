import { sendGA4Event } from './ga4-bridge';

type EventPropertyValue = string | number | boolean | null;
type EventProperties = Record<string, EventPropertyValue>;

interface AnalyticsEvent {
  event: string;
  properties: EventProperties;
  timestamp: string;
  sessionId: string;
}

const eventQueue: AnalyticsEvent[] = [];
let cachedSessionId: string | null = null;

function createSessionId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }

  return `sid_${Math.random().toString(36).slice(2)}_${Date.now()}`;
}

function getSessionId(): string {
  if (typeof window === 'undefined') return 'server';
  if (cachedSessionId) return cachedSessionId;

  try {
    const existing = window.sessionStorage.getItem('_sid');
    if (existing) {
      cachedSessionId = existing;
      return existing;
    }

    const generated = createSessionId();
    window.sessionStorage.setItem('_sid', generated);
    cachedSessionId = generated;
    return generated;
  } catch {
    const fallback = createSessionId();
    cachedSessionId = fallback;
    return fallback;
  }
}

function getPath(): string {
  if (typeof window === 'undefined') return '';
  return window.location.pathname;
}

function getReferrer(): string {
  if (typeof document === 'undefined') return '';
  return document.referrer;
}

export function track(event: string, properties: EventProperties = {}): void {
  const analyticsEvent: AnalyticsEvent = {
    event,
    properties: {
      ...properties,
      path: getPath(),
      referrer: getReferrer(),
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

export const analytics = {
  marketplaceView: (slotCount: number) => track('marketplace_view', { slot_count: slotCount }),

  listingCardImpression: (slotId: string, slotName: string, position: number) =>
    track('listing_card_impression', { slot_id: slotId, slot_name: slotName, position }),

  listingCardClick: (slotId: string, slotName: string, slotType: string, price: number) =>
    track('listing_card_click', {
      slot_id: slotId,
      slot_name: slotName,
      slot_type: slotType,
      price,
    }),

  listingView: (
    slotId: string,
    slotName: string,
    slotType: string,
    price: number,
    isAvailable: boolean
  ) =>
    track('listing_view', {
      slot_id: slotId,
      slot_name: slotName,
      slot_type: slotType,
      price,
      is_available: isAvailable,
    }),

  bookingStart: (slotId: string, slotName: string, price: number) =>
    track('booking_start', { slot_id: slotId, slot_name: slotName, price }),

  bookingSubmit: (slotId: string, slotName: string, price: number, hasMessage: boolean) =>
    track('booking_submit', { slot_id: slotId, slot_name: slotName, price, has_message: hasMessage }),

  bookingSuccess: (slotId: string, slotName: string, price: number) =>
    track('booking_success', { slot_id: slotId, slot_name: slotName, price }),

  bookingFail: (slotId: string, slotName: string, error: string) =>
    track('booking_fail', { slot_id: slotId, slot_name: slotName, error }),

  quoteStart: (slotId: string, slotName: string, price: number) =>
    track('quote_start', { slot_id: slotId, slot_name: slotName, price }),

  quoteSubmit: (
    slotId: string,
    slotName: string,
    price: number,
    metadata: {
      hasCompany: boolean;
      hasPhone: boolean;
      hasBudget: boolean;
      hasGoals: boolean;
      hasTimeline: boolean;
      messageLength: number;
      hasAttachments?: boolean;
      attachmentCount?: number;
      isLoggedIn?: boolean;
    }
  ) =>
    track('quote_submit', {
      slot_id: slotId,
      slot_name: slotName,
      price,
      has_company: metadata.hasCompany,
      has_phone: metadata.hasPhone,
      has_budget: metadata.hasBudget,
      has_goals: metadata.hasGoals,
      has_timeline: metadata.hasTimeline,
      message_length: metadata.messageLength,
      ...(typeof metadata.hasAttachments === 'boolean' && { has_attachments: metadata.hasAttachments }),
      ...(typeof metadata.attachmentCount === 'number' && { attachment_count: metadata.attachmentCount }),
      ...(typeof metadata.isLoggedIn === 'boolean' && { is_logged_in: metadata.isLoggedIn }),
    }),

  quoteSuccess: (slotId: string, slotName: string, price: number, quoteId: string) =>
    track('quote_success', { slot_id: slotId, slot_name: slotName, price, quote_id: quoteId }),

  quoteFail: (slotId: string, slotName: string, error: string) =>
    track('quote_fail', { slot_id: slotId, slot_name: slotName, error }),

  filterApply: (filterType: string, filterValue: string) =>
    track('filter_apply', { filter_type: filterType, filter_value: filterValue }),

  searchQuery: (query: string, resultCount: number) =>
    track('search_query', { query, result_count: resultCount }),

  newsletterSignupStart: () => track('newsletter_signup_start'),

  newsletterSignupSubmit: (emailDomain: string) =>
    track('newsletter_signup_submit', { email_domain: emailDomain }),

  newsletterSignupSuccess: () => track('newsletter_signup_success'),

  newsletterSignupFail: (error: string) => track('newsletter_signup_fail', { error }),

  navigation: (fromPage: string, toPage: string, navigationType: 'spa_route_change') =>
    track('navigation', { from_page: fromPage, to_page: toPage, navigation_type: navigationType }),

  marketplaceToDetailNavigation: (listingId: string) =>
    track('marketplace_to_detail_navigation', { listing_id: listingId }),

  listingScrollDepth: (slotId: string, depth: number) =>
    track('listing_scroll_depth', { slot_id: slotId, depth_percent: depth }),

  listingViewDuration: (slotId: string, durationSeconds: number) =>
    track('listing_view_duration', { slot_id: slotId, duration_seconds: durationSeconds }),
};

export { eventQueue };
