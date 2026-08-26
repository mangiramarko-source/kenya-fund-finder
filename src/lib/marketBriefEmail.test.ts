import { describe, expect, it } from "vitest";
import { darkDemoMarketBriefData, demoMarketBriefData, renderMarketBriefEmail } from "../../supabase/functions/_shared/market-brief-email";

describe("Market Brief editorial email renderer", () => {
  it("uses the Gmail-safe editorial shell while preserving the hero, CTA, and text report", () => {
    const email = renderMarketBriefEmail(darkDemoMarketBriefData);
    expect(email.subject).toBe("[DEMO] KenyaFundFinder — Kenya Market Brief");
    expect(email.html).toContain('bgcolor="#ffffff"');
    expect(email.html).toContain("background-color:#ffffff");
    expect(email.html).toContain("@media screen and (max-width:640px)");
    expect(email.html).toContain(".email-outer{padding:0!important}");
    expect(email.html).toContain(".email-shell{width:100%!important;max-width:none!important}");
    expect(email.html).toContain(".email-content{padding-left:16px!important;padding-right:16px!important}");
    expect(email.html).toContain('src="https://kenyafundfinder.com/market-brief-hero.png"');
    expect(email.html).toContain("VIEW FULL MARKET OVERVIEW");
    expect(email.html).toContain("https://kenyafundfinder.com/alerts?tab=settings");
    expect(email.html).toContain("News summary");
    expect(email.text).toContain("NEWS SUMMARY");
    expect(email.html).not.toMatch(/email-card|border-radius|#0a0a0b|#111113|color-scheme/);
    expect((email.html.match(/<table\b/gi) ?? []).length).toBe((email.html.match(/<\/table>/gi) ?? []).length);
  });
  it("omits optional report sections cleanly", () => {
    const email = renderMarketBriefEmail({ ...demoMarketBriefData, movers: [], currencies: [], watchlist: [], watchItems: [], newsSummary: [], news: [], discoveryActions: [], importantUpdates: undefined });
    expect(email.html).not.toContain("Biggest movers");
    expect(email.html).not.toContain("News summary");
    expect(email.html).not.toContain("Stories that matter");
    expect(email.html).toContain("Market overview");
  });
});
