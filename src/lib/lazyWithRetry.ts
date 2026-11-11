import { type ComponentType, lazy } from "react";

/**
 * Checks if an error is due to a failed dynamic import, stale chunk,
 * or MIME type mismatch from a stale cached deployment.
 * This commonly happens when a new version of the app is deployed to production
 * and chunk hashes change while a client is browsing the site.
 */
export function isChunkLoadError(error: unknown): boolean {
  if (!error) return false;
  const msg = error instanceof Error ? error.message : String(error);
  const name = error instanceof Error ? error.name : "";
  return (
    name === "ChunkLoadError" ||
    msg.includes("Failed to fetch dynamically imported module") ||
    msg.includes("error loading dynamically imported module") ||
    msg.includes("Importing a module script failed") ||
    msg.includes("error resolving module specifier") ||
    msg.includes("Loading chunk") ||
    msg.includes("MIME type") ||
    msg.includes("text/html") ||
    msg.includes("Failed to load module script") ||
    msg.includes("not a valid JavaScript MIME type")
  );
}

/**
 * Purges the browser CacheStorage API and reloads the window with a cache-busting
 * timestamp parameter to force browsers and CDNs to fetch fresh HTML and chunk hashes.
 */
export function forceReloadWithCacheBust(): void {
  if (typeof window === "undefined") return;
  try {
    if ("caches" in window) {
      caches.keys().then((names) => {
        names.forEach((name) => caches.delete(name));
      }).catch(() => {});
    }
    const url = new URL(window.location.href);
    url.searchParams.set("_v", String(Date.now()));
    window.location.replace(url.toString());
  } catch {
    window.location.reload();
  }
}

/**
 * Wraps dynamic React.lazy imports with automatic recovery for stale chunks.
 *
 * If a chunk fails to load due to a deployment mismatch, it checks sessionStorage
 * to ensure we haven't retried within the last 15 seconds (guarding against infinite loops),
 * records the retry, triggers a cache-busted reload, and returns a pending promise
 * so React remains in Suspense without crashing into the top-level ErrorBoundary.
 */
export function lazyWithRetry<T extends ComponentType<any>>(
  factory: () => Promise<{ default: T }>,
  chunkName?: string
) {
  return lazy(async () => {
    const key = `kff_retry_${chunkName || "chunk"}`;
    try {
      return await factory();
    } catch (error) {
      if (typeof window !== "undefined" && isChunkLoadError(error)) {
        const lastRetry = sessionStorage.getItem(key);
        const now = Date.now();
        // Guard against infinite reload loops (max 1 retry every 15s per chunk)
        if (!lastRetry || now - Number(lastRetry) > 15_000) {
          sessionStorage.setItem(key, String(now));
          forceReloadWithCacheBust();
          // Never resolve to keep Suspense active during navigation/reload
          return new Promise<{ default: T }>(() => {});
        }
      }
      throw error;
    }
  });
}
