import { useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { portfolioStorage } from "@/lib/portfolioStorage";
import { portfolioEventsStorage } from "@/lib/portfolioEventsStorage";

export type AssetType = "mmf" | "stock" | "fx" | "fixed_income" | "commodity";

export interface PortfolioItem {
  id: string;
  user_id: string;
  asset_type: AssetType;
  asset_name: string;
  ticker: string | null;
  /** Canonical id of the underlying fund/stock/fx/commodity. Nullable for legacy rows. */
  asset_id?: string | null;
  units: number;
  buy_price: number;
  current_price: number;
  current_yield: number;
  buy_date: string;
  notes: string;
  created_at: string;
  updated_at: string;
}

export interface NewPortfolioItem {
  asset_type: AssetType;
  asset_name: string;
  ticker?: string;
  asset_id?: string | null;
  units: number;
  buy_price: number;
  current_price: number;
  current_yield?: number;
  buy_date?: string;
  notes?: string;
}

export interface UpdatePortfolioItem {
  asset_name?: string;
  units?: number;
  buy_price?: number;
  current_yield?: number;
  notes?: string;
  buy_date?: string;
}

export interface LiveAsset {
  name: string;
  ticker?: string;
  price: number;
  yld?: number;
  id?: string;
  fundType?: string;
}

/** MMF daily compounding: Value = Principal × (1 + Rate/365)^Days */
export const calcMMFValue = (principal: number, annualRate: number, days: number) => {
  return principal * Math.pow(1 + annualRate / 100 / 365, days);
};

/** Days between two dates */
export const daysBetween = (start: string, end: Date = new Date()) => {
  const s = new Date(start);
  return Math.max(0, Math.floor((end.getTime() - s.getTime()) / (1000 * 60 * 60 * 24)));
};

/** Current value for any asset */
export const getCurrentValue = (item: PortfolioItem): number => {
  if (item.asset_type === "mmf") {
    const days = daysBetween(item.buy_date);
    return calcMMFValue(item.units * item.buy_price, item.current_yield || 15, days);
  }
  return item.units * item.current_price;
};

export const getCostBasis = (item: PortfolioItem): number => item.units * item.buy_price;
export const getPnL = (item: PortfolioItem): number => getCurrentValue(item) - getCostBasis(item);
export const getPnLPercent = (item: PortfolioItem): number => {
  const cost = getCostBasis(item);
  return cost === 0 ? 0 : (getPnL(item) / cost) * 100;
};

export const ASSET_TYPE_LABELS: Record<AssetType, string> = {
  mmf: "Unit Trusts",
  stock: "Stocks (NSE)",
  fx: "FX (Currency)",
  fixed_income: "Fixed Income",
  commodity: "Commodities",
};

/** Fetch live asset lists from DB */
export const useLiveAssets = () => {
  return useQuery({
    queryKey: ["live_assets_for_portfolio"],
    queryFn: async () => {
      const [fundsRes, stocksRes, commoditiesRes, fxRes] = await Promise.all([
        supabase.from("funds_public").select("id, name, slug, annual_yield, daily_yield, fund_type").order("name"),
        supabase.from("stocks_public").select("id, name, symbol, price").order("name"),
        supabase.from("commodities_public").select("id, name, symbol, price, unit").order("name"),
        supabase.from("exchange_rates_public").select("id, currency_code, currency_name, rate").order("sort_order"),
      ]);

      const funds: LiveAsset[] = (fundsRes.data || []).map((f) => ({
        name: f.name || "",
        ticker: f.slug || undefined,
        price: 1,
        yld: Number(f.annual_yield) || 15,
        id: f.id || undefined,
        fundType: (f as any).fund_type || undefined,
      }));

      const stocks: LiveAsset[] = (stocksRes.data || []).map((s) => ({
        name: s.name || "",
        ticker: s.symbol || undefined,
        price: Number(s.price) || 0,
        id: s.id || undefined,
      }));

      const commodities: LiveAsset[] = (commoditiesRes.data || []).map((c) => ({
        name: `${c.name || ""} (${c.unit || "USD"})`,
        ticker: c.symbol || undefined,
        price: Number(c.price) || 0,
        id: c.id || undefined,
      }));

      const fx: LiveAsset[] = (fxRes.data || []).map((r) => ({
        name: `KES / ${r.currency_code || ""}`,
        ticker: `KES/${r.currency_code || ""}`,
        price: Number(r.rate) || 0,
        id: r.id || undefined,
      }));

      const fixedIncome: LiveAsset[] = [
        { name: "91-Day T-Bill", price: 100, yld: 15.8 },
        { name: "182-Day T-Bill", price: 100, yld: 16.2 },
        { name: "364-Day T-Bill", price: 100, yld: 16.5 },
        { name: "2-Year Bond", price: 100, yld: 16.8 },
        { name: "5-Year Bond", price: 100, yld: 17.0 },
        { name: "10-Year Bond", price: 100, yld: 16.0 },
      ];

      return { mmf: funds, stock: stocks, commodity: commodities, fx, fixed_income: fixedIncome } as Record<AssetType, LiveAsset[]>;
    },
    staleTime: 60_000,
  });
};

/** Build a lookup map: ticker/name → live price */
const buildPriceLookup = (liveAssets: Record<AssetType, LiveAsset[]> | undefined) => {
  if (!liveAssets) return new Map<string, { price: number; yld?: number }>();
  const map = new Map<string, { price: number; yld?: number }>();
  for (const [, assets] of Object.entries(liveAssets)) {
    for (const a of assets) {
      if (a.ticker) map.set(a.ticker.toLowerCase(), { price: a.price, yld: a.yld });
      map.set(a.name.toLowerCase(), { price: a.price, yld: a.yld });
    }
  }
  return map;
};

export const usePortfolio = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { data: liveAssets } = useLiveAssets();
  const isDemo = !user;

  // Keep demo data fresh across tabs / programmatic writes (starter packs, etc.)
  useEffect(() => {
    if (!isDemo) return;
    const onChange = () =>
      queryClient.invalidateQueries({ queryKey: ["mock_portfolios", "demo"] });
    window.addEventListener("kff:portfolio:changed", onChange);
    window.addEventListener("storage", onChange);
    return () => {
      window.removeEventListener("kff:portfolio:changed", onChange);
      window.removeEventListener("storage", onChange);
    };
  }, [isDemo, queryClient]);

  const { data: rawItems = [], isLoading } = useQuery({
    queryKey: ["mock_portfolios", user?.id ?? "demo"],
    queryFn: async () => {
      if (!user) return portfolioStorage.list();
      const { data, error } = await supabase
        .from("mock_portfolios")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []) as PortfolioItem[];
    },
  });

  // Enrich items with live prices
  const priceLookup = buildPriceLookup(liveAssets);
  const items: PortfolioItem[] = rawItems.map((item) => {
    if (item.asset_type === "mmf") {
      // For MMFs, update yield from live fund data
      const live = priceLookup.get(item.ticker?.toLowerCase() || "") || priceLookup.get(item.asset_name.toLowerCase());
      if (live?.yld) return { ...item, current_yield: live.yld };
      return item;
    }
    // For stocks, commodities, fx — update current_price from live data
    const live = priceLookup.get(item.ticker?.toLowerCase() || "") || priceLookup.get(item.asset_name.toLowerCase());
    if (live) return { ...item, current_price: live.price };
    return item;
  });

  const addItem = useMutation({
    mutationFn: async (item: NewPortfolioItem) => {
      if (!user) {
        const rec = portfolioStorage.add(item);
        portfolioEventsStorage.record({
          portfolio_holding_id: rec.id,
          asset_id: item.asset_id ?? null,
          asset_type: item.asset_type,
          asset_name: item.asset_name,
          event_type: "add",
          amount: item.units * item.buy_price,
          quantity: item.units,
          note: "",
        });
        return;
      }
      const { data, error } = await supabase
        .from("mock_portfolios")
        .insert({
          user_id: user.id,
          asset_type: item.asset_type,
          asset_name: item.asset_name,
          ticker: item.ticker ?? null,
          asset_id: item.asset_id ?? null,
          units: item.units,
          buy_price: item.buy_price,
          current_price: item.current_price,
          current_yield: item.current_yield ?? 0,
          buy_date: item.buy_date ?? new Date().toISOString(),
          notes: item.notes ?? "",
        })
        .select()
        .single();
      if (error) throw error;
      try {
        await supabase.from("portfolio_events").insert({
          user_id: user.id,
          portfolio_holding_id: data?.id ?? null,
          asset_id: item.asset_id ?? null,
          asset_type: item.asset_type,
          asset_name: item.asset_name,
          event_type: "add",
          amount: item.units * item.buy_price,
          quantity: item.units,
          note: "",
        });
      } catch (e) {
        console.warn("portfolio_events insert failed", e);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["mock_portfolios"] });
      queryClient.invalidateQueries({ queryKey: ["portfolio_events"] });
      toast.success("Holding added");
    },
    onError: () => toast.error("Failed to add holding"),
  });

  const updateItem = useMutation({
    mutationFn: async ({ id, patch, note }: { id: string; patch: UpdatePortfolioItem; note?: string }) => {
      const existing = items.find((i) => i.id === id);
      const nextUnits = patch.units ?? existing?.units ?? 0;
      const nextBuyPrice = patch.buy_price ?? existing?.buy_price ?? 0;
      const nextAmount = nextUnits * nextBuyPrice;

      if (!user) {
        const updated = portfolioStorage.update(id, patch);
        if (updated) {
          portfolioEventsStorage.record({
            portfolio_holding_id: id,
            asset_id: updated.asset_id ?? null,
            asset_type: updated.asset_type,
            asset_name: updated.asset_name,
            event_type: "update",
            amount: nextAmount,
            quantity: nextUnits,
            note: note ?? patch.notes ?? "",
          });
        }
        return;
      }
      const { error } = await supabase
        .from("mock_portfolios")
        .update({
          ...patch,
          updated_at: new Date().toISOString(),
        })
        .eq("id", id);
      if (error) throw error;
      try {
        await supabase.from("portfolio_events").insert({
          user_id: user.id,
          portfolio_holding_id: id,
          asset_id: existing?.asset_id ?? null,
          asset_type: existing?.asset_type ?? "mmf",
          asset_name: patch.asset_name ?? existing?.asset_name ?? "",
          event_type: "update",
          amount: nextAmount,
          quantity: nextUnits,
          note: note ?? patch.notes ?? "",
        });
      } catch (e) {
        console.warn("portfolio_events insert failed", e);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["mock_portfolios"] });
      queryClient.invalidateQueries({ queryKey: ["portfolio_events"] });
      toast.success("Holding updated");
    },
    onError: () => toast.error("Failed to update holding"),
  });

  const deleteItem = useMutation({
    mutationFn: async (id: string) => {
      const existing = items.find((i) => i.id === id);
      const lastAmount = existing ? getCurrentValue(existing) : null;
      if (!user) {
        if (existing) {
          portfolioEventsStorage.record({
            portfolio_holding_id: id,
            asset_id: existing.asset_id ?? null,
            asset_type: existing.asset_type,
            asset_name: existing.asset_name,
            event_type: "remove",
            amount: lastAmount,
            quantity: existing.units,
            note: "",
          });
        }
        portfolioStorage.remove(id);
        return;
      }
      // Record event BEFORE delete so we keep last-known asset metadata.
      if (existing) {
        try {
          await supabase.from("portfolio_events").insert({
            user_id: user.id,
            portfolio_holding_id: id,
            asset_id: existing.asset_id ?? null,
            asset_type: existing.asset_type,
            asset_name: existing.asset_name,
            event_type: "remove",
            amount: lastAmount,
            quantity: existing.units,
            note: "",
          });
        } catch (e) {
          console.warn("portfolio_events insert failed", e);
        }
      }
      const { error } = await supabase.from("mock_portfolios").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["mock_portfolios"] });
      queryClient.invalidateQueries({ queryKey: ["portfolio_events"] });
      toast.success("Holding removed");
    },
    onError: () => toast.error("Failed to remove holding"),
  });

  const totalValue = items.reduce((sum, i) => sum + getCurrentValue(i), 0);
  const totalCost = items.reduce((sum, i) => sum + getCostBasis(i), 0);
  const totalPnL = totalValue - totalCost;
  const totalPnLPercent = totalCost > 0 ? (totalPnL / totalCost) * 100 : 0;

  const allocation = items.reduce<Record<AssetType, number>>((acc, item) => {
    const val = getCurrentValue(item);
    acc[item.asset_type] = (acc[item.asset_type] || 0) + val;
    return acc;
  }, {} as Record<AssetType, number>);

  return { items, isLoading, addItem, deleteItem, totalValue, totalCost, totalPnL, totalPnLPercent, allocation, isDemo };
};
