import { useEffect, useRef, useState } from "react";

/** Keeps an initial loading screen visible long enough for it to be perceived. */
export function useMinimumLoadingDuration(isLoading: boolean, minimumDuration = 1500) {
  const startedAt = useRef<number | null>(isLoading ? Date.now() : null);
  // A route that mounts with cached, ready data should not invent a new loading cycle.
  const [minimumElapsed, setMinimumElapsed] = useState(() => !isLoading);

  useEffect(() => {
    if (isLoading) {
      startedAt.current ??= Date.now();
      setMinimumElapsed(false);
      return;
    }

    const start = startedAt.current ?? Date.now();
    const remaining = Math.max(0, minimumDuration - (Date.now() - start));
    const timer = window.setTimeout(() => {
      startedAt.current = null;
      setMinimumElapsed(true);
    }, remaining);

    return () => window.clearTimeout(timer);
  }, [isLoading, minimumDuration]);

  return isLoading || !minimumElapsed;
}
