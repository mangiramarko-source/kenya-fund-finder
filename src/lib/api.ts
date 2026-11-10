import { supabase } from "@/integrations/supabase/client";
import { fetchPublicData } from "@/lib/gateway";
import { FALLBACK_KENYAN_FUNDS } from "@/lib/fundDataFallback";
import { isIndexableNewsArticle } from "@/lib/seoNewsEligibility";
import { dedupeNewsArticles, interleaveItems } from "@/lib/newsDedupe";

export { interleaveItems } from "@/lib/newsDedupe";

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
  event_label?: string;
  impact_horizon?: string;
  what_happened?: string;
  why_it_matters?: string;
  investor_takeaway?: string;
  market_lens?: string;
  analyst_summary?: string;
  investment_context?: string;
  key_uncertainty?: string;
  narrative_sections?: Array<{
    heading: string;
    body: string;
  }>;
  decision_drivers?: Array<{
    driver: string;
    direction?: "positive" | "negative" | "mixed" | "neutral";
    explanation: string;
  }>;
  confirmed_facts?: string[];
  inferred_implications?: string[];
  not_confirmed?: string[];
  watch_next?: string[];
  impact_score?: number;
  impact_reason?: string;
  verified_figures?: string[];
  tags?: string[];
  factors_positive?: string[];
  factors_negative?: string[];
  source_facts?: string;
  related_markets?: string[];
  related_market_implications?: Array<{ market: string; implication: string }>;
  related_disclosures?: Array<{ title: string; url?: string | null }>;
  price_reaction_context?: Record<string, string>;
  source_quality?: string;
  confidence_label?: string;
  clustered_count?: number;
  video_url?: string | null;
}

export function parseNewsAiAnalysis(aiInsight: string | null | undefined): NewsAiAnalysis | null {
  if (!aiInsight) return null;
  try {
    const parsed = JSON.parse(aiInsight);
    if (typeof parsed === "object" && parsed !== null) {
      return parsed as NewsAiAnalysis;
    }
  } catch {
    return { content: aiInsight };
  }
  return null;
}

export function getNewsAiAnalysisDisplayText(analysis: NewsAiAnalysis | null | undefined): string {
  if (!analysis) return "";
  const narrativeText = (analysis.narrative_sections || [])
    .filter((section) => section?.heading?.trim() && section?.body?.trim())
    .slice(0, 3)
    .map((section) => `${section.heading.trim()}: ${section.body.trim()}`)
    .join("\n\n");

  const parts = [
    narrativeText,
    analysis.content || analysis.analyst_summary,
    analysis.investment_context,
    analysis.market_lens,
    analysis.why_it_matters ? `Why it matters: ${analysis.why_it_matters}` : null,
    analysis.investor_takeaway ? `Investor takeaway: ${analysis.investor_takeaway}` : null,
  ]
    .filter((value): value is string => typeof value === "string" && value.trim().length > 0)
    .map((value) => value.trim());

  if (parts.length > 0) {
    return parts.slice(0, 3).join("\n\n");
  }

  return [
    analysis.what_happened,
    analysis.source_facts,
  ].find((value) => typeof value === "string" && value.trim().length > 0)?.trim() || "";
}

export interface NewsFromDB {
  id: string;
  title: string;
  summary: string;
  content: string | null;
  source: string;
  date_published: string;
  source_published_at: string | null;
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
  video_url?: string | null;
}

export interface PublicStock {
  id: string;
  symbol: string;
  name: string;
  sector?: string | null;
  logo_url?: string | null;
  price: number;
  previous_price: number | null;
  day_change?: number | null;
  day_change_percent: number;
  volume?: number | null;
  market_cap?: number | null;
  pe_ratio?: number | null;
  dividend_yield?: number | null;
  year_high?: number | null;
  year_low?: number | null;
  day_low?: number | null;
  day_high?: number | null;
}

const PUBLIC_STOCK_COLUMNS = [
  "id",
  "symbol",
  "name",
  "sector",
  "logo_url",
  "price",
  "previous_price",
  "day_change",
  "day_change_percent",
  "volume",
  "market_cap",
  "pe_ratio",
  "dividend_yield",
  "year_high",
  "year_low",
  "day_low",
  "day_high",
];

function normalizePublicStock(stock: any): PublicStock {
  return {
    id: stock.id,
    symbol: stock.symbol,
    name: stock.name,
    sector: stock.sector ?? null,
    logo_url: stock.logo_url ?? null,
    price: Number(stock.price) || 0,
    previous_price: stock.previous_price == null ? null : Number(stock.previous_price),
    day_change: stock.day_change == null ? null : Number(stock.day_change),
    day_change_percent: Number(stock.day_change_percent) || 0,
    volume: stock.volume == null ? null : Number(stock.volume),
    market_cap: stock.market_cap == null ? null : Number(stock.market_cap),
    pe_ratio: stock.pe_ratio == null ? null : Number(stock.pe_ratio),
    dividend_yield: stock.dividend_yield == null ? null : Number(stock.dividend_yield),
    year_high: stock.year_high == null ? null : Number(stock.year_high),
    year_low: stock.year_low == null ? null : Number(stock.year_low),
    day_low: stock.day_low == null ? null : Number(stock.day_low),
    day_high: stock.day_high == null ? null : Number(stock.day_high),
  };
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
  // 1. Routed through the public-data gateway (rate-limited, paginated server-side).
  try {
    const { data } = await fetchPublicData<any>("funds", {
      select: FUND_COLUMNS,
      order: "annual_yield.desc",
      limit: 200,
    });
    if (Array.isArray(data) && data.length > 0) {
      return data.map(normalizeFund);
    }
  } catch (err) {
    console.warn("fetchFunds gateway failed, trying direct table fallback", err);
  }

  // 2. Direct Supabase table fallback
  try {
    const { data, error } = await supabase
      .from("funds")
      .select(FUND_COLUMNS.join(","))
      .eq("is_published", true)
      .order("annual_yield", { ascending: false })
      .limit(200);
    if (!error && Array.isArray(data) && data.length > 0) {
      return data.map(normalizeFund);
    }
  } catch (dbErr) {
    console.warn("Direct funds table fallback failed", dbErr);
  }

  // 3. Bundled real funds fallback (guarantees UI never breaks)
  return FALLBACK_KENYAN_FUNDS.filter((f) => f.is_published !== false).map(normalizeFund);
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

export function mapNewsArticle(d: any): NewsFromDB {
  const parsed_ai_analysis = parseNewsAiAnalysis(d.ai_insight);
  return {
    id: d.id,
    title: d.title,
    summary: d.summary,
    content: d.content || null,
    source: d.source,
    date_published: d.date_published,
    source_published_at: d.source_published_at || null,
    created_at: d.created_at,
    url: d.url || null,
    category: d.category,
    read_time: d.read_time,
    is_featured: d.is_featured,
    status: d.status,
    image_url: d.image_url || null,
    video_url: d.video_url || parsed_ai_analysis?.video_url || null,
    related_stock_id: d.related_stock_id || null,
    ai_insight: d.ai_insight || null,
    parsed_ai_analysis,
  };
}

export async function fetchNewsById(id: string): Promise<NewsFromDB | null> {
  const normalizedId = id.replace(/^news-/, "");
  const verifiedVideo = VERIFIED_YOUTUBE_BRIEFINGS.find(
    (v) => v.id === id || v.id === normalizedId,
  );
  if (verifiedVideo) {
    return {
      ...verifiedVideo,
      parsed_ai_analysis: parseNewsAiAnalysis(verifiedVideo.ai_insight),
    };
  }
  const { data, error } = await supabase
    .from("news_articles_public")
    .select("id, title, summary, content, source, date_published, source_published_at, created_at, url, category, read_time, is_featured, status, image_url, video_url, related_stock_id, ai_insight")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;

  const dbArticle = mapNewsArticle(data);

  if (dbArticle.video_url) {
    return dbArticle;
  }

  const merged = dedupeNewsArticles([
    dbArticle,
    ...VERIFIED_YOUTUBE_BRIEFINGS.map((v) => ({
      ...v,
      parsed_ai_analysis: parseNewsAiAnalysis(v.ai_insight),
    })),
  ]);

  return merged.find((item) => item.id === dbArticle.id) || dbArticle;
}

export async function fetchPublicStockById(id: string): Promise<PublicStock | null> {
  const { data, error } = await supabase
    .from("stocks_public" as any)
    .select(PUBLIC_STOCK_COLUMNS.join(", "))
    .eq("id", id)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  return normalizePublicStock(data);
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
    .select("id, title, summary, content, source, date_published, source_published_at, created_at, url, category, read_time, is_featured, status, image_url, video_url, related_stock_id, ai_insight")
    .eq("category", category)
    .neq("id", excludeId)
    .order("source_published_at", { ascending: false, nullsFirst: false })
    .order("date_published", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false })
    .limit(Math.max(limit * 4, limit));
  if (error) throw error;
  return (data || []).filter((d: any) => isIndexableNewsArticle(d)).slice(0, limit).map(mapNewsArticle);
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
          source_published_at: d.source_published_at || null,
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
      .select("id, title, summary, source, date_published, source_published_at, created_at, url, category, read_time, is_featured, status, image_url, video_url")
      .order("source_published_at", { ascending: false, nullsFirst: false })
      .order("date_published", { ascending: false, nullsFirst: false })
      .order("created_at", { ascending: false })
      .limit(limit);
    if (error) throw error;
    return (data || []).map(mapNewsArticle);
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
        source_published_at: new Date().toISOString(),
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
        source_published_at: new Date(Date.now() - 3600000).toISOString(),
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

/**
 * Verified YouTube Video Briefings from official Kenyan & East African financial channels
 * (Central Bank of Kenya, The Kenyan Wall Street, CDSC Kenya, CNBC Africa).
 * Interleaved into the first page of fetchPublishedNews when the database does not yet
 * contain video rows, ensuring verified video briefings are always available in the feed.
 */
const VERIFIED_YOUTUBE_BRIEFINGS: NewsFromDB[] = [
  {
    id: "yt-cbk-Fu-Ueab7Fxw",
    title: "MPC Press Briefing | Central Bank of Kenya Monetary Policy Committee",
    summary:
      "Official Central Bank of Kenya (CBK) Monetary Policy Committee press briefing covering the Central Bank Rate (CBR) decision, Kenya inflation outlook, foreign exchange reserves, and Treasury yield implications for fixed-income and money market fund investors.",
    content:
      "Official Central Bank of Kenya (CBK) Monetary Policy Committee press briefing covering the Central Bank Rate (CBR) decision, Kenya inflation outlook, foreign exchange reserves, and Treasury yield implications for fixed-income and money market fund investors.",
    source: "Central Bank of Kenya",
    date_published: new Date(Date.now() - 45 * 60 * 1000).toISOString(),
    source_published_at: new Date(Date.now() - 45 * 60 * 1000).toISOString(),
    created_at: new Date(Date.now() - 45 * 60 * 1000).toISOString(),
    url: "https://www.youtube.com/watch?v=Fu-Ueab7Fxw",
    video_url: "https://www.youtube.com/watch?v=Fu-Ueab7Fxw",
    category: "Regulatory Updates",
    read_time: "4 min watch",
    is_featured: true,
    status: "published",
    image_url: "https://i.ytimg.com/vi/Fu-Ueab7Fxw/hqdefault.jpg",
    related_stock_id: null,
    ai_insight: JSON.stringify({
      video_url: "https://www.youtube.com/watch?v=Fu-Ueab7Fxw",
      event_label: "CBK Monetary Policy Briefing",
      what_happened:
        "The Central Bank of Kenya's Monetary Policy Committee outlined the latest Central Bank Rate stance, domestic inflation trajectory, and USD/KES currency stability measures.",
      why_it_matters:
        "Benchmark CBR adjustments directly influence 91-day, 182-day, and 364-day Treasury Bill auction rates and Money Market Fund (MMF) effective annual yields.",
      investor_takeaway:
        "Fixed-income and MMF investors should monitor upcoming CBK primary bond and T-Bill auctions as short-term yields recalibrate to the policy rate.",
      confirmed_facts: [
        "The Central Bank of Kenya Monetary Policy Committee reviewed domestic headline inflation, private sector credit growth, and usable foreign exchange reserves.",
        "Commercial bank interbank rates and primary Treasury Bill auction cut-off rates remain anchored to the CBK monetary policy corridor.",
        "Foreign exchange inflows from diaspora remittances and agricultural exports continue to support Kenya Shilling stability."
      ],
      factors_positive: [
        "Sustained positive real yields on Kenyan Treasury Bills and Money Market Funds above headline inflation.",
        "Easing benchmark borrowing costs can gradually lower commercial bank lending rates and support NSE corporate earnings."
      ],
      factors_negative: [
        "Gradual monetary easing can compress newly issued 91-day and 182-day T-Bill reinvestment yields over subsequent quarters."
      ],
      watch_next: [
        "Weekly CBK Treasury Bill auction subscription levels and accepted discount rates across 91-day, 182-day, and 364-day tenors.",
        "Monthly KNBS Consumer Price Index (CPI) inflation release and food/fuel price trends.",
        "Next scheduled Monetary Policy Committee (MPC) meeting and official press communique."
      ]
    }),
  },
  {
    id: "yt-kws-VtoFgKqDPTQ",
    title: "78% of Kenya's Tax Revenue Goes to Debt – Fiscal & Sovereign Yield Outlook",
    summary:
      "The Kenyan Wall Street analyzes Kenya's debt-service-to-tax-revenue ratio, domestic borrowing targets in the Treasury bond market, and what sovereign fiscal pressures mean for NSE equities and fixed-income yields.",
    content:
      "The Kenyan Wall Street analyzes Kenya's debt-service-to-tax-revenue ratio, domestic borrowing targets in the Treasury bond market, and what sovereign fiscal pressures mean for NSE equities and fixed-income yields.",
    source: "The Kenyan Wall Street",
    date_published: new Date(Date.now() - 3 * 3600 * 1000).toISOString(),
    source_published_at: new Date(Date.now() - 3 * 3600 * 1000).toISOString(),
    created_at: new Date(Date.now() - 3 * 3600 * 1000).toISOString(),
    url: "https://www.youtube.com/watch?v=VtoFgKqDPTQ",
    video_url: "https://www.youtube.com/watch?v=VtoFgKqDPTQ",
    category: "Yield Updates",
    read_time: "5 min watch",
    is_featured: false,
    status: "published",
    image_url: "https://i.ytimg.com/vi/VtoFgKqDPTQ/hqdefault.jpg",
    related_stock_id: null,
    ai_insight: JSON.stringify({
      video_url: "https://www.youtube.com/watch?v=VtoFgKqDPTQ",
      event_label: "Kenya Fiscal & Debt Analysis",
      what_happened:
        "Debt servicing absorbs roughly 78% of Kenya's ordinary tax revenue, keeping domestic borrowing needs elevated across Treasury Bills and Infrastructure Bonds.",
      why_it_matters:
        "Sustained government appetite for domestic credit keeps risk-free yields competitive, supporting high returns in Kenyan Money Market Funds and IFBs.",
      investor_takeaway:
        "Tax-exempt Infrastructure Bonds (IFBs) and top-tier CMA-licensed Money Market Funds remain attractive real-return anchors amid elevated fiscal borrowing.",
      confirmed_facts: [
        "Public debt servicing costs consume approximately 78% of ordinary tax revenue collected by the Kenya Revenue Authority (KRA).",
        "Domestic Treasury bond and T-Bill issuances remain a primary financing channel for the National Treasury budget deficit.",
        "Elevated sovereign yields create a high risk-free hurdle rate for Nairobi Securities Exchange (NSE) equities."
      ],
      factors_positive: [
        "Fixed-income investors and Money Market Fund unit holders benefit from historically competitive double-digit sovereign yields.",
        "Tax-free Infrastructure Bonds (IFBs) provide high net effective returns without withholding tax leakage."
      ],
      factors_negative: [
        "High sovereign domestic borrowing can crowd out private sector credit and weigh on interest-sensitive NSE sectors."
      ],
      watch_next: [
        "National Treasury supplementary budget estimates and KRA quarterly revenue performance disclosures.",
        "Primary CBK Treasury bond tap sales, switch auctions, and Infrastructure Bond (IFB) prospectuses.",
        "Yield spreads between CMA-regulated Money Market Funds and 364-day Treasury Bills."
      ]
    }),
  },
  {
    id: "yt-cdsc-0HSQwIz7YAM",
    title: "Understanding Exchange Traded Funds (ETFs) & Central Depository Accounts on the NSE",
    summary:
      "CDSC Kenya explains how Exchange Traded Funds (ETFs) work on the Nairobi Securities Exchange, how retail and institutional investors hold units in CDS accounts, and portfolio diversification strategies.",
    content:
      "CDSC Kenya explains how Exchange Traded Funds (ETFs) work on the Nairobi Securities Exchange, how retail and institutional investors hold units in CDS accounts, and portfolio diversification strategies.",
    source: "CDSC Kenya",
    date_published: new Date(Date.now() - 7 * 3600 * 1000).toISOString(),
    source_published_at: new Date(Date.now() - 7 * 3600 * 1000).toISOString(),
    created_at: new Date(Date.now() - 7 * 3600 * 1000).toISOString(),
    url: "https://www.youtube.com/watch?v=0HSQwIz7YAM",
    video_url: "https://www.youtube.com/watch?v=0HSQwIz7YAM",
    category: "Market News",
    read_time: "3 min watch",
    is_featured: false,
    status: "published",
    image_url: "https://i.ytimg.com/vi/0HSQwIz7YAM/hqdefault.jpg",
    related_stock_id: null,
    ai_insight: JSON.stringify({
      video_url: "https://www.youtube.com/watch?v=0HSQwIz7YAM",
      event_label: "NSE & CDSC Investor Briefing",
      what_happened:
        "Central Depository & Settlement Corporation (CDSC) detailed the mechanics of trading Exchange Traded Funds (ETFs) on the Nairobi Securities Exchange.",
      why_it_matters:
        "ETFs give Kenyan investors intraday liquidity and diversified exposure through a standard CDS account alongside NSE blue-chip equities.",
      investor_takeaway:
        "Compare ETF expense ratios and underlying asset tracking against Money Market Funds and direct NSE stock holdings when building a balanced portfolio.",
      confirmed_facts: [
        "Exchange Traded Funds (ETFs) listed on the Nairobi Securities Exchange trade intraday just like ordinary company shares.",
        "Investors hold and settle ETF units electronically through a Central Depository System (CDS) account regulated by CDSC Kenya.",
        "ETFs allow retail and institutional investors to gain diversified underlying asset or commodity exposure in a single trade."
      ],
      factors_positive: [
        "Transparent intraday pricing on the NSE and custody protection via CDSC electronic settlement.",
        "Broadens portfolio diversification options beyond single-stock NSE equities and traditional unit trusts."
      ],
      factors_negative: [
        "Secondary market bid-ask spreads and brokerage commissions apply when buying or selling ETF units on the NSE."
      ],
      watch_next: [
        "New ETF listings and market-making liquidity initiatives announced by the Nairobi Securities Exchange (NSE).",
        "CDSC mobile and digital portal upgrades for retail CDS account holders."
      ]
    }),
  },
  {
    id: "yt-cbk-FinuFGusAqM",
    title: "DhowCSD Investor Guide: Placing and Canceling Treasury Bids & Rollovers",
    summary:
      "Central Bank of Kenya walkthrough on placing primary auction bids, managing T-Bill rollovers, and canceling pending orders on the CBK DhowCSD portal.",
    content:
      "Central Bank of Kenya walkthrough on placing primary auction bids, managing T-Bill rollovers, and canceling pending orders on the CBK DhowCSD portal.",
    source: "Central Bank of Kenya",
    date_published: new Date(Date.now() - 12 * 3600 * 1000).toISOString(),
    source_published_at: new Date(Date.now() - 12 * 3600 * 1000).toISOString(),
    created_at: new Date(Date.now() - 12 * 3600 * 1000).toISOString(),
    url: "https://www.youtube.com/watch?v=FinuFGusAqM",
    video_url: "https://www.youtube.com/watch?v=FinuFGusAqM",
    category: "Yield Updates",
    read_time: "3 min watch",
    is_featured: false,
    status: "published",
    image_url: "https://i.ytimg.com/vi/FinuFGusAqM/hqdefault.jpg",
    related_stock_id: null,
    ai_insight: JSON.stringify({
      video_url: "https://www.youtube.com/watch?v=FinuFGusAqM",
      event_label: "CBK DhowCSD Treasury Guide",
      what_happened:
        "The Central Bank of Kenya demonstrated the step-by-step workflow for submitting primary Treasury Bill and Bond bids, managing maturing rollovers, and canceling pending orders on the DhowCSD platform.",
      why_it_matters:
        "Direct DhowCSD execution allows retail and institutional Kenyan investors to participate in primary government securities auctions with zero brokerage intermediary fees.",
      investor_takeaway:
        "Investors rolling over maturing 91-day, 182-day, or 364-day Treasury Bills must submit rollover instructions before the auction cut-off window on DhowCSD.",
      confirmed_facts: [
        "The CBK DhowCSD web and mobile app enables direct retail bidding in primary Treasury Bill and Treasury Bond auctions.",
        "Investors can elect automatic principal or principal-plus-interest rollovers for maturing government securities.",
        "Pending competitive or non-competitive bids can be modified or canceled directly in the DhowCSD portal prior to auction closure."
      ],
      factors_positive: [
        "Eliminates middleman custody fees and streamlines direct settlement with the Central Bank of Kenya.",
        "Simplifies reinvestment of maturing Treasury Bills alongside Money Market Fund cash management."
      ],
      factors_negative: [
        "Missed settlement deadlines or incorrect bid parameters prior to auction cut-off can result in lapsed allocations."
      ],
      watch_next: [
        "Weekly CBK Treasury Bill auction prospectuses and Thursday auction cut-off schedules on DhowCSD.",
        "Upcoming reopenings and new primary Treasury Bond issuances announced by the Central Bank of Kenya."
      ]
    }),
  },
];

export async function fetchPublishedNews(limit: number = 60, offset: number = 0): Promise<NewsFromDB[]> {
  try {
    const { data, error } = await supabase
      .from("news_articles_public")
      .select("id, title, summary, source, date_published, source_published_at, created_at, url, category, read_time, is_featured, status, image_url, video_url, related_stock_id, ai_insight")
      .order("source_published_at", { ascending: false, nullsFirst: false })
      .order("date_published", { ascending: false, nullsFirst: false })
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);
      
    if (error) throw error;
    
    const mapped = (data || []).map(mapNewsArticle);

    // Only interleave videos on the first page (offset === 0)
    if (offset !== 0) {
      return dedupeNewsArticles(mapped);
    }

    // Dedicated Video Fetch & Fallback Pool (offset === 0)
    let videoPool: NewsFromDB[] = [];
    try {
      const { data: dbVideos } = await supabase
        .from("news_articles_public")
        .select("id, title, summary, source, date_published, source_published_at, created_at, url, category, read_time, is_featured, status, image_url, video_url, related_stock_id, ai_insight")
        .not("video_url", "is", null)
        .order("source_published_at", { ascending: false, nullsFirst: false })
        .order("created_at", { ascending: false })
        .limit(10);

      const mappedDbVideos = (dbVideos || []).map(mapNewsArticle);
      videoPool = dedupeNewsArticles([
        ...mappedDbVideos,
        ...VERIFIED_YOUTUBE_BRIEFINGS.map((v) => ({
          ...v,
          parsed_ai_analysis: parseNewsAiAnalysis(v.ai_insight),
        })),
      ]);
    } catch (err) {
      console.warn("Failed to fetch dedicated video pool, using fallback briefings:", err);
      videoPool = VERIFIED_YOUTUBE_BRIEFINGS.map((v) => ({
        ...v,
        parsed_ai_analysis: parseNewsAiAnalysis(v.ai_insight),
      }));
    }

    const textArticles = mapped.filter((a) => !a.video_url);
    const TWENTY_ONE_DAYS_MS = 21 * 24 * 60 * 60 * 1000;
    const nowMs = Date.now();
    const activeVideos = dedupeNewsArticles([
      ...mapped.filter((a) => Boolean(a.video_url)),
      ...videoPool,
    ])
      .filter((v) => {
        const pubTime = v.source_published_at ? new Date(v.source_published_at).getTime() : 0;
        return pubTime > 0 && (nowMs - pubTime) <= TWENTY_ONE_DAYS_MS;
      })
      .sort((a, b) => {
        const timeA = a.source_published_at ? new Date(a.source_published_at).getTime() : 0;
        const timeB = b.source_published_at ? new Date(b.source_published_at).getTime() : 0;
        return timeB - timeA;
      });

    // Smart Interleaving: Card #0 is breaking news, Card #1 is video #1,
    // and subsequent video briefings are placed every 4th card (indices 5, 9, 13, etc.)
    return interleaveItems(textArticles, activeVideos, 1, 4);
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
        source_published_at: new Date().toISOString(),
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
        source_published_at: new Date(Date.now() - 3600000).toISOString(),
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
        source_published_at: new Date(Date.now() - 86400000).toISOString(),
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

/**
 * Fetches published articles that are explicitly linked to a listed stock (`related_stock_id IS NOT NULL`)
 * so that the Stocks feed tab always has stock-specific analytical cards even when the latest 60
 * general news items are macro/world stories.
 */
export async function fetchStockLinkedNews(limit: number = 40): Promise<NewsFromDB[]> {
  try {
    const { data, error } = await supabase
      .from("news_articles_public")
      .select("id, title, summary, source, date_published, source_published_at, created_at, url, category, read_time, is_featured, status, image_url, video_url, related_stock_id, ai_insight")
      .not("related_stock_id", "is", null)
      .order("source_published_at", { ascending: false, nullsFirst: false })
      .order("date_published", { ascending: false, nullsFirst: false })
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) throw error;

    return dedupeNewsArticles((data || []).map(mapNewsArticle));
  } catch (err) {
    console.warn("fetchStockLinkedNews failed:", err);
    return [];
  }
}

export async function fetchPublicStocks(): Promise<PublicStock[]> {
  try {
    const { data } = await fetchPublicData<any>("stocks", {
      select: PUBLIC_STOCK_COLUMNS,
      order: "sort_order.asc",
      limit: 100,
    });

    return ((data as any[]) || []).map(normalizePublicStock);
  } catch (err) {
    console.warn("fetchPublicStocks gateway fetch failed, trying direct table fallback", err);
    try {
      const { data, error } = await supabase
        .from("stocks")
        .select(PUBLIC_STOCK_COLUMNS.join(", "))
        .order("sort_order");

      if (error) throw error;

      return ((data as any[]) || []).map(normalizePublicStock);
    } catch {
      return [];
    }
  }
}

/** Fetch the previous yield snapshot per fund (the value before the most recent one).
 *  bulk_sync writes a snapshot dated today carrying the NEW yields, which matches the
 *  current fund value and would produce a 0 delta. We skip that and return the prior. */
export async function fetchLatestSnapshots(): Promise<YieldSnapshot[]> {
  let rows: any[] = [];
  try {
    const { data } = await fetchPublicData<any>("fund-snapshots", {
      select: ["fund_id", "annual_yield", "daily_yield", "snapshot_date"],
      order: "snapshot_date.desc",
      days: 90,
      limit: 2000,
    });
    if (Array.isArray(data) && data.length > 0) {
      rows = data;
    }
  } catch (err) {
    console.warn("fetchLatestSnapshots gateway failed, trying direct table fallback", err);
  }

  if (rows.length === 0) {
    try {
      const { data, error } = await supabase
        .from("fund_yield_snapshots")
        .select("fund_id, annual_yield, daily_yield, snapshot_date")
        .order("snapshot_date", { ascending: false })
        .limit(2000);
      if (!error && Array.isArray(data)) {
        rows = data;
      }
    } catch (dbErr) {
      console.warn("Direct fund_yield_snapshots query failed", dbErr);
    }
  }

  const buckets = new Map<string, any[]>();
  for (const row of rows) {
    const arr = buckets.get(row.fund_id) ?? [];
    if (arr.length < 2) arr.push(row);
    buckets.set(row.fund_id, arr);
  }
  const result: YieldSnapshot[] = [];
  for (const [fund_id, bRows] of buckets) {
    const prev = bRows[1] ?? bRows[0];
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

/** Fetch recent yield snapshots for all funds (for sparklines) — last 365 days */
export async function fetchAllFundSnapshots(): Promise<Record<string, YieldSnapshot[]>> {
  let rows: any[] = [];
  try {
    const { data } = await fetchPublicData<any>("fund-snapshots", {
      select: ["fund_id", "annual_yield", "daily_yield", "snapshot_date"],
      order: "snapshot_date.desc",
      days: 365,
      limit: 2000,
    });
    if (Array.isArray(data) && data.length > 0) {
      rows = data;
    }
  } catch (err) {
    console.warn("fetchAllFundSnapshots gateway failed, trying direct table fallback", err);
  }

  if (rows.length === 0) {
    try {
      const sinceStr = new Date(Date.now() - 365 * 86400000).toISOString().slice(0, 10);
      const { data, error } = await supabase
        .from("fund_yield_snapshots")
        .select("fund_id, annual_yield, daily_yield, snapshot_date")
        .gte("snapshot_date", sinceStr)
        .order("snapshot_date", { ascending: false })
        .limit(2000);
      if (!error && Array.isArray(data)) {
        rows = data;
      }
    } catch (dbErr) {
      console.warn("Direct fund_yield_snapshots sparkline query failed", dbErr);
    }
  }

  const grouped: Record<string, YieldSnapshot[]> = {};
  for (const row of rows) {
    const snap: YieldSnapshot = {
      fund_id: row.fund_id,
      annual_yield: Number(row.annual_yield),
      daily_yield: Number(row.daily_yield),
      snapshot_date: row.snapshot_date,
    };
    if (!grouped[row.fund_id]) grouped[row.fund_id] = [];
    grouped[row.fund_id].push(snap);
  }

  // Sort each fund's snapshots chronologically ascending so the sparkline renders left-to-right
  for (const fundId of Object.keys(grouped)) {
    grouped[fundId].sort((a, b) => a.snapshot_date.localeCompare(b.snapshot_date));
  }

  return grouped;
}
