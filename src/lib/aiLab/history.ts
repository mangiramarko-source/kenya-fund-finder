// Historical price/yield helpers for the AI Scenario Assistant compare flow.
// Pulls a configurable lookback window (7–90 days) from the public-data gateway
// and computes a simple period return + a series suitable for an inline sparkline.

import { fetchPublicData, type GatewayResource } from "@/lib/gateway";
import type { ComparableAsset } from "./marketContext";

export type LookbackDays = 7 | 30 | 90;

export const LOOKBACK_OPTIONS: LookbackDays[] = [7, 30, 90];

export function formatReturnLabel(days: LookbackDays): string {
  return `${days}-day return`;
}

export function formatTrendLabel(days: LookbackDays): string {
  return `${days}-day trend`;
}

export function formatHistoryAssumption(days: LookbackDays): string {
  return `${days}-day history is based on available price/rate observations. Missing or sparse history can show as —. Unit trusts may show — because no per-fund history endpoint is exposed yet.`;
}

export interface AssetHistory {
  /** Numeric series in chronological order (oldest -> newest). */
  points: number[];
  /** % change between first and last point (null when not computable). */
  returnPct: number | null;
  /** Source label for the chart tooltip ("price", "yield", "rate", etc.). */
  metric: string;
  /** ISO date range covered, if known. */
  from: string | null;
  to: string | null;
}

/** Pure: compute % return between the first and last point of a series. */
export function computeReturnPct(points: number[]): number | null {
  if (!points || points.length < 2) return null;
  const first = points[0];
  const last = points[points.length - 1];
  if (!Number.isFinite(first) || !Number.isFinite(last) || first === 0) return null;
  return Math.round(((last - first) / first) * 10000) / 100;
}

interface HistoryRow {
  snapshot_date?: string | null;
  price?: number | string | null;
  rate?: number | string | null;
  annual_yield?: number | string | null;
}

const toNum = (v: unknown): number | null => {
  const n = typeof v === "string" ? parseFloat(v) : (v as number);
  return Number.isFinite(n) ? n : null;
};

const EMPTY: AssetHistory = { points: [], returnPct: null, metric: "", from: null, to: null };

export async function fetchAssetHistory(
  asset: ComparableAsset,
  days = 30,
): Promise<AssetHistory> {
  if (!asset.id) return EMPTY;

  let resource: GatewayResource | null = null;
  let valueKey: "price" | "rate" | "annual_yield" = "price";
  let metric = "price";

  if (asset.kind === "stock") {
    resource = "stock-history";
    valueKey = "price";
    metric = "price";
  } else if (asset.kind === "commodity") {
    resource = "commodity-history";
    valueKey = "price";
    metric = "price";
  } else if (asset.kind === "fx") {
    resource = "rate-history";
    valueKey = "rate";
    metric = "rate";
  } else {
    // Funds have no per-id history endpoint exposed today.
    return EMPTY;
  }

  try {
    const res = await fetchPublicData<HistoryRow>(resource, {
      id: asset.id,
      days,
      order: "snapshot_date.asc",
      limit: Math.min(days + 5, 100),
    });
    const rows = (res.data ?? []).filter((r) => toNum(r[valueKey]) != null);
    const points = rows.map((r) => toNum(r[valueKey]) as number);
    const from = rows[0]?.snapshot_date ?? null;
    const to = rows[rows.length - 1]?.snapshot_date ?? null;
    return { points, returnPct: computeReturnPct(points), metric, from, to };
  } catch {
    return EMPTY;
  }
}
