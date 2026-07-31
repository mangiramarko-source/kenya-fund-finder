import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { installConsentScriptGuard } from "@/lib/consent-guard";
import { setConsent, clearConsent } from "@/lib/consent";

// Helper: append a <script> with the given src and report whether it kept its src
// (i.e. was allowed to execute) or was neutralized by the guard.
function tryLoadScript(src: string): { allowed: boolean; el: HTMLScriptElement } {
  const el = document.createElement("script");
  el.src = src;
  document.head.appendChild(el);
  // The guard strips src + sets type="text/plain" when blocked.
  const allowed = !!el.src && el.type !== "text/plain" && !el.dataset.consentBlocked;
  return { allowed, el };
}

describe("consent script guard", () => {
  beforeEach(() => {
    // Fresh state for each test.
    localStorage.clear();
    // The guard installs once per page; calling again is a safe no-op.
    installConsentScriptGuard();
    // Silence the [consent-guard] warnings during tests.
    vi.spyOn(console, "warn").mockImplementation(() => {});
  });

  afterEach(() => {
    document.head.querySelectorAll("script[data-test-script]").forEach((n) => n.remove());
    vi.restoreAllMocks();
  });

  it("blocks Google Analytics before any consent is given", () => {
    clearConsent();
    const { allowed, el } = tryLoadScript("https://www.google-analytics.com/analytics.js");
    el.dataset.testScript = "1";
    expect(allowed).toBe(false);
    expect(el.dataset.consentBlocked).toMatch(/consent-required:analytics/);
  });

  it("blocks Google AdSense before any consent is given", () => {
    clearConsent();
    const { allowed, el } = tryLoadScript(
      "https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js"
    );
    el.dataset.testScript = "1";
    expect(allowed).toBe(false);
    expect(el.dataset.consentBlocked).toMatch(/consent-required:ads/);
  });

  it("blocks unknown third-party scripts when no consent is given", () => {
    clearConsent();
    const { allowed, el } = tryLoadScript("https://tracker.example.com/pixel.js");
    el.dataset.testScript = "1";
    expect(allowed).toBe(false);
    expect(el.dataset.consentBlocked).toMatch(/no-consent/);
  });

  it("allows essential scripts (Supabase, Cloudflare Turnstile) without consent", () => {
    clearConsent();
    const supabase = tryLoadScript("https://caawgzuofnujrznwbuxk.supabase.co/anything.js");
    supabase.el.dataset.testScript = "1";
    const turnstile = tryLoadScript("https://challenges.cloudflare.com/turnstile/v0/api.js");
    turnstile.el.dataset.testScript = "1";
    expect(supabase.allowed).toBe(true);
    expect(turnstile.allowed).toBe(true);
  });

  it("allows analytics scripts after analytics consent is granted", () => {
    setConsent("custom", { analytics: true, ads: false });
    const { allowed, el } = tryLoadScript("https://www.googletagmanager.com/gtag/js?id=G-XYZ");
    el.dataset.testScript = "1";
    expect(allowed).toBe(true);
    expect(el.dataset.consentBlocked).toBeUndefined();
  });

  it("still blocks ads when only analytics consent is granted", () => {
    setConsent("custom", { analytics: true, ads: false });
    const { allowed, el } = tryLoadScript(
      "https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js"
    );
    el.dataset.testScript = "1";
    expect(allowed).toBe(false);
    expect(el.dataset.consentBlocked).toMatch(/consent-required:ads/);
  });

  it("allows ads scripts after ads consent is granted", () => {
    setConsent("custom", { analytics: false, ads: true });
    const { allowed, el } = tryLoadScript(
      "https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js"
    );
    el.dataset.testScript = "1";
    expect(allowed).toBe(true);
    expect(el.dataset.consentBlocked).toBeUndefined();
  });

  it("allows previously-blocked categories after acceptAll", () => {
    // First: blocked.
    clearConsent();
    const blocked = tryLoadScript("https://www.google-analytics.com/analytics.js");
    blocked.el.dataset.testScript = "1";
    expect(blocked.allowed).toBe(false);

    // Grant full consent and try again — should now load.
    setConsent("accepted", { analytics: true, ads: true });
    const allowed = tryLoadScript("https://www.google-analytics.com/analytics.js");
    allowed.el.dataset.testScript = "1";
    expect(allowed.allowed).toBe(true);
  });

  it("re-blocks scripts after consent is cleared", () => {
    setConsent("accepted", { analytics: true, ads: true });
    const granted = tryLoadScript("https://www.google-analytics.com/analytics.js");
    granted.el.dataset.testScript = "1";
    expect(granted.allowed).toBe(true);

    clearConsent();
    const reblocked = tryLoadScript("https://www.google-analytics.com/analytics.js");
    reblocked.el.dataset.testScript = "1";
    expect(reblocked.allowed).toBe(false);
  });
});
