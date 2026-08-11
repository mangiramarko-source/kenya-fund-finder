import { describe, expect, it } from "vitest";
import { canonicalUrl, escapeHtml, renderSeoHtml, stripHtml, truncateDescription } from "./seoPrerender";

const template = `<!doctype html><html><head><title>Default</title><meta name="description" content="Default"><link rel="canonical" href="https://kenyafundfinder.com/"><meta property="og:title" content="Default"><meta property="og:description" content="Default"><meta property="og:url" content="https://kenyafundfinder.com/"><meta property="og:type" content="website"><meta property="og:image" content="default.png"><meta name="twitter:title" content="Default"><meta name="twitter:description" content="Default"><meta name="twitter:image" content="default.png"></head><body><div id="root"><div id="kff-boot-fallback" style="display:flex"></div></div></body></html>`;

describe("SEO prerender helpers", () => {
  it("normalizes canonical URLs", () => {
    expect(canonicalUrl("/stocks/KEGN/")).toBe("https://kenyafundfinder.com/stocks/KEGN");
    expect(canonicalUrl("/")).toBe("https://kenyafundfinder.com/");
  });

  it("sanitizes source content", () => {
    expect(stripHtml("<p>Hello &amp; welcome</p><script>alert(1)</script>")).toBe("Hello & welcome");
    expect(escapeHtml('<img onerror="bad">')).toBe("&lt;img onerror=&quot;bad&quot;&gt;");
  });

  it("truncates descriptions on a word boundary", () => {
    const result = truncateDescription("word ".repeat(60), 80);
    expect(result.length).toBeLessThanOrEqual(80);
    expect(result.endsWith("…")).toBe(true);
  });

  it("renders route-specific metadata and semantic content", () => {
    const html = renderSeoHtml(template, {
      path: "/stocks/KEGN",
      title: "KEGN Share Price Today",
      description: "KenGen share price and financial information.",
      heading: "KenGen PLC (KEGN)",
      contentHtml: "<p>Current price KSh 10.95.</p>",
      jsonLd: { "@context": "https://schema.org", "@type": "FinancialProduct", name: "KenGen" },
    });

    expect(html).toContain("<title>KEGN Share Price Today</title>");
    expect(html).toContain('href="https://kenyafundfinder.com/stocks/KEGN"');
    expect(html).toContain("<h1 style=");
    expect(html).toContain("KenGen PLC (KEGN)");
    expect(html).toContain('data-seo-prerender="true"');
    expect(html).toContain('content="index, follow, max-image-preview:large');
    expect(html).toContain("display:none!important");
  });

  it("is idempotent when a generated template is reused", () => {
    const page = {
      path: "/stocks/KEGN",
      title: "KEGN Share Price Today",
      description: "KenGen share price and financial information.",
      heading: "KenGen PLC (KEGN)",
      contentHtml: "<p>Current price KSh 10.95.</p>",
      jsonLd: { "@context": "https://schema.org", "@type": "FinancialProduct", name: "KenGen" },
    };
    const once = renderSeoHtml(template, page);
    const twice = renderSeoHtml(once, page);
    expect(twice.match(/id="seo-prerender"/g)).toHaveLength(1);
    expect(twice.match(/data-seo-prerender="true"/g)).toHaveLength(1);
    expect(twice.match(/hreflang="en-KE"/g)).toHaveLength(1);
  });
});
