export const NEWS_TABS_DOCKED_EVENT = "kff:news-tabs-docked";
export const NEWS_CATEGORY_SENTINEL_ID = "news-category-sentinel";

/**
 * Returns the pixel height of the fixed mobile navbar from the CSS variable
 * managed by Navbar, falling back to 64px (4rem).
 */
export function getMobileHeaderHeight(): number {
  if (typeof window === "undefined") return 64;
  const raw = getComputedStyle(document.documentElement)
    .getPropertyValue("--kf-mobile-header")
    .trim();
  const parsed = parseFloat(raw);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 64;
}

/**
 * Scrolls the window back to the docked top of the mobile feed (right below
 * the fixed navbar) when switching categories while scrolled deep in the list.
 */
export function scrollToStickyFeedTop(): void {
  if (typeof window === "undefined") return;
  const headerHeight = getMobileHeaderHeight();
  const sentinelEl = document.getElementById(NEWS_CATEGORY_SENTINEL_ID);
  if (sentinelEl) {
    const rect = sentinelEl.getBoundingClientRect();
    // Sentinel sits at the sticky boundary (headerHeight - 3px)
    const targetScrollY = Math.max(0, window.scrollY + rect.top - (headerHeight - 3));
    if (window.scrollY > targetScrollY) {
      window.scrollTo({ top: targetScrollY, behavior: "instant" });
    }
    return;
  }

  const headerEl = document.getElementById("market-news-header");
  if (headerEl) {
    const rect = headerEl.getBoundingClientRect();
    const targetScrollY = Math.max(0, window.scrollY + rect.bottom - headerHeight);
    if (window.scrollY > targetScrollY) {
      window.scrollTo({ top: targetScrollY, behavior: "instant" });
    }
  } else if (window.scrollY > 0) {
    window.scrollTo({ top: 0, behavior: "instant" });
  }
}
