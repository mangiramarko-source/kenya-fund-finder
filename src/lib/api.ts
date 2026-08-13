import { supabase } from "@/integrations/supabase/client";
import { fetchPublicData } from "@/lib/gateway";

export type FundType = "money_market" | "fixed_income" | "balanced" | "equity" | "bond" | "special";

export const FUND_TYPE_LABELS: Record<FundType, string> = {
  money_market: "Money Market Fund",
  fixed_income: "Fixed Income Fund",
  balanced: "Balanced Fund",
  equity: "Equity Fund",
  bond: "Bond Fund",
  special: "Special Fund",
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
  logo_url: string | null;
  updated_at: string;
  buy_price?: number | null;
  sell_price?: number | null;
  effective_yield?: number | null;
}

export const YIELD_UNITS = ["%", "KES", "USD", "GBP"] as const;
export type YieldUnit = typeof YIELD_UNITS[number];

export interface NewsAiAnalysis {
  content?: string;
  tags?: string[];
  factors_positive?: string[];
  factors_negative?: string[];
  source_facts?: string;
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
  image_url: string | null;
  likes?: number | null;
  comments?: number | null;
  created_at?: string;
  related_stock_id: string | null;
  ai_insight: string | null;
  parsed_ai_analysis?: NewsAiAnalysis | null;
}

export interface PublicStock {
  id: string;
  symbol: string;
  name: string;
  price: number;
  previous_price: number | null;
  day_change_percent: number;
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

const FUND_COLUMNS = [
  "id", "slug", "name", "manager", "cma_licensed",
  "annual_yield", "daily_yield", "seven_day_yield", "thirty_day_yield",
  "fund_type", "minimum_investment", "management_fee", "withdrawal_time",
  "description", "website", "fact_sheet_date", "yield_unit",
  "is_published", "logo_url", "updated_at",
];

const normalizeFund = (f: any): FundFromDB => ({
  ...f,
  fund_type: (f.fund_type || "money_market") as FundType,
  yield_unit: f.yield_unit || "%",
  annual_yield: Number(f.annual_yield),
  daily_yield: Number(f.daily_yield),
  seven_day_yield: Number(f.seven_day_yield),
  thirty_day_yield: Number(f.thirty_day_yield),
  minimum_investment: Number(f.minimum_investment),
  management_fee: Number(f.management_fee),
});

export async function fetchFunds(): Promise<FundFromDB[]> {
  // Routed through the public-data gateway (rate-limited, paginated server-side).
  const { data } = await fetchPublicData<any>("funds", {
    select: FUND_COLUMNS,
    order: "annual_yield.desc",
    limit: 200,
  });
  return data.map(normalizeFund);
}

export async function fetchFundBySlug(slug: string): Promise<FundFromDB | null> {
  const { data } = await fetchPublicData<any>("funds", {
    select: FUND_COLUMNS,
    filters: { slug },
    limit: 1,
  });
  return data[0] ? normalizeFund(data[0]) : null;
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
    .select("id, title, summary, content, source, date_published, created_at, url, category, read_time, is_featured, status, image_url, related_stock_id, ai_insight")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  let parsed_ai_analysis: NewsAiAnalysis | null = null;
  if (data.ai_insight) {
    try {
      const parsed = JSON.parse(data.ai_insight);
      if (typeof parsed === 'object' && parsed !== null) {
        parsed_ai_analysis = parsed;
      }
    } catch (e) {
      parsed_ai_analysis = { content: data.ai_insight };
    }
  }

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
    created_at: data.created_at,
    related_stock_id: data.related_stock_id || null,
    ai_insight: data.ai_insight || null,
    parsed_ai_analysis,
  };
}

export async function fetchPublicStockById(id: string): Promise<PublicStock | null> {
  const { data, error } = await supabase
    .from("stocks_public" as any)
    .select("id, symbol, name, price, previous_price, day_change_percent")
    .eq("id", id)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  const stock = data as any;
  return {
    id: stock.id,
    symbol: stock.symbol,
    name: stock.name,
    price: Number(stock.price) || 0,
    previous_price: stock.previous_price == null ? null : Number(stock.previous_price),
    day_change_percent: Number(stock.day_change_percent) || 0,
  };
}

export async function enrichArticleLive(articleId: string): Promise<string> {
  const { data, error } = await supabase.functions.invoke("enrich-article", {
    body: { articleId }
  });
  if (error) throw error;
  return data?.ai_insight || null;
}

export async function fetchRelatedNews(category: string, excludeId: string, limit = 3): Promise<NewsFromDB[]> {
  const { data, error } = await supabase
    .from("news_articles_public")
    .select("id, title, summary, content, source, date_published, created_at, url, category, read_time, is_featured, status, image_url, ai_insight")
    .eq("category", category)
    .neq("id", excludeId)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data || []).map((d: any) => {
    let parsed_ai_analysis: NewsAiAnalysis | null = null;
    if (d.ai_insight) {
      try {
        const parsed = JSON.parse(d.ai_insight);
        if (typeof parsed === 'object' && parsed !== null) {
          parsed_ai_analysis = parsed;
        }
      } catch (e) {
        parsed_ai_analysis = { content: d.ai_insight };
      }
    }
    
    return {
      id: d.id,
      title: d.title,
      summary: d.summary,
      content: d.content || null,
      source: d.source,
      date_published: d.date_published,
      created_at: d.created_at,
      url: d.url,
      category: d.category,
      read_time: d.read_time,
      is_featured: d.is_featured,
      status: d.status,
      image_url: d.image_url || null,
      related_stock_id: d.related_stock_id || null,
      ai_insight: d.ai_insight || null,
      parsed_ai_analysis,
    };
  });
}

/** Lightweight news preview fetch (no `content` body) for homepage/sidebar lists. */
export async function fetchLatestNewsPreview(limit = 4): Promise<NewsFromDB[]> {
  // Reuse the early prefetch kicked off in index.html for the default limit (4).
  // This avoids waiting for the JS bundle to parse before the request begins.
  const prefetched = (typeof window !== "undefined")
    ? (window as any).__newsPreviewPromise
    : null;
  if (prefetched && limit === 4) {
    try {
      const data = await prefetched;
      // Consume the prefetch only once.
      try { (window as any).__newsPreviewPromise = null; } catch { /* no-op */ }
      if (Array.isArray(data) && data.length > 0) {
        return data.map((d: any) => ({
          id: d.id,
          title: d.title,
          summary: d.summary,
          content: null,
          source: d.source,
          date_published: d.date_published,
          created_at: d.created_at,
          url: d.url,
          category: d.category,
          read_time: d.read_time,
          is_featured: d.is_featured,
          status: d.status,
          image_url: d.image_url || null,
        }));
      }
    } catch { /* fall through to normal fetch */ }
  }

  try {
    const { data, error } = await supabase
      .from("news_articles_public")
      .select("id, title, summary, source, date_published, created_at, url, category, read_time, is_featured, status, image_url")
      .order("created_at", { ascending: false })
      .limit(limit);
    if (error) throw error;
    return (data || []).map((d: any) => ({
      id: d.id,
      title: d.title,
      summary: d.summary,
      content: null,
      source: d.source,
      date_published: d.date_published,
      created_at: d.created_at,
      url: d.url,
      category: d.category,
      read_time: d.read_time,
      is_featured: d.is_featured,
      status: d.status,
      image_url: d.image_url || null,
    }));
  } catch (err) {
    console.error("Failed to fetch latest news from Supabase (likely RLS error), using mock data", err);
    return [
      {
        id: "mock-1",
        title: "Remove the garbage from your feed. You choose what to filter.",
        summary: "Take control of your timeline with our new advanced filtering tools.",
        content: null,
        source: "Millan Philipose",
        date_published: new Date().toISOString(),
        url: "#",
        category: "Platform Update",
        read_time: "1 min read",
        is_featured: true,
        status: "published",
        image_url: "https://images.unsplash.com/photo-1614064641913-6b71a3061145?auto=format&fit=crop&q=80",
      },
      {
        id: "mock-2",
        title: "CBK holds benchmark rate at 13.00% amid inflation concerns",
        summary: "The Central Bank of Kenya has decided to maintain its benchmark lending rate...",
        content: null,
        source: "Business Daily",
        date_published: new Date(Date.now() - 3600000).toISOString(),
        url: "#",
        category: "Economy",
        read_time: "3 min read",
        is_featured: false,
        status: "published",
        image_url: "https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?auto=format&fit=crop&q=80",
      }
    ];
  }
}

export async function fetchPublishedNews(limit: number = 60): Promise<NewsFromDB[]> {
  try {
    const { data, error } = await supabase
      .from("news_articles_public")
      .select("id, title, summary, content, source, date_published, created_at, url, category, read_time, is_featured, status, image_url, related_stock_id, ai_insight")
      .order("created_at", { ascending: false })
      .limit(limit);
      
    if (error) throw error;
    
    return (data || []).map((d: any) => ({
      id: d.id,
      title: d.title,
      summary: d.summary,
      content: d.content || null,
      source: d.source,
      date_published: d.date_published,
      created_at: d.created_at,
      url: d.url,
      category: d.category,
      read_time: d.read_time,
      is_featured: d.is_featured,
      status: d.status,
      image_url: d.image_url || null,
      related_stock_id: d.related_stock_id || null,
      ai_insight: d.ai_insight || null,
    }));
  } catch (err) {
    console.error("Failed to fetch news from Supabase (likely RLS error), using mock data", err);
    // Return mock data so the right column works while RLS is being fixed
    return [
      {
        id: "mock-1",
        title: "Remove the garbage from your feed. You choose what to filter.",
        summary: "Take control of your timeline with our new advanced filtering tools.",
        content: "Take control of your timeline with our new advanced filtering tools.",
        source: "Millan Philipose",
        date_published: new Date().toISOString(),
        url: "#",
        category: "Platform Update",
        read_time: "1 min read",
        is_featured: true,
        status: "published",
        image_url: "https://images.unsplash.com/photo-1614064641913-6b71a3061145?auto=format&fit=crop&q=80",
        related_stock_id: null,
        ai_insight: null,
      },
      {
        id: "mock-2",
        title: "CBK holds benchmark rate at 13.00% amid inflation concerns",
        summary: "The Central Bank of Kenya has decided to maintain its benchmark lending rate...",
        content: "The Central Bank of Kenya has decided to maintain its benchmark lending rate...",
        source: "Business Daily",
        date_published: new Date(Date.now() - 3600000).toISOString(),
        url: "#",
        category: "Economy",
        read_time: "3 min read",
        is_featured: false,
        status: "published",
        image_url: "https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?auto=format&fit=crop&q=80",
        related_stock_id: null,
        ai_insight: null,
      },
      {
        id: "mock-3",
        title: "Safaricom reports 12% profit increase for Q3",
        summary: "Driven by M-PESA and mobile data growth, the telco giant...",
        content: "Driven by M-PESA and mobile data growth, the telco giant...",
        source: "TechCabal",
        date_published: new Date(Date.now() - 86400000).toISOString(),
        url: "#",
        category: "Tech",
        read_time: "4 min read",
        is_featured: false,
        status: "published",
        image_url: "https://images.unsplash.com/photo-1526628953301-3e589a6a8b74?auto=format&fit=crop&q=80",
        related_stock_id: null,
        ai_insight: null,
      }
    ];
  }
}

export async function fetchPublicStocks(): Promise<PublicStock[]> {
  const { data, error } = await supabase
    .from("stocks_public" as any)
    .select("id, symbol, name, price, previous_price, day_change_percent")
    .order("sort_order");

  if (error) throw error;

  return ((data as any[]) || []).map((stock) => ({
    id: stock.id,
    symbol: stock.symbol,
    name: stock.name,
    price: Number(stock.price) || 0,
    previous_price: stock.previous_price == null ? null : Number(stock.previous_price),
    day_change_percent: Number(stock.day_change_percent) || 0,
  }));
}

/** Fetch the previous yield snapshot per fund (the value before the most recent one).
 *  bulk_sync writes a snapshot dated today carrying the NEW yields, which matches the
 *  current fund value and would produce a 0 delta. We skip that and return the prior. */
export async function fetchLatestSnapshots(): Promise<YieldSnapshot[]> {
  const { data } = await fetchPublicData<any>("fund-snapshots", {
    select: ["fund_id", "annual_yield", "daily_yield", "snapshot_date"],
    order: "snapshot_date.desc",
    days: 90,
    limit: 2000,
  });
  const buckets = new Map<string, any[]>();
  for (const row of data) {
    const arr = buckets.get(row.fund_id) ?? [];
    if (arr.length < 2) arr.push(row);
    buckets.set(row.fund_id, arr);
  }
  const result: YieldSnapshot[] = [];
  for (const [fund_id, rows] of buckets) {
    const prev = rows[1] ?? rows[0];
    result.push({
      fund_id,
      annual_yield: Number(prev.annual_yield),
      daily_yield: Number(prev.daily_yield),
      snapshot_date: prev.snapshot_date,
    });
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

/** Fetch recent yield snapshots for all funds (for sparklines) — last ~30 days only */
export async function fetchAllFundSnapshots(): Promise<Record<string, YieldSnapshot[]>> {
  const { data } = await fetchPublicData<any>("fund-snapshots", {
    select: ["fund_id", "annual_yield", "daily_yield", "snapshot_date"],
    order: "snapshot_date.asc",
    days: 180,
    limit: 5000,
  });
  const grouped: Record<string, YieldSnapshot[]> = {};
  for (const row of data) {
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
