import { supabase } from "@/integrations/supabase/client";

export interface FundFromDB {
  id: string;
  slug: string;
  name: string;
  manager: string;
  cma_licensed: boolean;
  annual_yield: number;
  seven_day_yield: number;
  thirty_day_yield: number;
  minimum_investment: number;
  management_fee: number;
  withdrawal_time: string;
  description: string;
  website: string;
  fact_sheet_date: string | null;
  source_url: string | null;
  is_published: boolean;
  updated_at: string;
}

export interface NewsFromDB {
  id: string;
  title: string;
  summary: string;
  source: string;
  date_published: string;
  url: string | null;
  category: string;
  read_time: string;
  is_featured: boolean;
  status: string;
}

export interface HistoricalYield {
  month: string;
  yield: number;
}

export async function fetchFunds(): Promise<FundFromDB[]> {
  const { data, error } = await supabase
    .from("funds")
    .select("*")
    .eq("is_published", true)
    .order("annual_yield", { ascending: false });
  if (error) throw error;
  return (data || []).map((f) => ({
    ...f,
    annual_yield: Number(f.annual_yield),
    seven_day_yield: Number(f.seven_day_yield),
    thirty_day_yield: Number(f.thirty_day_yield),
    minimum_investment: Number(f.minimum_investment),
    management_fee: Number(f.management_fee),
  }));
}

export async function fetchFundBySlug(slug: string): Promise<FundFromDB | null> {
  const { data, error } = await supabase
    .from("funds")
    .select("*")
    .eq("slug", slug)
    .eq("is_published", true)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return {
    ...data,
    annual_yield: Number(data.annual_yield),
    seven_day_yield: Number(data.seven_day_yield),
    thirty_day_yield: Number(data.thirty_day_yield),
    minimum_investment: Number(data.minimum_investment),
    management_fee: Number(data.management_fee),
  };
}

export async function fetchHistoricalYields(fundId: string): Promise<HistoricalYield[]> {
  const { data, error } = await supabase
    .from("fund_historical_yields")
    .select("month, yield")
    .eq("fund_id", fundId)
    .order("month");
  if (error) throw error;
  return (data || []).map((y) => ({ month: y.month, yield: Number(y.yield) }));
}

export async function fetchPublishedNews(): Promise<NewsFromDB[]> {
  const { data, error } = await supabase
    .from("news_articles")
    .select("*")
    .eq("status", "published")
    .order("date_published", { ascending: false });
  if (error) throw error;
  return data || [];
}
