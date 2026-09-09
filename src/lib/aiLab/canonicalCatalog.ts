import type { ComparableAsset, MarketContext } from "./marketContext";
import type { CanonicalFinancialEntity, CanonicalEntityKind } from "../../../supabase/functions/_shared/universal-query";

const STATIC_ENTITIES: CanonicalFinancialEntity[] = [
  { id: "calculator:investment", kind: "calculator", subtype: "investment", displayLabel: "Investment calculator", sourceKey: "investment", aliases: ["returns calculator", "compound interest", "investment projection"] },
  { id: "calculator:currency", kind: "calculator", subtype: "currency", displayLabel: "Currency converter", sourceKey: "currency", aliases: ["fx calculator", "convert currency", "exchange calculator"] },
  { id: "calculator:paye", kind: "calculator", subtype: "tax", displayLabel: "PAYE calculator", sourceKey: "paye", aliases: ["salary tax", "income tax calculator"] },
  { id: "portfolio:holdings", kind: "portfolio", subtype: "holdings", displayLabel: "Portfolio holdings", sourceKey: "portfolio", aliases: ["my investments", "holdings", "portfolio"] },
  { id: "portfolio:watchlist", kind: "portfolio", subtype: "watchlist", displayLabel: "Watchlist", sourceKey: "watchlist", aliases: ["favourites", "favorites", "saved investments"] },
  { id: "news:markets", kind: "news_topic", subtype: "market_news", displayLabel: "Market news", sourceKey: "market-news", aliases: ["latest market news", "headlines", "market updates"] },
  { id: "topic:money-market-funds", kind: "market_topic", subtype: "education", displayLabel: "Money market funds", sourceKey: "money-market-funds", aliases: ["mmf", "mmfs", "money market", "unit trust"] },
  { id: "topic:stocks", kind: "market_topic", subtype: "education", displayLabel: "NSE stocks", sourceKey: "stocks", aliases: ["shares", "equities", "nse"] },
  { id: "topic:fx", kind: "market_topic", subtype: "education", displayLabel: "Foreign exchange", sourceKey: "fx", aliases: ["forex", "currency rates", "exchange rates"] },
  { id: "topic:commodities", kind: "market_topic", subtype: "education", displayLabel: "Commodities", sourceKey: "commodities", aliases: ["commodity prices"] },
];

function extra(asset: ComparableAsset, label: string): string | undefined {
  return asset.extras?.find((item) => item.label.toLowerCase() === label.toLowerCase())?.value;
}

export function canonicalIdForAsset(asset: Pick<ComparableAsset, "kind" | "id" | "symbol">): string {
  return `${asset.kind}:${asset.id ?? asset.symbol.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
}

export function canonicalEntityFromAsset(asset: ComparableAsset): CanonicalFinancialEntity {
  const subtype = asset.kind === "fund"
    ? extra(asset, "Fund type")?.toLowerCase().replace(/\s+/g, "_")
    : undefined;
  const manager = asset.kind === "fund" ? extra(asset, "Manager") : undefined;
  return {
    id: canonicalIdForAsset(asset),
    kind: asset.kind,
    subtype,
    displayLabel: asset.name,
    shortLabel: asset.kind === "stock" || asset.kind === "fx" || asset.kind === "commodity" ? asset.symbol : undefined,
    sourceKey: asset.symbol,
    sourceId: asset.id,
    manager,
    market: asset.kind === "stock" ? "NSE" : asset.kind === "fx" ? "KES" : undefined,
    aliases: [...new Set([asset.symbol, asset.name, manager ?? "", ...asset.aliases].filter(Boolean))],
  };
}

export function buildCanonicalCatalog(ctx: MarketContext | null): CanonicalFinancialEntity[] {
  const live = (ctx?.assets ?? []).map(canonicalEntityFromAsset);
  return [...live, ...STATIC_ENTITIES];
}

export interface SearchCatalogInput {
  id: string;
  kind: CanonicalEntityKind;
  subtype?: string;
  label: string;
  sourceKey: string;
  aliases?: Array<string | null | undefined>;
  manager?: string | null;
  market?: string;
}

export function canonicalEntityFromSearch(input: SearchCatalogInput): CanonicalFinancialEntity {
  return {
    id: `${input.kind}:${input.id}`,
    kind: input.kind,
    subtype: input.subtype,
    displayLabel: input.label,
    shortLabel: input.sourceKey,
    sourceKey: input.sourceKey,
    sourceId: input.id,
    manager: input.manager ?? undefined,
    market: input.market,
    aliases: [...new Set([input.label, input.sourceKey, input.manager ?? "", ...(input.aliases ?? [])].filter((value): value is string => Boolean(value)))],
  };
}

export function findMarketAssetByCanonicalId(
  canonicalId: string,
  ctx: MarketContext | null,
): ComparableAsset | null {
  return (ctx?.assets ?? []).find((asset) => canonicalIdForAsset(asset) === canonicalId) ?? null;
}
