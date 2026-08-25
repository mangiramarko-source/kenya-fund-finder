import { describe, expect, it } from "vitest";
import {
  calculateMarketBreadth,
  deterministicMarketSummary,
  evaluateCoreReadiness,
  selectDiverseStoredNews,
  validateAiNarrative,
} from "../../supabase/functions/_shared/market-overview";
import {
  createUnsubscribeToken,
  escapeHtml,
  normalizeEmail,
  retryDelayMinutes,
  verifyUnsubscribeToken,
} from "../../supabase/functions/_shared/communications";

describe("MVP market overview", () => {
  it("calculates breadth and excludes unverified extreme moves", () => {
    const result = calculateMarketBreadth([
      { id: "1", symbol: "AAA", name: "A", price: 110, previous_price: 100, updated_at: "2026-08-24T14:00:00Z", is_active: true },
      { id: "2", symbol: "BBB", name: "B", price: 90, previous_price: 100, updated_at: "2026-08-24T14:00:00Z", is_active: true },
      { id: "3", symbol: "CCC", name: "C", price: 150, previous_price: 100, updated_at: "2026-08-24T14:00:00Z", is_active: true },
    ], "2026-08-24");
    expect(result.validated).toBe(2);
    expect(result.direction).toBe("mixed");
    expect(result.warnings).toContainEqual(expect.objectContaining({ code: "unverified_extreme_move", symbol: "CCC" }));
  });

  it("uses neutral deterministic language and validates AI facts", () => {
    expect(deterministicMarketSummary({ direction: "rising", gainers: 20, losers: 10, unchanged: 2 }, 129.42)).toContain("market breadth was rising");
    const allowed = new Set(["breadth:2026-08-24"]);
    expect(validateAiNarrative("USD/KES was 999.00.", ["breadth:2026-08-24"], allowed, { usd_kes: 129.42 })).toBe(false);
    expect(validateAiNarrative("You should buy the leading counters today.", ["breadth:2026-08-24"], allowed)).toBe(false);
  });

  it("builds a ready deterministic snapshot from current stored facts", () => {
    const now = new Date("2026-08-24T15:30:00Z");
    const breadth = calculateMarketBreadth([
      { id: "1", symbol: "AAA", name: "A", price: 110, previous_price: 100, updated_at: now.toISOString(), is_active: true },
      { id: "2", symbol: "BBB", name: "B", price: 95, previous_price: 100, updated_at: now.toISOString(), is_active: true },
      { id: "3", symbol: "CCC", name: "C", price: 101, previous_price: 100, updated_at: now.toISOString(), is_active: true },
    ], "2026-08-24");
    expect(evaluateCoreReadiness({ breadth, marketDate: "2026-08-24", now, usdRate: 129.42, usdUpdatedAt: now.toISOString() })).toEqual([]);
    expect(breadth.topGainers.map((row) => row.symbol)).toEqual(["AAA", "CCC"]);
    expect(breadth.topLosers.map((row) => row.symbol)).toEqual(["BBB"]);
    expect(deterministicMarketSummary(breadth, 129.42)).toContain("USD/KES was 129.42");

    const news = selectDiverseStoredNews([
      { id: "n1", title: "One", summary: null, source: "Source A", url: "https://example.invalid/1", category: "markets", date_published: "2026-08-24", source_published_at: null, related_stock_id: null },
      { id: "n2", title: "Two", summary: null, source: "Source B", url: "https://example.invalid/2", category: "markets", date_published: "2026-08-24", source_published_at: null, related_stock_id: null },
      { id: "n3", title: "Three", summary: null, source: "Source C", url: "https://example.invalid/3", category: "markets", date_published: "2026-08-24", source_published_at: null, related_stock_id: null },
    ]);
    expect(news).toHaveLength(3);
    expect(news.map((item) => item.fact_id)).toEqual(["news:n1", "news:n2", "news:n3"]);
  });

  it("blocks stale core facts without affecting deterministic AI fallback", () => {
    const now = new Date("2026-08-24T15:30:00Z");
    const breadth = calculateMarketBreadth([
      { id: "1", symbol: "AAA", name: "A", price: 110, previous_price: 100, updated_at: "2026-08-23T15:30:00Z", is_active: true },
    ], "2026-08-24");
    expect(evaluateCoreReadiness({ breadth, marketDate: "2026-08-24", now, usdRate: 129.42, usdUpdatedAt: "2026-08-24T12:00:00Z" })).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: "insufficient_stock_coverage" }),
      expect.objectContaining({ code: "stale_or_missing_usd_kes" }),
    ]));

    const deterministic = deterministicMarketSummary({ direction: "mixed", gainers: 1, losers: 1, unchanged: 0 }, 129.42);
    expect(validateAiNarrative("USD/KES was an invented 999.00.", ["fx:USD:KES"], new Set(["fx:USD:KES"]), { rate: 129.42 })).toBe(false);
    expect(deterministic).toContain("USD/KES was 129.42");
  });
});

describe("MVP communication helpers", () => {
  it("normalizes addresses, escapes HTML, and bounds retries", () => {
    expect(normalizeEmail(" Test@Example.COM ")).toBe("test@example.com");
    expect(escapeHtml("<script>")).toBe("&lt;script&gt;");
    expect(retryDelayMinutes(5)).toBe(60);
  });

  it("signs and verifies expiring unsubscribe tokens", async () => {
    const token = await createUnsubscribeToken("secret", "user-1", "market_brief", new Date("2027-01-01T00:00:00Z"));
    await expect(verifyUnsubscribeToken("secret", token, new Date("2026-01-01T00:00:00Z"))).resolves.toEqual({ user_id: "user-1", scope: "market_brief" });
    await expect(verifyUnsubscribeToken("wrong", token, new Date("2026-01-01T00:00:00Z"))).resolves.toBeNull();
  });
});
