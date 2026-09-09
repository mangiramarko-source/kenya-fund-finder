export const SERVER_FINANCIAL_DISCLAIMER = "Data only. Not personal financial advice.";

export type ComparisonAssetKind = "stock" | "fund" | "commodity" | "fx";

export interface StructuredComparisonAsset {
  kind: ComparisonAssetKind;
  id?: string;
  name: string;
  symbol: string;
  value: number;
  valueLabel: string;
  changePct: number | null;
  extras?: Array<{ label: string; value: string }>;
  aliases: string[];
  updatedAt?: string | null;
  dataUnavailable?: boolean;
}

export interface StructuredComparisonResult {
  kind: "compare";
  assets: StructuredComparisonAsset[];
  diff: Array<{ label: string; value: string }>;
  assumptions: string[];
  warnings: string[];
  disclaimer: string;
}

export interface DeterministicMmfYieldChangeResult {
  kind: "mmf-yield-change";
  summary: string;
  inputs: { amount: number; fromYieldPct: number; toYieldPct: number; months: number };
  fromGrossYearly: number;
  toGrossYearly: number;
  fromMonthly: number;
  toMonthly: number;
  deltaYearly: number;
  deltaMonthly: number;
  percentagePointChange: number;
  relativeYieldChangePct: number | null;
  assumptions: string[];
  disclaimer: string;
}

const formatNumber = (value: number) =>
  new Intl.NumberFormat("en-KE", { maximumFractionDigits: 4 }).format(value);

function validObservationDate(value: string | null | undefined): string | null {
  if (!value) return null;
  const time = Date.parse(value);
  return Number.isFinite(time) ? new Date(time).toISOString().slice(0, 10) : null;
}

export function buildStructuredComparison(
  assets: StructuredComparisonAsset[],
): StructuredComparisonResult {
  const bounded = assets.slice(0, 4);
  const available = bounded.filter((asset) => !asset.dataUnavailable);
  const diff: StructuredComparisonResult["diff"] = [];
  const warnings: string[] = [];
  const base = available[0];

  if (base) {
    for (const asset of available.slice(1)) {
      if (asset.valueLabel !== base.valueLabel) {
        diff.push({
          label: `${asset.symbol} vs ${base.symbol}`,
          value: `Different units (${asset.valueLabel} vs ${base.valueLabel}); no numeric difference calculated.`,
        });
        continue;
      }
      const delta = asset.value - base.value;
      const relative = base.value === 0 ? null : delta / base.value * 100;
      diff.push({
        label: `${asset.symbol} vs ${base.symbol} (${base.valueLabel})`,
        value: `${delta >= 0 ? "+" : ""}${formatNumber(delta)}${relative == null ? "" : ` (${relative >= 0 ? "+" : ""}${relative.toFixed(2)}%)`}`,
      });
      if (base.changePct != null && asset.changePct != null) {
        const gap = asset.changePct - base.changePct;
        diff.push({
          label: `${asset.symbol} vs ${base.symbol} recent-move gap`,
          value: `${gap >= 0 ? "+" : ""}${gap.toFixed(2)} percentage points`,
        });
      }
    }
  }

  for (const asset of bounded) {
    if (asset.dataUnavailable) warnings.push(`${asset.name}: current comparison value is unavailable.`);
    if (!validObservationDate(asset.updatedAt)) warnings.push(`${asset.name}: source timestamp is unavailable.`);
  }
  const datedAssets = bounded
    .map((asset) => ({ asset, date: validObservationDate(asset.updatedAt) }))
    .filter((item): item is { asset: StructuredComparisonAsset; date: string } => item.date != null);
  const dates = [...new Set(datedAssets.map((item) => item.date))];
  if (dates.length > 1) {
    warnings.push(`Values use different observation dates: ${datedAssets.map(({ asset, date }) => `${asset.symbol} ${date}`).join("; ")}.`);
  }

  return {
    kind: "compare",
    assets: bounded,
    diff,
    assumptions: [
      "Values are the latest available server records for each product, not necessarily live tradable quotes.",
      "Cross-category values with different units are shown side by side and are not subtracted.",
      "Missing values remain unavailable; they are never estimated or filled by the language model.",
    ],
    warnings: [...new Set(warnings)],
    disclaimer: SERVER_FINANCIAL_DISCLAIMER,
  };
}

export function calculateDeterministicMmfYieldChange(
  amount: number,
  fromYieldPct: number,
  toYieldPct: number,
  months = 12,
): DeterministicMmfYieldChangeResult {
  const fromGrossYearly = amount * fromYieldPct / 100;
  const toGrossYearly = amount * toYieldPct / 100;
  const fromMonthly = fromGrossYearly / 12;
  const toMonthly = toGrossYearly / 12;
  const deltaYearly = toGrossYearly - fromGrossYearly;
  const percentagePointChange = toYieldPct - fromYieldPct;
  return {
    kind: "mmf-yield-change",
    summary: "This projection compares two annual yield assumptions for the same principal. It does not predict future returns.",
    inputs: { amount, fromYieldPct, toYieldPct, months },
    fromGrossYearly,
    toGrossYearly,
    fromMonthly,
    toMonthly,
    deltaYearly,
    deltaMonthly: toMonthly - fromMonthly,
    percentagePointChange,
    relativeYieldChangePct: fromYieldPct === 0 ? null : percentagePointChange / fromYieldPct * 100,
    assumptions: [
      "Simple annualized gross-income estimate applied to the same principal.",
      `Period shown: ${months} month${months === 1 ? "" : "s"}; annual and monthly equivalents are displayed for comparison.`,
      "Fees, taxes, withholding tax, compounding, reinvestment, deposits, and withdrawals are not included.",
      "Actual fund yields can change and returns are not guaranteed.",
    ],
    disclaimer: SERVER_FINANCIAL_DISCLAIMER,
  };
}
