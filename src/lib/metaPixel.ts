import { hasConsent, onConsent } from "@/lib/consent";
import { sanitizeProperties } from "@/lib/analytics";

declare global {
  interface Window {
    fbq?: any;
    _fbq?: any;
  }
}

let isMetaPixelInitialized = false;
let consentListenerRegistered = false;

/**
 * Generate a unique, deterministic-length event ID for Meta Browser/Server Deduplication.
 */
export function generateEventId(prefix = "kff"): string {
  const ts = Date.now().toString(36);
  const rand = Math.random().toString(36).substring(2, 10);
  return `${prefix}_${ts}_${rand}`;
}

/**
 * Stop Meta Pixel tracking when user revokes advertising consent.
 */
export function handleMetaConsentRevoked(): void {
  isMetaPixelInitialized = false;
  if (typeof window !== "undefined" && window.fbq) {
    try {
      window.fbq("consent", "revoke");
    } catch {
      // ignore
    }
  }
}

/**
 * Initialize Meta Pixel ONLY when advertising consent is granted.
 */
export function initMetaPixel(pixelIdOverride?: string): void {
  if (typeof window === "undefined") return;

  // Register one-time listener for consent updates (grant or revoke)
  if (!consentListenerRegistered) {
    consentListenerRegistered = true;

    onConsent("ads", () => {
      initMetaPixel(pixelIdOverride);
    });

    window.addEventListener("cookie-consent-change", () => {
      if (!hasConsent("ads")) {
        handleMetaConsentRevoked();
      } else {
        initMetaPixel(pixelIdOverride);
      }
    });
  }

  // Strictly block initialization if advertising consent is absent
  if (!hasConsent("ads")) {
    return;
  }

  if (isMetaPixelInitialized) return;

  const pixelId = pixelIdOverride || import.meta.env.VITE_META_PIXEL_ID;
  if (!pixelId || typeof pixelId !== "string" || !pixelId.trim()) {
    return;
  }

  // Initialize fbq stub if not already loaded
  if (!window.fbq) {
    const n = (window.fbq = function (...args: any[]) {
      if (n.callMethod) {
        n.callMethod(...args);
      } else {
        n.queue.push(args);
      }
    });
    if (!window._fbq) window._fbq = n;
    n.push = n;
    n.loaded = true;
    n.version = "2.0";
    n.queue = [];

    // Inject official Meta Pixel script
    const script = document.createElement("script");
    script.async = true;
    script.src = "https://connect.facebook.net/en_US/fbevents.js";
    const firstScript = document.getElementsByTagName("script")[0];
    if (firstScript && firstScript.parentNode) {
      firstScript.parentNode.insertBefore(script, firstScript);
    } else {
      document.head.appendChild(script);
    }
  }

  try {
    window.fbq("consent", "grant");
    window.fbq("init", pixelId.trim());
    isMetaPixelInitialized = true;
  } catch (err) {
    console.warn("[MetaPixel] init error:", err);
  }
}

export type MetaStandardEvent = "PageView" | "Lead" | "CompleteRegistration";
export type MetaCustomEvent = "PortfolioAssetAdded" | "WatchlistItemAdded" | "PriceAlertCreated";

/**
 * Dispatch an event to Meta Pixel if advertising consent is granted.
 */
export function trackMetaEvent(
  eventName: string,
  properties: Record<string, any> = {},
  eventId?: string
): void {
  if (typeof window === "undefined" || !hasConsent("ads") || !isMetaPixelInitialized || !window.fbq) {
    return;
  }

  const cleanProps = sanitizeProperties(properties);
  const options = eventId ? { eventID: eventId } : undefined;

  switch (eventName) {
    case "site_landed":
      window.fbq("track", "PageView", cleanProps, options);
      break;

    case "signup_started":
      window.fbq("track", "Lead", { content_name: "signup_started", ...cleanProps }, options);
      break;

    case "signup_completed":
      // Primary business conversion
      window.fbq("track", "CompleteRegistration", { status: "success", ...cleanProps }, options);
      break;

    case "portfolio_asset_added":
      window.fbq("trackCustom", "PortfolioAssetAdded", cleanProps, options);
      break;

    case "watchlist_item_added":
      window.fbq("trackCustom", "WatchlistItemAdded", cleanProps, options);
      break;

    case "price_alert_created":
      window.fbq("trackCustom", "PriceAlertCreated", cleanProps, options);
      break;

    default:
      // Custom or generic mapping
      break;
  }
}

/**
 * Test helper for resetting internal Meta state in unit tests.
 */
export function _resetMetaPixelStateForTesting(): void {
  isMetaPixelInitialized = false;
  consentListenerRegistered = false;
  if (typeof window !== "undefined") {
    delete window.fbq;
    delete window._fbq;
  }
}
