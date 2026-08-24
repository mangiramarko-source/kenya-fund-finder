import { describe, expect, it } from "vitest";
import { darkDemoMarketBriefData, demoMarketBriefData, renderMarketBriefEmail } from "../../supabase/functions/_shared/market-brief-email";

describe("Market Brief email renderer", () => {
  it("renders a responsive, demo-labelled report from explicit data only", () => {
    const email = renderMarketBriefEmail(demoMarketBriefData);
    expect(email.subject).toBe("[DEMO] KenyaFundFinder — Kenya Market Brief");
    expect(email.html).toContain("DEMO · SAMPLE DATA");
    expect(email.html).toContain("background:#f3f0e7");
    expect(email.html).toContain("background:#ffffff");
    expect(email.html).toContain("border:1px solid #e6e2d8");
    expect(email.html).toContain("background:#17734c");
    expect(email.html).toContain("color:#202938");
    expect(email.html).not.toContain("background:#0a0a0b");
    expect(email.html).toContain("font-family:Georgia");
    expect(email.html).toContain('name="viewport"');
    expect(email.html).toContain("@media only screen");
    expect(email.html).toContain("VIEW FULL MARKET OVERVIEW");
    expect(email.html).toContain("Was this brief useful?");
    expect(email.html).toContain("Unsubscribe");
    expect(email.html).not.toMatch(/<script\b|market_overviews|source_as_of|overview_id|from\(\"stocks\"/i);
    expect((email.html.match(/<table\b/gi) ?? []).length).toBe((email.html.match(/<\/table>/gi) ?? []).length);
  });

  it("omits optional report sections without leaving headings behind", () => {
    const email = renderMarketBriefEmail({ ...demoMarketBriefData, movers: [], currencies: [], watchlist: [], watchItems: [], news: [], discoveryActions: [], importantUpdates: undefined });
    expect(email.html).not.toContain("Biggest movers");
    expect(email.html).not.toContain("Kenyan Shilling");
    expect(email.html).not.toContain("Watchlist tracker");
    expect(email.html).not.toContain("What to watch next");
    expect(email.html).not.toContain("Stories that matter");
    expect(email.html).not.toContain("Explore KenyaFundFinder");
    expect(email.html).toContain("No important company updates today.");
  });

  it("renders five sample gainers and five sample losers in dark mode", () => {
    const email = renderMarketBriefEmail(darkDemoMarketBriefData);

    expect(email.html).toContain("background:#0a0a0b");
    expect(email.html).toContain('src="https://kenyafundfinder.com/market-brief-hero.png"');
    expect(email.html).toContain('width="600" alt="KenyaFundFinder — What to watch in Kenyan markets"');
    expect(email.html).toContain('style="display:block;width:100%;max-width:600px;height:auto;border:0;"');
    expect(email.html).not.toContain("DEMO · SAMPLE DATA");
    expect(email.html).not.toContain(">Market overview<");
    expect(email.html).not.toContain("Was this brief useful?");
    expect(email.html).not.toContain("Kenya Market Brief</div>");
    expect(email.html).not.toContain(darkDemoMarketBriefData.marketHeadline);
    expect(email.html).toContain("Top gainers · sample");
    expect(email.html).toContain("Top losers · sample");
    expect(darkDemoMarketBriefData.movers?.filter((item) => item.changePercent >= 0)).toHaveLength(5);
    expect(darkDemoMarketBriefData.movers?.filter((item) => item.changePercent < 0)).toHaveLength(5);
    expect(email.html).not.toMatch(/<script\b|market_overviews|from\(\"stocks\"/i);
    expect((email.html.match(/<table\b/gi) ?? []).length).toBe((email.html.match(/<\/table>/gi) ?? []).length);
    expect(renderMarketBriefEmail(demoMarketBriefData).html).not.toContain("market-brief-hero.png");
  });
});
