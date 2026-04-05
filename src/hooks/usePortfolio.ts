import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

export type AssetType = "mmf" | "stock" | "fx" | "fixed_income" | "commodity";

export interface PortfolioItem {
  id: string;
  user_id: string;
  asset_type: AssetType;
  asset_name: string;
  ticker: string | null;
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
  units: number;
  buy_price: number;
  current_price: number;
  current_yield?: number;
  buy_date?: string;
  notes?: string;
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

/** Cost basis */
export const getCostBasis = (item: PortfolioItem): number => {
  return item.units * item.buy_price;
};

/** PnL */
export const getPnL = (item: PortfolioItem): number => {
  return getCurrentValue(item) - getCostBasis(item);
};

/** PnL percentage */
export const getPnLPercent = (item: PortfolioItem): number => {
  const cost = getCostBasis(item);
  if (cost === 0) return 0;
  return (getPnL(item) / cost) * 100;
};

export const ASSET_TYPE_LABELS: Record<AssetType, string> = {
  mmf: "Unit Trusts (MMFs)",
  stock: "Stocks (NSE)",
  fx: "FX (Currency)",
  fixed_income: "Fixed Income",
  commodity: "Commodities",
};

export const usePortfolio = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: items = [], isLoading } = useQuery({
    queryKey: ["mock_portfolios", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("mock_portfolios")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []) as PortfolioItem[];
    },
    enabled: !!user,
  });

  const addItem = useMutation({
    mutationFn: async (item: NewPortfolioItem) => {
      if (!user) throw new Error("Not authenticated");
      const { error } = await supabase.from("mock_portfolios").insert({
        user_id: user.id,
        ...item,
        current_yield: item.current_yield ?? 0,
        buy_date: item.buy_date ?? new Date().toISOString(),
        notes: item.notes ?? "",
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["mock_portfolios"] });
      toast.success("Investment added");
    },
    onError: () => toast.error("Failed to add investment"),
  });

  const deleteItem = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("mock_portfolios").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["mock_portfolios"] });
      toast.success("Investment removed");
    },
    onError: () => toast.error("Failed to remove investment"),
  });

  // Computed totals
  const totalValue = items.reduce((sum, i) => sum + getCurrentValue(i), 0);
  const totalCost = items.reduce((sum, i) => sum + getCostBasis(i), 0);
  const totalPnL = totalValue - totalCost;
  const totalPnLPercent = totalCost > 0 ? (totalPnL / totalCost) * 100 : 0;

  // Allocation by asset type
  const allocation = items.reduce<Record<AssetType, number>>((acc, item) => {
    const val = getCurrentValue(item);
    acc[item.asset_type] = (acc[item.asset_type] || 0) + val;
    return acc;
  }, {} as Record<AssetType, number>);

  return {
    items,
    isLoading,
    addItem,
    deleteItem,
    totalValue,
    totalCost,
    totalPnL,
    totalPnLPercent,
    allocation,
  };
};
