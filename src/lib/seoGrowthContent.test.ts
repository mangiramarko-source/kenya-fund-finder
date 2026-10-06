import { describe, expect, it } from "vitest";
import { RESEARCH_ARTICLES, articlePath, articleSeo } from "../data/seoGrowthContent";
import { MMF_CALCULATOR_SEO, metric, mmfHubSeo, sourceDate, sourceLink, type ResearchFund } from "./seoMarketContent";
import { renderSeoHtml } from "./seoPrerender";
import { verifySeoGrowthHtml } from "./seoGrowthVerification";

const template = '<html><head><title>Default</title></head><body><div id="root"></div></body></html>';
const fund: ResearchFund = { slug: "etica-mmf", name: "Etica", manager: "Etica", fund_type: "money_market", annual_yield: 10, yield_unit: "%", management_fee: 2, minimum_investment: 100, withdrawal_time: "2 days", updated_at: "2026-10-01T10:00:00Z", fact_sheet_date: "2026-09-01", website: "https://example.com/fund" };

describe("SEO growth content", () => {
  it("publishes unique, substantial guides and trust pages with matching metadata", () => {
    expect(new Set(RESEARCH_ARTICLES.map(articlePath)).size).toBe(RESEARCH_ARTICLES.length);
    expect(RESEARCH_ARTICLES.filter(a => a.pillar === "stocks")).toHaveLength(4);
    expect(RESEARCH_ARTICLES.filter(a => a.pillar === "mmf")).toHaveLength(5);
    for (const article of RESEARCH_ARTICLES) {
      const page = articleSeo(article);
      expect(verifySeoGrowthHtml(page.path, renderSeoHtml(template, page))).toEqual([]);
      expect(page.contentHtml).toContain("https://licensees.cma.or.ke/licenses/15/");
      expect(page.contentHtml).toContain("/mmf-calculator");
      expect(article.sections.length).toBeGreaterThanOrEqual(2);
    }
  });
  it("uses real source dates separately from record dates and computes the stated illustration", () => {
    const page = mmfHubSeo([fund]);
    expect(page.contentHtml).toContain("8.5%");
    expect(page.contentHtml).toContain("Fact-sheet date");
    expect(page.contentHtml).toContain("Record updated");
    expect(page.contentHtml).toContain(sourceDate(fund.fact_sheet_date));
    expect(page.contentHtml).toContain("Oct 2026");
  });
  it("never presents a unit price as a percentage or adds tax estimates to it", () => {
    const html = mmfHubSeo([{ ...fund, annual_yield: 100, yield_unit: "USD" }]).contentHtml;
    expect(html).toContain("100 USD");
    expect(html).not.toContain("85%");
    expect(html).not.toContain("100%");
  });
  it("handles missing data, filters other fund types, and escapes untrusted fields", () => {
    expect(metric(null)).toBe("Unavailable");
    expect(metric(NaN)).toBe("Unavailable");
    expect(sourceDate("invalid")).toBe("Unavailable");
    expect(sourceLink("javascript:alert(1)")).toBe("Source link unavailable");
    const html = mmfHubSeo([{ ...fund, name: '<script>alert(1)</script>' }, { ...fund, slug: "equity", fund_type: "equity" }]).contentHtml;
    expect(html).not.toContain("<script>");
    expect(html).not.toContain('href="/compare/equity"');
    expect(mmfHubSeo([]).contentHtml).toContain("temporarily unavailable");
  });
  it("rejects thin fallback output and incorrect canonical or noindex pages", () => {
    expect(verifySeoGrowthHtml("/stocks", template)).toContain("stock directory has fewer than ten company links");
    const page = renderSeoHtml(template, { ...MMF_CALCULATOR_SEO, robots: "noindex" });
    expect(verifySeoGrowthHtml("/mmf-calculator", page)).toContain("page is not explicitly indexable");
    expect(verifySeoGrowthHtml("/calculator", page)).toContain("incorrect canonical");
  });
});
