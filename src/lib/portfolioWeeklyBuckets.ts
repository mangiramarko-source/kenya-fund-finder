/**
 * Pure helpers that group portfolio change rows into neutral "what changed
 * recently" buckets. No advice — descriptive labels only.
 */
import type { ChangeRow } from "@/hooks/usePortfolioChanges";

export interface WeeklyBuckets {
  largestYieldIncrease: ChangeRow | null;
  largestYieldDecrease: ChangeRow | null;
  largestPriceIncrease: ChangeRow | null;
  largestPriceDecrease: ChangeRow | null;
  /** Holdings with at least one new snapshot data point. */
  withData: ChangeRow[];
  /** Holdings where no recent snapshot is available. */
  missingData: ChangeRow[];
  /** True when nothing useful can be shown. */
  isEmpty: boolean;
}

export function buildWeeklyBuckets(changes: ChangeRow[]): WeeklyBuckets {
  const withData = changes.filter((c) => c.delta != null && c.delta !== 0);
  const flatOrMissing = changes.filter((c) => c.delta == null);

  const yields = withData.filter((c) => c.unit === "%");
  const prices = withData.filter((c) => c.unit === "KES");

  const pickMax = (rows: ChangeRow[]): ChangeRow | null =>
    rows.length === 0
      ? null
      : rows.reduce((best, r) => ((r.delta ?? 0) > (best.delta ?? 0) ? r : best));

  const pickMin = (rows: ChangeRow[]): ChangeRow | null =>
    rows.length === 0
      ? null
      : rows.reduce((worst, r) => ((r.delta ?? 0) < (worst.delta ?? 0) ? r : worst));

  const largestYieldIncrease = pickMax(yields.filter((c) => (c.delta ?? 0) > 0));
  const largestYieldDecrease = pickMin(yields.filter((c) => (c.delta ?? 0) < 0));
  const largestPriceIncrease = pickMax(prices.filter((c) => (c.delta ?? 0) > 0));
  const largestPriceDecrease = pickMin(prices.filter((c) => (c.delta ?? 0) < 0));

  return {
    largestYieldIncrease,
    largestYieldDecrease,
    largestPriceIncrease,
    largestPriceDecrease,
    withData,
    missingData: flatOrMissing,
    isEmpty:
      !largestYieldIncrease &&
      !largestYieldDecrease &&
      !largestPriceIncrease &&
      !largestPriceDecrease &&
      withData.length === 0,
  };
}
