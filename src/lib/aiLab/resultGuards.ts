import type { RouterResult } from "./router";
import { isMarketNewsBriefResult } from "../../../supabase/functions/_shared/market-news-brief";
import { isDailyMarketSummaryResult } from "../../../supabase/functions/_shared/daily-market-summary";

/**
 * Server results and restored local conversations cross a runtime boundary.
 * Do not render a structured card unless fields it formats are actually there.
 */
export function isRenderableAiLabResult(result: RouterResult): boolean {
  if (result.kind === "market-news-brief") return isMarketNewsBriefResult(result);
  if (result.kind === "daily-market-summary") return isDailyMarketSummaryResult(result);
  if (result.kind !== "stock-amount") return true;

  return (
    Number.isFinite(result.approximateShares) &&
    Array.isArray(result.rows) &&
    typeof result.inputs.name === "string" &&
    Number.isFinite(result.inputs.amount) &&
    Number.isFinite(result.inputs.latestPrice)
  );
}
