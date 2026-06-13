/**
 * Pure helper for computing the watchlist alert summary
 * (Saved assets / Active alerts / Triggered alerts).
 * Extracted so it can be unit-tested without rendering the page.
 */
export interface SummaryAlert {
  asset_type: string;
  asset_id: string;
  is_active: boolean;
  is_triggered: boolean;
}

export function computeAlertSummary(
  alerts: SummaryAlert[],
  watchedKeys: Set<string>,
): { active: number; triggered: number } {
  let active = 0;
  let triggered = 0;
  for (const a of alerts) {
    if (!a.is_active) continue;
    if (!watchedKeys.has(`${a.asset_type}:${a.asset_id}`)) continue;
    if (a.is_triggered) triggered++;
    else active++;
  }
  return { active, triggered };
}
