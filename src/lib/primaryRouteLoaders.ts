export const loadOverviewPage = () => import("@/pages/OverviewPage");
export const loadStocksPage = () => import("@/pages/StocksPage");
export const loadFundsPage = () => import("@/pages/Index");
export const loadSavingsPage = () => import("@/pages/SavingsPage");
export const loadPortfolioPage = () => import("@/pages/PortfolioPage");

const PRIMARY_ROUTE_LOADERS: Record<string, () => Promise<unknown>> = {
  "/": loadOverviewPage,
  "/stocks": loadStocksPage,
  "/funds": loadFundsPage,
  "/savings": loadSavingsPage,
  "/portfolio": loadPortfolioPage,
};

const prefetchedPaths = new Set<string>();

/**
 * Warms the lazy route chunk for a primary mobile dock destination so tab
 * transitions render without waiting for network fetch on tap.
 */
export function prefetchPrimaryRoute(path: string): void {
  const loader = PRIMARY_ROUTE_LOADERS[path];
  if (!loader || prefetchedPaths.has(path)) return;
  prefetchedPaths.add(path);
  loader().catch(() => {
    // Allow future retries if an idle prefetch fails on an unstable network.
    prefetchedPaths.delete(path);
  });
}

/** Prefetches all primary bottom-dock routes during browser idle time. */
export function prefetchAllPrimaryRoutes(): void {
  for (const path of Object.keys(PRIMARY_ROUTE_LOADERS)) {
    prefetchPrimaryRoute(path);
  }
}
