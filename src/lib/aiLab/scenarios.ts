// Pure, deterministic scenario calculators for the AI Scenario Assistant.
// No advice. Results are projections, not guarantees.

import type { NewsArticle, NewsQueryKind } from "./newsContext";

export const STANDARD_DISCLAIMER = "Data only. Not personal financial advice.";

export const MMF_SCENARIO_SUMMARY =
  "This projection estimates gross income from the amount and yield assumptions shown. It does not predict future returns.";

export const MMF_DEFAULT_ASSUMPTIONS = [
  "Simple annualized estimate applied pro-rata over the period.",
  "Excludes fees, taxes, and compounding differences.",
  "Actual fund distributions can differ.",
  "Yields can change.",
];

export interface MmfScenarioResult {
  kind: "mmf";
  summary: string;
  inputs: { amount: number; annualYieldPct: number; months: number };
  grossYearly: number;
  monthlyEquivalent: number;
  dailyEquivalent: number;
  projectedGross: number;
  assumptions: string[];
  disclaimer: string;
}

export interface MmfYieldChangeScenarioResult {
  kind: "mmf-yield-change";
  summary: string;
  inputs: { amount: number; fromYieldPct: number; toYieldPct: number; months: number };
  fromGrossYearly: number;
  toGrossYearly: number;
  fromMonthly: number;
  toMonthly: number;
  deltaYearly: number;
  assumptions: string[];
  disclaimer: string;
}

export function getMmfUserText(result: MmfScenarioResult | MmfYieldChangeScenarioResult): string {
  return [result.summary, ...result.assumptions].join(" ");
}

export function calculateMmfScenario(
  amount: number,
  annualYieldPct: number,
  months: number = 12,
  extraAssumptions: string[] = [],
): MmfScenarioResult {
  const grossYearly = amount * (annualYieldPct / 100);
  const monthlyEquivalent = grossYearly / 12;
  const dailyEquivalent = Math.round((grossYearly / 365) * 100) / 100;
  const projectedGross = amount + grossYearly * (months / 12);
  return {
    kind: "mmf",
    summary: MMF_SCENARIO_SUMMARY,
    inputs: { amount, annualYieldPct, months },
    grossYearly,
    monthlyEquivalent,
    dailyEquivalent,
    projectedGross,
    assumptions: [...MMF_DEFAULT_ASSUMPTIONS, ...extraAssumptions],
    disclaimer: STANDARD_DISCLAIMER,
  };
}

export function calculateMmfYieldChangeScenario(
  amount: number,
  fromYieldPct: number,
  toYieldPct: number,
  months: number = 12,
): MmfYieldChangeScenarioResult {
  const fromGrossYearly = amount * (fromYieldPct / 100);
  const toGrossYearly = amount * (toYieldPct / 100);
  const fromMonthly = fromGrossYearly / 12;
  const toMonthly = toGrossYearly / 12;
  return {
    kind: "mmf-yield-change",
    summary:
      "This projection compares two yield assumptions for the same amount. It does not predict future returns.",
    inputs: { amount, fromYieldPct, toYieldPct, months },
    fromGrossYearly,
    toGrossYearly,
    fromMonthly,
    toMonthly,
    deltaYearly: toGrossYearly - fromGrossYearly,
    assumptions: [
      ...MMF_DEFAULT_ASSUMPTIONS,
      `Period: ${months} months at each yield assumption.`,
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

export const FX_CONVERSION_SUMMARY =
  "This scenario estimates a currency conversion using the latest available rate shown in KenyaFundFinder. Actual conversion amounts can differ.";

export const FX_MOVE_SUMMARY =
  "This scenario shows how the quoted exchange rate changes under the movement assumption. It does not predict future exchange rates.";

export const COMMODITY_MOVE_SUMMARY =
  "This scenario shows how the commodity value changes under the movement assumption. It does not predict future commodity prices.";

const FX_CONVERSION_ASSUMPTIONS = [
  "Uses latest available KenyaFundFinder FX data.",
  "This is an estimated conversion, not a live quote.",
  "Actual conversion can differ because of spreads, fees, timing, and provider rates.",
  "This is not currency trading advice.",
];

const FX_MOVE_ASSUMPTIONS = [
  "Uses latest available KenyaFundFinder FX data.",
  "Movement is applied to the quoted rate shown.",
  "Does not predict future exchange rates.",
  "This is not currency trading advice.",
];

const COMMODITY_MOVE_ASSUMPTIONS = [
  "Uses latest available KenyaFundFinder commodity data.",
  "Movement is applied to the published value shown.",
  "Does not predict future commodity prices.",
  "This is not commodity trading advice.",
];

export interface FxConversionScenarioResult {
  kind: "fx-conversion";
  summary: string;
  inputs: {
    amount: number;
    fromCurrency: string;
    toCurrency: string;
    rate: number;
    rateLabel: string;
  };
  convertedAmount: number;
  assumptions: string[];
  importantNotes: string[];
  disclaimer: string;
}

export interface FxMoveScenarioResult {
  kind: "fx-move";
  summary: string;
  inputs: {
    pair: string;
    baseCurrency: string;
    quoteCurrency: string;
    currentRate: number;
    movementPct: number;
  };
  estimatedRateAfterMove: number;
  assumptions: string[];
  importantNotes: string[];
  disclaimer: string;
}

export interface CommodityMoveScenarioResult {
  kind: "commodity-move";
  summary: string;
  inputs: {
    symbol: string;
    name: string;
    currentValue: number;
    valueLabel: string;
    movementPct: number;
  };
  estimatedValueAfterMove: number;
  estimatedChange: number;
  assumptions: string[];
  importantNotes: string[];
  disclaimer: string;
}

export function calculateFxConversionScenario(
  amount: number,
  fromCurrency: string,
  toCurrency: string,
  rate: number,
  rateLabel: string,
): FxConversionScenarioResult {
  const from = fromCurrency.toUpperCase();
  const to = toCurrency.toUpperCase();
  const convertedAmount =
    from === "KES"
      ? Math.round((amount / rate) * 100) / 100
      : Math.round(amount * rate * 100) / 100;

  return {
    kind: "fx-conversion",
    summary: FX_CONVERSION_SUMMARY,
    inputs: { amount, fromCurrency: from, toCurrency: to, rate, rateLabel },
    convertedAmount,
    assumptions: [...FX_CONVERSION_ASSUMPTIONS],
    importantNotes: [
      "Mid-rate estimate only — bank, forex bureau, and mobile money rates may differ.",
    ],
    disclaimer: STANDARD_DISCLAIMER,
  };
}

export function calculateFxMoveScenario(
  baseCurrency: string,
  quoteCurrency: string,
  currentRate: number,
  movementPct: number,
): FxMoveScenarioResult {
  const pair = `${baseCurrency.toUpperCase()}/${quoteCurrency.toUpperCase()}`;
  const estimatedRateAfterMove =
    Math.round(currentRate * (1 + movementPct / 100) * 10000) / 10000;

  return {
    kind: "fx-move",
    summary: FX_MOVE_SUMMARY,
    inputs: {
      pair,
      baseCurrency: baseCurrency.toUpperCase(),
      quoteCurrency: quoteCurrency.toUpperCase(),
      currentRate,
      movementPct,
    },
    estimatedRateAfterMove,
    assumptions: [...FX_MOVE_ASSUMPTIONS],
    importantNotes: [
      "Rate change is illustrative only — actual market rates can differ.",
    ],
    disclaimer: STANDARD_DISCLAIMER,
  };
}

export function calculateCommodityMoveScenario(
  symbol: string,
  name: string,
  currentValue: number,
  valueLabel: string,
  movementPct: number,
): CommodityMoveScenarioResult {
  const estimatedValueAfterMove =
    Math.round(currentValue * (1 + movementPct / 100) * 100) / 100;
  const estimatedChange =
    Math.round((estimatedValueAfterMove - currentValue) * 100) / 100;

  return {
    kind: "commodity-move",
    summary: COMMODITY_MOVE_SUMMARY,
    inputs: { symbol, name, currentValue, valueLabel, movementPct },
    estimatedValueAfterMove,
    estimatedChange,
    assumptions: [...COMMODITY_MOVE_ASSUMPTIONS],
    importantNotes: [
      "Value change is illustrative only — actual commodity prices can differ.",
    ],
    disclaimer: STANDARD_DISCLAIMER,
  };
}

export function getFxCommodityUserText(
  result: FxConversionScenarioResult | FxMoveScenarioResult | CommodityMoveScenarioResult,
): string {
  const parts = [result.summary, ...result.assumptions, ...result.importantNotes];
  if (result.kind === "fx-conversion") {
    parts.push(String(result.convertedAmount));
  } else if (result.kind === "fx-move") {
    parts.push(String(result.estimatedRateAfterMove));
  } else {
    parts.push(String(result.estimatedValueAfterMove), String(result.estimatedChange));
  }
  return parts.join(" ");
}

export const NEWS_SUMMARY_PREFIX =
  "Based on the available KenyaFundFinder news data, here are matching articles and their stored summaries.";

export const NEWS_SUMMARY_SUFFIX = "It does not predict price movement.";

export const NEWS_IMPORTANT_NOTES = [
  "News data may be incomplete or delayed.",
  "This does not predict price movement.",
  "This is not buy/sell advice.",
  "Article matching is based on available titles, summaries, symbols, and company names. It may miss relevant articles or include broad mentions.",
  "This lists stored summaries only — not a full article analysis.",
] as const;

export interface NewsSummaryArticle {
  title: string;
  source?: string;
  publishedAt?: string;
  snippet?: string;
  url?: string;
  relatedSymbol?: string;
}

export interface NewsSummaryScenarioResult {
  kind: "news-summary";
  summary: string;
  articles: NewsSummaryArticle[];
  possibleRelevance: string[];
  importantNotes: string[];
  disclaimer: string;
}

export function calculateNewsSummaryScenario(
  matched: NewsArticle[],
  meta: { queryLabel: string; relatedSymbol?: string; queryKind: NewsQueryKind },
): NewsSummaryScenarioResult {
  const articles: NewsSummaryArticle[] = matched.map((a) => ({
    title: a.title,
    source: a.source || undefined,
    publishedAt: a.datePublished || undefined,
    snippet: a.summary ? a.summary.slice(0, 500) : undefined,
    url: a.url ?? undefined,
    relatedSymbol: meta.relatedSymbol,
  }));

  const summary =
    meta.queryKind === "explain_news"
      ? `${NEWS_SUMMARY_PREFIX} This lists stored summaries only — not a full article analysis. ${NEWS_SUMMARY_SUFFIX}`
      : `${NEWS_SUMMARY_PREFIX} ${NEWS_SUMMARY_SUFFIX}`;

  const possibleRelevance: string[] = [];
  if (meta.relatedSymbol) {
    possibleRelevance.push(
      "This news may be relevant because it mentions the requested company or ticker in the title or summary.",
    );
  } else if (meta.queryKind === "market_today" || meta.queryKind === "nse_today") {
    possibleRelevance.push(
      "This news may be relevant because it matches today's published articles in the available KenyaFundFinder news data.",
    );
  } else {
    possibleRelevance.push(
      "This news may be relevant because it matches the requested topic in available article titles or summaries.",
    );
  }
  possibleRelevance.push(
    "Possible things to watch include company announcements, regulatory updates, or broader market conditions referenced in the articles.",
  );

  const importantNotes = [...NEWS_IMPORTANT_NOTES];
  if (meta.queryKind === "explain_news") {
    importantNotes.push("This lists stored summaries only — not a full article analysis.");
  }

  return {
    kind: "news-summary",
    summary,
    articles,
    possibleRelevance,
    importantNotes,
    disclaimer: STANDARD_DISCLAIMER,
  };
}

export function getNewsSummaryUserText(result: NewsSummaryScenarioResult): string {
  return [
    result.summary,
    ...result.possibleRelevance,
    ...result.importantNotes,
    ...result.articles.map((a) => [a.title, a.source, a.publishedAt, a.snippet].filter(Boolean).join(" ")),
  ].join(" ");
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

export const GOAL_PROJECTION_SUMMARY =
  "This projection estimates a possible future value from the starting amount, monthly contribution, yield, and time assumptions shown. It does not predict future returns.";

export interface GoalProjectionRow {
  month: number;
  startingValue: number;
  contribution: number;
  estimatedGrowth: number;
  endingValue: number;
}

export interface GoalProjectionResult {
  kind: "goal-projection";
  summary: string;
  inputs: {
    startAmount: number;
    monthlyContribution: number;
    annualYieldPct: number;
    months: number;
  };
  totals: {
    totalContributions: number;
    estimatedGrossGrowth: number;
    estimatedGrossValue: number;
  };
  rows: GoalProjectionRow[];
  assumptions: string[];
  importantNotes: string[];
  disclaimer: string;
}

const roundCurrency = (n: number) => Math.round(n * 100) / 100;

export function getGoalProjectionUserText(result: GoalProjectionResult): string {
  return [result.summary, ...result.assumptions, ...result.importantNotes].join(" ");
}

export function calculateGoalProjectionScenario(
  startAmount: number,
  monthlyContribution: number,
  annualYieldPct: number,
  months: number,
): GoalProjectionResult {
  const monthlyRate = annualYieldPct / 100 / 12;
  let startingValue = startAmount;
  const rows: GoalProjectionRow[] = [];

  for (let month = 1; month <= months; month++) {
    const estimatedGrowth = roundCurrency(startingValue * monthlyRate);
    const endingValue = roundCurrency(
      startingValue + estimatedGrowth + monthlyContribution,
    );
    rows.push({
      month,
      startingValue: roundCurrency(startingValue),
      contribution: monthlyContribution,
      estimatedGrowth,
      endingValue,
    });
    startingValue = endingValue;
  }

  const totalContributions = startAmount + monthlyContribution * months;
  const estimatedGrossValue = rows[rows.length - 1]?.endingValue ?? roundCurrency(startAmount);
  const estimatedGrossGrowth = roundCurrency(estimatedGrossValue - totalContributions);

  return {
    kind: "goal-projection",
    summary: GOAL_PROJECTION_SUMMARY,
    inputs: { startAmount, monthlyContribution, annualYieldPct, months },
    totals: { totalContributions, estimatedGrossGrowth, estimatedGrossValue },
    rows,
    assumptions: [
      "Uses a simple monthly compounding estimate.",
      "Monthly contributions are added at the end of each month.",
      "Yield is assumed to stay constant for the projection period.",
      "Fees, taxes, withdrawals, and changing market conditions are not included.",
      "Actual results can differ.",
    ],
    importantNotes: [
      "This is a projection, not a guarantee.",
      "The calculation does not tell the user where to invest.",
      "A licensed adviser can help with personal financial planning.",
    ],
    disclaimer: STANDARD_DISCLAIMER,
  };
}

import type { ComparableAsset } from "./marketContext";

export const STOCK_AMOUNT_MOVEMENTS = [-10, -5, 0, 5, 10] as const;

export interface StockAmountScenarioRow {
  movementPct: number;
  estimatedPrice: number;
  estimatedValue: number;
  estimatedGainLoss: number;
}

export interface StockAmountScenarioResult {
  kind: "stock-amount";
  summary: string;
  inputs: { amount: number; symbol: string; name: string; latestPrice: number };
  approximateShares: number;
  rows: StockAmountScenarioRow[];
  assumptions: string[];
  importantNotes: string[];
  disclaimer: string;
}

const fmtKESAmount = (n: number) =>
  new Intl.NumberFormat("en-KE", {
    style: "currency",
    currency: "KES",
    maximumFractionDigits: 0,
  }).format(n);

export function getStockAmountUserText(result: StockAmountScenarioResult): string {
  return [result.summary, ...result.assumptions, ...result.importantNotes].join(" ");
}

export const PORTFOLIO_SPLIT_SUMMARY =
  "This is an allocation scenario, not a recommendation. It shows possible outcomes based on the assumptions entered.";

export const PORTFOLIO_SPLIT_IMPORTANT_NOTES = [
  "This is not a recommendation.",
  "Stock values can rise or fall.",
  "MMF yields can change.",
  "Fees, taxes, spreads, and transaction costs are not included unless stated.",
  "This does not predict future returns.",
] as const;

export interface PortfolioSplitScenarioRow {
  stockMovementPct: number;
  mmfEstimatedValue: number;
  stockEstimatedValue: number;
  totalEstimatedValue: number;
  estimatedGainLoss: number;
}

export interface PortfolioSplitScenarioResult {
  kind: "portfolio-split";
  summary: string;
  inputs: {
    totalAmount: number;
    mmfAmount: number;
    stockAmount: number;
    mmfPercent: number;
    stockPercent: number;
    stockSymbol: string;
    stockName: string;
    stockPrice: number;
    annualYieldPct: number;
    projectionMonths: number;
  };
  rows: PortfolioSplitScenarioRow[];
  assumptions: string[];
  importantNotes: string[];
  disclaimer: string;
}

export function getPortfolioSplitUserText(result: PortfolioSplitScenarioResult): string {
  return [result.summary, ...result.assumptions, ...result.importantNotes].join(" ");
}

export function calculatePortfolioSplitScenario(
  params: {
    totalAmount: number;
    mmfPercent: number;
    stockPercent: number;
    stockSymbol: string;
    stockName: string;
    stockPrice: number;
    annualYieldPct: number;
    projectionMonths?: number;
  },
  extraAssumptions: string[] = [],
): PortfolioSplitScenarioResult {
  const projectionMonths = params.projectionMonths ?? 12;
  const mmfAmount = Math.round(params.totalAmount * (params.mmfPercent / 100));
  const stockAmount = params.totalAmount - mmfAmount;
  const mmfGrowthFactor = 1 + (params.annualYieldPct / 100) * (projectionMonths / 12);
  const mmfEstimatedBase = mmfAmount * mmfGrowthFactor;

  const rows: PortfolioSplitScenarioRow[] = STOCK_AMOUNT_MOVEMENTS.map((stockMovementPct) => {
    const stockEstimatedValue = Math.round(stockAmount * (1 + stockMovementPct / 100));
    const mmfEstimatedValue = Math.round(mmfEstimatedBase);
    const totalEstimatedValue = mmfEstimatedValue + stockEstimatedValue;
    return {
      stockMovementPct,
      mmfEstimatedValue,
      stockEstimatedValue,
      totalEstimatedValue,
      estimatedGainLoss: totalEstimatedValue - params.totalAmount,
    };
  });

  return {
    kind: "portfolio-split",
    summary: PORTFOLIO_SPLIT_SUMMARY,
    inputs: {
      totalAmount: params.totalAmount,
      mmfAmount,
      stockAmount,
      mmfPercent: params.mmfPercent,
      stockPercent: params.stockPercent,
      stockSymbol: params.stockSymbol,
      stockName: params.stockName,
      stockPrice: params.stockPrice,
      annualYieldPct: params.annualYieldPct,
      projectionMonths,
    },
    rows,
    assumptions: [
      "MMF side uses gross simple annual yield over the projection period.",
      "Stock side uses price movement assumptions only.",
      "No fees, taxes, spreads, transaction costs, or timing differences are included.",
      ...extraAssumptions,
    ],
    importantNotes: [...PORTFOLIO_SPLIT_IMPORTANT_NOTES],
    disclaimer: STANDARD_DISCLAIMER,
  };
}

export function calculateStockAmountScenario(
  amount: number,
  asset: ComparableAsset,
): StockAmountScenarioResult {
  const latestPrice = asset.value;
  const approximateShares = Math.round((amount / latestPrice) * 100) / 100;
  const rows: StockAmountScenarioRow[] = STOCK_AMOUNT_MOVEMENTS.map((movementPct) => {
    const factor = 1 + movementPct / 100;
    const estimatedPrice = Math.round(latestPrice * factor * 100) / 100;
    const estimatedValue = Math.round(amount * factor);
    return {
      movementPct,
      estimatedPrice,
      estimatedValue,
      estimatedGainLoss: estimatedValue - amount,
    };
  });

  return {
    kind: "stock-amount",
    summary: `This scenario does not predict profit. It shows what ${fmtKESAmount(amount)} exposure to ${asset.symbol} could look like if the share price rises or falls.`,
    inputs: {
      amount,
      symbol: asset.symbol,
      name: asset.name,
      latestPrice,
    },
    approximateShares,
    rows,
    assumptions: [
      "Uses the latest available KenyaFundFinder price.",
      "Fees, taxes, spreads, commissions, and dividends are not included.",
      "Share prices can rise or fall.",
      "This is a scenario, not a prediction.",
      "Actual results can differ because of liquidity, timing, fees, taxes, dividends, and market conditions.",
    ],
    importantNotes: [
      "Approximate shares are illustrative only — fractional lots, board lots, and settlement rules are not modeled.",
      "This assistant cannot place orders or execute trades.",
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
      "The yield you see is usually an annualised effective rate based on recent fund data. For example, if a fund shows an annual yield, the monthly equivalent is often estimated by dividing the annual gross income by 12. Actual results can differ because yields, fees, taxes, and compounding methods can change.",
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
  "dividend-yield": {
    kind: "explainer",
    title: "What is dividend yield?",
    paragraphs: [
      "Dividend yield shows how much a company pays out in dividends each year relative to its share price, usually expressed as a percentage.",
      "It is a snapshot: if the share price moves or the dividend changes, the yield changes too.",
      "Dividend yield is one data point among many — it does not by itself describe total return, growth prospects, or risk.",
    ],
    assumptions: [
      "Not all companies pay dividends.",
      "Past dividends do not guarantee future payments.",
    ],
    disclaimer: STANDARD_DISCLAIMER,
  },
  nav: {
    kind: "explainer",
    title: "What is NAV (net asset value)?",
    paragraphs: [
      "Net asset value (NAV) is the per-unit value of a fund's assets minus its liabilities, usually calculated at the end of each business day.",
      "For unit trusts and money market funds, the price you buy or redeem at is often based on the published NAV.",
      "NAV moves as the underlying holdings change in value and as income accrues inside the fund.",
    ],
    assumptions: [
      "NAV calculation methods can differ slightly between fund managers.",
      "Published NAV may lag intraday market moves for some products.",
    ],
    disclaimer: STANDARD_DISCLAIMER,
  },
  "expense-ratio": {
    kind: "explainer",
    title: "What is an expense ratio?",
    paragraphs: [
      "An expense ratio is the annual fee charged to run a fund, expressed as a percentage of assets under management.",
      "It typically covers management, administration, custody, and other operating costs.",
      "A lower expense ratio leaves more of the fund's return for unit holders, but fees are only one factor when reviewing a fund.",
    ],
    assumptions: [
      "Expense ratios are usually disclosed in factsheets and prospectuses.",
      "Some products also have entry, exit, or performance-related charges outside the headline ratio.",
    ],
    disclaimer: STANDARD_DISCLAIMER,
  },
  compounding: {
    kind: "explainer",
    title: "What is compounding?",
    paragraphs: [
      "Compounding means earning returns on both your original amount and on returns that have already been added.",
      "Over time, compounding can grow a balance faster than simple interest, especially over longer periods.",
      "The effect depends on the rate, how often returns are credited, fees, taxes, and whether you add or withdraw money.",
    ],
    assumptions: [
      "Money market funds may credit income daily while other products compound on different schedules.",
      "Projections that ignore compounding differences may not match actual fund statements.",
    ],
    disclaimer: STANDARD_DISCLAIMER,
  },
  "unit-trust": {
    kind: "explainer",
    title: "What is a unit trust?",
    paragraphs: [
      "A unit trust pools money from many investors into a portfolio managed by a licensed fund manager.",
      "Investors hold units whose value is linked to the fund's net asset value (NAV).",
      "Unit trusts can focus on cash, bonds, equities, or blended strategies — terms, fees, and liquidity vary by fund.",
    ],
    assumptions: [
      "Unit trusts are regulated products but values can still fall.",
      "Read the prospectus for the specific fund's objectives and risks.",
    ],
    disclaimer: STANDARD_DISCLAIMER,
  },
  etf: {
    kind: "explainer",
    title: "What is an ETF?",
    paragraphs: [
      "An exchange-traded fund (ETF) is a fund whose units trade on a stock exchange, similar to shares.",
      "ETFs may track an index, commodity, basket of bonds, or other asset classes depending on the product mandate.",
      "Prices can move during market hours and may differ slightly from the fund's indicative net asset value because of supply and demand.",
    ],
    assumptions: [
      "ETF structures, fees, and tax treatment vary by product and market.",
      "Trading ETFs involves brokerage costs and market-price risk like other listed securities.",
    ],
    disclaimer: STANDARD_DISCLAIMER,
  },
  "capital-gain": {
    kind: "explainer",
    title: "What is a capital gain?",
    paragraphs: [
      "A capital gain is the profit when you sell an asset for more than you paid for it (before fees and taxes).",
      "If you sell for less than you paid, that is a capital loss.",
      "Capital gains are separate from income such as interest or dividends and may be taxed differently depending on the product and law.",
    ],
    assumptions: [
      "Cost basis, holding period, and allowable deductions affect the final gain or loss.",
      WITHHOLDING_TAX_GUARD,
    ],
    disclaimer: STANDARD_DISCLAIMER,
  },
  "downside-risk": {
    kind: "explainer",
    title: "What is downside risk?",
    paragraphs: [
      "Downside risk describes the chance that an investment's value could be lower than expected or fall from your entry point.",
      "Even income-focused products can see lower-than-expected returns if yields fall, fees rise, or market conditions change.",
      "Understanding downside risk helps set expectations — outcomes can be lower than projected and values can fall.",
    ],
    assumptions: [
      "Risk measures differ by asset class and time period.",
      "Past volatility or drawdowns do not cap future losses.",
    ],
    disclaimer: STANDARD_DISCLAIMER,
  },

};

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


export type WebsiteLookupEntityType = "stock" | "fund" | "fx" | "commodity";

export interface WebsiteLookupScenarioResult {
  kind: "website-lookup";
  summary: string;
  entityType: WebsiteLookupEntityType;
  entityName: string;
  entitySymbol?: string;
  fields: Array<{ label: string; value: string }>;
  sourceNote: string;
  pagePath?: string;
  disclaimer: string;
}

export type ScenarioResult =
  | MmfScenarioResult
  | MmfYieldChangeScenarioResult
  | StockMoveScenarioResult
  | MonthlyContributionScenarioResult
  | GoalProjectionResult
  | StockAmountScenarioResult
  | FxConversionScenarioResult
  | FxMoveScenarioResult
  | CommodityMoveScenarioResult
  | NewsSummaryScenarioResult
  | PortfolioSplitScenarioResult
  | ExplainerResult
  | CompareScenarioResult
  | WebsiteLookupScenarioResult;
