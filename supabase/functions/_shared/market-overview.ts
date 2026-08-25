export const MARKET_OVERVIEW_PAYLOAD_VERSION = 1;
export const MAX_VERIFIED_STOCK_MOVE_PERCENT = 20;
export const MIN_STOCK_COVERAGE = 0.9;

export interface MarketStockRow {
  id: string;
  symbol: string;
  name: string;
  price: number | string | null;
  previous_price: number | string | null;
  updated_at: string;
  is_active: boolean;
}

export interface MarketMover {
  fact_id: string;
  stock_id: string;
  symbol: string;
  name: string;
  price: number;
  previous_price: number;
  change_percent: number;
  as_of: string;
}

export interface BreadthCalculation {
  direction: "rising" | "falling" | "mixed";
  gainers: number;
  losers: number;
  unchanged: number;
  validated: number;
  coverage: number;
  topGainers: MarketMover[];
  topLosers: MarketMover[];
  warnings: Array<Record<string, unknown>>;
}

export interface CoreReadinessInput {
  breadth: Pick<BreadthCalculation, "coverage">;
  marketDate: string;
  now: Date;
  usdRate: number | null;
  usdUpdatedAt: string | null;
  beforeFinalRefresh?: boolean;
}

export interface StoredNewsArticle {
  id: string;
  title: string;
  summary: string | null;
  source: string | null;
  url: string;
  category: string | null;
  date_published: string;
  source_published_at: string | null;
  related_stock_id: string | null;
}

function finitePositive(value: unknown): number | null {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : null;
}

export function localDateInNairobi(value: string | Date): string {
  const date = typeof value === "string" ? new Date(value) : value;
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Africa/Nairobi",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

export function calculateMarketBreadth(
  rows: MarketStockRow[],
  marketDate: string,
): BreadthCalculation {
  const active = rows.filter((row) => row.is_active);
  const valid: MarketMover[] = [];
  const warnings: Array<Record<string, unknown>> = [];

  for (const row of active) {
    const price = finitePositive(row.price);
    const previous = finitePositive(row.previous_price);
    const updatedOnMarketDate = localDateInNairobi(row.updated_at) === marketDate;

    if (price === null || previous === null || !updatedOnMarketDate) {
      warnings.push({
        code: "invalid_or_stale_stock",
        stock_id: row.id,
        symbol: row.symbol,
      });
      continue;
    }

    const changePercent = ((price - previous) / previous) * 100;
    if (Math.abs(changePercent) > MAX_VERIFIED_STOCK_MOVE_PERCENT) {
      warnings.push({
        code: "unverified_extreme_move",
        stock_id: row.id,
        symbol: row.symbol,
        change_percent: Number(changePercent.toFixed(2)),
      });
      continue;
    }

    valid.push({
      fact_id: `stock:${row.id}:daily_move`,
      stock_id: row.id,
      symbol: row.symbol,
      name: row.name,
      price,
      previous_price: previous,
      change_percent: Number(changePercent.toFixed(2)),
      as_of: row.updated_at,
    });
  }

  const gainers = valid.filter((row) => row.change_percent > 0.005);
  const losers = valid.filter((row) => row.change_percent < -0.005);
  const unchanged = valid.length - gainers.length - losers.length;
  const breadthDelta = valid.length === 0
    ? 0
    : (gainers.length - losers.length) / valid.length;
  const direction = breadthDelta >= 0.2
    ? "rising"
    : breadthDelta <= -0.2
    ? "falling"
    : "mixed";

  return {
    direction,
    gainers: gainers.length,
    losers: losers.length,
    unchanged,
    validated: valid.length,
    coverage: active.length === 0 ? 0 : valid.length / active.length,
    topGainers: gainers
      .sort((left, right) => right.change_percent - left.change_percent)
      .slice(0, 3),
    topLosers: losers
      .sort((left, right) => left.change_percent - right.change_percent)
      .slice(0, 3),
    warnings,
  };
}

export function deterministicMarketSummary(
  breadth: Pick<BreadthCalculation, "direction" | "gainers" | "losers" | "unchanged">,
  usdKes: number,
): string {
  const directionSentence = breadth.direction === "rising"
    ? "Kenyan stock market breadth was rising"
    : breadth.direction === "falling"
    ? "Kenyan stock market breadth was falling"
    : "Kenyan stock market breadth was mixed";

  return `${directionSentence}, with ${breadth.gainers} stocks up, ${breadth.losers} down, and ${breadth.unchanged} unchanged among validated counters. USD/KES was ${usdKes.toFixed(2)}. These are market data updates, not investment advice.`;
}

export function evaluateCoreReadiness(input: CoreReadinessInput): Array<Record<string, unknown>> {
  const blockedReasons: Array<Record<string, unknown>> = [];
  if (input.beforeFinalRefresh) {
    blockedReasons.push({ code: "before_final_market_refresh", required_hour_eat: 17 });
  }
  if (input.breadth.coverage < MIN_STOCK_COVERAGE) {
    blockedReasons.push({
      code: "insufficient_stock_coverage",
      coverage: Number(input.breadth.coverage.toFixed(4)),
      required: MIN_STOCK_COVERAGE,
    });
  }
  const usdAgeMinutes = input.usdUpdatedAt
    ? (input.now.getTime() - new Date(input.usdUpdatedAt).getTime()) / 60_000
    : Number.POSITIVE_INFINITY;
  if (
    input.usdRate === null ||
    !input.usdUpdatedAt ||
    localDateInNairobi(input.usdUpdatedAt) !== input.marketDate ||
    usdAgeMinutes > 120
  ) {
    blockedReasons.push({ code: "stale_or_missing_usd_kes" });
  }
  return blockedReasons;
}

export function selectDiverseStoredNews(articles: StoredNewsArticle[]): Array<Record<string, unknown>> {
  const newsItems: Array<Record<string, unknown>> = [];
  const seenSources = new Set<string>();
  for (const article of articles) {
    const sourceKey = String(article.source || "unknown").toLowerCase();
    if (seenSources.has(sourceKey) && newsItems.length < 3) continue;
    seenSources.add(sourceKey);
    newsItems.push({
      fact_id: `news:${article.id}`,
      id: article.id,
      title: article.title,
      summary: article.summary,
      source: article.source,
      url: article.url,
      category: article.category,
      published_at: article.source_published_at ?? article.date_published,
      related_stock_id: article.related_stock_id,
    });
    if (newsItems.length === 5) break;
  }
  return newsItems;
}

export function validateAiNarrative(
  summary: unknown,
  factIds: unknown,
  allowedFactIds: Set<string>,
  sourceFacts?: unknown,
): summary is string {
  if (typeof summary !== "string" || summary.trim().length < 20 || summary.length > 700) {
    return false;
  }
  if (!Array.isArray(factIds) || factIds.length === 0) return false;
  if (!factIds.every((factId) => typeof factId === "string" && allowedFactIds.has(factId))) {
    return false;
  }
  const forbidden = /\b(buy|sell|hold|recommend|should invest|undervalued|overvalued)\b/i;
  if (forbidden.test(summary)) return false;
  if (sourceFacts !== undefined) {
    const numbers = summary.match(/-?\d[\d,]*(?:\.\d+)?/g) ?? [];
    const allowedNumbers = new Set(
      (JSON.stringify(sourceFacts).match(/-?\d[\d,]*(?:\.\d+)?/g) ?? [])
        .map((value) => value.replaceAll(",", "")),
    );
    if (numbers.some((value) => !allowedNumbers.has(value.replaceAll(",", "")))) return false;
  }
  return true;
}
