import type { NewPortfolioItem } from "@/hooks/usePortfolio";

export interface StarterPortfolio {
  id: string;
  name: string;
  tagline: string;
  description: string;
  emoji: string;
  /**
   * Each entry is a "recipe" that the empty-state UI resolves to a real
   * NewPortfolioItem using current liveAssets data. We keep recipes lean
   * so the catalogue survives changes to specific fund names/yields.
   */
  recipes: StarterRecipe[];
}

export type StarterRecipe =
  | {
      kind: "mmf_top";
      /** filter by yield_unit. "%" / "USD" etc. */
      currency?: string;
      principal: number;
      rank?: number; // 1 = highest published yield in pool, 2 = next, etc.
    }
  | {
      kind: "stock_by_symbol";
      symbol: string;
      units: number;
    }
  | {
      kind: "tbill";
      tenor: "91" | "182" | "364";
      principal: number;
    }
  | {
      kind: "fx";
      currencyCode: string;
      units: number;
    };

export const STARTER_PORTFOLIOS: StarterPortfolio[] = [
  {
    id: "mmf_stack",
    name: "Conservative MMF Stack",
    tagline: "Capital-safe, predictable yield",
    emoji: "🛡️",
    description:
      "Spread KES 100,000 across three Kenyan money market funds with the highest published yields. Daily compounding, T+1 access.",
    recipes: [
      { kind: "mmf_top", currency: "%", principal: 40_000, rank: 1 },
      { kind: "mmf_top", currency: "%", principal: 35_000, rank: 2 },
      { kind: "mmf_top", currency: "%", principal: 25_000, rank: 3 },
    ],
  },
  {
    id: "diaspora_usd",
    name: "Diaspora USD Income",
    tagline: "Earn in dollars from abroad",
    emoji: "🌍",
    description:
      "$5,000 split across two Kenyan USD money market funds with the highest published yields. Earns USD yield and provides shilling-rate exposure.",
    recipes: [
      { kind: "mmf_top", currency: "USD", principal: 3_000, rank: 1 },
      { kind: "mmf_top", currency: "USD", principal: 2_000, rank: 2 },
    ],
  },
  {
    id: "nse_bluechips",
    name: "NSE Bluechip Sampler",
    tagline: "Own a slice of Kenya's biggest names",
    emoji: "📈",
    description:
      "100 shares each of Safaricom, Equity, KCB and EABL — classic NSE bluechips for long-term growth.",
    recipes: [
      { kind: "stock_by_symbol", symbol: "SCOM", units: 100 },
      { kind: "stock_by_symbol", symbol: "EQTY", units: 100 },
      { kind: "stock_by_symbol", symbol: "KCB", units: 100 },
      { kind: "stock_by_symbol", symbol: "EABL", units: 50 },
    ],
  },
  {
    id: "balanced_60_30_10",
    name: "Diversified 60 / 30 / 10",
    tagline: "Yield, growth and T-bills",
    emoji: "⚖️",
    description:
      "60% in the MMF with the highest published yield, 30% in NSE bluechips, 10% in 364-day T-Bill. Mixed allocation across asset classes.",
    recipes: [
      { kind: "mmf_top", currency: "%", principal: 60_000, rank: 1 },
      { kind: "stock_by_symbol", symbol: "SCOM", units: 100 },
      { kind: "stock_by_symbol", symbol: "EQTY", units: 50 },
      { kind: "tbill", tenor: "364", principal: 10_000 },
    ],
  },
];

/**
 * Resolve recipes into concrete NewPortfolioItem rows using the current
 * liveAssets snapshot. Recipes that cannot be matched (e.g. missing symbol)
 * are silently skipped so the pack always loads what it can.
 */
export function resolveStarterPack(
  pack: StarterPortfolio,
  liveAssets:
    | {
        mmf: { name: string; ticker?: string; price: number; yld?: number; fundType?: string }[];
        stock: { name: string; ticker?: string; price: number }[];
        fx: { name: string; ticker?: string; price: number }[];
        fixed_income: { name: string; price: number; yld?: number }[];
      }
    | undefined,
): NewPortfolioItem[] {
  if (!liveAssets) return [];
  const items: NewPortfolioItem[] = [];

  for (const recipe of pack.recipes) {
    if (recipe.kind === "mmf_top") {
      const pool = (liveAssets.mmf || [])
        .filter((m) => {
          const isPct = recipe.currency === "%" || !recipe.currency;
          // MMF currency lives only in the back-end fund row; the live snapshot
          // does not expose it, so we approximate by yield magnitude:
          // KES MMFs are >5%, USD MMFs are <6%. Good enough for a starter pick.
          if (isPct) return (m.yld ?? 0) >= 8;
          return (m.yld ?? 0) < 8 && (m.yld ?? 0) > 0;
        })
        .sort((a, b) => (b.yld ?? 0) - (a.yld ?? 0));
      const idx = Math.max(0, (recipe.rank ?? 1) - 1);
      const match = pool[idx];
      if (!match) continue;
      items.push({
        asset_type: "mmf",
        asset_name: match.name,
        ticker: match.ticker,
        units: 1,
        buy_price: recipe.principal,
        current_price: recipe.principal,
        current_yield: match.yld ?? 15,
      });
    } else if (recipe.kind === "stock_by_symbol") {
      const match = (liveAssets.stock || []).find(
        (s) => (s.ticker || "").toUpperCase() === recipe.symbol.toUpperCase(),
      );
      if (!match || !match.price) continue;
      items.push({
        asset_type: "stock",
        asset_name: match.name,
        ticker: match.ticker,
        units: recipe.units,
        buy_price: match.price,
        current_price: match.price,
        current_yield: 0,
      });
    } else if (recipe.kind === "tbill") {
      const name = `${recipe.tenor}-Day T-Bill`;
      const match = (liveAssets.fixed_income || []).find((f) => f.name === name);
      if (!match) continue;
      items.push({
        asset_type: "fixed_income",
        asset_name: name,
        units: 1,
        buy_price: recipe.principal,
        current_price: recipe.principal,
        current_yield: match.yld ?? 16,
      });
    } else if (recipe.kind === "fx") {
      const match = (liveAssets.fx || []).find((f) =>
        (f.ticker || "").toUpperCase().includes(recipe.currencyCode.toUpperCase()),
      );
      if (!match || !match.price) continue;
      items.push({
        asset_type: "fx",
        asset_name: match.name,
        ticker: match.ticker,
        units: recipe.units,
        buy_price: match.price,
        current_price: match.price,
      });
    }
  }

  return items;
}
