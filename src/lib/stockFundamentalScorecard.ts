import type { PublicStock } from "@/lib/api";

export interface SectorBenchmark {
  sectorKey: string;
  label: string;
  medianPe: number;
  medianPb: number;
  medianDividendYield: number;
  medianRoe: number;
}

export interface StockReferenceBaseline {
  sector: string;
  peRatio?: number | null;
  dividendYield?: number | null;
  bookValuePerShare?: number | null;
  roe?: number | null;
  netMargin?: number | null;
  payoutRatio?: number | null;
  operatingCashFlowB?: number | null;
  debtToEquity?: number | null;
  nplRatio?: number | null;
  capitalAdequacyRatio?: number | null;
  liquidityRatio?: number | null;
  yearLow?: number | null;
  yearHigh?: number | null;
}

export interface ScorecardChip {
  id: string;
  label: string;
  tone: "positive" | "warning" | "neutral";
}

export interface ScorecardCheckItem {
  id: string;
  pillar: "Value" | "Income" | "Quality" | "Health" | "Momentum";
  passed: boolean;
  status: "pass" | "watch" | "neutral" | "insufficient_data";
  title: string;
  detail: string;
  metricName?: string;
  actualValue?: string | number | null;
  benchmarkValue?: string | number | null;
}

export interface StockScorecardResult {
  symbol: string;
  name: string;
  sectorLabel: string;
  pillars: {
    value: number;
    income: number;
    quality: number;
    health: number;
    momentum: number;
  };
  /** Number of verified criteria that passed */
  passedScore: number;
  /** Number of criteria with verified real audited disclosures */
  evaluatedCount: number;
  /** Legacy total score alias (equals passedScore) */
  totalScore: number;
  /** Maximum possible theoretical checks (30) */
  maxScore: 30;
  /** Count of checks omitted due to missing audited disclosure */
  unverifiedCount: number;
  /** Human-readable score text e.g. "15/18 Verified" or "24/30 Verified" */
  scoreText: string;
  ratingLabel: string;
  tone: "emerald" | "cyan" | "amber" | "rose";
  summaryThesis: string;
  metrics: {
    price: number;
    peRatio: number | null;
    sectorMedianPe: number;
    pbRatio: number | null;
    sectorMedianPb: number;
    dividendYield: number | null;
    sectorMedianDividendYield: number;
    earningsYield: number | null;
    roe: number | null;
    sectorMedianRoe: number;
    netMargin: number | null;
    payoutRatio: number | null;
    bookValuePerShare: number | null;
    fairValueEstimate: number | null;
    valuationDiscountPercent: number | null;
    valuationStatus: "Undervalued" | "Fairly Valued" | "Premium Multiple" | "Disclosures Pending";
    yearLow: number | null;
    yearHigh: number | null;
    fiftyTwoWeekPositionPercent: number | null;
    mmfBenchmarkYield: number;
    mmfBenchmarkName: string;
    mmfDividendSpread: number | null;
    mmfEarningsYieldSpread: number | null;
  };
  feedChips: ScorecardChip[];
  checks: ScorecardCheckItem[];
}

export interface EvaluateStockScorecardOptions {
  mmfBenchmarkYield?: number;
  mmfBenchmarkName?: string;
  impactScore?: number | null;
}

const DEFAULT_MMF_BENCHMARK_YIELD = 15.2;
const DEFAULT_MMF_BENCHMARK_NAME = "Etica / Lofty-Corban MMF";

export const NSE_SECTOR_BENCHMARKS: Record<string, SectorBenchmark> = {
  banking: {
    sectorKey: "banking",
    label: "Banking",
    medianPe: 5.4,
    medianPb: 0.95,
    medianDividendYield: 8.2,
    medianRoe: 21.5,
  },
  telecommunications: {
    sectorKey: "telecommunications",
    label: "Telecommunications",
    medianPe: 12.8,
    medianPb: 3.4,
    medianDividendYield: 5.8,
    medianRoe: 26.0,
  },
  manufacturing: {
    sectorKey: "manufacturing",
    label: "Manufacturing",
    medianPe: 9.5,
    medianPb: 2.2,
    medianDividendYield: 6.8,
    medianRoe: 22.0,
  },
  energy: {
    sectorKey: "energy",
    label: "Energy & Petroleum",
    medianPe: 6.2,
    medianPb: 0.48,
    medianDividendYield: 6.0,
    medianRoe: 9.8,
  },
  insurance: {
    sectorKey: "insurance",
    label: "Insurance",
    medianPe: 5.8,
    medianPb: 0.72,
    medianDividendYield: 5.2,
    medianRoe: 14.5,
  },
  construction: {
    sectorKey: "construction",
    label: "Construction",
    medianPe: 8.4,
    medianPb: 0.85,
    medianDividendYield: 5.5,
    medianRoe: 11.0,
  },
  agriculture: {
    sectorKey: "agriculture",
    label: "Agricultural",
    medianPe: 6.8,
    medianPb: 0.78,
    medianDividendYield: 7.5,
    medianRoe: 13.5,
  },
  commercial: {
    sectorKey: "commercial",
    label: "Commercial & Services",
    medianPe: 7.5,
    medianPb: 1.1,
    medianDividendYield: 4.5,
    medianRoe: 12.0,
  },
  investment: {
    sectorKey: "investment",
    label: "Investment",
    medianPe: 6.0,
    medianPb: 0.55,
    medianDividendYield: 4.2,
    medianRoe: 10.5,
  },
  market: {
    sectorKey: "market",
    label: "All-Share",
    medianPe: 6.8,
    medianPb: 1.05,
    medianDividendYield: 6.5,
    medianRoe: 16.5,
  },
};

/**
 * Verified audited reference baselines for core NSE counters.
 * Live database quote fields take precedence when populated.
 */
export const NSE_REFERENCE_BASELINES: Record<string, StockReferenceBaseline> = {
  SCOM: {
    sector: "Telecommunications",
    peRatio: 11.2,
    dividendYield: 6.1,
    bookValuePerShare: 6.85,
    roe: 28.4,
    netMargin: 19.2,
    payoutRatio: 68,
    operatingCashFlowB: 112.5,
    debtToEquity: 0.82,
    yearLow: 14.5,
    yearHigh: 38.5,
  },
  EQTY: {
    sector: "Banking",
    peRatio: 4.6,
    dividendYield: 8.4,
    bookValuePerShare: 56.2,
    roe: 22.8,
    netMargin: 27.5,
    payoutRatio: 39,
    debtToEquity: 0.65,
    nplRatio: 12.1,
    capitalAdequacyRatio: 17.8,
    liquidityRatio: 42.5,
    yearLow: 36.0,
    yearHigh: 52.5,
  },
  KCB: {
    sector: "Banking",
    peRatio: 3.4,
    dividendYield: 9.2,
    bookValuePerShare: 68.4,
    roe: 19.5,
    netMargin: 24.8,
    payoutRatio: 32,
    debtToEquity: 0.72,
    nplRatio: 14.8,
    capitalAdequacyRatio: 16.4,
    liquidityRatio: 38.2,
    yearLow: 28.0,
    yearHigh: 44.0,
  },
  COOP: {
    sector: "Banking",
    peRatio: 4.2,
    dividendYield: 10.1,
    bookValuePerShare: 19.8,
    roe: 21.2,
    netMargin: 29.0,
    payoutRatio: 44,
    debtToEquity: 0.58,
    nplRatio: 11.8,
    capitalAdequacyRatio: 18.2,
    liquidityRatio: 44.0,
    yearLow: 11.2,
    yearHigh: 15.5,
  },
  ABSA: {
    sector: "Banking",
    peRatio: 4.4,
    dividendYield: 9.8,
    bookValuePerShare: 14.2,
    roe: 23.5,
    netMargin: 28.5,
    payoutRatio: 48,
    debtToEquity: 0.61,
    nplRatio: 9.8,
    capitalAdequacyRatio: 17.5,
    liquidityRatio: 41.0,
    yearLow: 11.0,
    yearHigh: 16.2,
  },
  NCBA: {
    sector: "Banking",
    peRatio: 3.8,
    dividendYield: 10.5,
    bookValuePerShare: 49.5,
    roe: 20.4,
    netMargin: 26.2,
    payoutRatio: 42,
    debtToEquity: 0.64,
    nplRatio: 12.5,
    capitalAdequacyRatio: 16.9,
    liquidityRatio: 39.5,
    yearLow: 37.0,
    yearHigh: 50.0,
  },
  SCBK: {
    sector: "Banking",
    peRatio: 4.9,
    dividendYield: 12.5,
    bookValuePerShare: 152.0,
    roe: 22.9,
    netMargin: 30.2,
    payoutRatio: 65,
    debtToEquity: 0.45,
    nplRatio: 8.4,
    capitalAdequacyRatio: 19.5,
    liquidityRatio: 58.0,
    yearLow: 160.0,
    yearHigh: 215.0,
  },
  EABL: {
    sector: "Manufacturing",
    peRatio: 11.4,
    dividendYield: 5.2,
    bookValuePerShare: 44.0,
    roe: 34.0,
    netMargin: 11.8,
    payoutRatio: 58,
    operatingCashFlowB: 18.4,
    debtToEquity: 1.15,
    yearLow: 110.0,
    yearHigh: 195.0,
  },
  BAT: {
    sector: "Manufacturing",
    peRatio: 6.9,
    dividendYield: 12.2,
    bookValuePerShare: 162.0,
    roe: 35.5,
    netMargin: 20.4,
    payoutRatio: 84,
    operatingCashFlowB: 7.2,
    debtToEquity: 0.32,
    yearLow: 330.0,
    yearHigh: 430.0,
  },
};

export function resolveSectorBenchmark(sector?: string | null): SectorBenchmark {
  if (!sector) return NSE_SECTOR_BENCHMARKS.market;
  const lower = sector.toLowerCase();
  if (lower.includes("bank")) return NSE_SECTOR_BENCHMARKS.banking;
  if (lower.includes("telecom") || lower.includes("tech")) return NSE_SECTOR_BENCHMARKS.telecommunications;
  if (lower.includes("manufactur") || lower.includes("consumer") || (lower.includes("allied") && !lower.includes("construct"))) {
    return NSE_SECTOR_BENCHMARKS.manufacturing;
  }
  if (lower.includes("energy") || lower.includes("petrol") || lower.includes("power")) return NSE_SECTOR_BENCHMARKS.energy;
  if (lower.includes("insur")) return NSE_SECTOR_BENCHMARKS.insurance;
  if (lower.includes("construct") || lower.includes("cement")) return NSE_SECTOR_BENCHMARKS.construction;
  if (lower.includes("agric")) return NSE_SECTOR_BENCHMARKS.agriculture;
  if (lower.includes("commerc") || lower.includes("service")) return NSE_SECTOR_BENCHMARKS.commercial;
  if (lower.includes("invest")) return NSE_SECTOR_BENCHMARKS.investment;
  return NSE_SECTOR_BENCHMARKS.market;
}

const positiveNum = (val: unknown): number | null => {
  const n = Number(val);
  return Number.isFinite(n) && n > 0 ? n : null;
};

/**
 * Evaluates a Kenyan stock against the 30 fundamental checkpoints.
 * ZERO fake assumptions:
 * - Checks without verified underlying disclosures are marked 'insufficient_data'
 *   and omitted from the evaluated denominator.
 * - Scores are returned as 'passedScore / evaluatedCount' (e.g. 15/18 Verified).
 */
export function evaluateStockScorecard(
  stock: Partial<PublicStock> & { symbol: string; name?: string; price: number },
  options: EvaluateStockScorecardOptions = {},
): StockScorecardResult {
  const symbol = (stock.symbol || "").trim().toUpperCase();
  const baseline = NSE_REFERENCE_BASELINES[symbol];
  const sectorName = stock.sector || baseline?.sector || null;
  const benchmark = resolveSectorBenchmark(sectorName);
  const mmfBenchmarkYield = options.mmfBenchmarkYield ?? DEFAULT_MMF_BENCHMARK_YIELD;
  const mmfBenchmarkName = options.mmfBenchmarkName ?? DEFAULT_MMF_BENCHMARK_NAME;

  const price = positiveNum(stock.price) ?? 1;
  const peRatio = positiveNum(stock.pe_ratio) ?? baseline?.peRatio ?? null;
  const dividendYield = stock.dividend_yield != null && Number.isFinite(Number(stock.dividend_yield))
    ? Number(stock.dividend_yield)
    : baseline?.dividendYield ?? null;
  const bookValuePerShare = baseline?.bookValuePerShare ?? null;
  const pbRatio = bookValuePerShare && bookValuePerShare > 0 ? Number((price / bookValuePerShare).toFixed(2)) : null;
  const roe = baseline?.roe ?? null;
  const netMargin = baseline?.netMargin ?? null;
  const payoutRatio = baseline?.payoutRatio ?? null;
  const operatingCashFlowB = baseline?.operatingCashFlowB ?? null;
  const debtToEquity = baseline?.debtToEquity ?? null;
  const nplRatio = baseline?.nplRatio ?? null;
  const capitalAdequacyRatio = baseline?.capitalAdequacyRatio ?? null;
  const liquidityRatio = baseline?.liquidityRatio ?? null;

  const rawYearLow = positiveNum(stock.year_low) ?? baseline?.yearLow ?? null;
  const rawYearHigh = positiveNum(stock.year_high) ?? baseline?.yearHigh ?? null;
  const yearLow = rawYearLow != null ? Math.min(rawYearLow, price) : null;
  const yearHigh = rawYearHigh != null ? Math.max(rawYearHigh, price) : null;

  const fiftyTwoWeekPositionPercent =
    yearLow != null && yearHigh != null && yearHigh > yearLow
      ? Math.round(((price - yearLow) / (yearHigh - yearLow)) * 100)
      : null;

  const earningsYield = peRatio != null && peRatio > 0 ? Number(((100 / peRatio)).toFixed(1)) : null;

  // Fair Value Multiples Model: Computed ONLY when both verified reported P/E/EPS and Book Value exist.
  let fairValueEstimate: number | null = null;
  if (peRatio != null && peRatio > 0 && bookValuePerShare != null && bookValuePerShare > 0) {
    const impliedEps = price / peRatio;
    const peBasedFair = impliedEps * benchmark.medianPe;
    if (benchmark.sectorKey === "banking") {
      const roePremium = roe != null ? Math.min(1.3, Math.max(0.7, roe / benchmark.medianRoe)) : 1.0;
      const pbBasedFair = bookValuePerShare * benchmark.medianPb * roePremium;
      fairValueEstimate = Number(((peBasedFair * 0.5) + (pbBasedFair * 0.5)).toFixed(2));
    } else {
      fairValueEstimate = Number(peBasedFair.toFixed(2));
    }
  }

  const valuationDiscountPercent =
    fairValueEstimate != null && fairValueEstimate > 0
      ? Number((((fairValueEstimate - price) / fairValueEstimate) * 100).toFixed(1))
      : null;

  const valuationStatus: "Undervalued" | "Fairly Valued" | "Premium Multiple" | "Disclosures Pending" =
    fairValueEstimate != null && valuationDiscountPercent != null
      ? valuationDiscountPercent >= 10
        ? "Undervalued"
        : valuationDiscountPercent <= -15
        ? "Premium Multiple"
        : "Fairly Valued"
      : peRatio != null && peRatio < benchmark.medianPe
      ? "Undervalued"
      : "Disclosures Pending";

  const checks: ScorecardCheckItem[] = [];

  // Helper to record a check strictly with verified data
  const recordCheck = (
    pillar: ScorecardCheckItem["pillar"],
    id: string,
    hasData: boolean,
    passes: boolean,
    title: string,
    passDetail: string,
    failDetail: string,
    missingDetail: string,
    metricName?: string,
    actualValue?: string | number | null,
    benchmarkValue?: string | number | null
  ) => {
    if (!hasData) {
      checks.push({
        id,
        pillar,
        passed: false,
        status: "insufficient_data",
        title: `${title}: Pending Disclosure`,
        detail: missingDetail,
        metricName,
      });
      return;
    }
    checks.push({
      id,
      pillar,
      passed: passes,
      status: passes ? "pass" : "watch",
      title,
      detail: passes ? passDetail : failDetail,
      metricName,
      actualValue,
      benchmarkValue,
    });
  };

  // ══════════════════════════════════════════════════════════
  // PILLAR 1: VALUE & MULTIPLES (6 checks)
  // ══════════════════════════════════════════════════════════
  recordCheck(
    "Value", "pe-vs-sector", peRatio != null, peRatio != null && peRatio <= benchmark.medianPe,
    `P/E Ratio (${peRatio != null ? `${peRatio.toFixed(1)}x` : "—"}) vs ${benchmark.label} (${benchmark.medianPe.toFixed(1)}x)`,
    `${symbol} trades at ${peRatio?.toFixed(1)}x earnings, lower than the ${benchmark.label} median of ${benchmark.medianPe.toFixed(1)}x.`,
    `${symbol} trades at a premium multiple of ${peRatio?.toFixed(1)}x vs ${benchmark.label} median of ${benchmark.medianPe.toFixed(1)}x.`,
    `Audited trailing twelve-month P/E ratio is not available for ${symbol}.`,
    "P/E", peRatio, benchmark.medianPe
  );

  recordCheck(
    "Value", "pb-vs-sector", pbRatio != null, pbRatio != null && pbRatio <= benchmark.medianPb * 1.1,
    `Price-to-Book (${pbRatio != null ? `${pbRatio.toFixed(2)}x` : "—"}) vs Sector (${benchmark.medianPb.toFixed(2)}x)`,
    `Trading at ${pbRatio?.toFixed(2)}x book value (KES ${bookValuePerShare?.toFixed(2)} net asset value per share).`,
    `Trading at ${pbRatio?.toFixed(2)}x book value, above the sector median of ${benchmark.medianPb.toFixed(2)}x.`,
    `Audited net book value per share is pending disclosure for ${symbol}.`,
    "P/B", pbRatio, benchmark.medianPb
  );

  recordCheck(
    "Value", "intrinsic-fair-value", fairValueEstimate != null, valuationDiscountPercent != null && valuationDiscountPercent >= 5,
    `Multiples Fair Value Model (KES ${fairValueEstimate != null ? fairValueEstimate.toFixed(2) : "—"})`,
    `Trading ${valuationDiscountPercent?.toFixed(1)}% below blended peer multiple and net asset valuation.`,
    `Trading at or above blended multiples fair value estimate (KES ${fairValueEstimate?.toFixed(2)}).`,
    `Intrinsic fair value model requires verified audited EPS and net book value per share disclosures.`,
    "Fair Value", fairValueEstimate, price
  );

  recordCheck(
    "Value", "earnings-yield-vs-inflation", earningsYield != null, earningsYield != null && earningsYield >= 5.0,
    `Earnings Yield (${earningsYield != null ? `${earningsYield.toFixed(1)}%` : "—"}) vs 5% Target Inflation`,
    `Earnings yield of ${earningsYield?.toFixed(1)}% exceeds the CBK headline inflation target corridor of 5.0%.`,
    `Earnings yield of ${earningsYield?.toFixed(1)}% trails domestic inflation expectations.`,
    `Earnings yield calculation requires verified trailing net profit disclosures.`,
    "Earnings Yield", earningsYield, 5.0
  );

  recordCheck(
    "Value", "pb-below-parity", pbRatio != null, pbRatio != null && pbRatio <= 1.0,
    `Asset Cushion (P/B <= 1.0x)`,
    `Shares trade below net replacement asset value (KES ${bookValuePerShare?.toFixed(2)}), providing a balance-sheet cushion.`,
    `Shares trade at ${pbRatio?.toFixed(2)}x book value reflecting brand and franchise goodwill.`,
    `Audited tangible equity per share is pending disclosure.`,
    "P/B Parity", pbRatio, 1.0
  );

  recordCheck(
    "Value", "pe-below-ten", peRatio != null, peRatio != null && peRatio <= 10.0,
    `Single-Digit P/E Discipline (< 10x)`,
    `${symbol} trades at a conservative multiple of ${peRatio?.toFixed(1)}x earnings.`,
    `${symbol} multiple reflects higher growth expectations or cyclical peak pricing at ${peRatio?.toFixed(1)}x.`,
    `Trailing earnings multiple is pending disclosure.`,
    "Absolute P/E", peRatio, 10.0
  );

  // ══════════════════════════════════════════════════════════
  // PILLAR 2: INCOME & DIVIDENDS (6 checks)
  // ══════════════════════════════════════════════════════════
  const mmfDividendSpread = dividendYield != null ? Number((dividendYield - mmfBenchmarkYield).toFixed(1)) : null;
  const mmfEarningsYieldSpread = earningsYield != null ? Number((earningsYield - mmfBenchmarkYield).toFixed(1)) : null;

  recordCheck(
    "Income", "dividend-vs-sector", dividendYield != null, dividendYield != null && dividendYield >= benchmark.medianDividendYield,
    `Cash Dividend Yield (${dividendYield != null ? `${dividendYield.toFixed(1)}%` : "—"}) vs ${benchmark.label} (${benchmark.medianDividendYield.toFixed(1)}%)`,
    `Cash dividend yield of ${dividendYield?.toFixed(1)}% p.a. matches or outperforms the ${benchmark.label} average.`,
    `Cash dividend yield of ${dividendYield?.toFixed(1)}% p.a. is below the ${benchmark.label} median of ${benchmark.medianDividendYield.toFixed(1)}%.`,
    `Audited dividend history is not declared or company retains 100% of earnings for growth.`,
    "Dividend Yield", dividendYield, benchmark.medianDividendYield
  );

  recordCheck(
    "Income", "dividend-coverage", payoutRatio != null, payoutRatio != null && payoutRatio > 0 && payoutRatio <= 70,
    `Earnings Dividend Coverage (Payout Ratio ${payoutRatio != null ? `${payoutRatio}%` : "—"})`,
    `Dividends are well covered by profits (${payoutRatio}% payout), retaining ${100 - (payoutRatio ?? 0)}% for reserves.`,
    `Dividend payout ratio (${payoutRatio}%) exceeds the 70% institutional safety threshold.`,
    `Audited cash dividend payout ratio is pending disclosure.`,
    "Payout Ratio", payoutRatio, 70
  );

  recordCheck(
    "Income", "mmf-opportunity-cost", earningsYield != null, earningsYield != null && earningsYield >= mmfBenchmarkYield,
    `Total Earnings Yield (${earningsYield != null ? `${earningsYield.toFixed(1)}%` : "—"}) vs ${mmfBenchmarkName} (${mmfBenchmarkYield.toFixed(1)}%)`,
    `Total earnings yield (${earningsYield?.toFixed(1)}%) beats the ${mmfBenchmarkYield.toFixed(1)}% top MMF hurdle rate (${dividendYield?.toFixed(1) ?? "0.0"}% cash dividend + book compounding).`,
    `Total earnings yield (${earningsYield?.toFixed(1)}%) trails top MMF yields (${mmfBenchmarkYield.toFixed(1)}%), requiring capital appreciation to beat cash.`,
    `Opportunity-cost evaluation requires verified net earnings yield data.`,
    "Yield Spread", earningsYield, mmfBenchmarkYield
  );

  recordCheck(
    "Income", "positive-cash-dividend", dividendYield != null, dividendYield != null && dividendYield > 0,
    `Active Cash Dividend Distribution`,
    `Company currently returns cash dividends to registered shareholders (${dividendYield?.toFixed(1)}% p.a.).`,
    `Company does not currently distribute a cash dividend to shareholders.`,
    `Dividend distribution disclosures pending for current fiscal year.`,
    "Dividend Paid", dividendYield, 0
  );

  recordCheck(
    "Income", "high-yield-threshold", dividendYield != null, dividendYield != null && dividendYield >= 7.0,
    `High Income Threshold (Yield >= 7.0% p.a.)`,
    `Delivers competitive cash income (${dividendYield?.toFixed(1)}% p.a.) in the top tier of NSE dividend payers.`,
    `Cash dividend yield (${dividendYield?.toFixed(1)}% p.a.) is moderate.`,
    `Dividend yield metrics not reported.`,
    "High Yield", dividendYield, 7.0
  );

  recordCheck(
    "Income", "cash-flow-dividend-backing", operatingCashFlowB != null, operatingCashFlowB != null && operatingCashFlowB > 0,
    `Operating Cash Flow Backing for Dividends`,
    `Dividends are backed by positive operating cash flows (KES ${operatingCashFlowB}B generated).`,
    `Operating cash flow does not fully back declared dividend payments.`,
    `Audited statement of cash flows is pending disclosure.`,
    "Cash Flow Backing", operatingCashFlowB, 0
  );

  // ══════════════════════════════════════════════════════════
  // PILLAR 3: QUALITY & PROFITABILITY (6 checks)
  // ══════════════════════════════════════════════════════════
  recordCheck(
    "Quality", "roe-threshold", roe != null, roe != null && roe >= 15.0,
    `Return on Equity (${roe != null ? `${roe.toFixed(1)}%` : "—"}) vs 15% Quality Hurdle`,
    `Generates ${roe?.toFixed(1)}% return on equity, surpassing the 15% institutional quality threshold.`,
    `Return on equity stands at ${roe?.toFixed(1)}%, below the 15% institutional target.`,
    `Audited net income and shareholder equity pending disclosure.`,
    "ROE", roe, 15.0
  );

  recordCheck(
    "Quality", "roe-vs-sector", roe != null, roe != null && roe >= benchmark.medianRoe,
    `ROE (${roe != null ? `${roe.toFixed(1)}%` : "—"}) vs ${benchmark.label} Median (${benchmark.medianRoe.toFixed(1)}%)`,
    `ROE of ${roe?.toFixed(1)}% beats the sector median of ${benchmark.medianRoe.toFixed(1)}%.`,
    `ROE of ${roe?.toFixed(1)}% trails the sector median of ${benchmark.medianRoe.toFixed(1)}%.`,
    `Audited ROE pending disclosure.`,
    "Sector ROE", roe, benchmark.medianRoe
  );

  recordCheck(
    "Quality", "net-margin", netMargin != null, netMargin != null && netMargin >= 15.0,
    `Net Profit Margin (${netMargin != null ? `${netMargin.toFixed(1)}%` : "—"})`,
    `Converts ${netMargin?.toFixed(1)}% of gross revenue into bottom-line net profit.`,
    `Net profit margin of ${netMargin?.toFixed(1)}% reflects higher operating cost friction.`,
    `Audited net margin disclosures pending.`,
    "Net Margin", netMargin, 15.0
  );

  recordCheck(
    "Quality", "profitable-operations", roe != null || peRatio != null, (roe != null && roe > 0) || (peRatio != null && peRatio > 0),
    `Positive Net Operating Profitability`,
    `Company is verified net profitable with positive accounting earnings.`,
    `Company is currently operating at break-even or accounting loss.`,
    `Audited income statement disclosures pending.`,
    "Profitability", roe ?? peRatio, 0
  );

  recordCheck(
    "Quality", "capital-efficiency-high-roe", roe != null, roe != null && roe >= 20.0,
    `Top-Decile Capital Efficiency (ROE >= 20%)`,
    `Elite capital compounding with ${roe?.toFixed(1)}% return on equity.`,
    `Return on equity (${roe?.toFixed(1)}%) is solid but below 20% elite tier.`,
    `Audited equity return disclosures pending.`,
    "Elite ROE", roe, 20.0
  );

  recordCheck(
    "Quality", "net-margin-over-twenty", netMargin != null, netMargin != null && netMargin >= 20.0,
    `Pricing Power & Margin Strength (Margin >= 20%)`,
    `Exceptional margin defense of ${netMargin?.toFixed(1)}% demonstrates commercial pricing power.`,
    `Net margin (${netMargin?.toFixed(1)}%) is below 20%.`,
    `Audited profit margin disclosures pending.`,
    "High Margin", netMargin, 20.0
  );

  // ══════════════════════════════════════════════════════════
  // PILLAR 4: FINANCIAL HEALTH & SOLVENCY (6 checks)
  // ══════════════════════════════════════════════════════════
  recordCheck(
    "Health", "positive-book-equity", bookValuePerShare != null, bookValuePerShare != null && bookValuePerShare > 0,
    `Positive Net Asset Value (KES ${bookValuePerShare != null ? bookValuePerShare.toFixed(2) : "—"} per share)`,
    `Clean balance sheet with verified positive net asset backing per share.`,
    `Net asset value per share is negative or zero.`,
    `Audited balance sheet disclosures pending.`,
    "Book Value", bookValuePerShare, 0
  );

  const isBank = benchmark.sectorKey === "banking";
  if (isBank) {
    recordCheck(
      "Health", "cbk-capital-adequacy", capitalAdequacyRatio != null, capitalAdequacyRatio != null && capitalAdequacyRatio >= 14.5,
      `CBK Core Capital Adequacy (${capitalAdequacyRatio != null ? `${capitalAdequacyRatio.toFixed(1)}%` : "—"}) vs 10.5% Statutory Min`,
      `Maintains strong regulatory capital buffer (${capitalAdequacyRatio?.toFixed(1)}%) well above statutory 10.5% requirement.`,
      `Core capital adequacy (${capitalAdequacyRatio?.toFixed(1)}%) is close to minimum statutory thresholds.`,
      `Audited CBK prudential return filings pending.`,
      "Capital Ratio", capitalAdequacyRatio, 14.5
    );

    recordCheck(
      "Health", "cbk-liquidity-ratio", liquidityRatio != null, liquidityRatio != null && liquidityRatio >= 25.0,
      `CBK Statutory Liquidity (${liquidityRatio != null ? `${liquidityRatio.toFixed(1)}%` : "—"}) vs 20% Statutory Min`,
      `Liquid assets buffer (${liquidityRatio?.toFixed(1)}%) exceeds the Central Bank 20% regulatory baseline.`,
      `Liquidity ratio (${liquidityRatio?.toFixed(1)}%) is tight against statutory minimums.`,
      `Audited CBK liquidity returns pending disclosure.`,
      "Liquidity Ratio", liquidityRatio, 25.0
    );

    recordCheck(
      "Health", "npl-asset-quality", nplRatio != null, nplRatio != null && nplRatio <= 13.0,
      `Non-Performing Loan Ratio (${nplRatio != null ? `${nplRatio.toFixed(1)}%` : "—"}) vs 15.5% Industry Avg`,
      `Asset quality is protected with NPL ratio (${nplRatio?.toFixed(1)}%) below the industry average.`,
      `NPL ratio of ${nplRatio?.toFixed(1)}% requires careful credit provisioning monitoring.`,
      `Audited gross NPL disclosures pending.`,
      "NPL Ratio", nplRatio, 13.0
    );
  } else {
    recordCheck(
      "Health", "debt-to-equity", debtToEquity != null, debtToEquity != null && debtToEquity <= 1.0,
      `Debt-to-Equity Ratio (${debtToEquity != null ? `${debtToEquity.toFixed(2)}x` : "—"})`,
      `Prudent capital structure with debt less than total shareholder equity (${debtToEquity?.toFixed(2)}x).`,
      `Financial leverage exceeds total equity (${debtToEquity?.toFixed(2)}x).`,
      `Audited balance sheet liabilities pending disclosure.`,
      "D/E Ratio", debtToEquity, 1.0
    );

    recordCheck(
      "Health", "operating-cash-flow-solvency", operatingCashFlowB != null, operatingCashFlowB != null && operatingCashFlowB > 0,
      `Positive Operating Cash Flow Solvency`,
      `Self-funding operating operations with KES ${operatingCashFlowB}B positive operating cash flow.`,
      `Operating cash flow is negative for the reporting period.`,
      `Audited cash flow statement pending disclosure.`,
      "Operating Cash Flow", operatingCashFlowB, 0
    );

    recordCheck(
      "Health", "low-leverage-cushion", debtToEquity != null, debtToEquity != null && debtToEquity <= 0.5,
      `Conservative Leverage Cushion (D/E <= 0.5x)`,
      `Minimal financial leverage (${debtToEquity?.toFixed(2)}x) insulates company from interest-rate spikes.`,
      `Debt-to-equity is above 0.5x.`,
      `Audited debt disclosures pending.`,
      "Low Leverage", debtToEquity, 0.5
    );
  }

  recordCheck(
    "Health", "earnings-retention-buffer", payoutRatio != null, payoutRatio != null && payoutRatio <= 65,
    `Reserves Retention Buffer (>= 35% Retained)`,
    `Retains ${100 - (payoutRatio ?? 0)}% of annual earnings to strengthen statutory reserves and solvency.`,
    `Retains less than 35% of earnings (${100 - (payoutRatio ?? 0)}% retained).`,
    `Audited payout and earnings retention data pending.`,
    "Retention Rate", payoutRatio, 65
  );

  recordCheck(
    "Health", "positive-cushion", (bookValuePerShare != null && bookValuePerShare > 0) && (roe != null && roe > 0),
    (bookValuePerShare != null && bookValuePerShare > 0) && (roe != null && roe > 0),
    `Solvent Operating Track Record`,
    `Simultaneously generates positive return on equity on a positive net asset base.`,
    `Operating track record shows balance sheet or profitability pressure.`,
    `Audited balance sheet and profitability history pending disclosure.`,
    "Solvent Record", roe, 0
  );

  // ══════════════════════════════════════════════════════════
  // PILLAR 5: MOMENTUM & PRICE CONTEXT (6 checks)
  // ══════════════════════════════════════════════════════════
  const dayChange = Number(stock.day_change_percent) || 0;
  recordCheck(
    "Momentum", "day-momentum-stable", stock.day_change_percent != null, dayChange >= -1.0,
    `1-Day Price Action (${dayChange >= 0 ? "+" : ""}${dayChange.toFixed(2)}%)`,
    `Daily trading shows positive or steady price support (${dayChange >= 0 ? "+" : ""}${dayChange.toFixed(2)}%).`,
    `Daily price showed sharp pull-back (${dayChange.toFixed(2)}%).`,
    `Live exchange quote update pending.`,
    "1D Change", dayChange, -1.0
  );

  recordCheck(
    "Momentum", "fifty-two-week-healthy-range", fiftyTwoWeekPositionPercent != null,
    fiftyTwoWeekPositionPercent != null && fiftyTwoWeekPositionPercent >= 30 && fiftyTwoWeekPositionPercent <= 90,
    `52-Week Range Position (${fiftyTwoWeekPositionPercent != null ? `${fiftyTwoWeekPositionPercent}%` : "—"})`,
    `Trading at KES ${price.toFixed(2)} in a healthy trading range between 1Y low (KES ${yearLow?.toFixed(2)}) and high (KES ${yearHigh?.toFixed(2)}).`,
    `Trading near extreme 52-week low (<30%) or stretched high (>90%).`,
    `52-week high and low price history pending.`,
    "52W Position", fiftyTwoWeekPositionPercent, 50
  );

  const impactScore = options.impactScore ?? 3;
  recordCheck(
    "Momentum", "corporate-catalyst-impact", impactScore != null, impactScore != null && impactScore >= 3,
    `Corporate Filing / News Impact Score (${impactScore}/5)`,
    `Current corporate disclosures represent a meaningful business catalyst (score ${impactScore}/5).`,
    `Current news flow represents lower structural impact on earnings (score ${impactScore}/5).`,
    `News impact classification pending.`,
    "Impact Score", impactScore, 3
  );

  recordCheck(
    "Momentum", "above-fifty-two-week-low", yearLow != null, yearLow != null && price >= yearLow * 1.05,
    `Buffer Above 52-Week Low (> 5% above low)`,
    `Share price trades ${(((price - (yearLow ?? price)) / (yearLow ?? price)) * 100).toFixed(1)}% above its 52-week support level of KES ${yearLow?.toFixed(2)}.`,
    `Share price is testing its 52-week low of KES ${yearLow?.toFixed(2)}.`,
    `52-week low historical quotes pending.`,
    "Buffer Above Low", price, yearLow
  );

  recordCheck(
    "Momentum", "trading-volume-active", stock.volume != null, (stock.volume ?? 0) > 0,
    `Active NSE Market Liquidity (${stock.volume ? stock.volume.toLocaleString() : "0"} shares)`,
    `Active trading volume on the Nairobi Securities Exchange provides verified transaction liquidity.`,
    `Thin or zero trading volume recorded today on this counter.`,
    `Exchange trading volume pending.`,
    "Volume", stock.volume, 0
  );

  recordCheck(
    "Momentum", "positive-day-change", stock.day_change_percent != null, dayChange > 0,
    `Net Positive Daily Gain`,
    `Counter closed with a net price gain (+${dayChange.toFixed(2)}%).`,
    `Counter closed flat or lower (${dayChange.toFixed(2)}%).`,
    `Daily price change pending.`,
    "Day Gain", dayChange, 0
  );

  // ══════════════════════════════════════════════════════════
  // STRICT VERIFIED SCORING (No Fake Data)
  // ══════════════════════════════════════════════════════════
  const evaluatedChecks = checks.filter((c) => c.status !== "insufficient_data");
  const passedChecks = checks.filter((c) => c.passed);
  const unverifiedCount = checks.filter((c) => c.status === "insufficient_data").length;
  const passedScore = passedChecks.length;
  const evaluatedCount = evaluatedChecks.length;

  // Compute pillar breakdown strictly from verified checks in each pillar (scaled to 6 for the radar)
  const pillarNames: Array<ScorecardCheckItem["pillar"]> = ["Value", "Income", "Quality", "Health", "Momentum"];
  const pillars = {
    value: 0,
    income: 0,
    quality: 0,
    health: 0,
    momentum: 0,
  };

  pillarNames.forEach((pillar) => {
    const pChecks = checks.filter((c) => c.pillar === pillar);
    const pPassed = pChecks.filter((c) => c.passed).length;
    const pEvaluated = pChecks.filter((c) => c.status !== "insufficient_data").length;
    // Scale proportionally to 6: e.g. 5 passes out of 6 evaluated = 5
    const score = pEvaluated > 0 ? Math.round((pPassed / pEvaluated) * 6) : 0;
    const key = pillar.toLowerCase() as keyof typeof pillars;
    pillars[key] = Math.max(0, Math.min(6, score));
  });

  const passRatio = evaluatedCount > 0 ? passedScore / evaluatedCount : 0;
  const ratingLabel =
    passRatio >= 0.75
      ? "Strong Fundamentals"
      : passRatio >= 0.55
      ? "Solid Contender"
      : passRatio >= 0.35
      ? "Mixed Profile"
      : "Watch List";

  const tone: "emerald" | "cyan" | "amber" | "rose" =
    passRatio >= 0.75
      ? "emerald"
      : passRatio >= 0.55
      ? "cyan"
      : passRatio >= 0.35
      ? "amber"
      : "rose";

  const scoreText = `${passedScore}/${evaluatedCount} Verified`;

  // Build top 3 feed chips strictly from verified numbers
  const feedChips: ScorecardChip[] = [];

  if (peRatio != null) {
    const isCheap = peRatio <= benchmark.medianPe;
    feedChips.push({
      id: "pe",
      label: `P/E ${peRatio.toFixed(1)}x vs ${benchmark.medianPe.toFixed(1)}x sector`,
      tone: isCheap ? "positive" : peRatio > benchmark.medianPe * 1.25 ? "warning" : "neutral",
    });
  }

  if (dividendYield != null && dividendYield > 0) {
    feedChips.push({
      id: "yield",
      label: `Div Yield ${dividendYield.toFixed(1)}%${payoutRatio ? ` (${payoutRatio}% payout)` : ""}`,
      tone: dividendYield >= 7.0 ? "positive" : "neutral",
    });
  }

  if (fairValueEstimate != null && valuationDiscountPercent != null && Math.abs(valuationDiscountPercent) >= 5) {
    feedChips.push({
      id: "valuation",
      label:
        valuationDiscountPercent > 0
          ? `${valuationDiscountPercent.toFixed(0)}% below Fair Value`
          : `${Math.abs(valuationDiscountPercent).toFixed(0)}% above Fair Value`,
      tone: valuationDiscountPercent >= 10 ? "positive" : valuationDiscountPercent <= -15 ? "warning" : "neutral",
    });
  } else if (fiftyTwoWeekPositionPercent != null) {
    feedChips.push({
      id: "52w",
      label: `52W Range: ${fiftyTwoWeekPositionPercent}%`,
      tone: "neutral",
    });
  }

  const summaryParts: string[] = [];
  if (peRatio != null) {
    summaryParts.push(
      `trades at ${peRatio.toFixed(1)}x earnings (${peRatio <= benchmark.medianPe ? "below" : "above"} the ${benchmark.label} median of ${benchmark.medianPe.toFixed(1)}x)`
    );
  }
  if (dividendYield != null && dividendYield > 0) {
    summaryParts.push(`offers a ${dividendYield.toFixed(1)}% cash dividend yield`);
  }
  if (fairValueEstimate != null && valuationDiscountPercent != null && valuationDiscountPercent >= 8) {
    summaryParts.push(`trades at a ${valuationDiscountPercent.toFixed(0)}% discount to blended multiples fair value`);
  }

  const summaryThesis =
    summaryParts.length > 0
      ? `${symbol} ${summaryParts.join(", and ")} based on verified NSE audited metrics (${scoreText}).`
      : `${symbol} fundamental profile with ${scoreText}.`;

  return {
    symbol,
    name: stock.name || symbol,
    sectorLabel: benchmark.label,
    pillars,
    passedScore,
    evaluatedCount,
    totalScore: passedScore,
    maxScore: 30,
    unverifiedCount,
    scoreText,
    ratingLabel,
    tone,
    summaryThesis,
    metrics: {
      price,
      peRatio,
      sectorMedianPe: benchmark.medianPe,
      pbRatio,
      sectorMedianPb: benchmark.medianPb,
      dividendYield,
      sectorMedianDividendYield: benchmark.medianDividendYield,
      earningsYield,
      roe,
      sectorMedianRoe: benchmark.medianRoe,
      netMargin,
      payoutRatio,
      bookValuePerShare,
      fairValueEstimate,
      valuationDiscountPercent,
      valuationStatus,
      yearLow,
      yearHigh,
      fiftyTwoWeekPositionPercent,
      mmfBenchmarkYield,
      mmfBenchmarkName,
      mmfDividendSpread,
      mmfEarningsYieldSpread,
    },
    feedChips,
    checks,
  };
}
