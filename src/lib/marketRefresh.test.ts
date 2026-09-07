import { afterEach, describe, expect, it, vi } from "vitest";
import { startMarketRefresh } from "./marketRefresh";

afterEach(() => { vi.useRealTimers(); vi.restoreAllMocks(); });

describe("market refresh without Realtime", () => {
  it("refreshes visible screens on a timer and on return, and cleans up", () => {
    vi.useFakeTimers();
    const visibility = vi.spyOn(document, "visibilityState", "get").mockReturnValue("visible");
    const refresh = vi.fn();
    const stop = startMarketRefresh(refresh);
    vi.advanceTimersByTime(60_000);
    expect(refresh).toHaveBeenCalledTimes(1);
    visibility.mockReturnValue("hidden");
    vi.advanceTimersByTime(60_000);
    expect(refresh).toHaveBeenCalledTimes(1);
    visibility.mockReturnValue("visible");
    document.dispatchEvent(new Event("visibilitychange"));
    window.dispatchEvent(new Event("online"));
    expect(refresh).toHaveBeenCalledTimes(3);
    stop();
    vi.advanceTimersByTime(60_000);
    window.dispatchEvent(new Event("focus"));
    document.dispatchEvent(new Event("visibilitychange"));
    expect(refresh).toHaveBeenCalledTimes(3);
  });
});
