/**
 * Pure helper to derive the alert state of a portfolio holding.
 * - "triggered"  → active alert that has fired
 * - "active"     → active alert, not yet triggered
 * - "none"       → no matching active alert
 *
 * Matching prefers asset_id, then ticker/symbol, then normalized name —
 * mirroring the rest of the holding resolution chain.
 */
import { normalizeName } from "@/lib/assetMatch";

export type HoldingAlertState = "none" | "active" | "triggered";

export interface MinimalAlert {
  asset_type: string;
  asset_id: string;
  asset_name: string;
  is_active: boolean;
  is_triggered: boolean;
}

export interface MinimalHolding {
  asset_type: string;
  asset_id?: string | null;
  asset_name: string;
  ticker?: string | null;
}

/** Map a portfolio holding's asset_type to the alert asset_type used elsewhere. */
const toAlertType = (assetType: string): string => {
  if (assetType === "mmf") return "fund";
  if (assetType === "stock") return "stock";
  if (assetType === "fx") return "currency";
  if (assetType === "commodity") return "commodity";
  return assetType;
};

export function findHoldingAlert(
  holding: MinimalHolding,
  alerts: MinimalAlert[],
): MinimalAlert | null {
  const wantType = toAlertType(holding.asset_type);
  const candidates = alerts.filter((a) => a.asset_type === wantType && a.is_active);
  if (candidates.length === 0) return null;

  if (holding.asset_id) {
    const byId = candidates.find((a) => a.asset_id === holding.asset_id);
    if (byId) return byId;
  }
  if (holding.ticker) {
    const t = holding.ticker.toUpperCase();
    const byTicker = candidates.find((a) => a.asset_id?.toUpperCase?.() === t);
    if (byTicker) return byTicker;
  }
  const target = normalizeName(holding.asset_name);
  if (target) {
    const byName = candidates.find((a) => normalizeName(a.asset_name) === target);
    if (byName) return byName;
  }
  return null;
}

export function getHoldingAlertState(
  holding: MinimalHolding,
  alerts: MinimalAlert[],
): HoldingAlertState {
  const a = findHoldingAlert(holding, alerts);
  if (!a) return "none";
  return a.is_triggered ? "triggered" : "active";
}
