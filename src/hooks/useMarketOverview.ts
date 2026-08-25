import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface MarketOverviewMover {
  fact_id: string;
  stock_id: string;
  symbol: string;
  name: string;
  price: number;
  previous_price: number;
  change_percent: number;
  as_of: string;
}

export interface MarketOverviewFxItem {
  fact_id: string;
  currency_code: string;
  currency_name: string;
  rate: number;
  previous_rate: number | null;
  change_percent: number | null;
  as_of: string;
}

export interface MarketOverviewV1 {
  id: string;
  market_date: string;
  generated_at: string;
  source_as_of: string;
  breadth_direction: "rising" | "falling" | "mixed";
  gainers_count: number;
  losers_count: number;
  unchanged_count: number;
  validated_stock_count: number;
  top_gainers: MarketOverviewMover[];
  top_losers: MarketOverviewMover[];
  fx_snapshot: Record<string, MarketOverviewFxItem>;
  optional_markets: Record<string, unknown>;
  news_items: Array<Record<string, unknown>>;
  narrative: string;
}

async function fetchLatestOverview(): Promise<MarketOverviewV1 | null> {
  const { data, error } = await supabase
    .from("market_overviews")
    .select("id,market_date,generated_at,source_as_of,breadth_direction,gainers_count,losers_count,unchanged_count,validated_stock_count,top_gainers,top_losers,fx_snapshot,optional_markets,news_items,narrative")
    .eq("status", "ready")
    .order("market_date", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return data as unknown as MarketOverviewV1;
}

export function useMarketOverview() {
  return useQuery({
    queryKey: ["market-overview", "latest-ready"],
    queryFn: fetchLatestOverview,
    staleTime: 5 * 60_000,
    refetchInterval: 15 * 60_000,
    retry: 1,
  });
}
