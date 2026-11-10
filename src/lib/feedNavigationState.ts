export interface FeedNavigationState {
  scrollY: number;
  activeCategory: string;
  middleColumnScrollY?: number;
  timestamp: number;
}

const STORAGE_KEY_PREFIX = "kff:feed-nav-state:";

export const feedNavigationState = {
  saveState(
    pathname: string,
    state: { scrollY: number; activeCategory: string; middleColumnScrollY?: number }
  ) {
    try {
      if (typeof sessionStorage === "undefined") return;
      const cleanPath = pathname === "/" || pathname === "/overview" ? "/" : pathname;
      sessionStorage.setItem(
        `${STORAGE_KEY_PREFIX}${cleanPath}`,
        JSON.stringify({
          scrollY: Math.max(0, state.scrollY || 0),
          activeCategory: state.activeCategory || "All",
          middleColumnScrollY: Math.max(0, state.middleColumnScrollY || 0),
          timestamp: Date.now(),
        })
      );
    } catch {
      // Storage unavailable in restricted browsing mode
    }
  },

  getState(pathname: string): FeedNavigationState | null {
    try {
      if (typeof sessionStorage === "undefined") return null;
      const cleanPath = pathname === "/" || pathname === "/overview" ? "/" : pathname;
      const raw = sessionStorage.getItem(`${STORAGE_KEY_PREFIX}${cleanPath}`);
      if (!raw) return null;
      const parsed = JSON.parse(raw) as FeedNavigationState;
      // Expire after 30 minutes
      if (Date.now() - parsed.timestamp > 30 * 60 * 1000) {
        sessionStorage.removeItem(`${STORAGE_KEY_PREFIX}${cleanPath}`);
        return null;
      }
      return parsed;
    } catch {
      return null;
    }
  },

  clearState(pathname: string) {
    try {
      if (typeof sessionStorage === "undefined") return;
      const cleanPath = pathname === "/" || pathname === "/overview" ? "/" : pathname;
      sessionStorage.removeItem(`${STORAGE_KEY_PREFIX}${cleanPath}`);
    } catch {
      // Storage unavailable
    }
  },
};
