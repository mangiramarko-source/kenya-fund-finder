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

/** Join explainer fields for safety / content assertions in tests. */
export function getExplainerText(explainer: ExplainerResult): string {
  return [explainer.title, ...explainer.paragraphs, ...explainer.assumptions].join(" ");
}

export const WITHHOLDING_TAX_GUARD =
  "Tax treatment can change and depends on the product, law, and investor circumstances. Confirm current tax treatment from official sources or a licensed adviser.";

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
  "t-bills": {
    kind: "explainer",
    title: "What are treasury bills (T-bills)?",
    paragraphs: [
      "Treasury bills are short-term government-backed debt instruments issued by the Central Bank of Kenya on behalf of the government.",
      "Investors typically buy T-bills at a discount and receive the face value at maturity — the difference is the return. Tenors are commonly 91, 182 or 364 days.",
      "Because they are government-backed, T-bills are often used as a reference for short-term interest rates and can appear inside money market fund portfolios.",
      "They are not the same as holding cash: reinvestment risk, inflation, and liquidity timing still matter even for government-backed instruments.",
    ],
    assumptions: [
      "Auction results and yields change at each issuance.",
      "Secondary-market access and settlement terms vary by channel.",
    ],
    disclaimer: STANDARD_DISCLAIMER,
  },
  "withholding-tax": {
    kind: "explainer",
    title: "What is withholding tax on investment income?",
    paragraphs: [
      "Withholding tax is tax deducted at source from certain types of income — such as interest from some deposits or distributions — before you receive the net amount.",
      "For unit trusts and similar products, the yield or return you see may be shown gross (before tax) or net (after tax), depending on the fund and how data is published.",
      WITHHOLDING_TAX_GUARD,
    ],
    assumptions: [
      "Tax rules differ by product type, investor category, and applicable law.",
      "Gross figures in calculators and tables may not equal what you keep after tax and fees.",
    ],
    disclaimer: STANDARD_DISCLAIMER,
  },
  fees: {
    kind: "explainer",
    title: "What are fund fees?",
    paragraphs: [
      "Fund fees are charges levied to run and administer an investment product. Common examples include management fees, trustee/custodian fees, and sometimes entry or exit loads.",
      "Fees reduce your net return: two funds with the same published yield can deliver different outcomes after fees are deducted.",
      "Always check the fund factsheet or prospectus for the fee schedule that applies to the specific product you are reviewing.",
    ],
    assumptions: [
      "Fee structures vary by fund manager and share class.",
      "Published yields may be shown before some fees — read the label carefully.",
    ],
    disclaimer: STANDARD_DISCLAIMER,
  },
  liquidity: {
    kind: "explainer",
    title: "What is liquidity?",
    paragraphs: [
      "Liquidity describes how quickly and easily you can access your money without a large price penalty.",
      "Cash and many money market funds offer high liquidity — you can usually withdraw within a few business days, subject to cut-off times and fund rules.",
      "Stocks are liquid during market hours but prices move. Some fixed-term deposits or locked instruments trade liquidity for a stated rate.",
      "Liquidity terms are product-specific: check notice periods, settlement days, and any penalties before committing funds.",
    ],
    assumptions: [
      "Cut-off times and public holidays affect settlement speed.",
      "During market stress, even liquid assets can gap in price.",
    ],
    disclaimer: STANDARD_DISCLAIMER,
  },
  volatility: {
    kind: "explainer",
    title: "What is volatility?",
    paragraphs: [
      "Volatility measures how much an asset's price or value moves up and down over time. Higher volatility means larger and more frequent swings.",
      "Stocks and commodities tend to be more volatile than money market funds or short-term government-backed instruments.",
      "Volatility is not the same as loss: it describes movement. A volatile asset can rise or fall; the range of outcomes is simply wider.",
      "Past volatility does not predict future volatility, but it helps set expectations about how smooth or bumpy a holding might be.",
    ],
    assumptions: [
      "Different assets use different volatility measures (daily, annualised, etc.).",
      "Short samples can understate or overstate true variability.",
    ],
    disclaimer: STANDARD_DISCLAIMER,
  },
  "gross-vs-net": {
    kind: "explainer",
    title: "Gross vs net return",
    paragraphs: [
      "Gross return is the return before deductions such as withholding tax, management fees, and other charges.",
      "Net return is what remains after those deductions — closer to what you actually keep.",
      "When comparing products, check whether the figure shown is gross or net. A higher gross yield is not automatically a higher net outcome if fees or tax treatment differ.",
      WITHHOLDING_TAX_GUARD,
    ],
    assumptions: [
      "Labels on tables and factsheets may use different conventions.",
      "Calculators in this assistant may show gross projections unless stated otherwise.",
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
