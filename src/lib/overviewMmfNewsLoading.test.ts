import { describe, expect, it, vi } from "vitest";
import type { NewsFromDB, FundFromDB } from "@/lib/api";
import { buildRelatedMarketLinks, findRelatedMmf } from "@/lib/newsMarketLinks";

import { isFundsAndFixedIncomeArticle, FUNDS_AND_FIXED_INCOME_TAB } from "@/lib/fundsFixedIncomeNews";

// Category matcher helper matching OverviewPage & NewsPage definitions
const tabMatchesArticle = (tab: string, a: NewsFromDB): boolean => {
  if (tab === FUNDS_AND_FIXED_INCOME_TAB || tab === "MMFs") {
    return isFundsAndFixedIncomeArticle(a);
  }
  return true;
};

// Batch filler function matching OverviewPage fillCategoryNews
const fillCategoryNews = async (
  category: string,
  existingArticles: NewsFromDB[],
  startOffset: number,
  currentHasMore: boolean,
  fetchBatch: (limit: number, offset: number) => Promise<NewsFromDB[]>,
  target = 15
): Promise<{ articles: NewsFromDB[]; offset: number; hasMore: boolean; batchesFetched: number }> => {
  let accumulated = [...existingArticles];
  let currentOffset = startOffset;
  let hasMoreRemote = currentHasMore;
  const MAX_BATCHES = 10;
  let batches = 0;

  while (hasMoreRemote && batches < MAX_BATCHES) {
    const matching = accumulated.filter(a => tabMatchesArticle(category, a));
    if (matching.length >= target) break;

    const nextOffset = currentOffset + 60;
    const batch = await fetchBatch(60, nextOffset);
    batches++;

    if (batch.length > 0) {
      const existingIds = new Set(accumulated.map(a => a.id));
      const fresh = batch.filter(a => !existingIds.has(a.id));
      accumulated = [...accumulated, ...fresh];
      currentOffset = nextOffset;
    }
    if (batch.length < 60) {
      hasMoreRemote = false;
    }
    if (batch.length === 0) break;
  }

  return { articles: accumulated, offset: currentOffset, hasMore: hasMoreRemote, batchesFetched: batches };
};

const createMockArticle = (id: string, title: string, summary: string, category = "Market News"): NewsFromDB => ({
  id,
  title,
  summary,
  content: null,
  source: "Standard Media",
  date_published: "2026-08-01T00:00:00.000Z",
  source_published_at: "2026-08-01T00:00:00.000Z",
  created_at: "2026-08-01T00:00:00.000Z",
  url: "https://example.com",
  category,
  read_time: "2 min",
  is_featured: false,
  status: "published",
  image_url: null,
  related_stock_id: null,
  ai_insight: null,
});

describe("OverviewPage MMF Category On-Demand Batch Loading Regression", () => {
  it("proves MMF category finds genuine MMF articles via on-demand batches without attaching fake fund links", async () => {
    // 1. Initial 60 articles (Batch 0) have NO MMF articles
    const initialBatch: NewsFromDB[] = Array.from({ length: 60 }, (_, i) =>
      createMockArticle(`initial-${i}`, `Stock Market Update #${i}`, `Equity and NSE general performance update #${i}`, "Stocks")
    );

    const initialMmfMatches = initialBatch.filter(a => tabMatchesArticle("MMFs", a));
    // Proof 1: Initial 60 articles has 0 MMF matches
    expect(initialMmfMatches.length).toBe(0);

    // Mock subsequent batches in the database
    // Batch 1 (offset 60): 60 general macro news articles
    const batch1: NewsFromDB[] = Array.from({ length: 60 }, (_, i) =>
      createMockArticle(`batch1-${i}`, `Central Bank Macro Report #${i}`, `Inflation and interest rates #${i}`, "Economy")
    );

    // Batch 2 (offset 120): 60 general banking news articles
    const batch2: NewsFromDB[] = Array.from({ length: 60 }, (_, i) =>
      createMockArticle(`batch2-${i}`, `Banking Sector Review #${i}`, `Commercial bank earnings update #${i}`, "Banking")
    );

    // Batch 3 (offset 180): Contains the genuine July 31 MMF article at index ~14 (overall index ~194)
    const genuineMmfArticle = createMockArticle(
      "cebd67ed-6602-40ce-8d5c-4b498c8c34f8",
      "More Kenyans ditch money market funds for higher-yielding special schemes",
      "Although MMFs remain the largest investment category, their market dominance has fallen significantly as special funds and fixed income funds gain market share.",
      "Market News"
    );

    const batch3: NewsFromDB[] = [
      ...Array.from({ length: 13 }, (_, i) => createMockArticle(`batch3-${i}`, `Trade Report #${i}`, `Exports and imports summary #${i}`)),
      genuineMmfArticle,
      ...Array.from({ length: 46 }, (_, i) => createMockArticle(`batch3-after-${i}`, `Global Energy #${i}`, `Crude oil and fuel update #${i}`, "Commodities")),
    ];

    const mockFetch = vi.fn(async (limit: number, offset: number) => {
      if (offset === 60) return batch1;
      if (offset === 120) return batch2;
      if (offset === 180) return batch3;
      return [];
    });

    // 2. Trigger on-demand category pagination for "MMFs"
    const fillResult = await fillCategoryNews("MMFs", initialBatch, 0, true, mockFetch);

    // Proof 2: Additional batches were fetched on demand
    expect(fillResult.batchesFetched).toBeGreaterThan(0);
    expect(mockFetch).toHaveBeenCalledWith(60, 60);
    expect(mockFetch).toHaveBeenCalledWith(60, 120);
    expect(mockFetch).toHaveBeenCalledWith(60, 180);

    // 3. Proof 3: The genuine MMF article is found
    const allMmfMatches = fillResult.articles.filter(a => tabMatchesArticle("MMFs", a));
    expect(allMmfMatches.length).toBe(1);
    expect(allMmfMatches[0].id).toBe("cebd67ed-6602-40ce-8d5c-4b498c8c34f8");
    expect(allMmfMatches[0].title).toBe("More Kenyans ditch money market funds for higher-yielding special schemes");

    // 4. Proof 4: It renders as general MMF news with relatedMmf = null (no fake benchmark fund link or snapshot)
    const mockFunds: FundFromDB[] = [
      {
        id: "fund-1",
        slug: "nabo-africa-money-market-fund",
        name: "Nabo Africa Money Market Fund",
        manager: "Nabo Capital",
        cma_licensed: true,
        annual_yield: 12.5,
        daily_yield: 0.034,
        seven_day_yield: 12.5,
        thirty_day_yield: 12.4,
        fund_type: "money_market",
        minimum_investment: 10000,
        management_fee: 1.5,
        withdrawal_time: "2-3 business days",
        description: "",
        website: "",
        fact_sheet_date: null,
        yield_unit: "%",
        is_published: true,
        logo_url: null,
        updated_at: "2026-08-01",
      },
      {
        id: "fund-2",
        slug: "equity-money-market-fund",
        name: "Equity Money Market Fund",
        manager: "Equity Investment Bank",
        cma_licensed: true,
        annual_yield: 11.8,
        daily_yield: 0.032,
        seven_day_yield: 11.8,
        thirty_day_yield: 11.7,
        fund_type: "money_market",
        minimum_investment: 1000,
        management_fee: 1.2,
        withdrawal_time: "Instant to M-Pesa",
        description: "",
        website: "",
        fact_sheet_date: null,
        yield_unit: "%",
        is_published: true,
        logo_url: null,
        updated_at: "2026-08-01",
      },
    ];

    const matchedFund = findRelatedMmf(genuineMmfArticle.title, genuineMmfArticle.summary, mockFunds);
    expect(matchedFund).toBeNull();

    const marketLinks = buildRelatedMarketLinks(genuineMmfArticle.title, genuineMmfArticle.summary, mockFunds, [], []);
    expect(marketLinks.relatedMmf).toBeNull();
  });
});
