import { useEffect, useRef, useState } from "react";

/** Keeps an initial loading screen visible long enough for it to be perceived. */
export function useMinimumLoadingDuration(isLoading: boolean, minimumDuration = 1500) {
  const startedAt = useRef<number | null>(isLoading ? Date.now() : null);
  const [minimumElapsed, setMinimumElapsed] = useState(false);

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
