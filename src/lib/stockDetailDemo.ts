import type { CachedStock } from "@/lib/stockCache";

export function findDemoStock(stocks: CachedStock[], symbol: string): CachedStock | null {
  return stocks.find((stock) => stock.symbol.toUpperCase() === symbol.toUpperCase()) ?? null;
}

export function filterDemoStocks(stocks: CachedStock[], search: string): CachedStock[] {
  const query = search.trim().toLowerCase();
  if (!query) return stocks;
  return stocks.filter((stock) =>
    stock.symbol.toLowerCase().includes(query)
    || stock.name.toLowerCase().includes(query)
    || stock.sector.toLowerCase().includes(query),
  );
}

export const stockProductionPath = (symbol: string) => `/stocks/${encodeURIComponent(symbol)}`;

export interface DemoPricePoint {
  snapshot_date: string;
  price: number;
}

export function calculateDemoReturn(points: DemoPricePoint[], currentPrice: number, days: number): number | null {
  if (points.length === 0 || currentPrice <= 0) return null;
  const eligible = points
    .filter((point) => Number.isFinite(point.price) && point.price > 0 && Number.isFinite(new Date(point.snapshot_date).getTime()))
    .sort((a, b) => new Date(a.snapshot_date).getTime() - new Date(b.snapshot_date).getTime());
  if (eligible.length === 0) return null;

  const latestObservationTime = new Date(eligible[eligible.length - 1].snapshot_date).getTime();
  const cutoff = latestObservationTime - days * 24 * 60 * 60 * 1000;
  let baseline = eligible[0];
  for (const point of eligible) {
    if (new Date(point.snapshot_date).getTime() > cutoff) break;
    baseline = point;
  }
  return ((currentPrice - baseline.price) / baseline.price) * 100;
}
