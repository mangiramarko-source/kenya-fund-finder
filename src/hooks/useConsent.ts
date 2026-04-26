import { useEffect, useState } from "react";
import {
  getConsentChoice,
  getConsentPreferences,
  type ConsentChoice,
  type ConsentPreferences,
} from "@/lib/consent";

/** Reactive view of the current consent state. Updates on changes in any tab. */
export function useConsent(): { choice: ConsentChoice | null; preferences: ConsentPreferences } {
  const [state, setState] = useState(() => ({
    choice: getConsentChoice(),
    preferences: getConsentPreferences(),
  }));

  useEffect(() => {
    if (typeof window === "undefined") return;
    const refresh = () =>
      setState({ choice: getConsentChoice(), preferences: getConsentPreferences() });
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
