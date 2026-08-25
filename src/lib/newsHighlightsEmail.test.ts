import { describe, expect, it } from "vitest";
import { demoNewsHighlightsData, formatDisplayDate, renderNewsHighlightsEmail } from "../../supabase/functions/_shared/news-highlights-email";

describe("News Highlights email renderer", () => {
  it("formats dates from ISO timestamps into human-readable strings", () => {
    expect(formatDisplayDate("2026-08-24T02:00:00+00:00")).toBe("24 Aug 2026");
    expect(formatDisplayDate("2026-08-23T18:00:00+00:00")).toBe("23 Aug 2026");
    expect(formatDisplayDate("2026-08-23T15:00:00+00:00")).toBe("23 Aug 2026");
    expect(formatDisplayDate("")).toBe("");
    expect(formatDisplayDate(undefined)).toBe("");
  });

  it("renders the premium dark theme email with email-safe structure and accurate data", () => {
    const email = renderNewsHighlightsEmail({
      ...demoNewsHighlightsData,
      unsubscribeUrl: "https://example.test/unsubscribe",
      preferencesUrl: "https://example.test/preferences",
    });

    expect(email.subject).toBe("[DEMO] KenyaFundFinder News Highlights");

    // Hero preservation
    expect(email.html).toContain('src="https://kenyafundfinder.com/market-news-highlights-hero.png"');
    expect(email.html).toContain('width="600" alt="KenyaFundFinder News Highlights"');
    expect(email.html).toContain('style="display:block;width:100%;max-width:600px;height:auto;border:0;"');

    // Dark theme color palette & email client compatibility
    expect(email.html).toContain('bgcolor="#0B0F14"');
    expect(email.html).toContain("background-color:#0B0F14");
    expect(email.html).toContain('bgcolor="#10161D"');
    expect(email.html).toContain("background-color:#10161D");
    expect(email.html).toContain('bgcolor="#151C24"');
    expect(email.html).toContain("background-color:#151C24");
    expect(email.html).toContain('bgcolor="#19212B"');
    expect(email.html).toContain("background-color:#19212B");
    expect(email.html).toContain("color:#F3F4F6");
    expect(email.html).toContain("color:#A7B0BB");
    expect(email.html).toContain("color:#7F8A98");
    expect(email.html).toContain("color:#22C55E");
    expect(email.html).toContain("background-color:#15803D");
    expect(email.html).toContain("border:1px solid #263241");
    expect(email.html).toContain('<meta name="color-scheme" content="dark">');

    // Section headings
    expect(email.html).toContain("Top stories");
    expect(email.html).toContain("Why it matters");
    expect(email.html).toContain("Company watch");
    expect(email.html).toContain("Economy / policy watch");
    expect(email.html).toContain("Editor&#039;s pick");
    expect(email.html).toContain("VIEW MORE MARKET NEWS");

    // Category pills & content
    expect(email.html).toContain("EARNINGS REPORT");
    expect(email.html).toContain("MARKET SENTIMENT");
    expect(email.html).toContain("FX");
    expect(email.html).toContain("POLICY");
    expect(email.html).toContain("Read more -&gt;");

    // Human-readable formatted dates (no raw ISO timestamps in rendered HTML)
    expect(email.html).toContain("24 Aug 2026");
    expect(email.html).toContain("23 Aug 2026");
    expect(email.html).not.toContain("2026-08-24T02:00:00+00:00");

    // Links
    expect(email.html).toContain('href="https://example.test/unsubscribe"');
    expect(email.html).toContain('href="https://example.test/preferences"');
    expect(email.html).toContain('href="https://kenyafundfinder.com/news"');

    // Demo constraints & plain-text variant
    expect(demoNewsHighlightsData.topStories).toHaveLength(4);
    expect(demoNewsHighlightsData.topStories.length).toBeGreaterThanOrEqual(3);
    expect(demoNewsHighlightsData.topStories.length).toBeLessThanOrEqual(5);
    expect(email.text).toContain("TOP STORIES");
    expect(email.text).toContain("WHY IT MATTERS");
    expect(email.text).toContain("COMPANY WATCH");
    expect(email.text).toContain("ECONOMY / POLICY WATCH");
    expect(email.text).toContain("EDITOR'S PICK");

    // Safety: no scripts, proper table balance
    expect(email.html).not.toMatch(/<script\b|market_overviews|from\(\"news_articles\"|from\(\"stocks\"|source_as_of|overview_id/i);
    expect((email.html.match(/<table\b/gi) ?? []).length).toBe((email.html.match(/<\/table>/gi) ?? []).length);
  });
});
