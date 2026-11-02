import { useState, useCallback } from "react";

const SNOOZE_KEY = "kff_auth_wall_snooze_until";

function safeGetSessionItem(key: string): string | null {
  try {
    if (typeof window === "undefined" || !window.sessionStorage) return null;
    return window.sessionStorage.getItem(key);
  } catch {
    return null;
  }
}

function safeSetSessionItem(key: string, value: string): void {
  try {
    if (typeof window === "undefined" || !window.sessionStorage) return;
    window.sessionStorage.setItem(key, value);
  } catch {
    // Fail silently in restricted sandbox or private browsing contexts
  }
}

/**
 * Explicitly detect automated bots, crawlers, and build-time prerenderers.
 * Always guards against SSR or missing window/navigator environments.
 */
export function isBotOrPrerender(): boolean {
  if (typeof window === "undefined" || typeof navigator === "undefined") {
    return true;
  }
  // Automated headless browsers and prerenderers
  if (navigator.webdriver) {
    return true;
  }
  const userAgent = navigator.userAgent || "";
  const botPattern = /bot|crawl|spider|slurp|bingpreview|headlesschrome|prerender/i;
  return botPattern.test(userAgent);
}

/**
 * Modal soft wall trigger hook.
 * The unprompted 25-second timer has been deactivated in favor of contextual
 * "Rule of 3" inline data gates across market sections.
 */
export function useSoftWallTrigger() {
  const [shouldShow, setShouldShow] = useState(false);

  const snooze = useCallback((durationMinutes = 10) => {
    safeSetSessionItem(
      SNOOZE_KEY,
      (Date.now() + durationMinutes * 60 * 1000).toString()
    );
    setShouldShow(false);
  }, []);

  const openWall = useCallback(() => {
    if (isBotOrPrerender()) return;
    const snoozeUntil = safeGetSessionItem(SNOOZE_KEY);
    if (snoozeUntil) {
      const snoozeTime = parseInt(snoozeUntil, 10);
      if (!isNaN(snoozeTime) && Date.now() < snoozeTime) {
        return;
      }
    }
    setShouldShow(true);
  }, []);

  return { shouldShow, snooze, openWall };
}
