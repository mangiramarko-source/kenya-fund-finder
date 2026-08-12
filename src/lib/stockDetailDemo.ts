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

export interface DemoHistoryRow extends DemoPricePoint {
  stock_id: string;
}

export interface DemoHistoryPage {
  count: number;
  data: DemoHistoryRow[];
}

export async function fetchCompleteDemoHistory(
  fetchPage: (offset: number, limit: number) => Promise<DemoHistoryPage>,
  pageSize = 5000,
): Promise<Record<string, DemoPricePoint[]>> {
  const rows = new Map<string, DemoHistoryRow>();
  let offset = 0;
  let count = 0;

  do {
    const page = await fetchPage(offset, pageSize);
    count = page.count;
    page.data.forEach((point) => rows.set(`${point.stock_id}:${point.snapshot_date}`, point));
    if (page.data.length === 0) break;
    offset += page.data.length;
  } while (offset < count);

  const grouped: Record<string, DemoPricePoint[]> = {};
  rows.forEach((point) => {
    if (!grouped[point.stock_id]) grouped[point.stock_id] = [];
    grouped[point.stock_id].push({ snapshot_date: point.snapshot_date, price: Number(point.price) });
  });
  Object.values(grouped).forEach((points) => points.sort((left, right) => left.snapshot_date.localeCompare(right.snapshot_date)));
  return grouped;
}

export function calculateDemoReturn(points: DemoPricePoint[], currentPrice: number, days: number): number | null {
  if (points.length === 0 || currentPrice <= 0) return null;
  const eligible = points
    .filter((point) => Number.isFinite(point.price) && point.price > 0 && Number.isFinite(new Date(point.snapshot_date).getTime()))
    .sort((a, b) => new Date(a.snapshot_date).getTime() - new Date(b.snapshot_date).getTime());
  if (eligible.length === 0) return null;

  const latestObservationTime = new Date(eligible[eligible.length - 1].snapshot_date).getTime();
  const cutoff = latestObservationTime - days * 24 * 60 * 60 * 1000;
  let baseline: DemoPricePoint | null = null;
  for (const point of eligible) {
    if (new Date(point.snapshot_date).getTime() > cutoff) break;
    baseline = point;
  }
  if (!baseline) return null;
  return ((currentPrice - baseline.price) / baseline.price) * 100;
}
