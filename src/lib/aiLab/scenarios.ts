// Pure, deterministic scenario calculators for the AI Scenario Assistant.
// No advice. Results are projections, not guarantees.

export const STANDARD_DISCLAIMER = "Data only. Not personal financial advice.";

export interface MmfScenarioResult {
  kind: "mmf";
  inputs: { amount: number; annualYieldPct: number; months: number };
  grossYearly: number;
  monthlyEquivalent: number;
  projectedGross: number;
  assumptions: string[];
  disclaimer: string;
}

export function calculateMmfScenario(
  amount: number,
  annualYieldPct: number,
  months: number = 12
): MmfScenarioResult {
  const grossYearly = amount * (annualYieldPct / 100);
  const monthlyEquivalent = grossYearly / 12;
  const projectedGross = amount + grossYearly * (months / 12);
  return {
    kind: "mmf",
    inputs: { amount, annualYieldPct, months },
    grossYearly,
    monthlyEquivalent,
    projectedGross,
    assumptions: [
      "Simple (non-compounded) interest applied pro-rata over the period.",
      "Yield is gross and shown before the 15% withholding tax and any fund fees.",
      "Yields, fees and market conditions can change at any time.",
    ],
    disclaimer: STANDARD_DISCLAIMER,
  };
}

export interface StockMoveScenarioResult {
  kind: "stock-move";
  inputs: { amount: number; priceChangePct: number };
  newValue: number;
  delta: number;
  direction: "up" | "down" | "flat";
  assumptions: string[];
  disclaimer: string;
}

export function calculateStockMoveScenario(
  amount: number,
  priceChangePct: number
): StockMoveScenarioResult {
  const newValue = amount * (1 + priceChangePct / 100);
  const delta = newValue - amount;
  const direction = priceChangePct > 0 ? "up" : priceChangePct < 0 ? "down" : "flat";
  return {
    kind: "stock-move",
    inputs: { amount, priceChangePct },
    newValue,
    delta,
    direction,
    assumptions: [
      "Assumes a single price movement applied to the full position.",
      "Excludes brokerage fees, taxes and currency effects.",
      "Past or hypothetical movements do not predict future prices.",
    ],
    disclaimer: STANDARD_DISCLAIMER,
  };
}

export interface MonthlyContributionScenarioResult {
  kind: "monthly-contribution";
  inputs: { startAmount: number; monthly: number; annualYieldPct: number; months: number };
  totalContributions: number;
  projectedGross: number;
  grossEarnings: number;
  assumptions: string[];
  disclaimer: string;
}

export function calculateMonthlyContributionScenario(
  startAmount: number,
  monthly: number,
  annualYieldPct: number,
  months: number
): MonthlyContributionScenarioResult {
  const monthlyRate = annualYieldPct / 100 / 12;
  let balance = startAmount;
  for (let i = 0; i < months; i++) {
    balance += balance * monthlyRate + monthly;
  }
  const totalContributions = startAmount + monthly * months;
  const projectedGross = balance;
  const grossEarnings = projectedGross - totalContributions;
  return {
    kind: "monthly-contribution",
    inputs: { startAmount, monthly, annualYieldPct, months },
    totalContributions,
    projectedGross,
    grossEarnings,
    assumptions: [
      "Contribution added at the end of each month after interest is credited.",
      "Yield held constant for the full period — real yields vary.",
      "Gross of withholding tax and fund fees.",
    ],
    disclaimer: STANDARD_DISCLAIMER,
  };
}

export interface ExplainerResult {
  kind: "explainer";
  title: string;
  paragraphs: string[];
  assumptions: string[];
  disclaimer: string;
}

export const EXPLAINERS: Record<string, ExplainerResult> = {
  "mmf-yield": {
    kind: "explainer",
    title: "What is money market fund yield?",
    paragraphs: [
      "A money market fund (MMF) pools investor money into short-term, interest-bearing instruments such as treasury bills, fixed deposits and commercial paper.",
      "The 'yield' you see is usually an annualised effective rate — what your money would earn over a year if the current rate held steady. It is shown gross of the 15% withholding tax and any management fees.",
      "Daily yield is simply the annual rate divided across the year and credited to your balance, which is why MMF returns look smooth compared to stocks.",
    ],
    assumptions: [
      "Yields change as market interest rates change.",
      "Different funds have different fees, minimums and liquidity terms.",
    ],
    disclaimer: STANDARD_DISCLAIMER,
  },
};

import type { ComparableAsset } from "./marketContext";

export interface CompareScenarioResult {
  kind: "compare";
  assets: ComparableAsset[];
  /** Rows describing differences (e.g. price gap, yield gap). */
  diff: Array<{ label: string; value: string }>;
  assumptions: string[];
  disclaimer: string;
}

const fmtPct = (n: number | null) =>
  n == null ? "—" : `${n > 0 ? "+" : ""}${n.toFixed(2)}%`;

const fmtNumber = (n: number) =>
  new Intl.NumberFormat("en-KE", { maximumFractionDigits: 2 }).format(n);

export function compareAssets(a: ComparableAsset, b: ComparableAsset): CompareScenarioResult {
  const diff: Array<{ label: string; value: string }> = [];

  if (a.valueLabel === b.valueLabel) {
    const delta = b.value - a.value;
    const pct = a.value !== 0 ? (delta / a.value) * 100 : null;
    diff.push({
      label: `${b.symbol} vs ${a.symbol} (${a.valueLabel})`,
      value: `${delta >= 0 ? "+" : ""}${fmtNumber(delta)}${
        pct != null ? ` (${pct >= 0 ? "+" : ""}${pct.toFixed(2)}%)` : ""
      }`,
    });
  } else {
    diff.push({
      label: "Note",
      value: `${a.symbol} and ${b.symbol} use different units (${a.valueLabel} vs ${b.valueLabel}); direct numeric comparison is not meaningful.`,
    });
  }

  if (a.changePct != null && b.changePct != null) {
    diff.push({
      label: "Recent move gap",
      value: `${a.symbol} ${fmtPct(a.changePct)} vs ${b.symbol} ${fmtPct(b.changePct)} (gap ${fmtPct(
        b.changePct - a.changePct,
      )})`,
    });
  }

  return {
    kind: "compare",
    assets: [a, b],
    diff,
    assumptions: [
      "Values are point-in-time from the latest available snapshot.",
      "Percentage changes use the previous published value (intraday for stocks, last update for FX/commodities).",
      "30-day return uses the gateway's daily history series and is unavailable for unit trusts (no per-fund history endpoint).",
      "Cross-category comparisons (e.g. a stock price vs a fund yield) are presented side-by-side for context only — they measure different things.",
    ],
    disclaimer: STANDARD_DISCLAIMER,
  };
}

export type ScenarioResult =
  | MmfScenarioResult
  | StockMoveScenarioResult
  | MonthlyContributionScenarioResult
  | ExplainerResult
  | CompareScenarioResult;
