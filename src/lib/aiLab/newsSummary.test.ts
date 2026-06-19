import { describe, it, expect } from "vitest";
import { routePrompt } from "./router";
import { NEWS_UNKNOWN_MSG } from "./intent";
import {
  calculateNewsSummaryScenario,
  getNewsSummaryUserText,
  NEWS_IMPORTANT_NOTES,
  NEWS_SUMMARY_PREFIX,
} from "./scenarios";
import {
  isPublishedToday,
  matchNewsForPrompt,
  type NewsArticle,
  type NewsContext,
} from "./newsContext";
import { detectAdviceIntent } from "./safety";
import type { MarketContext, ComparableAsset } from "./marketContext";

const REF_DATE = new Date("2026-05-29T12:00:00+03:00");

function nairobiDateISO(dayOffset = 0): string {
  const d = new Date(REF_DATE);
  d.setDate(d.getDate() + dayOffset);
  const date = d.toLocaleDateString("en-CA", { timeZone: "Africa/Nairobi" });
  return `${date}T10:00:00+03:00`;
}

function mkArticle(overrides: Partial<NewsArticle> & { id: string; title: string }): NewsArticle {
  return {
    summary: "Safaricom reported strong quarterly earnings.",
    source: "Business Daily",
    datePublished: nairobiDateISO(0),
    url: "https://example.com/safaricom",
    category: "Market News",
    ...overrides,
  };
}

const safaricomArticle = mkArticle({
  id: "1",
  title: "Safaricom shares rise on earnings beat",
  summary: "Safaricom PLC posted higher revenue in Q1.",
});

const nseTodayArticle = mkArticle({
  id: "2",
  title: "NSE turnover hits daily high",
  summary: "The Nairobi Securities Exchange saw record volume today.",
  category: "Market News",
});

const oldMarketArticle = mkArticle({
  id: "3",
  title: "Old market recap",
  summary: "Markets were mixed last week.",
  datePublished: nairobiDateISO(-7),
});

const mkStock = (symbol: string, name: string): ComparableAsset => ({
  kind: "stock",
  symbol,
  name,
  value: 18.5,
  valueLabel: "Price (KES)",
  changePct: 1.2,
  aliases: [symbol.toLowerCase(), name.toLowerCase()],
});

const marketCtx: MarketContext = {
  fundCount: 0,
  avgAnnualYieldPct: null,
  topAnnualYieldPct: null,
  lowAnnualYieldPct: null,
  sampleStockSymbol: "SCOM",
  sampleStockPrice: 18.5,
  sampleStockChangePct: 1.2,
  assets: [mkStock("SCOM", "Safaricom")],
  fetchedAt: REF_DATE.toISOString(),
};

const newsCtx: NewsContext = {
  articles: [safaricomArticle, nseTodayArticle, oldMarketArticle],
  fetchedAt: REF_DATE.toISOString(),
};

describe("isPublishedToday", () => {
  it("returns true for same Nairobi calendar day", () => {
    expect(isPublishedToday(nairobiDateISO(0), REF_DATE)).toBe(true);
  });

  it("returns false for a different day", () => {
    expect(isPublishedToday(nairobiDateISO(-1), REF_DATE)).toBe(false);
  });
});

describe("matchNewsForPrompt", () => {
  it("matches asset news by company name", () => {
    const match = matchNewsForPrompt(
      "Latest news about Safaricom",
      newsCtx,
      marketCtx,
      REF_DATE,
    );
    expect(match?.articles.length).toBeGreaterThan(0);
    expect(match?.queryKind).toBe("asset");
    expect(match?.relatedSymbol).toBe("SCOM");
  });

  it("returns null when no articles match asset query", () => {
    const emptyAssetCtx: NewsContext = {
      articles: [oldMarketArticle],
      fetchedAt: REF_DATE.toISOString(),
    };
    const match = matchNewsForPrompt(
      "Latest news about Safaricom",
      emptyAssetCtx,
      marketCtx,
      REF_DATE,
    );
    expect(match).toBeNull();
  });

  it("filters today-only for market today prompts", () => {
    const todayOnly = matchNewsForPrompt(
      "Summarize today's market news",
      newsCtx,
      marketCtx,
      REF_DATE,
    );
    expect(todayOnly?.queryKind).toBe("market_today");
    expect(todayOnly?.articles.every((a) => isPublishedToday(a.datePublished, REF_DATE))).toBe(
      true,
    );
  });

  it("returns null for today prompt when only old articles exist", () => {
    const oldOnly: NewsContext = {
      articles: [oldMarketArticle],
      fetchedAt: REF_DATE.toISOString(),
    };
    const match = matchNewsForPrompt(
      "Summarize today's market news",
      oldOnly,
      marketCtx,
      REF_DATE,
    );
    expect(match).toBeNull();
  });

  it("matches NSE today articles", () => {
    const match = matchNewsForPrompt(
      "What happened to NSE today?",
      newsCtx,
      marketCtx,
      REF_DATE,
    );
    expect(match?.queryKind).toBe("nse_today");
    expect(match?.articles.length).toBeGreaterThan(0);
  });

  it("returns latest market news for explain-news prompts", () => {
    const match = matchNewsForPrompt(
      "Explain this news in simple terms",
      newsCtx,
      marketCtx,
      REF_DATE,
    );
    expect(match?.queryKind).toBe("explain_news");
    expect(match?.articles.length).toBeGreaterThan(0);
  });
});

describe("calculateNewsSummaryScenario", () => {
  it("includes required prefix and notes", () => {
    const result = calculateNewsSummaryScenario([safaricomArticle], {
      queryLabel: "News related to SCOM",
      relatedSymbol: "SCOM",
      queryKind: "asset",
    });
    expect(result.kind).toBe("news-summary");
    expect(result.summary).toContain(NEWS_SUMMARY_PREFIX);
    expect(result.summary).toContain("does not predict price movement");
    for (const note of NEWS_IMPORTANT_NOTES) {
      expect(result.importantNotes).toContain(note);
    }
  });

  it("preserves source and date from stored fields", () => {
    const result = calculateNewsSummaryScenario([safaricomArticle], {
      queryLabel: "News related to SCOM",
      relatedSymbol: "SCOM",
      queryKind: "asset",
    });
    expect(result.articles[0].title).toBe(safaricomArticle.title);
    expect(result.articles[0].source).toBe("Business Daily");
    expect(result.articles[0].publishedAt).toBe(safaricomArticle.datePublished);
    expect(result.articles[0].url).toBe(safaricomArticle.url!);
    expect(result.articles[0].relatedSymbol).toBe("SCOM");
  });

  it("adds explain-news note without inventing analysis", () => {
    const result = calculateNewsSummaryScenario([safaricomArticle], {
      queryLabel: "Latest available market news",
      queryKind: "explain_news",
    });
    expect(result.summary).toContain("stored summaries only");
    expect(result.importantNotes).toContain(
      "This lists stored summaries only — not a full article analysis.",
    );
    const text = getNewsSummaryUserText(result).toLowerCase();
    expect(text).not.toContain("will rise");
    expect(text).not.toContain("will fall");
    expect(text).not.toContain("full analysis");
  });
});

describe("routePrompt news-summary", () => {
  it("returns news-summary when mock articles match", () => {
    const r = routePrompt("Latest news about Safaricom", marketCtx, newsCtx);
    expect(r.kind).toBe("news-summary");
    if (r.kind === "news-summary") {
      expect(r.summary).toContain("KenyaFundFinder news data");
      expect(r.articles.length).toBeGreaterThan(0);
      expect(r.disclaimer).toBe("Data only. Not personal financial advice.");
    }
  });

  it("returns NEWS_UNKNOWN_MSG when no articles match", () => {
    const noMatch: NewsContext = {
      articles: [oldMarketArticle],
      fetchedAt: REF_DATE.toISOString(),
    };
    const r = routePrompt("Latest news about Safaricom", marketCtx, noMatch);
    expect(r.kind).toBe("unknown");
    if (r.kind === "unknown") {
      expect(r.message).toBe(NEWS_UNKNOWN_MSG);
    }
  });

  it("returns NEWS_UNKNOWN_MSG when newsCtx is empty", () => {
    const empty: NewsContext = { articles: [], fetchedAt: REF_DATE.toISOString() };
    const r = routePrompt("Latest news about Safaricom", marketCtx, empty);
    expect(r.kind).toBe("unknown");
    if (r.kind === "unknown") {
      expect(r.message).toBe(NEWS_UNKNOWN_MSG);
    }
  });

  it("returns NEWS_UNKNOWN_MSG without newsCtx", () => {
    const r = routePrompt("Latest news about Safaricom", marketCtx);
    expect(r.kind).toBe("unknown");
    if (r.kind === "unknown") {
      expect(r.message).toBe(NEWS_UNKNOWN_MSG);
    }
  });
});

describe("routePrompt news today gates", () => {
  function todayArticles(): NewsContext {
    const today = new Date();
    const date = today.toLocaleDateString("en-CA", { timeZone: "Africa/Nairobi" });
    const iso = `${date}T10:00:00+03:00`;
    return {
      articles: [
        mkArticle({
          id: "today-1",
          title: "Markets open higher",
          summary: "Nairobi market started the session higher.",
          datePublished: iso,
          category: "Market News",
        }),
      ],
      fetchedAt: today.toISOString(),
    };
  }

  function oldOnlyArticles(): NewsContext {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 3);
    const date = yesterday.toLocaleDateString("en-CA", { timeZone: "Africa/Nairobi" });
    return {
      articles: [
        mkArticle({
          id: "old-1",
          title: "Last week market wrap",
          summary: "A recap from several days ago.",
          datePublished: `${date}T10:00:00+03:00`,
          category: "Market News",
        }),
      ],
      fetchedAt: new Date().toISOString(),
    };
  }

  it("G5-1: Summarize today's market news with today article → news-summary", () => {
    const r = routePrompt("Summarize today's market news", marketCtx, todayArticles());
    expect(r.kind).toBe("news-summary");
  });

  it("G5-2: Summarize today's market news with only old articles → NEWS_UNKNOWN_MSG", () => {
    const r = routePrompt("Summarize today's market news", marketCtx, oldOnlyArticles());
    expect(r.kind).toBe("unknown");
    if (r.kind === "unknown") {
      expect(r.message).toBe(NEWS_UNKNOWN_MSG);
    }
  });
});

describe("news advice refusal", () => {
  it("G5-6: Will SCOM rise because of this news? → refusal", () => {
    expect(detectAdviceIntent("Will SCOM rise because of this news?")).toBe(true);
    expect(routePrompt("Will SCOM rise because of this news?", marketCtx, newsCtx).kind).toBe(
      "refusal",
    );
  });

  it("flags other news advice patterns", () => {
    const prompts = [
      "Is this good news for buying SCOM?",
      "Should I sell because of this news?",
      "Will NSE go up today?",
    ];
    for (const p of prompts) {
      expect(detectAdviceIntent(p)).toBe(true);
      expect(routePrompt(p, marketCtx, newsCtx).kind).toBe("refusal");
    }
  });
});

describe("getNewsSummaryUserText forbidden wording", () => {
  it("does not contain advisory or invented analysis phrases", () => {
    const result = calculateNewsSummaryScenario([safaricomArticle], {
      queryLabel: "News related to SCOM",
      relatedSymbol: "SCOM",
      queryKind: "asset",
    });
    const text = getNewsSummaryUserText(result).toLowerCase();
    const forbidden = [
      "you should buy",
      "i recommend",
      "put your money in",
      "will rise",
      "will fall",
      "full analysis",
      "guaranteed",
    ];
    for (const phrase of forbidden) {
      expect(text).not.toContain(phrase);
    }
  });
});
