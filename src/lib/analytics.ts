import posthog from "posthog-js";
import { hasConsent, onConsent } from "@/lib/consent";
import { trackMetaEvent, generateEventId } from "@/lib/metaPixel";
import { sendMetaConversion } from "@/lib/metaCapi";

export interface UtmAttribution {
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_content?: string;
  utm_term?: string;
  fbclid?: string;
  gclid?: string;
  msclkid?: string;
  referrer?: string;
  landing_page?: string;
  landing_time?: string;
}

export type AnalyticsEventName =
  | "site_landed"
  | "market_page_viewed"
  | "stock_viewed"
  | "fund_viewed"
  | "fx_viewed"
  | "treasury_viewed"
  | "news_article_viewed"
  | "signup_started"
  | "signup_completed"
  | "login_completed"
  | "portfolio_created"
  | "portfolio_asset_added"
  | "watchlist_item_added"
  | "price_alert_created"
  | "search_used"
  | "cta_clicked";

const FIRST_TOUCH_KEY = "kff_first_touch_utm";
const LAST_TOUCH_KEY = "kff_last_touch_utm";

const SENSITIVE_KEY_PATTERNS = [
  /password/i,
  /token/i,
  /secret/i,
  /auth/i,
  /jwt/i,
  /apikey/i,
  /api_key/i,
  /access_token/i,
  /refresh_token/i,
  /bearer/i,
];

function sanitizeParam(val: string | null | undefined): string | undefined {
  if (!val || typeof val !== "string") return undefined;
  const trimmed = val.trim();
  if (!trimmed) return undefined;
  // Strip control characters and HTML tags, truncate length to safe limit
  return trimmed.replace(/[<>\r\n\t]/g, "").slice(0, 500);
}

/**
 * State tracking for consent and initialization
 */
let isPosthogInitialized = false;
let consentListenerRegistered = false;

/**
 * Handle consent revocation by opting out and resetting user session in PostHog.
 */
export function handleConsentRevoked(): void {
  if (isPosthogInitialized && posthog) {
    try {
      if (typeof posthog.opt_out_capturing === "function") {
        posthog.opt_out_capturing();
      }
      if (typeof posthog.reset === "function") {
        posthog.reset();
      }
    } catch {
      // ignore
    }
  }
}

/**
 * Initialize PostHog ONLY when analytics consent is granted.
 */
export function initAnalytics(apiKeyOverride?: string): void {
  if (typeof window === "undefined") return;

  // Register one-time listener to react to real-time consent updates (grant or revoke)
  if (!consentListenerRegistered) {
    consentListenerRegistered = true;

    onConsent("analytics", () => {
      initAnalytics(apiKeyOverride);
    });

    window.addEventListener("cookie-consent-change", () => {
      if (!hasConsent("analytics")) {
        handleConsentRevoked();
      } else {
        initAnalytics(apiKeyOverride);
      }
    });
  }

  // Strictly block initialization if analytics consent is not granted
  if (!hasConsent("analytics")) {
    return;
  }

  // If already initialized and re-granted, ensure capturing is enabled
  if (isPosthogInitialized) {
    if (posthog && typeof posthog.opt_in_capturing === "function") {
      try {
        posthog.opt_in_capturing();
      } catch {
        // ignore
      }
    }
    return;
  }

  const apiKey = apiKeyOverride || import.meta.env.VITE_POSTHOG_KEY;
  const apiHost = import.meta.env.VITE_POSTHOG_HOST || "https://us.i.posthog.com";

  if (apiKey) {
    posthog.init(apiKey, {
      api_host: apiHost,
      autocapture: false, // Explicit events only
      capture_pageview: false, // We control pageviews to ensure clean attribution
      persistence: "localStorage+cookie",
    });
    isPosthogInitialized = true;
  }
}

/**
 * Test helper to reset internal initialization flags
 */
export function _resetAnalyticsStateForTesting(): void {
  isPosthogInitialized = false;
  consentListenerRegistered = false;
}

/**
 * Extract UTM and ad-click query parameters from the given search string or URLSearchParams.
 */
export function extractCampaignParams(
  search: string | URLSearchParams,
  referrer = "",
  pathname = "/"
): UtmAttribution {
  const params = typeof search === "string" ? new URLSearchParams(search) : search;
  const now = new Date().toISOString();

  const extracted: UtmAttribution = {};

  const source = sanitizeParam(params.get("utm_source"));
  const medium = sanitizeParam(params.get("utm_medium"));
  const campaign = sanitizeParam(params.get("utm_campaign"));
  const content = sanitizeParam(params.get("utm_content"));
  const term = sanitizeParam(params.get("utm_term"));
  const fbclid = sanitizeParam(params.get("fbclid"));
  const gclid = sanitizeParam(params.get("gclid"));
  const msclkid = sanitizeParam(params.get("msclkid"));

  if (source) extracted.utm_source = source;
  if (medium) extracted.utm_medium = medium;
  if (campaign) extracted.utm_campaign = campaign;
  if (content) extracted.utm_content = content;
  if (term) extracted.utm_term = term;
  if (fbclid) extracted.fbclid = fbclid;
  if (gclid) extracted.gclid = gclid;
  if (msclkid) extracted.msclkid = msclkid;

  if (referrer) {
    const safeRef = sanitizeParam(referrer);
    if (safeRef && !safeRef.includes(window.location.hostname)) {
      extracted.referrer = safeRef;
    }
  }

  extracted.landing_page = sanitizeParam(pathname) || "/";
  extracted.landing_time = now;

  return extracted;
}

/**
 * Capture and store both First-Touch and Last-Touch attribution.
 */
export function captureUtmAttribution(
  search: string | URLSearchParams,
  referrer: string = typeof document !== "undefined" ? document.referrer : "",
  pathname: string = typeof window !== "undefined" ? window.location.pathname : "/"
): { firstTouch: UtmAttribution; lastTouch: UtmAttribution; hasNewCampaign: boolean } {
  const extracted = extractCampaignParams(search, referrer, pathname);
  const hasCampaignParams =
    !!extracted.utm_source ||
    !!extracted.utm_campaign ||
    !!extracted.utm_medium ||
    !!extracted.fbclid ||
    !!extracted.gclid ||
    !!extracted.msclkid;

  let firstTouch: UtmAttribution = {};
  let lastTouch: UtmAttribution = {};

  if (typeof window !== "undefined") {
    // 1. First-Touch Attribution (stored in localStorage, NEVER overwritten once set)
    try {
      const storedFirst = localStorage.getItem(FIRST_TOUCH_KEY);
      if (storedFirst) {
        firstTouch = JSON.parse(storedFirst);
      } else {
        // Set first touch
        firstTouch = { ...extracted };
        localStorage.setItem(FIRST_TOUCH_KEY, JSON.stringify(firstTouch));
      }
    } catch {
      firstTouch = { ...extracted };
    }

    // 2. Last-Touch Attribution (updated whenever campaign params are present)
    try {
      if (hasCampaignParams) {
        lastTouch = { ...extracted };
        sessionStorage.setItem(LAST_TOUCH_KEY, JSON.stringify(lastTouch));
      } else {
        const storedLast = sessionStorage.getItem(LAST_TOUCH_KEY);
        if (storedLast) {
          lastTouch = JSON.parse(storedLast);
        } else {
          lastTouch = { ...firstTouch };
        }
      }
    } catch {
      lastTouch = { ...extracted };
    }
  }

  return { firstTouch, lastTouch, hasNewCampaign: hasCampaignParams };
}

/**
 * Retrieve saved First-Touch attribution.
 */
export function getFirstTouchAttribution(): UtmAttribution {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(FIRST_TOUCH_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

/**
 * Retrieve saved Last-Touch attribution.
 */
export function getLastTouchAttribution(): UtmAttribution {
  if (typeof window === "undefined") return {};
  try {
    const raw = sessionStorage.getItem(LAST_TOUCH_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

/**
 * Get combined attribution properties to attach to analytics events.
 */
export function getAttributionProperties(): Record<string, any> {
  const first = getFirstTouchAttribution();
  const last = getLastTouchAttribution();

  const props: Record<string, any> = {};

  if (first.utm_source) props.initial_utm_source = first.utm_source;
  if (first.utm_medium) props.initial_utm_medium = first.utm_medium;
  if (first.utm_campaign) props.initial_utm_campaign = first.utm_campaign;
  if (first.utm_content) props.initial_utm_content = first.utm_content;
  if (first.utm_term) props.initial_utm_term = first.utm_term;
  if (first.landing_page) props.first_landing_page = first.landing_page;
  if (first.fbclid) props.initial_fbclid = first.fbclid;
  if (first.gclid) props.initial_gclid = first.gclid;

  if (last.utm_source) props.utm_source = last.utm_source;
  if (last.utm_medium) props.utm_medium = last.utm_medium;
  if (last.utm_campaign) props.utm_campaign = last.utm_campaign;
  if (last.utm_content) props.utm_content = last.utm_content;
  if (last.utm_term) props.utm_term = last.utm_term;
  if (last.landing_page) props.last_landing_page = last.landing_page;
  if (last.fbclid) props.fbclid = last.fbclid;
  if (last.gclid) props.gclid = last.gclid;

  return props;
}

/**
 * Sanitize event properties to ensure no sensitive credentials or tokens are tracked.
 */
export function sanitizeProperties(props?: Record<string, any>): Record<string, any> {
  if (!props || typeof props !== "object") return {};
  const cleaned: Record<string, any> = {};

  for (const [key, value] of Object.entries(props)) {
    // Drop sensitive key names
    if (SENSITIVE_KEY_PATTERNS.some((pattern) => pattern.test(key))) {
      continue;
    }

    if (typeof value === "string") {
      // Drop tokens or auth strings in values
      if (
        value.startsWith("Bearer ") ||
        value.startsWith("sb_secret_") ||
        value.includes("access_token=") ||
        value.includes("refresh_token=")
      ) {
        continue;
      }
      cleaned[key] = value.slice(0, 1000);
    } else if (typeof value === "number" || typeof value === "boolean") {
      cleaned[key] = value;
    } else if (Array.isArray(value)) {
      cleaned[key] = value.slice(0, 50).map((v) => (typeof v === "string" ? v.slice(0, 200) : v));
    } else if (value && typeof value === "object") {
      cleaned[key] = sanitizeProperties(value as Record<string, any>);
    }
  }

  return cleaned;
}

/**
 * Track an analytics event with automatic attribution and sanitization.
 */
export function trackEvent(
  event: AnalyticsEventName,
  properties?: Record<string, any>
): void {
  const attribution = getAttributionProperties();
  const rawProps = {
    ...attribution,
    ...properties,
    current_path: typeof window !== "undefined" ? window.location.pathname : undefined,
  };

  const cleanProps = sanitizeProperties(rawProps);

  // Dispatch to PostHog ONLY IF analytics consent is granted AND PostHog is initialized
  if (hasConsent("analytics") && isPosthogInitialized && posthog && typeof posthog.capture === "function") {
    posthog.capture(event, cleanProps);
  }

  // Dispatch to Meta Pixel & Conversions API with deduplication event_id (gated by ads consent)
  const eventId = generateEventId(`kff_${event}`);
  trackMetaEvent(event, cleanProps, eventId);

  // Send server-side Meta Conversions API event for authenticated milestones (gated by ads consent)
  if (hasConsent("ads")) {
    if (event === "signup_completed") {
      sendMetaConversion({
        event_name: "CompleteRegistration",
        event_id: eventId,
        custom_data: cleanProps,
      });
    } else if (event === "portfolio_asset_added") {
      sendMetaConversion({
        event_name: "PortfolioAssetAdded",
        event_id: eventId,
        custom_data: cleanProps,
      });
    } else if (event === "watchlist_item_added") {
      sendMetaConversion({
        event_name: "WatchlistItemAdded",
        event_id: eventId,
        custom_data: cleanProps,
      });
    } else if (event === "price_alert_created") {
      sendMetaConversion({
        event_name: "PriceAlertCreated",
        event_id: eventId,
        custom_data: cleanProps,
      });
    }
  }

  // Dispatch browser custom event for local monitoring/testing
  if (typeof window !== "undefined" && typeof window.dispatchEvent === "function") {
    try {
      window.dispatchEvent(
        new CustomEvent("kff_analytics_event", {
          detail: { event, properties: cleanProps },
        })
      );
    } catch {
      // ignore
    }
  }
}

/**
 * Associate a user with PostHog using their stable user ID and non-sensitive traits.
 */
export function identifyUser(
  userId: string,
  traits?: Record<string, any>
): void {
  if (!userId || typeof userId !== "string") return;

  const firstTouch = getFirstTouchAttribution();
  const cleanTraits = sanitizeProperties({
    ...traits,
    acquisition_source: firstTouch.utm_source || "direct",
    acquisition_medium: firstTouch.utm_medium,
    acquisition_campaign: firstTouch.utm_campaign,
    first_landing_page: firstTouch.landing_page,
  });

  if (hasConsent("analytics") && isPosthogInitialized && posthog && typeof posthog.identify === "function") {
    posthog.identify(userId, cleanTraits);
  }
}

/**
 * Reset PostHog identity on logout.
 */
export function resetUser(): void {
  if (isPosthogInitialized && posthog && typeof posthog.reset === "function") {
    posthog.reset();
  }
}
