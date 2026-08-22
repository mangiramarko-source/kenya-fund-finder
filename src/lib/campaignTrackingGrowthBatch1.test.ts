import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  extractCampaignParams,
  captureUtmAttribution,
  getFirstTouchAttribution,
  getLastTouchAttribution,
  getAttributionProperties,
  sanitizeProperties,
  trackEvent,
  identifyUser,
  resetUser,
} from "./analytics";

describe("Growth Batch 1 — Campaign Tracking & Attribution Verification", () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    vi.clearAllMocks();
  });

  it("1: captures standard UTM and ad click parameters correctly", () => {
    const search = "?utm_source=facebook&utm_medium=paid_social&utm_campaign=launch_q3&utm_content=video_ad_1&utm_term=mmf_kenya&fbclid=fb_123456";
    const extracted = extractCampaignParams(search, "https://l.facebook.com", "/funds");

    expect(extracted.utm_source).toBe("facebook");
    expect(extracted.utm_medium).toBe("paid_social");
    expect(extracted.utm_campaign).toBe("launch_q3");
    expect(extracted.utm_content).toBe("video_ad_1");
    expect(extracted.utm_term).toBe("mmf_kenya");
    expect(extracted.fbclid).toBe("fb_123456");
    expect(extracted.referrer).toBe("https://l.facebook.com");
    expect(extracted.landing_page).toBe("/funds");
  });

  it("2: preserves First-Touch attribution and does NOT overwrite it on later visits", () => {
    // Visit 1: Arrives from Google Search ad
    const search1 = "?utm_source=google&utm_medium=cpc&utm_campaign=brand_search&gclid=gclid_999";
    captureUtmAttribution(search1, "https://google.com", "/");

    const firstTouch1 = getFirstTouchAttribution();
    expect(firstTouch1.utm_source).toBe("google");
    expect(firstTouch1.utm_campaign).toBe("brand_search");
    expect(firstTouch1.gclid).toBe("gclid_999");

    // Visit 2: Returns 3 days later via Facebook ad
    const search2 = "?utm_source=facebook&utm_medium=paid_social&utm_campaign=retargeting&fbclid=fb_888";
    captureUtmAttribution(search2, "https://facebook.com", "/stocks");

    const firstTouch2 = getFirstTouchAttribution();
    // Must remain google brand_search!
    expect(firstTouch2.utm_source).toBe("google");
    expect(firstTouch2.utm_campaign).toBe("brand_search");
    expect(firstTouch2.gclid).toBe("gclid_999");
  });

  it("3: updates Last-Touch attribution when a new campaign visit occurs", () => {
    // Visit 1: Google
    captureUtmAttribution("?utm_source=google&utm_campaign=search_1", "", "/");
    expect(getLastTouchAttribution().utm_source).toBe("google");

    // Visit 2: Facebook
    captureUtmAttribution("?utm_source=facebook&utm_campaign=social_2", "", "/funds");
    expect(getLastTouchAttribution().utm_source).toBe("facebook");
    expect(getLastTouchAttribution().utm_campaign).toBe("social_2");
    expect(getLastTouchAttribution().landing_page).toBe("/funds");
  });

  it("4: attribution properties combine initial and last touch for event tracking", () => {
    captureUtmAttribution("?utm_source=tiktok&utm_campaign=viral_1", "", "/");
    captureUtmAttribution("?utm_source=newsletter&utm_campaign=weekly_digest", "", "/rates");

    const props = getAttributionProperties();
    expect(props.initial_utm_source).toBe("tiktok");
    expect(props.initial_utm_campaign).toBe("viral_1");
    expect(props.utm_source).toBe("newsletter");
    expect(props.utm_campaign).toBe("weekly_digest");
    expect(props.last_landing_page).toBe("/rates");
  });

  it("5: sanitizeProperties redacts auth tokens, passwords, and secret keys", () => {
    const raw = {
      user_id: "123",
      source: "ad_test",
      password: "secret_password_123",
      access_token: "eyJhbGciOi...",
      refresh_token: "refresh_val",
      auth_header: "Bearer token123",
      secret_key: "sb_secret_abcdef",
      safe_metric: 42,
    };

    const clean = sanitizeProperties(raw);
    expect(clean.user_id).toBe("123");
    expect(clean.source).toBe("ad_test");
    expect(clean.safe_metric).toBe(42);

    expect(clean.password).toBeUndefined();
    expect(clean.access_token).toBeUndefined();
    expect(clean.refresh_token).toBeUndefined();
    expect(clean.auth_header).toBeUndefined();
    expect(clean.secret_key).toBeUndefined();
  });

  it("6: malformed or malicious UTM values are sanitized and do not execute or throw", () => {
    const maliciousSearch = "?utm_source=<script>alert(1)</script>&utm_campaign=test%0D%0AInjectedHeader";
    const extracted = extractCampaignParams(maliciousSearch);

    expect(extracted.utm_source).not.toContain("<script>");
    expect(extracted.utm_source).not.toContain("</script>");
    expect(extracted.utm_campaign).not.toContain("\r");
    expect(extracted.utm_campaign).not.toContain("\n");
  });

  it("7: trackEvent emits CustomEvent with sanitized properties in browser runtime", () => {
    let capturedDetail: any = null;
    const listener = (e: any) => {
      capturedDetail = e.detail;
    };
    window.addEventListener("kff_analytics_event", listener);

    captureUtmAttribution("?utm_source=twitter&utm_campaign=launch");
    trackEvent("signup_completed", { method: "email", dummy_token: "secret" });

    window.removeEventListener("kff_analytics_event", listener);

    expect(capturedDetail).not.toBeNull();
    expect(capturedDetail.event).toBe("signup_completed");
    expect(capturedDetail.properties.method).toBe("email");
    expect(capturedDetail.properties.initial_utm_source).toBe("twitter");
    expect(capturedDetail.properties.dummy_token).toBeUndefined();
  });

  it("8: application property sanitization preserves non-sensitive properties while stripping sensitive fields", () => {
    const rawProps = {
      page: "/overview",
      asset_symbol: "SCOM",
      yield_rate: 16.5,
      auth_token: "secret_123",
      refresh_token: "secret_456",
      api_key: "secret_789",
      password: "password123",
      session: "Bearer abc.def.ghi",
    };

    const sanitized = sanitizeProperties(rawProps);

    // Non-sensitive properties preserved
    expect(sanitized.page).toBe("/overview");
    expect(sanitized.asset_symbol).toBe("SCOM");
    expect(sanitized.yield_rate).toBe(16.5);

    // Sensitive properties strictly stripped
    expect(sanitized.auth_token).toBeUndefined();
    expect(sanitized.refresh_token).toBeUndefined();
    expect(sanitized.api_key).toBeUndefined();
    expect(sanitized.password).toBeUndefined();
    expect(sanitized.session).toBeUndefined();
  });
});
