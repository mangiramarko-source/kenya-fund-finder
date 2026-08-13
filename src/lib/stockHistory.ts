export type StockHistoryRange = "1W" | "1M" | "3M" | "1Y" | "5Y" | "10Y" | "15Y" | "ALL";

export interface StockHistoryPoint {
  snapshot_date: string;
  price: number;
}

export const STOCK_HISTORY_DAYS: Record<StockHistoryRange, number> = {
  "1W": 7,
  "1M": 30,
  "3M": 90,
  "1Y": 365,
  "5Y": 1825,
  "10Y": 3650,
  "15Y": 5475,
  "ALL": 7305,
};

export const STOCK_HISTORY_RANGES: StockHistoryRange[] = ["1W", "1M", "3M", "1Y", "5Y", "10Y", "15Y", "ALL"];

export interface StockHistoryPage<T extends StockHistoryPoint> {
  count: number;
  data: T[];
}

export async function fetchAllStockHistoryPages<T extends StockHistoryPoint>(
  fetchPage: (offset: number, limit: number) => Promise<StockHistoryPage<T>>,
  pageSize = 1500,
) {
  const unique = new Map<string, T>();
  const firstPage = await fetchPage(0, pageSize);
  firstPage.data.forEach((point) => unique.set(point.snapshot_date, point));
  if (!firstPage.data.length) return [];

  const offsets: number[] = [];
  for (let offset = firstPage.data.length; offset < firstPage.count; offset += firstPage.data.length) {
    offsets.push(offset);
  }
  const remainingPages = await Promise.all(offsets.map((offset) => fetchPage(offset, pageSize)));
  remainingPages.forEach((page) => {
    page.data.forEach((point) => unique.set(point.snapshot_date, point));
  });

  return [...unique.values()].sort((left, right) => left.snapshot_date.localeCompare(right.snapshot_date));
}

export function filterStockHistory(
  history: StockHistoryPoint[],
  range: StockHistoryRange,
  now = new Date(),
) {
  if (range === "ALL" || !history.length) return [...history];
  const latestDate = new Date(history[history.length - 1].snapshot_date);
  const baseTime = isNaN(latestDate.getTime()) ? now.getTime() : Math.max(now.getTime(), latestDate.getTime());
  const cutoff = new Date(baseTime - STOCK_HISTORY_DAYS[range] * 86400000);
  return history.filter((point) => new Date(point.snapshot_date) >= cutoff);
}

export function downsampleStockHistory(history: StockHistoryPoint[], maxPoints = 300) {
  if (history.length <= maxPoints || maxPoints < 3) return [...history];

  const result: StockHistoryPoint[] = [history[0]];
  const interior = history.slice(1, -1);
  const bucketCount = Math.max(1, Math.floor((maxPoints - 2) / 2));
  const bucketSize = interior.length / bucketCount;

  for (let bucket = 0; bucket < bucketCount; bucket += 1) {
    const start = Math.floor(bucket * bucketSize);
    const end = Math.min(interior.length, Math.floor((bucket + 1) * bucketSize));
    const points = interior.slice(start, Math.max(start + 1, end));
    if (!points.length) continue;

    let lowIndex = 0;
    let highIndex = 0;
    points.forEach((point, index) => {
      if (point.price < points[lowIndex].price) lowIndex = index;
      if (point.price > points[highIndex].price) highIndex = index;
    });

    if (lowIndex === highIndex) {
      result.push(points[lowIndex]);
    } else if (lowIndex < highIndex) {
      result.push(points[lowIndex], points[highIndex]);
    } else {
      result.push(points[highIndex], points[lowIndex]);
    }
  }

  result.push(history[history.length - 1]);
  return result.slice(0, maxPoints);
}
