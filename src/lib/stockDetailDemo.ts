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
  timestamp?: number;
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
  const firstPage = await fetchPage(0, pageSize);
  const count = firstPage.count;
  firstPage.data.forEach((point) => rows.set(`${point.stock_id}:${point.snapshot_date}`, point));

  if (count > pageSize) {
    const promises = [];
    for (let offset = pageSize; offset < count; offset += pageSize) {
      promises.push(fetchPage(offset, pageSize));
    }
    const pages = await Promise.all(promises);
    for (const page of pages) {
      page.data.forEach((point) => rows.set(`${point.stock_id}:${point.snapshot_date}`, point));
    }
  }

  const grouped: Record<string, DemoPricePoint[]> = {};
  rows.forEach((point) => {
    if (!grouped[point.stock_id]) grouped[point.stock_id] = [];
    grouped[point.stock_id].push({ 
      snapshot_date: point.snapshot_date, 
      price: Number(point.price),
      timestamp: new Date(point.snapshot_date).getTime(),
    });
  });
  Object.values(grouped).forEach((points) => points.sort((left, right) => left.snapshot_date.localeCompare(right.snapshot_date)));
  return grouped;
}

export function calculateDemoReturn(points: DemoPricePoint[], currentPrice: number, days: number): number | null {
  if (points.length === 0 || currentPrice <= 0) return null;

  // points are pre-sorted chronologically in fetchCompleteDemoHistory
  let latestObservationTime = 0;
  let latestIndex = -1;
  for (let i = points.length - 1; i >= 0; i--) {
    const pt = points[i];
    if (Number.isFinite(pt.price) && pt.price > 0) {
      const t = pt.timestamp || new Date(pt.snapshot_date).getTime();
      if (Number.isFinite(t)) {
        latestObservationTime = t;
        latestIndex = i;
        break;
      }
    }
  }

  if (latestIndex === -1) return null;

  const cutoff = latestObservationTime - days * 24 * 60 * 60 * 1000;
  
  let baseline: DemoPricePoint | null = null;
  let minDiff = Infinity;
  // Allow tolerance proportional to timeframe: e.g. 7d for 1W/7D, 15d for 1M, 45d for 3M, 120d for 1Y
  const maxDiff = Math.max(7 * 24 * 60 * 60 * 1000, days * 0.6 * 24 * 60 * 60 * 1000);

  for (let i = 0; i <= latestIndex; i++) {
    const point = points[i];
    if (Number.isFinite(point.price) && point.price > 0) {
      const t = point.timestamp || new Date(point.snapshot_date).getTime();
      if (Number.isFinite(t)) {
        const diff = Math.abs(t - cutoff);
        if (diff < minDiff && diff <= maxDiff) {
          minDiff = diff;
          baseline = point;
        }
      }
    }
  }
  
  // Fallback: if no baseline point was found within maxDiff, use the earliest available point in range
  if (!baseline && points.length > 0) {
    baseline = points[0];
  }

  if (!baseline || baseline.price <= 0) return null;
  return ((currentPrice - baseline.price) / baseline.price) * 100;
}
