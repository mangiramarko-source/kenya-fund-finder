import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useSoftWallTrigger, isBotOrPrerender } from "./useSoftWallTrigger";

describe("isBotOrPrerender", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns true when navigator.webdriver is true", () => {
    Object.defineProperty(navigator, "webdriver", {
      value: true,
      configurable: true,
    });
    expect(isBotOrPrerender()).toBe(true);
  });

  it("returns true when user agent matches a crawler or headless browser", () => {
    Object.defineProperty(navigator, "webdriver", {
      value: false,
      configurable: true,
    });
    Object.defineProperty(navigator, "userAgent", {
      value: "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)",
      configurable: true,
    });
    expect(isBotOrPrerender()).toBe(true);

    Object.defineProperty(navigator, "userAgent", {
      value: "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 HeadlessChrome/120.0.0.0 Safari/537.36",
      configurable: true,
    });
    expect(isBotOrPrerender()).toBe(true);
  });

  it("returns false for standard human browsers without webdriver", () => {
    Object.defineProperty(navigator, "webdriver", {
      value: false,
      configurable: true,
    });
    Object.defineProperty(navigator, "userAgent", {
      value: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      configurable: true,
    });
    expect(isBotOrPrerender()).toBe(false);
  });
});

describe("useSoftWallTrigger", () => {
  beforeEach(() => {
    sessionStorage.clear();
    Object.defineProperty(navigator, "webdriver", {
      value: false,
      configurable: true,
    });
    Object.defineProperty(navigator, "userAgent", {
      value: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      configurable: true,
    });
  });

  it("defaults shouldShow to false (no unexpected timer popup)", () => {
    const { result } = renderHook(() => useSoftWallTrigger());
    expect(result.current.shouldShow).toBe(false);
  });

  it("allows opening wall on demand when openWall is called", () => {
    const { result } = renderHook(() => useSoftWallTrigger());
    expect(result.current.shouldShow).toBe(false);

    act(() => {
      result.current.openWall();
    });
    expect(result.current.shouldShow).toBe(true);
  });

  it("does not open wall if user is a bot or prerender", () => {
    Object.defineProperty(navigator, "webdriver", {
      value: true,
      configurable: true,
    });

    const { result } = renderHook(() => useSoftWallTrigger());
    act(() => {
      result.current.openWall();
    });
    expect(result.current.shouldShow).toBe(false);
  });

  it("snoozes the wall and writes future expiration to sessionStorage", () => {
    const { result } = renderHook(() => useSoftWallTrigger());

    act(() => {
      result.current.openWall();
    });
    expect(result.current.shouldShow).toBe(true);

    act(() => {
      result.current.snooze(10);
    });
    expect(result.current.shouldShow).toBe(false);

    const snoozeUntil = sessionStorage.getItem("kff_auth_wall_snooze_until");
    expect(Number(snoozeUntil)).toBeGreaterThan(Date.now());

    // Subsequent openWall attempts while snoozed should stay closed
    act(() => {
      result.current.openWall();
    });
    expect(result.current.shouldShow).toBe(false);
  });
});
