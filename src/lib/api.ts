import { supabase } from "@/integrations/supabase/client";

export type FundType = "money_market" | "fixed_income" | "balanced" | "equity" | "bond";

export const FUND_TYPE_LABELS: Record<FundType, string> = {
  money_market: "Money Market Fund",
  fixed_income: "Fixed Income Fund",
  balanced: "Balanced Fund",
  equity: "Equity Fund",
  bond: "Bond Fund",
};

export interface FundFromDB {
  id: string;
  slug: string;
  name: string;
  manager: string;
  cma_licensed: boolean;
  annual_yield: number;
  daily_yield: number;
  seven_day_yield: number;
  thirty_day_yield: number;
  fund_type: FundType;
  minimum_investment: number;
  management_fee: number;
  withdrawal_time: string;
  description: string;
  website: string;
  fact_sheet_date: string | null;
  yield_unit: string;
  is_published: boolean;
  updated_at: string;
}

export const YIELD_UNITS = ["%", "KES", "USD", "GBP"] as const;
export type YieldUnit = typeof YIELD_UNITS[number];

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
  image_url: string | null;
}

export interface HistoricalYield {
  month: string;
  yield: number;
}

export interface YieldSnapshot {
  fund_id: string;
  annual_yield: number;
  daily_yield: number;
  snapshot_date: string;
}

export async function fetchFunds(): Promise<FundFromDB[]> {
  const { data, error } = await supabase
    .from("funds_public")
    .select("id, slug, name, manager, cma_licensed, annual_yield, daily_yield, seven_day_yield, thirty_day_yield, fund_type, minimum_investment, management_fee, withdrawal_time, description, website, fact_sheet_date, yield_unit, is_published, updated_at")
    .order("annual_yield", { ascending: false });
  if (error) throw error;
  return (data || []).map((f) => ({
    ...f,
    fund_type: (f.fund_type || "money_market") as FundType,
    yield_unit: f.yield_unit || "%",
    annual_yield: Number(f.annual_yield),
    daily_yield: Number(f.daily_yield),
    seven_day_yield: Number(f.seven_day_yield),
    thirty_day_yield: Number(f.thirty_day_yield),
    minimum_investment: Number(f.minimum_investment),
    management_fee: Number(f.management_fee),
  }));
}

export async function fetchFundBySlug(slug: string): Promise<FundFromDB | null> {
  const { data, error } = await supabase
    .from("funds_public")
    .select("id, slug, name, manager, cma_licensed, annual_yield, daily_yield, seven_day_yield, thirty_day_yield, fund_type, minimum_investment, management_fee, withdrawal_time, description, website, fact_sheet_date, yield_unit, is_published, updated_at")
    .eq("slug", slug)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return {
    ...data,
    fund_type: (data.fund_type || "money_market") as FundType,
    yield_unit: data.yield_unit || "%",
    annual_yield: Number(data.annual_yield),
    daily_yield: Number(data.daily_yield),
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

export async function fetchNewsById(id: string): Promise<NewsFromDB | null> {
  const { data, error } = await supabase
    .from("news_articles_public")
    .select("id, title, summary, content, source, date_published, url, category, read_time, is_featured, status, image_url")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return {
    id: data.id!,
    title: data.title!,
    summary: data.summary!,
    content: data.content || null,
    source: data.source!,
    date_published: data.date_published!,
    url: data.url || null,
    category: data.category!,
    read_time: data.read_time!,
    is_featured: data.is_featured!,
    status: data.status!,
    image_url: (data as any).image_url || null,
  };
}

export async function fetchRelatedNews(category: string, excludeId: string, limit = 3): Promise<NewsFromDB[]> {
  const { data, error } = await supabase
    .from("news_articles_public")
    .select("id, title, summary, content, source, date_published, url, category, read_time, is_featured, status, image_url")
    .eq("category", category)
    .neq("id", excludeId)
    .order("date_published", { ascending: false })
    .limit(limit);
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
    image_url: d.image_url || null,
  }));
}

/** Lightweight news preview fetch (no `content` body) for homepage/sidebar lists. */
export async function fetchLatestNewsPreview(limit = 4): Promise<NewsFromDB[]> {
  const { data, error } = await supabase
    .from("news_articles_public")
    .select("id, title, summary, source, date_published, url, category, read_time, is_featured, status, image_url")
    .order("date_published", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data || []).map((d: any) => ({
    id: d.id,
    title: d.title,
    summary: d.summary,
    content: null,
    source: d.source,
    date_published: d.date_published,
    url: d.url,
    category: d.category,
    read_time: d.read_time,
    is_featured: d.is_featured,
    status: d.status,
    image_url: d.image_url || null,
  }));
}

export async function fetchPublishedNews(): Promise<NewsFromDB[]> {
  const { data, error } = await supabase
    .from("news_articles_public")
    .select("id, title, summary, content, source, date_published, url, category, read_time, is_featured, status, image_url")
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
    image_url: d.image_url || null,
  }));
}

/** Fetch the most recent yield snapshot for each fund (previous values before last update) */
export async function fetchLatestSnapshots(): Promise<YieldSnapshot[]> {
  const { data, error } = await supabase
    .from("fund_yield_snapshots")
    .select("fund_id, annual_yield, daily_yield, snapshot_date")
    .order("snapshot_date", { ascending: false })
    .limit(500);
  if (error) throw error;
  // Deduplicate: keep only the latest snapshot per fund
  const seen = new Set<string>();
  const result: YieldSnapshot[] = [];
  for (const row of data || []) {
    if (!seen.has(row.fund_id)) {
      seen.add(row.fund_id);
      result.push({
        fund_id: row.fund_id,
        annual_yield: Number(row.annual_yield),
        daily_yield: Number(row.daily_yield),
        snapshot_date: row.snapshot_date,
      });
    }
  }
  return result;
}

/** Fetch all yield snapshots for a specific fund */
export async function fetchFundSnapshots(fundId: string): Promise<YieldSnapshot[]> {
  const { data, error } = await supabase
    .from("fund_yield_snapshots")
    .select("fund_id, annual_yield, daily_yield, snapshot_date")
    .eq("fund_id", fundId)
    .order("snapshot_date", { ascending: false });
  if (error) throw error;
  return (data || []).map((row) => ({
    fund_id: row.fund_id,
    annual_yield: Number(row.annual_yield),
    daily_yield: Number(row.daily_yield),
    snapshot_date: row.snapshot_date,
  }));
}

/** Fetch recent yield snapshots for all funds (for sparklines) */
export async function fetchAllFundSnapshots(): Promise<Record<string, YieldSnapshot[]>> {
  const { data, error } = await supabase
    .from("fund_yield_snapshots")
    .select("fund_id, annual_yield, daily_yield, snapshot_date")
    .order("snapshot_date", { ascending: true })
    .limit(1000);
  if (error) throw error;
  const grouped: Record<string, YieldSnapshot[]> = {};
  for (const row of data || []) {
    const snap: YieldSnapshot = {
      fund_id: row.fund_id,
      annual_yield: Number(row.annual_yield),
      daily_yield: Number(row.daily_yield),
      snapshot_date: row.snapshot_date,
    };
    if (!grouped[row.fund_id]) grouped[row.fund_id] = [];
    grouped[row.fund_id].push(snap);
  }
  return grouped;
}
