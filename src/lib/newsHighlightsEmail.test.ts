import { describe, expect, it } from "vitest";
import {
  demoNewsHighlightsData,
  formatDisplayDate,
  renderNewsHighlightsEmail,
  type NewsHighlightsEmailData,
} from "../../supabase/functions/_shared/news-highlights-email.ts";

describe("News Highlights Email Renderer (Gmail-Resistant Dark Mode)", () => {
  it("renders with fallback bgcolor attributes on body and outer tables", () => {
    const rendered = renderNewsHighlightsEmail(demoNewsHighlightsData);

    expect(rendered.html).toContain('bgcolor="#0B0F14"');
    expect(rendered.html).toContain('bgcolor="#10161D"');
    expect(rendered.html).toContain('bgcolor="#151C24"');
  });

  it("renders inline background-color declarations on major containers", () => {
    const rendered = renderNewsHighlightsEmail(demoNewsHighlightsData);

    expect(rendered.html).toContain("background-color:#0B0F14");
    expect(rendered.html).toContain("background-color:#10161D");
    expect(rendered.html).toContain("background-color:#151C24");
  });

  it("applies solid linear-gradient protection for Gmail on dark backgrounds", () => {
    const rendered = renderNewsHighlightsEmail(demoNewsHighlightsData);

    expect(rendered.html).toContain("background:linear-gradient(#0B0F14,#0B0F14)");
    expect(rendered.html).toContain("background:linear-gradient(#10161D,#10161D)");
    expect(rendered.html).toContain("background:linear-gradient(#151C24,#151C24)");
    expect(rendered.html).toContain("background:linear-gradient(#19212B,#19212B)");
  });

  it("does not declare unsupported dark-only color-scheme meta tags", () => {
    const rendered = renderNewsHighlightsEmail(demoNewsHighlightsData);

    expect(rendered.html).not.toContain('<meta name="color-scheme"');
    expect(rendered.html).not.toContain('<meta name="supported-color-schemes"');
    expect(rendered.html).not.toContain("color-scheme: dark");
    expect(rendered.html).not.toContain("color-scheme:dark");
    expect(rendered.html).not.toContain("color-scheme: light dark");
  });

  it("preserves apple message reformatting meta tag", () => {
    const rendered = renderNewsHighlightsEmail(demoNewsHighlightsData);

    expect(rendered.html).toContain('<meta name="x-apple-disable-message-reformatting">');
  });

  it("sets body class='body' and doctype for Gmail blend targeting", () => {
    const rendered = renderNewsHighlightsEmail(demoNewsHighlightsData);

    expect(rendered.html.startsWith("<!doctype html>")).toBe(true);
    expect(rendered.html).toContain('<body class="body"');
  });

  it("includes u + .body CSS blend mode rules for Gmail iOS text preservation", () => {
    const rendered = renderNewsHighlightsEmail(demoNewsHighlightsData);

    expect(rendered.html).toContain("u + .body .gmail-blend-screen{background:#000;mix-blend-mode:screen}");
    expect(rendered.html).toContain("u + .body .gmail-blend-difference{background:#000;mix-blend-mode:difference}");
  });

  it("protects primary white headings and headlines with nested blend divs", () => {
    const rendered = renderNewsHighlightsEmail(demoNewsHighlightsData);

    // Section title "Top stories"
    expect(rendered.html).toContain(
      '<div class="gmail-blend-screen"><div class="gmail-blend-difference">Top stories</div></div>'
    );
    // Section title "Why it matters"
    expect(rendered.html).toContain(
      '<div class="gmail-blend-screen"><div class="gmail-blend-difference">Why it matters</div></div>'
    );
    // Story headline
    expect(rendered.html).toContain(
      '<div class="gmail-blend-screen"><div class="gmail-blend-difference">Sample bank profits improve as loan book growth offsets margin pressure</div></div>'
    );
  });

  it("does not wrap secondary grey summaries or muted metadata in blend mode wrappers", () => {
    const rendered = renderNewsHighlightsEmail(demoNewsHighlightsData);

    // Secondary summaries should be plain text or escaped text inside the styling container
    expect(rendered.html).toContain("Fictional earnings coverage showing how a bank update might be summarized");
    expect(rendered.html).not.toContain(
      '<div class="gmail-blend-screen"><div class="gmail-blend-difference">Fictional earnings coverage'
    );

    // Muted meta should not be wrapped
    expect(rendered.html).not.toContain(
      '<div class="gmail-blend-screen"><div class="gmail-blend-difference">Business Daily'
    );
  });

  it("preserves CTA button and green links", () => {
    const rendered = renderNewsHighlightsEmail(demoNewsHighlightsData);

    expect(rendered.html).toContain("VIEW MORE MARKET NEWS");
    expect(rendered.html).toContain('bgcolor="#22C55E"');
    expect(rendered.html).toContain("background:linear-gradient(#22C55E,#22C55E)");
    expect(rendered.html).toContain("color:#22C55E");
  });

  it("correctly formats published dates into clean display strings", () => {
    expect(formatDisplayDate("2026-08-24T02:00:00+00:00")).toBe("24 Aug 2026");
    expect(formatDisplayDate("2026-08-23T18:00:00+00:00")).toBe("23 Aug 2026");
    expect(formatDisplayDate("")).toBe("");
    expect(formatDisplayDate(undefined)).toBe("");
  });

  it("escapes untrusted user or news content before inserting into HTML and blend wrappers", () => {
    const untrustedData: NewsHighlightsEmailData = {
      ...demoNewsHighlightsData,
      topStories: [
        {
          category: "TECH & MEDIA",
          headline: 'Alert: <script>alert("xss")</script> & Market "News"',
          summary: "Summary with <b>tags</b> & quotes",
          url: "https://kenyafundfinder.com/news?a=1&b=2",
        },
      ],
      featuredStory: {
        category: "SPECIAL",
        headline: 'Featured <img src="x" onerror="alert(1)">',
        summary: "Featured summary <script>",
        url: "https://kenyafundfinder.com/news",
      },
    };

    const rendered = renderNewsHighlightsEmail(untrustedData);

    expect(rendered.html).not.toContain("<script>");
    expect(rendered.html).not.toContain('<img src="x"');
    expect(rendered.html).toContain("&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt; &amp; Market &quot;News&quot;");
    expect(rendered.html).toContain("&lt;b&gt;tags&lt;/b&gt; &amp; quotes");
    expect(rendered.html).toContain(
      '<div class="gmail-blend-screen"><div class="gmail-blend-difference">Alert: &lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt; &amp; Market &quot;News&quot;</div></div>'
    );
  });

  it("keeps total HTML email byte size well below Gmail clipping limit of 102KB", () => {
    const rendered = renderNewsHighlightsEmail(demoNewsHighlightsData);
    const bytes = Buffer.byteLength(rendered.html, "utf8");

    // Email size should be ~10KB - 20KB, well under 102KB (104,448 bytes)
    expect(bytes).toBeLessThan(50 * 1024);
    expect(bytes).toBeGreaterThan(5 * 1024);
  });
});
