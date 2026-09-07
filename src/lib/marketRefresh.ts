/** Refresh visible market screens even when Realtime is unavailable. */
export function startMarketRefresh(refresh: () => void, intervalMs = 60_000) {
  const refreshVisible = () => {
    if (document.visibilityState === "visible") refresh();
  };
  const timer = window.setInterval(refreshVisible, intervalMs);
  document.addEventListener("visibilitychange", refreshVisible);
  window.addEventListener("focus", refreshVisible);
  window.addEventListener("online", refreshVisible);
  return () => {
    window.clearInterval(timer);
    document.removeEventListener("visibilitychange", refreshVisible);
    window.removeEventListener("focus", refreshVisible);
    window.removeEventListener("online", refreshVisible);
  };
}
