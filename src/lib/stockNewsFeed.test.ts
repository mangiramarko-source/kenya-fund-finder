import { describe, expect, it } from "vitest";
import type { NewsFromDB, PublicStock } from "@/lib/api";
import { buildNewsFeedItems, filterNewsArticles } from "./stockNewsFeed";

const article = (overrides: Partial<NewsFromDB> = {}): NewsFromDB => ({
  id: "article-1",
  title: "Safaricom reports stronger earnings",
  summary: "Summary fallback",
  content: null,
  source: "Business Daily",
  date_published: "2026-08-10T08:00:00.000Z",
  created_at: "2026-08-10T09:00:00.000Z",
  url: "https://example.com/article",
  category: "Stocks",
  read_time: "3 min read",
  is_featured: false,
  status: "published",
  image_url: null,
  related_stock_id: "stock-1",
  ai_insight: "Profit growth was driven by M-PESA.",
  ...overrides,
});

const stock: PublicStock = {
  id: "stock-1",
  symbol: "SCOM",
  name: "Safaricom PLC",
  price: 25.4,
  previous_price: 25,
  day_change_percent: 1.6,
};

describe("stock news feed", () => {
  it("joins an article to normalized live stock data", () => {
    const [item] = buildNewsFeedItems([article()], [stock]);
    expect(item.relatedStock).toEqual({
      id: "stock-1",
      symbol: "SCOM",
      name: "Safaricom PLC",
      price: 25.4,
      previousPrice: 25,
      changePercent: 1.6,
    });
    expect(item.content).toBe("Profit growth was driven by M-PESA.");
  });

  it("uses the summary while an AI insight is unavailable", () => {
    const [item] = buildNewsFeedItems([article({ ai_insight: null })], [stock]);
    expect(item.content).toBe("Summary fallback");
  });

  it("renders structured AI analysis as readable decision text", () => {
    const ai_insight = JSON.stringify({
      content: "Safaricom changed a bundle rule, which may affect customer usage patterns.",
      analyst_summary: "Safaricom adjusted how customers can use one data bundle.",
      investment_context: "For SCOM investors, this is customer-pricing context rather than proven earnings impact.",
      key_uncertainty: "The article does not confirm revenue or profit impact.",
      narrative_sections: [
        {
          heading: "The story",
          body: "Safaricom changed how a customer bundle can be used.",
        },
      ],
      decision_drivers: [
        {
          driver: "Customer demand",
          direction: "mixed",
          explanation: "The pricing change may influence how customers use data bundles.",
        },
      ],
      market_lens: "Stocks lens: this is customer-pricing news for SCOM, not proven earnings impact.",
      why_it_matters: "Investors should monitor whether pricing changes support data revenue.",
      investor_takeaway: "Watch future disclosures before treating this as earnings impact.",
      confirmed_facts: ["The article says Safaricom changed a bundle rule."],
      inferred_implications: ["Customer usage may change if the new rule affects convenience."],
      not_confirmed: ["The article does not prove stock-price causation."],
      impact_score: 2,
      impact_reason: "Direct company mention, but limited financial evidence.",
      watch_next: ["Watch Safaricom disclosures for data revenue impact."],
      related_markets: ["Stocks"],
      related_market_implications: [
        {
          market: "Stocks",
          implication: "The article is relevant to SCOM because it discusses a Safaricom pricing change.",
        },
      ],
    });
    const [item] = buildNewsFeedItems([article({ ai_insight })], [stock]);
    expect(item.content).toContain("The story: Safaricom changed how a customer bundle can be used.");
    expect(item.content).toContain("customer-pricing context");
    expect(item.rawItem.parsed_ai_analysis.market_lens).toContain("Stocks lens");
    expect(item.rawItem.parsed_ai_analysis.analyst_summary).toContain("adjusted");
    expect(item.rawItem.parsed_ai_analysis.narrative_sections?.[0].heading).toBe("The story");
    expect(item.rawItem.parsed_ai_analysis.investment_context).toContain("customer-pricing");
    expect(item.rawItem.parsed_ai_analysis.key_uncertainty).toContain("revenue");
    expect(item.rawItem.parsed_ai_analysis.decision_drivers?.[0].driver).toBe("Customer demand");
    expect(item.rawItem.parsed_ai_analysis.investor_takeaway).toContain("future disclosures");
    expect(item.rawItem.parsed_ai_analysis.impact_score).toBe(2);
    expect(item.rawItem.parsed_ai_analysis.watch_next?.[0]).toContain("data revenue");
    expect(item.rawItem.parsed_ai_analysis.related_market_implications?.[0].implication).toContain("pricing change");
    expect(item.rawItem.parsed_ai_analysis.not_confirmed?.[0]).toContain("stock-price causation");
    expect(item.rawItem.parsed_ai_analysis.why_it_matters).toContain("pricing changes");
  });

  it("does not render legacy RSS markup in a summary", () => {
    const summary = '<a href="https://news.google.com">EABL stake sale</a> <font>Business Daily</font>';
    const [item] = buildNewsFeedItems([article({ ai_insight: null, summary })], [stock]);
    expect(item.content).toBe("EABL stake sale Business Daily");
  });

  it("uses one cleaned headline when the summary only repeats the title", () => {
    const title = "MPs seek safeguards in Diageo’s EABL stake sale - Business Daily";
    const [item] = buildNewsFeedItems([article({ title, summary: title, ai_insight: null })], [stock]);
    expect(item.title).toBe("MPs seek safeguards in Diageo’s EABL stake sale");
    expect(item.content).toBe("");
    expect(item.isHeadlineOnly).toBe(true);
  });

  it("does not fabricate a relation when the stock is missing", () => {
    const [item] = buildNewsFeedItems([article()], []);
    expect(item.relatedStock).toBeNull();
  });

  it("filters the Stocks tab and keeps newest-first ordering", () => {
    const unrelated = article({ id: "article-2", related_stock_id: null, created_at: "2026-08-11T09:00:00.000Z" });
    expect(filterNewsArticles([unrelated, article()], "Stocks", "").map((item) => item.id)).toEqual(["article-1"]);
  });
});
