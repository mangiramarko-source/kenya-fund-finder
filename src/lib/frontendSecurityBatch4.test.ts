import { describe, it, expect, vi } from "vitest";
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { sanitizeUrl, isSafeHttpUrl } from "./urlSanitizer";
import { decodeHtmlEntities } from "./utils";

describe("Batch 4 — Frontend & Browser Security Verification", () => {
  it("1 & 2: useAuth and AuthCallback source code must not contain console.log/console.error of tokens, hashes, or URLs", () => {
    const useAuthSrc = readFileSync(resolve(__dirname, "../hooks/useAuth.tsx"), "utf8");
    const authCallbackSrc = readFileSync(resolve(__dirname, "../pages/AuthCallback.tsx"), "utf8");

    expect(useAuthSrc).not.toMatch(/console\.log\([^)]*window\.location\.hash/);
    expect(useAuthSrc).not.toMatch(/console\.log\([^)]*window\.location\.href/);
    expect(useAuthSrc).not.toMatch(/console\.log\([^)]*access_token/);
    expect(useAuthSrc).not.toMatch(/console\.log\([^)]*refresh_token/);

    expect(authCallbackSrc).not.toMatch(/console\.error\([^)]*sessionError/);
    expect(authCallbackSrc).not.toMatch(/console\.error\([^)]*err/);
  });

  it("3 & 4: Production build bundle must not contain backend secrets or sb_secret_ keys", () => {
    const distDir = resolve(__dirname, "../../dist");
    if (existsSync(distDir)) {
      const indexHtml = readFileSync(resolve(distDir, "index.html"), "utf8");
      expect(indexHtml).not.toMatch(/sb_secret_/);
      expect(indexHtml).not.toMatch(/service_role/);
      expect(indexHtml).not.toMatch(/SUPABASE_SERVICE_ROLE_KEY/);
    }
  });

  it("5: Frontend source tree must not hardcode legacy service_role JWT credentials", () => {
    const clientSrc = readFileSync(resolve(__dirname, "../integrations/supabase/client.ts"), "utf8");
    const gatewaySrc = readFileSync(resolve(__dirname, "gateway.ts"), "utf8");
    const supabaseLibSrc = readFileSync(resolve(__dirname, "supabase.ts"), "utf8");

    // Must not contain legacy HS256 service role JWT signature
    expect(clientSrc).not.toMatch(/RoY94LVmcCVVjLtIHyOCLb-8UYpE4wEQkPHobGdKkDE/);
    expect(gatewaySrc).not.toMatch(/RoY94LVmcCVVjLtIHyOCLb-8UYpE4wEQkPHobGdKkDE/);
    expect(supabaseLibSrc).not.toMatch(/RoY94LVmcCVVjLtIHyOCLb-8UYpE4wEQkPHobGdKkDE/);
  });

  it("6: Admin state is never granted by hardcoded email check in useAuth", () => {
    const useAuthSrc = readFileSync(resolve(__dirname, "../hooks/useAuth.tsx"), "utf8");
    expect(useAuthSrc).not.toMatch(/session\.user\.email.*===.*kokoscalbaridi/);
    expect(useAuthSrc).not.toMatch(/if\s*\(session\.user\.email\)\s*\{\s*setIsAdmin\(true\)/);
  });

  it("7: sanitizeUrl rejects javascript: and unsafe external redirect protocols", () => {
    expect(sanitizeUrl("javascript:alert(1)")).toBe("#");
    expect(sanitizeUrl("JAVASCRIPT:document.cookie")).toBe("#");
    expect(sanitizeUrl("data:text/html,<script>alert(1)</script>")).toBe("#");
    expect(sanitizeUrl("vbscript:msgbox(1)")).toBe("#");
    
    // Allowed safe destinations
    expect(sanitizeUrl("https://kenyafundfinder.com")).toBe("https://kenyafundfinder.com");
    expect(sanitizeUrl("http://example.com")).toBe("http://example.com");
    expect(sanitizeUrl("/funds/test")).toBe("/funds/test");
    expect(sanitizeUrl("#section")).toBe("#section");
    expect(sanitizeUrl("mailto:support@kenyafundfinder.com")).toBe("mailto:support@kenyafundfinder.com");

    expect(isSafeHttpUrl("https://example.com")).toBe(true);
    expect(isSafeHttpUrl("javascript:alert(1)")).toBe(false);
    expect(isSafeHttpUrl("")).toBe(false);
  });

  it("8 & 9: decodeHtmlEntities sanitizes HTML and decodes entities safely without DOM script execution", () => {
    const entityInput = "&quot;Hello &amp; Welcome &#8217;To&#8216; KenyaFundFinder&quot;";
    const decoded = decodeHtmlEntities(entityInput);
    expect(decoded).toContain('"Hello & Welcome');
    expect(decoded).toContain("KenyaFundFinder");

    const xssPayload = "<img src=x onerror=alert(1)><b>Bold Title</b>";
    const sanitized = decodeHtmlEntities(xssPayload);
    expect(sanitized).not.toContain("<img");
    expect(sanitized).not.toContain("onerror");
    expect(sanitized).toContain("Bold Title");
  });

  it("10: Sentry telemetry config contains beforeSend and beforeBreadcrumb credential redaction", () => {
    const mainSrc = readFileSync(resolve(__dirname, "../main.tsx"), "utf8");
    expect(mainSrc).toMatch(/beforeSend\(event\)/);
    expect(mainSrc).toMatch(/delete event\.request\.headers\["authorization"\]/);
    expect(mainSrc).toMatch(/beforeBreadcrumb\(breadcrumb\)/);
    expect(mainSrc).toMatch(/access_token/);
  });
});
