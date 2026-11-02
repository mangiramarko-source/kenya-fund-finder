import { type PublicStock } from "@/lib/api";

export type Tone = "positive" | "negative" | "neutral";

export interface Metric {
  label: string;
  value: string;
  tone?: Tone;
}

export interface MarketContextSnapshotProps {
  title?: string;
  description?: string;
  href?: string;
  metrics: Metric[];
}

export interface MarketSnapshotAsset {
  id?: string;
  symbol?: string;
  name?: string;
  price?: number;
  previousPrice?: number | null;
  previous_price?: number | null;
  changePercent?: number;
  day_change_percent?: number;
  yield?: number;
  annualYield?: number;
  rate?: number;
  unit?: string;
  slug?: string;
  pair?: string;
}

export const formatPercent = (value: number) => `${value >= 0 ? "+" : ""}${value.toFixed(2)}%`;

export const movementTone = (value: number): Tone => {
  if (value > 0) return "positive";
  if (value < 0) return "negative";
  return "neutral";
};

export function buildStockMarketContext(stock?: PublicStock | MarketSnapshotAsset | null): MarketContextSnapshotProps | null {
  if (!stock) return null;
  const price = Number(stock.price) || 0;
  const change = Number("day_change_percent" in stock ? stock.day_change_percent : stock.changePercent) || 0;
  const previousPrice = "previous_price" in stock ? stock.previous_price : stock.previousPrice;
  const metrics: Metric[] = [
    { label: "Latest price", value: `KES ${price.toFixed(2)}` },
    { label: "1D move", value: formatPercent(change), tone: movementTone(change) },
  ];
  if (previousPrice != null) {
    metrics.push({ label: "Previous", value: `KES ${Number(previousPrice).toFixed(2)}` });
  }
  return {
    title: `${stock.symbol || "Stock"} market context`,
    description: "Separate from the article: latest linked stock data already available on Kenya Fund Finder.",
    href: stock.symbol ? `/stocks/${stock.symbol}` : undefined,
    metrics,
  };
}

export function buildMmfMarketContext(mmf?: MarketSnapshotAsset | null): MarketContextSnapshotProps | null {
  if (!mmf) return null;
  const annualYield = Number(mmf.annualYield ?? mmf.yield) || 0;
  const change = Number(mmf.changePercent) || 0;
  return {
    title: `${mmf.name || "MMF"} market context`,
    description: "Separate from the article: current fund data already available on Kenya Fund Finder.",
    href: mmf.slug ? `/compare/${mmf.slug}` : undefined,
    metrics: [
      { label: "Annual yield", value: `${annualYield.toFixed(2)}%` },
      { label: "Yield move", value: formatPercent(change), tone: movementTone(change) },
    ],
  };
}

export function buildFxMarketContext(fx?: MarketSnapshotAsset | null): MarketContextSnapshotProps | null {
  if (!fx) return null;
  const change = Number(fx.changePercent) || 0;
  return {
    title: `${fx.pair || "FX"} market context`,
    description: "Separate from the article: latest exchange-rate data already available on Kenya Fund Finder.",
    href: "/rates",
    metrics: [
      { label: "Latest rate", value: `KES ${(Number(fx.rate) || 0).toFixed(2)}` },
      { label: "Move", value: formatPercent(change), tone: movementTone(change) },
    ],
  };
}

export function buildCommodityMarketContext(commodity?: MarketSnapshotAsset | null): MarketContextSnapshotProps | null {
  if (!commodity) return null;
  const change = Number(commodity.changePercent) || 0;
  return {
    title: `${commodity.name || "Commodity"} market context`,
    description: "Separate from the article: latest commodity data already available on Kenya Fund Finder.",
    href: "/commodities",
    metrics: [
      { label: "Latest price", value: `${(Number(commodity.price) || 0).toFixed(2)} ${commodity.unit || ""}`.trim() },
      { label: "Move", value: formatPercent(change), tone: movementTone(change) },
    ],
  };
}
