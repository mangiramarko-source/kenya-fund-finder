import { supabase } from "@/integrations/supabase/client";

export interface FundFromDB {
  id: string;
  slug: string;
  name: string;
  manager: string;
  cma_licensed: boolean;
  annual_yield: number;
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
  content: string | null;
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
    .select("id, slug, name, manager, cma_licensed, annual_yield, minimum_investment, management_fee, withdrawal_time, description, website, fact_sheet_date, source_url, is_published, updated_at")
    .eq("is_published", true)
    .order("annual_yield", { ascending: false });
  if (error) throw error;
  return (data || []).map((f) => ({
    ...f,
    annual_yield: Number(f.annual_yield),
    minimum_investment: Number(f.minimum_investment),
    management_fee: Number(f.management_fee),
  }));
}

export async function fetchFundBySlug(slug: string): Promise<FundFromDB | null> {
  const { data, error } = await supabase
    .from("funds")
    .select("id, slug, name, manager, cma_licensed, annual_yield, minimum_investment, management_fee, withdrawal_time, description, website, fact_sheet_date, source_url, is_published, updated_at")
    .eq("slug", slug)
    .eq("is_published", true)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return {
    ...data,
    annual_yield: Number(data.annual_yield),
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
    .select("id, title, summary, content, source, date_published, url, category, read_time, is_featured, status")
    .eq("status", "published")
    .order("date_published", { ascending: false });
  if (error) throw error;
  return (data || []).map((d: any) => ({
    id: d.id,
    title: d.title,
    summary: d.summary,
    content: d.content || null,
    source: d.source,
    date_published: d.date_published,
    url: d.url,
    category: d.category,
    read_time: d.read_time,
    is_featured: d.is_featured,
    status: d.status,
  }));
}
