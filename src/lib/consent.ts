// Centralized cookie-consent gate.
// Use this everywhere ads, analytics, or any non-essential tracking is initialized.
//
// Example:
//   import { onConsent } from "@/lib/consent";
//   onConsent("ads", () => {
//     // load AdSense script here — runs immediately if already granted,
//     // and again later if the user grants consent without reloading.
//   });

const CONSENT_KEY = "cookie-consent";
const PREFS_KEY = "cookie-preferences";

export type ConsentCategory = "necessary" | "analytics" | "ads";

export type ConsentPreferences = {
  necessary: true;
  analytics: boolean;
  ads: boolean;
};

const DEFAULT_PREFS: ConsentPreferences = {
  necessary: true,
  analytics: false,
  ads: false,
};

const CONSENT_EVENT = "cookie-consent-change";

export type ConsentChoice = "accepted" | "rejected" | "custom";

/** Persist a full consent decision and notify subscribers in this tab. */
export function setConsent(choice: ConsentChoice, prefs: Omit<ConsentPreferences, "necessary">): void {
  if (typeof window === "undefined") return;
  const full: ConsentPreferences = { necessary: true, analytics: !!prefs.analytics, ads: !!prefs.ads };
  try {
    localStorage.setItem(CONSENT_KEY, choice);
    localStorage.setItem(PREFS_KEY, JSON.stringify(full));
  } catch {
    // ignore
  }
  notifyConsentChange();
}

/** Clear all consent — banner will re-appear on next render. */
export function clearConsent(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(CONSENT_KEY);
    localStorage.removeItem(PREFS_KEY);
  } catch {
    // ignore
  }
  notifyConsentChange();
}

export function getConsentChoice(): "accepted" | "rejected" | "custom" | null {
  if (typeof window === "undefined") return null;
  try {
    const v = localStorage.getItem(CONSENT_KEY);
    if (v === "accepted" || v === "rejected" || v === "custom") return v;
    return null;
  } catch {
    return null;
  }
}

export function getConsentPreferences(): ConsentPreferences {
  if (typeof window === "undefined") return DEFAULT_PREFS;
  try {
    const raw = localStorage.getItem(PREFS_KEY);
    if (!raw) return DEFAULT_PREFS;
    const parsed = JSON.parse(raw) as Partial<ConsentPreferences>;
    return {
      necessary: true,
      analytics: !!parsed.analytics,
      ads: !!parsed.ads,
    };
  } catch {
    return DEFAULT_PREFS;
  }
}

export function hasConsent(category: ConsentCategory): boolean {
  if (category === "necessary") return true;
  return !!getConsentPreferences()[category];
}

/** Dispatch when consent is updated in the same tab. */
export function notifyConsentChange(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(CONSENT_EVENT));
}

/**
 * Run `init` as soon as consent for `category` is granted — now or later.
 * Returns an unsubscribe function. The init callback is guaranteed to run
 * at most once per call.
 */
export function onConsent(category: ConsentCategory, init: () => void): () => void {
  if (typeof window === "undefined") return () => {};

  let fired = false;
  const tryFire = () => {
    if (fired) return;
    if (hasConsent(category)) {
      fired = true;
      try {
        init();
      } catch (e) {
        console.error(`[consent] init for "${category}" failed`, e);
      }
    }
  };

  // Run immediately if already granted.
  tryFire();
  if (fired) return () => {};

  const onChange = () => tryFire();
  const onStorage = (e: StorageEvent) => {
    if (e.key === CONSENT_KEY || e.key === PREFS_KEY) tryFire();
  };

  window.addEventListener(CONSENT_EVENT, onChange);
  window.addEventListener("storage", onStorage);

  return () => {
    window.removeEventListener(CONSENT_EVENT, onChange);
    window.removeEventListener("storage", onStorage);
  };
}
