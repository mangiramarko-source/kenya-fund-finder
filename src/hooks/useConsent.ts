import { useEffect, useState } from "react";
import {
  getConsentChoice,
  getConsentPreferences,
  type ConsentChoice,
  type ConsentPreferences,
} from "@/lib/consent";

const SSR_SAFE_DEFAULT: { choice: ConsentChoice | null; preferences: ConsentPreferences } = {
  choice: null,
  preferences: { necessary: true, analytics: false, ads: false },
};

/**
 * Reactive view of the current consent state. Updates on changes in any tab.
 *
 * SSR-safe: returns the conservative default (no choice, no optional categories
 * granted) on the server and on the very first client render. Only after the
 * post-mount effect runs do we read localStorage. This guarantees that any
 * component gating optional UI/scripts on `useConsent()` will NOT render those
 * during SSR — preventing optional scripts from being injected before the
 * client has verified consent.
 */
export function useConsent(): { choice: ConsentChoice | null; preferences: ConsentPreferences } {
  const [state, setState] = useState(SSR_SAFE_DEFAULT);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const refresh = () =>
      setState({ choice: getConsentChoice(), preferences: getConsentPreferences() });
    refresh(); // hydrate from localStorage AFTER mount
    const onStorage = (e: StorageEvent) => {
      if (e.key === "cookie-consent" || e.key === "cookie-preferences") refresh();
    };
    window.addEventListener("cookie-consent-change", refresh);
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener("cookie-consent-change", refresh);
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  return state;
}
