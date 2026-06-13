import { useMemo } from "react";
import { getCurrentValue, type PortfolioItem } from "@/hooks/usePortfolio";

/**
 * Neutral portfolio metrics. No advice — just math.
 * Weighted average yield is computed across yield-bearing fund holdings only.
 * Estimated monthly income assumes 15% withholding tax (KE).
 */
export function usePortfolioMetrics(items: PortfolioItem[]) {
  return useMemo(() => {
    const fundItems = items.filter((i) => i.asset_type === "mmf");
    let weightedNumer = 0;
    let weightedDenom = 0;
    let monthlyIncome = 0;

    fundItems.forEach((i) => {
      const value = getCurrentValue(i);
      const yld = i.current_yield || 0;
      weightedNumer += value * yld;
      weightedDenom += value;
      // 15% withholding tax applied, divided by 12 months
      monthlyIncome += (value * (yld / 100) * 0.85) / 12;
    });

    const weightedAvgYield = weightedDenom > 0 ? weightedNumer / weightedDenom : null;

    return {
      weightedAvgYield,
      monthlyIncome,
      fundHoldingValue: weightedDenom,
      hasFunds: fundItems.length > 0,
    };
  }, [items]);
}
