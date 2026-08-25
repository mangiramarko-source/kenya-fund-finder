import { describe, expect, it } from "vitest";
import { demoNewsHighlightsData, renderNewsHighlightsEmail } from "../../supabase/functions/_shared/news-highlights-email";

describe("News Highlights email renderer", () => {
  it("renders the dark news variant from explicit sample data only", () => {
    const email = renderNewsHighlightsEmail({
      ...demoNewsHighlightsData,
      unsubscribeUrl: "https://example.test/unsubscribe",
      preferencesUrl: "https://example.test/preferences",
    });

    expect(email.subject).toBe("[DEMO] KenyaFundFinder News Highlights");
    expect(email.html).toContain('src="https://kenyafundfinder.com/market-news-highlights-hero.png"');
    expect(email.html).toContain('width="600" alt="KenyaFundFinder News Highlights"');
    expect(email.html).toContain('style="display:block;width:100%;max-width:600px;height:auto;border:0;"');
    expect(email.html).toContain("background:#0a0a0b");
    expect(email.html).toContain("Top stories");
    expect(email.html).toContain("Why it matters");
    expect(email.html).toContain("Company watch");
    expect(email.html).toContain("Economy / policy watch");
    expect(email.html).toContain("Editor&#039;s pick");
    expect(email.html).toContain("VIEW MORE MARKET NEWS");
    expect(email.html).toContain("EARNINGS REPORT");
    expect(email.html).toContain("MARKET SENTIMENT");
    expect(email.html).toContain("FX");
    expect(email.html).toContain("POLICY");
    expect(email.html).toContain("Read more -&gt;");
    expect(email.html).toContain('href="https://example.test/unsubscribe"');
    expect(email.html).toContain('href="https://example.test/preferences"');
    expect(email.html).not.toContain("Stories shaping Kenyan markets");
    expect(email.html).not.toContain("Kenya Market Brief");
    expect(demoNewsHighlightsData.topStories).toHaveLength(4);
    expect(demoNewsHighlightsData.topStories.length).toBeGreaterThanOrEqual(3);
    expect(demoNewsHighlightsData.topStories.length).toBeLessThanOrEqual(5);
    expect(email.text).toContain("TOP STORIES");
    expect(email.text).toContain("WHY IT MATTERS");
    expect(email.text).toContain("COMPANY WATCH");
    expect(email.text).toContain("ECONOMY / POLICY WATCH");
    expect(email.text).toContain("EDITOR'S PICK");
    expect(email.html).not.toMatch(/<script\b|market_overviews|from\(\"news_articles\"|from\(\"stocks\"|source_as_of|overview_id/i);
    expect((email.html.match(/<table\b/gi) ?? []).length).toBe((email.html.match(/<\/table>/gi) ?? []).length);
  });
});
