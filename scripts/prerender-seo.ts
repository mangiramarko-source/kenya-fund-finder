import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import {
  SEO_SITE_URL,
  canonicalUrl,
  definitionList,
  escapeHtml,
  paragraph,
  renderSeoHtml,
  stripHtml,
  truncateDescription,
  type SeoPageDefinition,
} from "../src/lib/seoPrerender";

const DIST_DIR = resolve("dist");
const TEMPLATE_PATH = join(DIST_DIR, "index.html");
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || "https://caawgzuofnujrznwbuxk.supabase.co";
const SUPABASE_ANON_KEY =
  process.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNhYXdnenVvZm51anJ6bndidXhrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYzMjI0ODYsImV4cCI6MjA5MTg5ODQ4Nn0.Ci7AcNBlIa4LhINAEvpmeDjLQfxWUxcROd8q5hNAQnA";
const STRICT = process.env.VERCEL === "1" || process.env.SEO_PRERENDER_STRICT === "true";

interface StockRow {
  symbol: string | null;
  name: string | null;
  sector: string | null;
  price: number | null;
  day_change: number | null;
  day_change_percent: number | null;
  volume: number | null;
  market_cap: number | null;
  pe_ratio: number | null;
  dividend_yield: number | null;
  year_high: number | null;
  year_low: number | null;
  updated_at: string | null;
  is_active: boolean | null;
}

interface FundRow {
  slug: string | null;
  name: string | null;
  manager: string | null;
  annual_yield: number | null;
  daily_yield: number | null;
  minimum_investment: number | null;
  management_fee: number | null;
  withdrawal_time: string | null;
  description: string | null;
  fund_type: string | null;
  yield_unit: string | null;
  cma_licensed: boolean | null;
  is_published: boolean | null;
  updated_at: string | null;
  logo_url: string | null;
}

interface NewsRow {
  id: string | null;
  title: string | null;
  summary: string | null;
  content: string | null;
  source: string | null;
  date_published: string | null;
  created_at: string | null;
  updated_at: string | null;
  image_url: string | null;
  category: string | null;
  read_time: string | null;
  status: string | null;
}

interface SitePageRow {
  slug: string | null;
  title: string | null;
  content: string | null;
  meta: Record<string, string> | null;
  updated_at: string | null;
}

async function supaSelect<T>(resource: string, query: string): Promise<T[]> {
  const rows: T[] = [];
  const pageSize = 1000;
  for (let offset = 0; ; offset += pageSize) {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/${resource}?${query}`, {
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        Range: `${offset}-${offset + pageSize - 1}`,
      },
    });
    if (!response.ok) {
      const detail = (await response.text()).slice(0, 300);
      throw new Error(`${resource} returned HTTP ${response.status}: ${detail}`);
    }
    const page = (await response.json()) as T[];
    rows.push(...page);
    if (page.length < pageSize) break;
  }
  return rows;
}

function validSegment(value: string | null): value is string {
  return Boolean(value && /^[A-Za-z0-9_-]+$/.test(value));
}

function money(value: number | null): string | null {
  if (value == null || !Number.isFinite(Number(value))) return null;
  return `KSh ${Number(value).toLocaleString("en-KE", { maximumFractionDigits: 2 })}`;
}

function percent(value: number | null): string | null {
  if (value == null || !Number.isFinite(Number(value))) return null;
  return `${Number(value).toLocaleString("en-KE", { maximumFractionDigits: 2 })}%`;
}

function compactNumber(value: number | null): string | null {
  if (value == null || !Number.isFinite(Number(value))) return null;
  return Number(value).toLocaleString("en-KE", { notation: "compact", maximumFractionDigits: 2 });
}

function breadcrumb(items: Array<{ name: string; path: string }>): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: canonicalUrl(item.path),
    })),
  };
}

function staticRoutes(): SeoPageDefinition[] {
  return [
    {
      path: "/",
      title: "Kenya Fund Finder – NSE Stocks, Money Market Funds & FX",
      description: "Compare CMA-regulated money market funds, NSE share prices, FX rates and commodities in Kenya. Track performance, charts and market news.",
      heading: "Kenya investment markets in one place",
      contentHtml: `${paragraph("Compare Kenyan stocks, money market funds, foreign exchange rates and commodity prices using regularly updated market data.")}<nav><a href="/stocks">NSE stocks</a> · <a href="/funds">Money market funds</a> · <a href="/rates">FX rates</a> · <a href="/news">Market news</a></nav>`,
      jsonLd: { "@context": "https://schema.org", "@type": "WebPage", name: "Kenya Fund Finder Market Overview", url: canonicalUrl("/") },
    },
    {
      path: "/funds",
      title: "Money Market Funds in Kenya – Compare Yields & Fees",
      description: "Compare CMA-regulated money market funds and unit trusts in Kenya by annual yield, fees, minimum investment and withdrawal time.",
      heading: "Money market funds and unit trusts in Kenya",
      contentHtml: paragraph("Compare published fund yields, minimum investment amounts, management fees and withdrawal periods from Kenyan fund managers."),
    },
    {
      path: "/stocks",
      title: "NSE Share Prices Today – Kenyan Stocks Market Data",
      description: "Track Nairobi Securities Exchange share prices, daily changes, market capitalisation, dividend yields and price charts for Kenyan listed companies.",
      heading: "Nairobi Securities Exchange share prices",
      contentHtml: paragraph("Explore current NSE stock prices, daily market movement, company statistics and historical charts for listed Kenyan companies."),
    },
    {
      path: "/compare",
      title: "Compare Investment Funds in Kenya | Kenya Fund Finder",
      description: "Compare Kenyan money market funds and unit trusts side by side by yield, fees, minimum investment and withdrawal period.",
      heading: "Compare Kenyan investment funds",
      contentHtml: paragraph("Select published funds to compare their yields, fees and investment requirements side by side."),
    },
    {
      path: "/rates",
      title: "Kenya Shilling Exchange Rates Today – USD, GBP, EUR to KES",
      description: "View current foreign exchange rates against the Kenya shilling, including USD/KES, GBP/KES and EUR/KES with historical charts.",
      heading: "Foreign exchange rates against the Kenya shilling",
      contentHtml: paragraph("Track major currency exchange rates against KES and review recent rate movements."),
    },
    {
      path: "/commodities",
      title: "Commodity Prices in Kenya – Gold, Oil & Global Markets",
      description: "Track gold, oil and other global commodity prices relevant to Kenyan investors, with recent price changes and historical charts.",
      heading: "Commodity market prices",
      contentHtml: paragraph("Follow major global commodity prices and their recent market movement."),
    },
    {
      path: "/markets",
      title: "Kenya Markets Dashboard – Stocks, FX & Commodities",
      description: "A combined dashboard for Kenyan stocks, exchange rates, commodities and investment-market updates.",
      heading: "Kenya markets dashboard",
      contentHtml: paragraph("Review Kenyan stocks, foreign exchange rates and commodity market information from one dashboard."),
    },
    {
      path: "/news",
      title: "Kenya Market News – Stocks, Funds, Business & Economy",
      description: "Read Kenyan stock-market, investment-fund, business and economic news with linked company data and concise market context.",
      heading: "Kenya market news",
      contentHtml: paragraph("Follow current Kenyan business, stock market, investment fund and economic stories."),
    },
    {
      path: "/calculator",
      title: "Money Market Fund Calculator Kenya",
      description: "Estimate money market fund returns in Kenya after management fees and withholding tax using adjustable investment and contribution amounts.",
      heading: "Money market fund return calculator",
      contentHtml: paragraph("Estimate potential investment growth using a selected yield, contribution schedule, fees and withholding tax."),
    },
    {
      path: "/learn",
      title: "Learn About Investing in Kenya | Kenya Fund Finder",
      description: "Educational guides about Kenyan money market funds, unit trusts, NSE stocks, investment fees and market terminology.",
      heading: "Learn about investing in Kenya",
      contentHtml: paragraph("Read practical educational guides about Kenyan investment products and markets."),
    },
    {
      path: "/learn/how-to-invest-in-money-market-funds-kenya",
      title: "How to Invest in Money Market Funds in Kenya",
      description: "A practical guide to choosing and investing in a CMA-regulated money market fund in Kenya, including yields, fees, tax and withdrawals.",
      heading: "How to invest in a money market fund in Kenya",
      contentHtml: paragraph("Learn how Kenyan money market funds work, what fees and taxes apply, and what to compare before investing."),
      type: "article",
    },
    {
      path: "/checklist",
      title: "Kenya Investment Fund Checklist",
      description: "Use this checklist to compare regulation, returns, fees, liquidity and minimum investment before selecting a Kenyan investment fund.",
      heading: "Investment fund checklist",
      contentHtml: paragraph("Review key fund details before making an investment decision."),
    },
    {
      path: "/treasury",
      title: "Kenya Treasury Bills & Bonds – Compare CBK Rates & Yields",
      description: "Track the latest 91-day, 182-day and 364-day Treasury Bill auction rates in Kenya. Compare Treasury Bonds, yields, and time to maturity.",
      heading: "Treasury Bills & Bonds",
      contentHtml: paragraph("Track the latest Central Bank of Kenya Treasury Bill auction results and active Treasury Bonds available in the secondary market."),
    },
  ];
}

function privateRoutes(): SeoPageDefinition[] {
  const robots = "noindex, nofollow, noarchive";
  return [
    ["/auth", "Sign in"], ["/reset-password", "Reset password"], ["/profile", "Profile"],
    ["/alerts", "Price alerts"], ["/portfolio", "Portfolio"], ["/portfolio/summary", "Portfolio summary"],
    ["/watchlist", "Watchlist"], ["/ai-lab", "AI Lab"], ["/admin", "Administration"],
    ["/admin/login", "Administrator sign in"], ["/stocks-demo", "Stocks demo"],
    ["/demo-stocks-feed", "Stocks feed demo"], ["/demo-feed", "Feed demo"],
  ].map(([path, heading]) => ({
    path,
    title: `${heading} | Kenya Fund Finder`,
    description: `${heading} on Kenya Fund Finder.`,
    heading,
    contentHtml: paragraph("This utility page is not intended for search results."),
    robots,
  }));
}

function stockPage(stock: StockRow): SeoPageDefinition | null {
  if (!validSegment(stock.symbol) || !stock.name) return null;
  const path = `/stocks/${stock.symbol.toUpperCase()}`;
  const price = money(stock.price);
  const description = `${stock.name} (${stock.symbol}) share price${price ? ` is ${price}` : ""}. View its NSE price chart, daily change, market cap, P/E ratio and dividend yield.`;
  return {
    path,
    title: `${stock.symbol.toUpperCase()} Share Price Today – ${stock.name} Stock Chart`,
    description,
    heading: `${stock.name} (${stock.symbol.toUpperCase()}) share price`,
    contentHtml: `${paragraph(`${stock.name} is listed on the Nairobi Securities Exchange${stock.sector ? ` in the ${stock.sector} sector` : ""}.`)}${definitionList([
      ["Current share price", price],
      ["Daily change", stock.day_change == null ? null : `${money(stock.day_change)} (${percent(stock.day_change_percent)})`],
      ["Market capitalisation", money(stock.market_cap)],
      ["Trading volume", compactNumber(stock.volume)],
      ["P/E ratio", stock.pe_ratio],
      ["Dividend yield", percent(stock.dividend_yield)],
      ["52-week high", money(stock.year_high)],
      ["52-week low", money(stock.year_low)],
    ])}<p><a href="/stocks">View all NSE stocks</a></p>`,
    jsonLd: [
      {
        "@context": "https://schema.org",
        "@type": "FinancialProduct",
        name: `${stock.name} (${stock.symbol.toUpperCase()})`,
        description: truncateDescription(description),
        url: canonicalUrl(path),
      },
      breadcrumb([
        { name: "Home", path: "/" },
        { name: "Stocks", path: "/stocks" },
        { name: `${stock.name} (${stock.symbol.toUpperCase()})`, path },
      ]),
    ],
  };
}

function fundPage(fund: FundRow): SeoPageDefinition | null {
  if (!validSegment(fund.slug) || !fund.name || !fund.manager) return null;
  const path = `/compare/${fund.slug}`;
  const yieldLabel = fund.annual_yield == null ? null : `${percent(fund.annual_yield)} annual yield`;
  const description = `${fund.name} by ${fund.manager}${yieldLabel ? ` currently shows a ${yieldLabel}` : ""}. Compare fees, minimum investment and withdrawal time.`;
  return {
    path,
    title: `${fund.name} – Yield, Fees & Minimum Investment`,
    description,
    heading: fund.name,
    image: fund.logo_url,
    contentHtml: `${paragraph(`${fund.name} is managed by ${fund.manager}${fund.cma_licensed ? " and is listed as CMA regulated" : ""}.`)}${paragraph(fund.description)}${definitionList([
      ["Annual yield", percent(fund.annual_yield)],
      ["Daily yield", percent(fund.daily_yield)],
      ["Minimum investment", money(fund.minimum_investment)],
      ["Management fee", percent(fund.management_fee)],
      ["Withdrawal time", fund.withdrawal_time],
      ["Fund type", fund.fund_type?.replaceAll("_", " ")],
    ])}<p><a href="/funds">Compare all investment funds</a></p>`,
    jsonLd: [
      {
        "@context": "https://schema.org",
        "@type": "FinancialProduct",
        name: fund.name,
        description: truncateDescription(description),
        provider: { "@type": "Organization", name: fund.manager },
        url: canonicalUrl(path),
        ...(fund.annual_yield == null ? {} : { interestRate: { "@type": "QuantitativeValue", value: fund.annual_yield, unitText: "percent per annum" } }),
      },
      breadcrumb([
        { name: "Home", path: "/" },
        { name: "Funds", path: "/funds" },
        { name: fund.name, path },
      ]),
    ],
  };
}

function newsPage(article: NewsRow): SeoPageDefinition | null {
  if (!validSegment(article.id) || !article.title || !article.summary) return null;
  const path = `/news/${article.id}`;
  const published = article.date_published || article.created_at;
  const body = stripHtml(article.content || article.summary);
  return {
    path,
    title: `${article.title} | Kenya Fund Finder`,
    description: article.summary,
    heading: article.title,
    image: article.image_url,
    type: "article",
    contentHtml: `${paragraph(article.summary)}${body && body !== stripHtml(article.summary) ? paragraph(body) : ""}${definitionList([
      ["Source", article.source], ["Category", article.category], ["Published", published ? new Date(published).toLocaleDateString("en-KE", { dateStyle: "long" }) : null], ["Reading time", article.read_time],
    ])}<p><a href="/news">Read more market news</a></p>`,
    jsonLd: [
      {
        "@context": "https://schema.org",
        "@type": "NewsArticle",
        headline: article.title,
        description: truncateDescription(article.summary),
        mainEntityOfPage: canonicalUrl(path),
        ...(published ? { datePublished: published } : {}),
        ...(article.updated_at ? { dateModified: article.updated_at } : {}),
        ...(article.image_url ? { image: [article.image_url] } : {}),
        author: { "@type": "Organization", name: article.source || "Kenya Fund Finder" },
        publisher: {
          "@type": "Organization",
          name: "Kenya Fund Finder",
          logo: { "@type": "ImageObject", url: `${SEO_SITE_URL}/apple-touch-icon.png` },
        },
      },
      breadcrumb([
        { name: "Home", path: "/" },
        { name: "Market News", path: "/news" },
        { name: article.title, path },
      ]),
    ],
  };
}

function contentPage(page: SitePageRow): SeoPageDefinition | null {
  if (!validSegment(page.slug) || !page.title) return null;
  const direct = ["privacy", "terms"].includes(page.slug);
  const path = direct ? `/${page.slug}` : `/page/${page.slug}`;
  const description = page.meta?.description || truncateDescription(page.content || page.title);
  return {
    path,
    title: `${page.title} | Kenya Fund Finder`,
    description,
    heading: page.title,
    contentHtml: paragraph(page.content),
  };
}

function outputPath(routePath: string): string {
  if (routePath === "/") return TEMPLATE_PATH;
  const relative = routePath.replace(/^\//, "");
  if (!relative || relative.includes("..")) throw new Error(`Unsafe route path: ${routePath}`);
  return join(DIST_DIR, `${relative}.html`);
}

function writePage(template: string, page: SeoPageDefinition): void {
  const filePath = outputPath(page.path);
  mkdirSync(dirname(filePath), { recursive: true });
  writeFileSync(filePath, renderSeoHtml(template, page));
}

async function loadDynamicPages(): Promise<SeoPageDefinition[]> {
  const [stocks, funds, news, sitePages] = await Promise.all([
    supaSelect<StockRow>("stocks_public", "select=symbol,name,sector,price,day_change,day_change_percent,volume,market_cap,pe_ratio,dividend_yield,year_high,year_low,updated_at,is_active&is_active=eq.true&order=sort_order.asc"),
    supaSelect<FundRow>("funds_public", "select=slug,name,manager,annual_yield,daily_yield,minimum_investment,management_fee,withdrawal_time,description,fund_type,yield_unit,cma_licensed,is_published,updated_at,logo_url&is_published=eq.true&order=name.asc"),
    supaSelect<NewsRow>("news_articles_public", "select=id,title,summary,content,source,date_published,created_at,updated_at,image_url,category,read_time,status&status=eq.published&order=date_published.desc"),
    supaSelect<SitePageRow>("site_pages_public", "select=slug,title,content,meta,updated_at&order=slug.asc"),
  ]);

  return [
    ...stocks.map(stockPage),
    ...funds.map(fundPage),
    ...news.map(newsPage),
    ...sitePages.map(contentPage),
  ].filter((page): page is SeoPageDefinition => Boolean(page));
}

async function main() {
  const template = readFileSync(TEMPLATE_PATH, "utf8");
  let dynamicPages: SeoPageDefinition[] = [];
  try {
    dynamicPages = await loadDynamicPages();
  } catch (error) {
    console.error("[seo-prerender] dynamic content fetch failed", error);
    if (STRICT) process.exitCode = 1;
  }

  const pages = [...staticRoutes(), ...privateRoutes(), ...dynamicPages];
  const uniquePages = new Map(pages.map((page) => [page.path, page]));
  for (const page of uniquePages.values()) writePage(template, page);
  console.log(`[seo-prerender] wrote ${uniquePages.size} route HTML files (${dynamicPages.length} dynamic)`);
}

main().catch((error) => {
  console.error("[seo-prerender] failed", error);
  process.exitCode = 1;
});
