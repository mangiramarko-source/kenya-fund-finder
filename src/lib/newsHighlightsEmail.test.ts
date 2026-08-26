import { describe, expect, it } from "vitest";
import { demoNewsHighlightsData, formatDisplayDate, renderNewsHighlightsEmail, type NewsHighlightsEmailData } from "../../supabase/functions/_shared/news-highlights-email.ts";

describe("News Highlights editorial email renderer", () => {
  it("uses Gmail-safe white surfaces with a full-width mobile shell", () => {
    const email = renderNewsHighlightsEmail(demoNewsHighlightsData);
    expect(email.html).toContain('bgcolor="#ffffff"');
    expect(email.html).toContain("background-color:#ffffff");
    expect(email.html).toContain("@media screen and (max-width:640px)");
    expect(email.html).toContain(".email-outer{padding:0!important}");
    expect(email.html).toContain(".email-shell{width:100%!important;max-width:none!important}");
    expect(email.html).toContain(".email-content{padding-left:16px!important;padding-right:16px!important}");
    expect(email.html).toContain('src="https://kenyafundfinder.com/market-news-highlights-hero.png"');
    expect(email.html).toContain("VIEW MORE MARKET NEWS");
    expect(email.html).not.toMatch(/email-card|border-radius|#0a0a0b|#111113|color-scheme/);
    expect((email.html.match(/<table\b/gi) ?? []).length).toBe((email.html.match(/<\/table>/gi) ?? []).length);
  });
  it("formats dates and escapes untrusted content", () => {
    expect(formatDisplayDate("2026-08-24T02:00:00+00:00")).toBe("24 Aug 2026");
    const unsafe: NewsHighlightsEmailData = { ...demoNewsHighlightsData, topStories: [{ category: "TEST", headline: '<script>alert("x")</script>', summary: "<b>summary</b>", url: "https://kenyafundfinder.com/news?a=1&b=2" }] };
    const html = renderNewsHighlightsEmail(unsafe).html;
    expect(html).not.toContain("<script>alert");
    expect(html).toContain("&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt;");
    expect(html).toContain("&lt;b&gt;summary&lt;/b&gt;");
  });
});
