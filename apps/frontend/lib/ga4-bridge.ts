type GA4ParamValue = string | number | boolean;

declare global {
  interface Window {
    gtag?: (command: 'event', eventName: string, params?: Record<string, GA4ParamValue>) => void;
    dataLayer?: unknown[];
  }
}

export function sendGA4Event(
  eventName: string,
  params: Record<string, GA4ParamValue> = {}
): void {
  if (typeof window === 'undefined') return;

  if (typeof window.gtag === 'function') {
    window.gtag('event', eventName, params);
  } else if (Array.isArray(window.dataLayer)) {
    window.dataLayer.push(['event', eventName, params]);
  } else {
    return;
  }

  if (process.env.NODE_ENV === 'development') {
    // eslint-disable-next-line no-console
    console.debug(`[GA4] ${eventName}`, params);
  }
}
