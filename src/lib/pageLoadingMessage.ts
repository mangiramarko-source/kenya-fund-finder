const ROUTE_LOADING_MESSAGES: Array<{ matches: (pathname: string) => boolean; message: string }> = [
  { matches: (pathname) => pathname === "/", message: "Loading latest market overview…" },
  { matches: (pathname) => pathname === "/funds", message: "Loading latest fund data…" },
  { matches: (pathname) => pathname === "/compare", message: "Loading latest fund comparison data…" },
  { matches: (pathname) => pathname.startsWith("/compare/"), message: "Loading fund details…" },
  { matches: (pathname) => pathname === "/treasury", message: "Loading latest Treasury data…" },
  { matches: (pathname) => pathname === "/rates", message: "Loading latest FX rate data…" },
  { matches: (pathname) => pathname === "/commodities", message: "Loading latest commodity data…" },
  { matches: (pathname) => pathname === "/stocks", message: "Loading latest stock data…" },
  { matches: (pathname) => pathname.startsWith("/stocks/"), message: "Loading stock details…" },
  { matches: (pathname) => pathname === "/markets", message: "Loading latest market data…" },
  { matches: (pathname) => pathname === "/portfolio/summary", message: "Loading your portfolio summary…" },
  { matches: (pathname) => pathname === "/portfolio", message: "Loading your portfolio…" },
  { matches: (pathname) => pathname === "/watchlist", message: "Loading your watchlist…" },
  { matches: (pathname) => pathname === "/alerts", message: "Loading your alerts…" },
  { matches: (pathname) => pathname === "/profile", message: "Loading your profile…" },
  { matches: (pathname) => pathname === "/ai-lab", message: "Loading AI Lab…" },
  { matches: (pathname) => pathname === "/admin", message: "Loading admin workspace…" },
  { matches: (pathname) => pathname === "/news", message: "Loading latest market news…" },
  { matches: (pathname) => pathname.startsWith("/news/archive"), message: "Loading news archive…" },
  { matches: (pathname) => pathname.startsWith("/news/"), message: "Loading market news…" },
];

/**
 * Keeps lazy-route loading visually continuous with the selected page's data gate.
 */
export const getPageLoadingMessage = (pathname: string): string =>
  ROUTE_LOADING_MESSAGES.find(({ matches }) => matches(normalizePathname(pathname)))?.message ?? "Loading page…";

const normalizePathname = (pathname: string): string =>
  pathname.length > 1 && pathname.endsWith("/") ? pathname.slice(0, -1) : pathname;
