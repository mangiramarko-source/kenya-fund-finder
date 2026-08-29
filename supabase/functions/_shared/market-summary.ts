export type MarketSummaryRow = {
  dayChange: number | null;
  marketCap: number | null;
  peRatio: number | null;
};

export type MarketSummary = {
  totalMarketCap: number;
  averagePE: number;
  advances: number;
  declines: number;
  unchanged: number;
};

export function calculateMarketSummary(rows: MarketSummaryRow[]): MarketSummary {
  let totalMarketCap = 0;
  let peRatioTotal = 0;
  let peRatioCount = 0;
  let advances = 0;
  let declines = 0;
  let unchanged = 0;

  for (const row of rows) {
    const dayChange = row.dayChange ?? 0;
    if (dayChange > 0) advances++;
    else if (dayChange < 0) declines++;
    else unchanged++;

    if (typeof row.marketCap === "number" && Number.isFinite(row.marketCap)) {
      totalMarketCap += row.marketCap;
    }
    if (typeof row.peRatio === "number" && Number.isFinite(row.peRatio) && row.peRatio !== 0) {
      peRatioTotal += row.peRatio;
      peRatioCount++;
    }
  }

  return {
    totalMarketCap,
    averagePE: peRatioCount > 0 ? Number((peRatioTotal / peRatioCount).toFixed(2)) : 0,
    advances,
    declines,
    unchanged,
  };
}
