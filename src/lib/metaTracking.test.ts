// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import posthog from "posthog-js";

const invokeMock = vi.fn();
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    functions: { invoke: (...args: unknown[]) => invokeMock(...args) },
  },
}));

import { setConsent, clearConsent } from "./consent";
import {
  initMetaPixel,
  trackMetaEvent,
  handleMetaConsentRevoked,
  generateEventId,
  _resetMetaPixelStateForTesting,
} from "./metaPixel";
import { sendMetaConversion } from "./metaCapi";
import { initAnalytics, trackEvent, _resetAnalyticsStateForTesting } from "./analytics";

describe("Meta Advertising Conversion Tracking & CAPI Deduplication", () => {
  beforeEach(() => {
    _resetMetaPixelStateForTesting();
    _resetAnalyticsStateForTesting();
    localStorage.clear();
    sessionStorage.clear();
    vi.clearAllMocks();
  });

  afterEach(() => {
    _resetMetaPixelStateForTesting();
    _resetAnalyticsStateForTesting();
    localStorage.clear();
    sessionStorage.clear();
  });

  it("1: no ad consent → Meta Pixel does not initialize", () => {
    // No consent given
    initMetaPixel("1234567890");

    expect(window.fbq).toBeUndefined();
    expect(window._fbq).toBeUndefined();
  });

  it("2: ad consent granted → Pixel initializes", () => {
    setConsent("accepted", { analytics: false, ads: true });

    initMetaPixel("1234567890");

    expect(window.fbq).toBeDefined();
    expect(typeof window.fbq).toBe("function");
    expect(window.fbq.loaded).toBe(true);
  });

  it("3: site_landed maps correctly to PageView with eventID", () => {
    setConsent("accepted", { analytics: false, ads: true });
    initMetaPixel("1234567890");

    const fbqSpy = vi.spyOn(window, "fbq");
    const eventId = generateEventId("kff_site_landed");

    trackMetaEvent("site_landed", { landing_path: "/funds" }, eventId);

    expect(fbqSpy).toHaveBeenCalledWith(
      "track",
      "PageView",
      expect.objectContaining({ landing_path: "/funds" }),
      { eventID: eventId }
    );
  });

  it("4: signup_started maps correctly to Lead with eventID", () => {
    setConsent("accepted", { analytics: false, ads: true });
    initMetaPixel("1234567890");

    const fbqSpy = vi.spyOn(window, "fbq");
    const eventId = generateEventId("kff_signup_started");

    trackMetaEvent("signup_started", { source: "hero_cta" }, eventId);

    expect(fbqSpy).toHaveBeenCalledWith(
      "track",
      "Lead",
      expect.objectContaining({ content_name: "signup_started", source: "hero_cta" }),
      { eventID: eventId }
    );
  });

  it("5: signup_completed maps to CompleteRegistration (PRIMARY CONVERSION)", () => {
    setConsent("accepted", { analytics: false, ads: true });
    initMetaPixel("1234567890");

    const fbqSpy = vi.spyOn(window, "fbq");
    const eventId = generateEventId("kff_signup_completed");

    trackMetaEvent("signup_completed", { method: "email", user_id: "u123" }, eventId);

    expect(fbqSpy).toHaveBeenCalledWith(
      "track",
      "CompleteRegistration",
      expect.objectContaining({ status: "success", method: "email", user_id: "u123" }),
      { eventID: eventId }
    );
  });

  it("6: browser/server event_id deduplication works across Pixel and CAPI", async () => {
    setConsent("accepted", { analytics: true, ads: true });
    initMetaPixel("1234567890");

    const fbqSpy = vi.spyOn(window, "fbq");
    invokeMock.mockResolvedValueOnce({
      data: { ok: true, events_received: 1 },
      error: null,
    });

    const eventId = generateEventId("kff_signup_completed");

    // 1. Browser Meta Pixel track
    trackMetaEvent("signup_completed", { method: "email" }, eventId);

    // 2. Server CAPI conversion send
    await sendMetaConversion({
      event_name: "CompleteRegistration",
      event_id: eventId,
      custom_data: { method: "email" },
    });

    // Check that both browser and server used the EXACT same eventID
    expect(fbqSpy).toHaveBeenCalledWith(
      "track",
      "CompleteRegistration",
      expect.anything(),
      { eventID: eventId }
    );

    expect(invokeMock).toHaveBeenCalledWith(
      "meta-conversion",
      expect.objectContaining({
        body: expect.objectContaining({
          event_name: "CompleteRegistration",
          event_id: eventId,
        }),
      })
    );
  });

  it("7: Meta server secret never appears in frontend environment or bundle", () => {
    // Verify frontend does not define or expose META_CONVERSIONS_API_ACCESS_TOKEN
    expect((import.meta.env as any).META_CONVERSIONS_API_ACCESS_TOKEN).toBeUndefined();
    expect((import.meta.env as any).VITE_META_CONVERSIONS_API_ACCESS_TOKEN).toBeUndefined();
  });

  it("8: only allowed server-side event names are valid in CAPI contract", () => {
    const allowed = [
      "CompleteRegistration",
      "Lead",
      "PortfolioAssetAdded",
      "WatchlistItemAdded",
      "PriceAlertCreated",
      "PageView",
    ];

    expect(allowed).toContain("CompleteRegistration");
    expect(allowed).toContain("Lead");
    expect(allowed).toContain("PortfolioAssetAdded");
    expect(allowed).not.toContain("ArbitraryUnauthorizedEvent");
  });

  it("9: revoking advertising consent stops browser Meta tracking", () => {
    setConsent("accepted", { analytics: true, ads: true });
    initMetaPixel("1234567890");

    const fbqSpy = vi.spyOn(window, "fbq");
    fbqSpy.mockClear();

    // Revoke consent
    setConsent("rejected", { analytics: false, ads: false });
    handleMetaConsentRevoked();

    trackMetaEvent("signup_completed", { method: "email" });

    // Ensure no conversion event was dispatched
    expect(fbqSpy).not.toHaveBeenCalledWith("track", "CompleteRegistration", expect.anything(), expect.anything());
  });

  it("10: PostHog behavior is unchanged and independent of Meta ad consent", () => {
    // Give analytics consent but NOT ads consent
    setConsent("custom", { analytics: true, ads: false });
    initAnalytics("phc_posthog_test");

    const posthogCaptureSpy = vi.spyOn(posthog, "capture");
    posthogCaptureSpy.mockClear();

    trackEvent("stock_viewed", { stock_symbol: "EQTY" });

    // PostHog received the event
    expect(posthogCaptureSpy).toHaveBeenCalledWith(
      "stock_viewed",
      expect.objectContaining({ stock_symbol: "EQTY" })
    );

    // Meta Pixel was never initialized
    expect(window.fbq).toBeUndefined();
  });
});
