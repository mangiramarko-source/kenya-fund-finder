import type { AssetType, LiveAsset, NewPortfolioItem } from "@/hooks/usePortfolio";
import type { OnboardingAsset } from "./OnboardingSetup";

type LiveAssets = Record<AssetType, LiveAsset[]>;

const assetId = (type: string, asset: LiveAsset) => asset.id ?? `${type}:${asset.ticker ?? asset.name}`;

export function buildOnboardingAssets(liveAssets: LiveAssets | undefined): OnboardingAsset[] {
  if (!liveAssets) return [];
  return [
    ...liveAssets.mmf.map((asset) => ({
      id: assetId("fund", asset), databaseId: asset.id, type: "fund" as const, name: asset.name,
      detail: `${asset.yld?.toFixed(2) ?? "—"}% p.a. · ${asset.fundType?.replace(/_/g, " ") ?? "Fund"}`,
      price: asset.price, ticker: asset.ticker, annualYield: asset.yld,
    })),
    ...liveAssets.stock.map((asset) => ({
      id: assetId("stock", asset), databaseId: asset.id, type: "stock" as const, name: asset.name,
      detail: `${asset.ticker ?? "NSE"} · KES ${asset.price.toLocaleString("en-KE")}`,
      price: asset.price, ticker: asset.ticker,
    })),
    ...liveAssets.fx.map((asset) => ({
      id: assetId("currency", asset), databaseId: asset.id, type: "currency" as const, name: asset.name,
      detail: `${asset.ticker ?? "FX"} · KES ${asset.price.toLocaleString("en-KE")}`,
      price: asset.price, ticker: asset.ticker,
    })),
    ...liveAssets.commodity.map((asset) => ({
      id: assetId("commodity", asset), databaseId: asset.id, type: "commodity" as const, name: asset.name,
      detail: `${asset.ticker ?? "Commodity"} · ${asset.price.toLocaleString("en-KE")}`,
      price: asset.price, ticker: asset.ticker,
    })),
    ...liveAssets.fixed_income.map((asset) => ({
      id: assetId("fixed_income", asset), type: "fixed_income" as const, name: asset.name,
      detail: `${asset.yld?.toFixed(2) ?? "—"}% p.a. · Fixed income`,
      price: asset.price, ticker: asset.ticker, annualYield: asset.yld,
    })),
  ];
}

export function portfolioItemFromOnboardingAsset(asset: OnboardingAsset, amount: number): NewPortfolioItem | null {
  if (!Number.isFinite(amount) || amount <= 0) return null;
  const common = { asset_name: asset.name, ticker: asset.ticker, asset_id: asset.databaseId ?? null };
  if (asset.type === "fund" || asset.type === "fixed_income") {
    return { ...common, asset_type: asset.type === "fund" ? "mmf" : "fixed_income", units: 1, buy_price: amount, current_price: amount, current_yield: asset.annualYield ?? 0 };
  }
  if (!asset.price || asset.price <= 0) return null;
  return {
    ...common,
    asset_type: asset.type === "currency" ? "fx" : asset.type,
    units: amount / asset.price,
    buy_price: asset.price,
    current_price: asset.price,
    current_yield: 0,
  };
}

export function watchlistType(asset: OnboardingAsset): "fund" | "stock" | "currency" | "commodity" | null {
  return asset.type === "fixed_income" ? null : asset.type;
}
