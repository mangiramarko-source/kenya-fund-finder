import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import {
  SEO_DEFAULT_OG_IMAGE,
  SEO_SITE_URL,
  buildFundSeoTitle,
  canonicalUrl,
  definitionList,
  escapeHtml,
  paragraph,
  renderSeoHtml,
  stripHtml,
  truncateDescription,
  type SeoPageDefinition,
} from "../src/lib/seoPrerender";
import { isIndexableNewsArticle } from "../src/lib/seoNewsEligibility";
import {
  getNewsArchivePage,
  getNewsArchivePageCount,
  getNewsArchivePath,
} from "../src/lib/newsArchive";
import { isIndexableSitePageSlug } from "../src/lib/seoSitePageEligibility";
import { faqByFundType, type FaqItem } from "../src/data/faq";
import { mmfGuideFaq } from "../src/data/mmfGuideFaq";
import { RESEARCH_ARTICLES, articleSeo, researchLinksHtml } from "../src/data/seoGrowthContent";
import { MMF_CALCULATOR_SEO, mmfHubSeo, reportedYield, sourceDate, sourceLink } from "../src/lib/seoMarketContent";
import { SERRARI_MMF_SNAPSHOT_2026_11_02 } from "../src/lib/serrariMmfSync";
import { FALLBACK_KENYAN_STOCKS } from "../src/lib/stockDataFallback";
import { seoPublicData, SEO_SUPABASE_URL, SEO_SUPABASE_KEY } from "./seo-public-data";

const DIST_DIR = resolve("dist");
const TEMPLATE_PATH = join(DIST_DIR, "index.html");
const SUPABASE_URL = SEO_SUPABASE_URL;
const SUPABASE_ANON_KEY = SEO_SUPABASE_KEY;
const STRICT = process.env.VERCEL === "1" || process.env.SEO_PRERENDER_STRICT === "true";
const SKIP_DYNAMIC = process.env.SEO_PRERENDER_SKIP_DYNAMIC === "true";

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
  provider_updated_at?: string | null;
  quote_source?: string | null;
  company_summary?: string | null;
  official_website?: string | null;
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
  fact_sheet_date?: string | null;
  website?: string | null;
}

interface NewsRow {
  id: string | null;
  title: string | null;
  summary: string | null;
  content: string | null;
  source: string | null;
  date_published: string | null;
  source_published_at: string | null;
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
        ...(SUPABASE_ANON_KEY.startsWith("eyJ") ? { Authorization: `Bearer ${SUPABASE_ANON_KEY}` } : {}),
        Range: `${offset}-${offset + pageSize - 1}`,
      },
      signal: AbortSignal.timeout(30_000),
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

async function publicStocks<T>(): Promise<T[]> {
  return seoPublicData<T>("stocks", "symbol,name,sector,price,day_change,day_change_percent,volume,market_cap,pe_ratio,dividend_yield,year_high,year_low,updated_at,provider_updated_at,quote_source,company_summary,official_website", "sort_order.asc");
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

function faqSchema(items: FaqItem[]): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: { "@type": "Answer", text: item.answer },
    })),
  };
}

function faqContentHtml(items: FaqItem[]): string {
  return `<section aria-labelledby="seo-faq-heading"><h2 id="seo-faq-heading">Frequently asked questions</h2>${items
    .map(
      (item) =>
        `<article><h3>${escapeHtml(item.question)}</h3><p>${escapeHtml(item.answer)}</p></article>`,
    )
    .join("")}</section>`;
}

function staticRoutes(): SeoPageDefinition[] {
  return [
    MMF_CALCULATOR_SEO,
    ...RESEARCH_ARTICLES.map(articleSeo),
    {
      path: "/",
      title: "Kenya Fund Finder – NSE Stocks, Money Market Funds & FX",
      description: "Compare CMA-regulated money market funds, NSE share prices, FX rates and commodities in Kenya. Track performance, charts and market news.",
      heading: "Kenya investment markets in one place",
      image: SEO_DEFAULT_OG_IMAGE,
      contentHtml: [
        paragraph("Kenya Fund Finder brings public information about Kenyan investment funds and markets into one place so you can research options before making a decision."),
        '<section><h2>Compare Kenyan investment options</h2><p>Review published yields, fees, minimum deposits and withdrawal periods on the <a href="/funds">fund directory</a>, compare guaranteed returns on <a href="/savings">Bank Fixed Deposits & SACCOs</a>, compare selected products side by side with the <a href="/compare">fund comparison tool</a>, estimate possible returns using the <a href="/calculator">investment calculator</a>, and use the <a href="/checklist">fund checklist</a> when evaluating an option.</p></section>',
        '<section><h2>Follow markets and rates</h2><p>Explore <a href="/stocks">Nairobi Securities Exchange stocks</a>, <a href="/treasury">Kenya Treasury bills and bonds</a>, <a href="/savings">bank fixed deposits & regulated SACCO rates</a>, <a href="/rates">foreign exchange rates</a>, <a href="/commodities">commodity prices</a>, or open the combined <a href="/markets">markets dashboard</a>.</p></section>',
        '<section><h2>Learn before you invest</h2><p>Read current <a href="/news">Kenyan market news</a>, browse plain-language answers in the <a href="/learn">investing learning centre</a>, or follow the practical guide on <a href="/learn/how-to-invest-in-money-market-funds-kenya">how to invest in a Kenyan money market fund</a>. Verify product details with the fund manager and the relevant regulator before investing.</p></section>',
        '<section><h2>About and policies</h2><p>Learn <a href="/page/about">about Kenya Fund Finder</a>, <a href="/page/contact">contact the team</a>, and review the <a href="/privacy">privacy policy</a> and <a href="/terms">terms of use</a>.</p></section>',
      ].join(""),
      jsonLd: [{ "@context": "https://schema.org", "@type": "WebPage", name: "Kenya Fund Finder Market Overview", url: canonicalUrl("/") }, { "@context": "https://schema.org", "@type": "Organization", name: "Kenya Fund Finder", url: SEO_SITE_URL, logo: `${SEO_SITE_URL}/apple-touch-icon.png` }],
    },
    {
      path: "/funds",
      title: "Money Market Funds in Kenya (2026) – Compare 40 KES & USD Yields",
      description: "Compare all 40 CMA-regulated Money Market Funds (27 KES & 13 USD) and unit trusts in Kenya by daily yield, annual EAR, net return after tax, management fee, and minimum investment. Updated Mon–Fri.",
      heading: "Money Market Funds and Unit Trusts in Kenya",
      contentHtml: `${paragraph("Compare published Money Market Fund (MMF) daily and annual yields, minimum investment amounts, management fees and withdrawal periods from CMA-licensed Kenyan fund managers.")}<p>Comparing fixed cash alternatives? Review guaranteed returns on <a href="/savings">Bank Fixed Deposits & SACCO rates</a>.</p>`,
    },
    {
      path: "/savings",
      title: "Bank Fixed Deposits & SACCO Rates in Kenya (2026) – Compare Net Returns",
      description: "Compare fixed deposit rates across Kenyan commercial banks (Tier 1 & Tier 2) and dividend yields across top SASRA-regulated SACCOs with net returns after 15% Withholding Tax.",
      heading: "Bank Fixed Deposits and Regulated SACCO Rates in Kenya",
      contentHtml: `${paragraph("Compare guaranteed interest rates across licensed commercial banks and member dividend yields across Kenya's premier SASRA-regulated DT-SACCOs.")}<p>Estimate your take-home earnings with the <a href="/savings">savings benchmark calculator</a> and compare rates against <a href="/funds">Money Market Funds</a> and <a href="/treasury">Treasury Bills</a>.</p>`,
      jsonLd: { "@context": "https://schema.org", "@type": "CollectionPage", name: "Bank Fixed Deposits and SACCO Rates in Kenya", url: canonicalUrl("/savings") },
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
      contentHtml: `${paragraph("Select published funds to compare their yields, fees and investment requirements side by side.")}<p>Start with the <a href="/funds">fund directory</a>, then use the <a href="/checklist">investment fund checklist</a> to review regulation, fees and withdrawal terms before choosing a fund.</p>`,
      jsonLd: { "@context": "https://schema.org", "@type": "WebPage", name: "Compare Kenyan investment funds", url: canonicalUrl("/compare") },
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
      contentHtml: `${paragraph("Follow current Kenyan business, stock market, investment fund and economic stories.")}<p><a href="/news/archive">Browse the complete indexed news archive</a></p>`,
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
      contentHtml: `${paragraph("Read practical educational guides about Kenyan investment products and markets.")}${researchLinksHtml("stocks")}${researchLinksHtml("mmf")}${researchLinksHtml("trust")}${faqContentHtml(faqByFundType.general)}`,
      jsonLd: faqSchema(faqByFundType.general),
    },
    {
      path: "/learn/how-to-invest-in-money-market-funds-kenya",
      title: "How to Invest in Money Market Funds in Kenya",
      description: "A practical guide to choosing and investing in a CMA-regulated money market fund in Kenya, including yields, fees, tax and withdrawals.",
      heading: "How to invest in a money market fund in Kenya",
      contentHtml: `${paragraph("Learn how Kenyan money market funds work, what fees and taxes apply, and what to compare before investing.")}${faqContentHtml(
        mmfGuideFaq.map(({ q, a }) => ({ question: q, answer: a })),
      )}<p><a href="/funds?type=money_market">Compare money market funds</a> · <a href="/calculator">Estimate investment returns</a></p>`,
      type: "article",
      jsonLd: [
        {
          "@context": "https://schema.org",
          "@type": "Article",
          headline: "How to Invest in Money Market Funds in Kenya",
          description: "A practical guide to choosing and investing in a CMA-regulated money market fund in Kenya, including yields, fees, tax and withdrawals.",
          mainEntityOfPage: canonicalUrl("/learn/how-to-invest-in-money-market-funds-kenya"),
          author: { "@type": "Organization", name: "Kenya Fund Finder" },
          publisher: { "@type": "Organization", name: "Kenya Fund Finder" },
        },
        faqSchema(mmfGuideFaq.map(({ q, a }) => ({ question: q, answer: a }))),
        breadcrumb([
          { name: "Home", path: "/" },
          { name: "Learn", path: "/learn" },
          { name: "How to invest in money market funds in Kenya", path: "/learn/how-to-invest-in-money-market-funds-kenya" },
        ]),
      ],
    },
    {
      path: "/checklist",
      title: "Kenya Investment Fund Checklist",
      description: "Use this checklist to compare regulation, returns, fees, liquidity and minimum investment before selecting a Kenyan investment fund.",
      heading: "Investment fund checklist",
      contentHtml: `${paragraph("Review regulation, returns, fees, liquidity and minimum investment before making an investment decision.")}<p>Use the <a href="/funds">fund directory</a> to compare published products and read the <a href="/learn/how-to-invest-in-money-market-funds-kenya">money market fund guide</a> before investing.</p>`,
      jsonLd: { "@context": "https://schema.org", "@type": "WebPage", name: "Kenya Investment Fund Checklist", url: canonicalUrl("/checklist") },
    },
    {
      path: "/treasury",
      title: "CBK Treasury Bills & Bonds Kenya (2026) – 91, 182 & 364-Day Rates",
      description: "Track the latest Central Bank of Kenya (CBK) 91-day, 182-day, and 364-day Treasury Bill auction rates, tax-free Infrastructure Bonds (IFBs), and DhowCSD net returns after withholding tax.",
      heading: "Kenya Treasury Bills & Bonds (CBK Rates)",
      contentHtml: [
        paragraph("Track the latest Central Bank of Kenya (CBK) 91-day, 182-day, and 364-day Treasury Bill weekly auction rates, active fixed-coupon Treasury Bonds, and tax-free Infrastructure Bonds (IFBs) available via DhowCSD and the NSE secondary market."),
        '<section><h2>Kenyan Government Securities Overview</h2><ul><li><strong>91-Day, 182-Day &amp; 364-Day Treasury Bills:</strong> Short-term discounted government securities auctioned weekly by the Central Bank of Kenya with a KSh 50,000 minimum face value and 15% KRA withholding tax on discount interest.</li><li><strong>Fixed-Coupon Treasury Bonds (FXD):</strong> Medium-to-long-term government bonds paying semi-annual coupon interest (15% WHT for tenors under 10 years; 10% WHT for 10+ years).</li><li><strong>Infrastructure Bonds (IFB):</strong> Tax-exempt Kenyan government bonds funding public infrastructure, typically requiring a KSh 100,000 minimum investment.</li></ul></section>',
        faqContentHtml([
          {
            question: "What is the minimum investment for CBK Treasury Bills and Bonds in Kenya?",
            answer: "The minimum face-value investment for Central Bank of Kenya 91-day, 182-day, and 364-day Treasury Bills and regular Treasury Bonds via DhowCSD is KSh 50,000, while Infrastructure Bonds (IFBs) typically require KSh 100,000.",
          },
          {
            question: "How are Treasury Bills and Infrastructure Bonds taxed in Kenya?",
            answer: "Interest on Treasury Bills and bonds under 10 years is subject to 15% withholding tax, bonds of 10 years or more attract 10% withholding tax, and qualifying Infrastructure Bonds (IFBs) are tax-free.",
          },
          {
            question: "How do Treasury Bills compare with Money Market Funds (MMFs) in Kenya?",
            answer: "Treasury Bills lock your capital for 91, 182, or 364 days with a KSh 50,000 minimum directly with CBK, while CMA-regulated Money Market Funds invest in T-Bills and bank deposits with minimums from KSh 100 and 1–3 day withdrawal liquidity.",
          },
        ]),
        '<p><a href="/funds">Compare Money Market Funds in Kenya</a> · <a href="/calculator">Investment return calculator</a></p>',
      ].join(""),
      jsonLd: [
        {
          "@context": "https://schema.org",
          "@type": "Dataset",
          name: "Central Bank of Kenya (CBK) Treasury Bills & Bonds Rates",
          description: "Weekly 91-day, 182-day, and 364-day Kenyan Treasury Bill auction yields and active Kenyan Treasury and Infrastructure Bonds.",
          url: canonicalUrl("/treasury"),
          creator: { "@type": "Organization", name: "Kenya Fund Finder", url: SEO_SITE_URL },
        },
        faqSchema([
          {
            question: "What is the minimum investment for CBK Treasury Bills and Bonds in Kenya?",
            answer: "The minimum face-value investment for Central Bank of Kenya 91-day, 182-day, and 364-day Treasury Bills and regular Treasury Bonds via DhowCSD is KSh 50,000, while Infrastructure Bonds (IFBs) typically require KSh 100,000.",
          },
          {
            question: "How are Treasury Bills and Infrastructure Bonds taxed in Kenya?",
            answer: "Interest on Treasury Bills and bonds under 10 years is subject to 15% withholding tax, bonds of 10 years or more attract 10% withholding tax, and qualifying Infrastructure Bonds (IFBs) are tax-free.",
          },
          {
            question: "How do Treasury Bills compare with Money Market Funds (MMFs) in Kenya?",
            answer: "Treasury Bills lock your capital for 91, 182, or 364 days with a KSh 50,000 minimum directly with CBK, while CMA-regulated Money Market Funds invest in T-Bills and bank deposits with minimums from KSh 100 and 1–3 day withdrawal liquidity.",
          },
        ]),
        breadcrumb([
          { name: "Home", path: "/" },
          { name: "Treasury Bills & Bonds", path: "/treasury" },
        ]),
      ],
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

function stockPage(stock: StockRow, stocks: StockRow[] = []): SeoPageDefinition | null {
  if (!validSegment(stock.symbol) || !stock.name) return null;
  const symbolUpper = stock.symbol.toUpperCase();
  const path = `/stocks/${symbolUpper}`;
  const price = money(stock.price);
  const description = `${stock.name} (${symbolUpper}) share price${price ? ` is ${price}` : ""}${stock.dividend_yield != null ? `, dividend yield ${percent(stock.dividend_yield)}` : ""}${stock.pe_ratio != null ? `, P/E ${stock.pe_ratio}` : ""}. View its NSE price chart, daily change, volume and market cap.`;
  const stockFaqs: FaqItem[] = [
    {
      question: `What is the ${stock.name} (${symbolUpper}) share price on the NSE today?`,
      answer: `${stock.name} (${symbolUpper}) has a last reported share price of ${price || "unavailable"} on the Nairobi Securities Exchange${stock.year_low != null && stock.year_high != null ? `, with a 52-week trading range of ${money(stock.year_low)} to ${money(stock.year_high)}` : ""}.`,
    },
    {
      question: `What is ${stock.name}'s (${symbolUpper}) dividend yield and P/E ratio?`,
      answer: `${stock.name} (${symbolUpper}) shows a reported dividend yield of ${percent(stock.dividend_yield) || "unavailable"}, a P/E ratio of ${stock.pe_ratio ?? "unavailable"}, and a market capitalisation of ${money(stock.market_cap) || "unavailable"}.`,
    },
    {
      question: `How do I buy ${stock.name} (${symbolUpper}) shares in Kenya?`,
      answer: `Open a CDS account with a CMA-licensed stockbroker or investment bank in Kenya, fund your account, and place an order for ticker ${symbolUpper} on the Nairobi Securities Exchange.`,
    },
  ];
  return {
    path,
    title: `${symbolUpper} Share Price Today${price ? ` (${price})` : ""} – ${stock.name} Stock`,
    description,
    heading: `${stock.name} (${symbolUpper}) share price`,
    contentHtml: `${paragraph(`${stock.name} is listed on the Nairobi Securities Exchange${stock.sector ? ` in the ${stock.sector} sector` : ""}.`)}${paragraph(stock.company_summary)}${definitionList([
      ["Current share price", price],
      ["Daily change", stock.day_change == null ? null : `${money(stock.day_change)} (${percent(stock.day_change_percent) || "percentage unavailable"})`],
      ["Market capitalisation", money(stock.market_cap)],
      ["Trading volume", compactNumber(stock.volume)],
      ["P/E ratio", stock.pe_ratio],
      ["Dividend yield", percent(stock.dividend_yield)],
      ["52-week high", money(stock.year_high)],
      ["52-week low", money(stock.year_low)],
      ["Quote source", stock.quote_source || "Public market-data feed; confirm executable prices with your broker"],
      ["Quote timestamp", sourceDate(stock.provider_updated_at || stock.updated_at)],
      ["Record updated", sourceDate(stock.updated_at)],
    ])}<p>Quotes may be delayed. Missing metrics are unavailable. <a href="/page/market-data-methodology">Read the data methodology</a>.</p><section><h2>Related companies in ${escapeHtml(stock.sector || "the NSE")}</h2><ul>${stocks.filter(s => s.symbol !== stock.symbol && s.sector === stock.sector && validSegment(s.symbol) && s.name).slice(0, 6).map(s => `<li><a href="/stocks/${encodeURIComponent(s.symbol!.toUpperCase())}">${escapeHtml(s.name)} (${escapeHtml(s.symbol!.toUpperCase())})</a></li>`).join("")}</ul></section>${faqContentHtml(stockFaqs)}${researchLinksHtml("stocks")}<p><a href="/stocks">View all NSE stocks</a> · <a href="/news">Market news</a></p>`,
    jsonLd: [
      {
        "@context": "https://schema.org",
        "@type": "Corporation",
        name: stock.name,
        tickerSymbol: `NSE:${symbolUpper}`,
        url: canonicalUrl(path),
      },
      {
        "@context": "https://schema.org",
        "@type": "FinancialProduct",
        name: `${stock.name} (${symbolUpper})`,
        description: truncateDescription(description),
        url: canonicalUrl(path),
      },
      faqSchema(stockFaqs),
      breadcrumb([
        { name: "Home", path: "/" },
        { name: "NSE Stocks", path: "/stocks" },
        { name: `${stock.name} (${symbolUpper})`, path },
      ]),
    ],
  };
}

function fundPage(fund: FundRow, allFunds: FundRow[] = []): SeoPageDefinition | null {
  if (!validSegment(fund.slug) || !fund.name || !fund.manager) return null;
  const path = `/compare/${fund.slug}`;
  const isMmf = fund.fund_type === "money_market";
  const isPct = fund.yield_unit === "%";
  const netYield =
    isPct && fund.annual_yield != null && Number.isFinite(Number(fund.annual_yield))
      ? `${(Number(fund.annual_yield) * 0.85).toLocaleString("en-KE", { maximumFractionDigits: 2 })}%`
      : null;
  const yieldLabel = fund.annual_yield == null ? null : `${reportedYield(fund)} published figure`;
  const description = isMmf && fund.annual_yield != null
    ? `${fund.name} Money Market Fund by ${fund.manager}: ${reportedYield(fund)} annual yield${fund.daily_yield != null ? ` (${percent(fund.daily_yield)} daily)` : ""}${netYield ? `, ~${netYield} net after 15% WHT` : ""}. Compare fees, min deposit and withdrawal time.`
    : `${fund.name} by ${fund.manager}${yieldLabel ? ` shows ${yieldLabel}` : ""}. Compare fees, minimum investment and withdrawal time.`;
  const peerLinks = allFunds
    .filter(
      (peer) =>
        peer.slug !== fund.slug &&
        peer.fund_type === fund.fund_type &&
        peer.yield_unit === fund.yield_unit &&
        validSegment(peer.slug) &&
        peer.name,
    )
    .sort((a, b) => Number(b.annual_yield ?? 0) - Number(a.annual_yield ?? 0))
    .slice(0, 8)
    .map(
      (peer) =>
        `<li><a href="/compare/${encodeURIComponent(peer.slug!)}">${escapeHtml(peer.name)}</a> — ${escapeHtml(peer.manager)} (${reportedYield(peer)})</li>`,
    )
    .join("");
  const fundFaqs: FaqItem[] = [
    {
      question: `What is the current yield of ${fund.name} ${isMmf ? "Money Market Fund" : "Unit Trust"} in Kenya?`,
      answer: `${fund.name} (${fund.manager}) has a published annual figure of ${reportedYield(fund)}${fund.daily_yield != null ? ` and a daily yield of ${percent(fund.daily_yield)}` : ""}${netYield ? `, with an estimated net return of ${netYield} after 15% KRA withholding tax` : ""}.`,
    },
    {
      question: `What is the minimum investment and management fee for ${fund.name}?`,
      answer: `The reported minimum investment is ${fund.minimum_investment ?? "unavailable"}, the management fee is ${percent(fund.management_fee) ?? "unavailable"}, and the stated withdrawal turnaround is ${fund.withdrawal_time ?? "unavailable"}.`,
    },
    {
      question: `Is ${fund.name} regulated by the Capital Markets Authority (CMA)?`,
      answer: `${fund.name} is managed by ${fund.manager}${fund.cma_licensed ? " and is listed as a CMA-regulated scheme in Kenya" : ""}. Always verify current scheme details with the manager and the CMA register.`,
    },
  ];
  return {
    path,
    title: buildFundSeoTitle(fund.name, fund.slug, 60, fund.annual_yield),
    description,
    heading: isMmf && !/money market/i.test(fund.name) ? `${fund.name} Money Market Fund` : fund.name,
    contentHtml: `${paragraph(`${fund.name} is managed by ${fund.manager}${fund.cma_licensed ? " and is listed as CMA regulated" : ""}.`)}${paragraph(fund.description)}${definitionList([
      ["Published figure (confirm gross/net basis)", reportedYield(fund)],
      ["Nominal daily yield", percent(fund.daily_yield)],
      ["Estimated net yield after 15% withholding tax", netYield],
      ["Minimum investment (reported amount; confirm currency)", fund.minimum_investment],
      ["Management fee", percent(fund.management_fee)],
      ["Withdrawal time", fund.withdrawal_time],
      ["Fund type", fund.fund_type?.replaceAll("_", " ")],
      ["Fact-sheet date", sourceDate(fund.fact_sheet_date)],
      ["Record updated", sourceDate(fund.updated_at)],
    ])}<p>${sourceLink(fund.website)}</p><p>A record update is not independent source verification. Confirm currency, yield basis and current terms with the manager.</p>${peerLinks ? `<section><h2>Compare related Kenyan ${isMmf ? "Money Market Funds" : "unit trusts"}</h2><ul>${peerLinks}</ul></section>` : ""}${faqContentHtml(fundFaqs)}${researchLinksHtml("mmf")}<p><a href="/funds">Compare all investment funds</a> · <a href="/money-market-funds-kenya">Kenya MMF comparison table</a> · <a href="/page/source-policy">Source policy</a></p>`,
    jsonLd: [
      {
        "@context": "https://schema.org",
        "@type": "FinancialProduct",
        name: isMmf && !/money market/i.test(fund.name) ? `${fund.name} Money Market Fund` : fund.name,
        description: truncateDescription(description),
        provider: { "@type": "Organization", name: fund.manager },
        url: canonicalUrl(path),
        ...(fund.annual_yield == null || (fund.yield_unit !== "%" && fund.yield_unit !== "USD")
          ? {}
          : { interestRate: { "@type": "QuantitativeValue", value: fund.annual_yield, unitText: "percent per annum" } }),
      },
      faqSchema(fundFaqs),
      breadcrumb([
        { name: "Home", path: "/" },
        { name: "Money Market Funds", path: "/funds" },
        { name: fund.name, path },
      ]),
    ],
  };
}

function newsPage(article: NewsRow): SeoPageDefinition | null {
  if (!validSegment(article.id) || !isIndexableNewsArticle(article)) return null;
  const path = `/news/${article.id}`;
  const published = article.source_published_at || article.date_published || article.created_at;
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

function fundDirectoryPage(funds: FundRow[]): SeoPageDefinition {
  const validFunds = funds.filter((fund) => validSegment(fund.slug) && fund.name && fund.manager);
  const mmfs = [...validFunds]
    .filter((f) => f.fund_type === "money_market")
    .sort((a, b) => Number(b.annual_yield ?? 0) - Number(a.annual_yield ?? 0));
  const kesMmfs = mmfs.filter((f) => f.yield_unit !== "USD");
  const usdMmfs = mmfs.filter((f) => f.yield_unit === "USD");
  const topKes = kesMmfs[0];
  const topUsd = usdMmfs[0];
  const lowMinKes = [...kesMmfs]
    .filter((f) => f.minimum_investment != null && Number(f.minimum_investment) <= 1000)
    .slice(0, 5);
  const latestFactDate =
    kesMmfs.map((f) => f.fact_sheet_date).find((d): d is string => Boolean(d && /^\d{4}-\d{2}-\d{2}$/.test(d))) ||
    "2026-11-02";

  const answerFirstHtml = `<p><strong>Market Summary (<time datetime="${escapeHtml(latestFactDate)}">${escapeHtml(sourceDate(latestFactDate))}</time>):</strong> Kenya Fund Finder tracks ${validFunds.length} CMA-regulated unit trusts in Kenya, including ${kesMmfs.length} KES Money Market Funds and ${usdMmfs.length} USD Money Market Funds.${topKes ? ` The highest-yielding KES MMF is <a href="/compare/${encodeURIComponent(topKes.slug!)}">${escapeHtml(topKes.name)}</a> (${escapeHtml(topKes.manager)}) at ${escapeHtml(percent(topKes.annual_yield) || "")} p.a. (${escapeHtml(percent(topKes.daily_yield) || "")} daily, ~${escapeHtml(((Number(topKes.annual_yield ?? 0) * 0.85)).toFixed(2))}% net after 15% withholding tax).` : ""}${topUsd ? ` Among USD dollar funds, <a href="/compare/${encodeURIComponent(topUsd.slug!)}">${escapeHtml(topUsd.name)}</a> leads at ${escapeHtml(percent(topUsd.annual_yield) || "")} p.a.` : ""} Verify current terms with each fund manager and the <a href="https://licensees.cma.or.ke/licenses/15/">Capital Markets Authority (CMA)</a> before investing.</p>`;

  const fanOutHighlightsHtml = `<section><h2>Money Market Fund Categories in Kenya (KES, USD &amp; Low Minimum Deposit)</h2><ul>${topKes ? `<li><strong>Highest-Yielding KES MMFs:</strong> ${kesMmfs.slice(0, 5).map((f) => `<a href="/compare/${encodeURIComponent(f.slug!)}">${escapeHtml(f.name)}</a> (${escapeHtml(percent(f.annual_yield) || "")})`).join(", ")}.</li>` : ""}${topUsd ? `<li><strong>Top USD Dollar MMFs in Kenya:</strong> ${usdMmfs.slice(0, 5).map((f) => `<a href="/compare/${encodeURIComponent(f.slug!)}">${escapeHtml(f.name)}</a> (${escapeHtml(percent(f.annual_yield) || "")})`).join(", ")}.</li>` : ""}${lowMinKes.length ? `<li><strong>Low-Minimum &amp; M-Pesa Accessible MMFs (KSh 100 – KSh 1,000):</strong> ${lowMinKes.map((f) => `<a href="/compare/${encodeURIComponent(f.slug!)}">${escapeHtml(f.name)}</a> (min KSh ${escapeHtml(f.minimum_investment)})`).join(", ")}.</li>` : ""}</ul></section>`;

  const renderMmfTable = (caption: string, rows: FundRow[]) => {
    if (!rows.length) return "";
    const bodyRows = rows
      .map((f, idx) => {
        const net =
          f.annual_yield != null && Number.isFinite(Number(f.annual_yield))
            ? `${(Number(f.annual_yield) * 0.85).toFixed(2)}%`
            : "Unavailable";
        return `<tr><td>${idx + 1}</td><td><a href="/compare/${encodeURIComponent(f.slug!)}">${escapeHtml(f.name)}</a></td><td>${escapeHtml(f.manager)}</td><td>${escapeHtml(percent(f.annual_yield) || "Unavailable")}</td><td>${escapeHtml(percent(f.daily_yield) || "Unavailable")}</td><td>${escapeHtml(net)}</td><td>${escapeHtml(percent(f.management_fee) || "Unavailable")}</td><td>${escapeHtml(f.minimum_investment ?? "Unavailable")}</td><td>${escapeHtml(sourceDate(f.fact_sheet_date))}</td></tr>`;
      })
      .join("");
    return `<section><h2>${escapeHtml(caption)}</h2><table><caption>${escapeHtml(caption)}</caption><thead><tr><th>Rank</th><th>Fund</th><th>Manager</th><th>Annual Yield (EAR)</th><th>Daily Yield</th><th>Est. Net (After 15% WHT)</th><th>Mgmt Fee</th><th>Min Deposit</th><th>Fact-Sheet Date</th></tr></thead><tbody>${bodyRows}</tbody></table></section>`;
  };

  const grouped = new Map<string, FundRow[]>();
  for (const fund of validFunds) {
    const group = fund.fund_type?.replaceAll("_", " ") || "Other funds";
    grouped.set(group, [...(grouped.get(group) || []), fund]);
  }
  const groups = [...grouped.entries()].map(([label, rows]) => (
    `<section><h2>${escapeHtml(label)}</h2><ul>${rows.map((fund) => (
      `<li><a href="/compare/${encodeURIComponent(fund.slug!)}">${escapeHtml(fund.name)}</a> — ${escapeHtml(fund.manager)}; published figure: ${reportedYield(fund)}; fact sheet: ${escapeHtml(sourceDate(fund.fact_sheet_date))}; record updated: ${escapeHtml(sourceDate(fund.updated_at))}</li>`
    )).join("")}</ul></section>`
  )).join("");

  const description = "Compare all 40 CMA-regulated Money Market Funds (27 KES & 13 USD) and unit trusts in Kenya by daily yield, annual EAR, net return after tax, management fee, and minimum investment. Updated Mon–Fri.";

  return {
    path: "/funds",
    title: "Money Market Funds in Kenya (2026) – Compare 40 KES & USD Yields",
    description,
    heading: "Money Market Funds and Unit Trusts in Kenya",
    contentHtml: `${answerFirstHtml}<p><a href="/money-market-funds-kenya">Compare Kenyan MMF yields, costs and source dates</a> · <a href="/mmf-calculator">Kenya MMF calculator</a></p>${fanOutHighlightsHtml}${renderMmfTable("KES Money Market Funds in Kenya Ranked by Yield", kesMmfs)}${renderMmfTable("USD Money Market Funds in Kenya (Dollar MMFs)", usdMmfs)}${groups}${faqContentHtml(faqByFundType.money_market)}${researchLinksHtml("mmf")}<p><a href="/learn/how-to-invest-in-money-market-funds-kenya">Read the money market fund guide</a></p>`,
    jsonLd: [
      {
        "@context": "https://schema.org",
        "@type": "Dataset",
        name: "Money Market Funds in Kenya – Daily & Annual Yields (KES & USD)",
        description,
        url: canonicalUrl("/funds"),
        creator: { "@type": "Organization", name: "Kenya Fund Finder", url: SEO_SITE_URL },
      },
      {
        "@context": "https://schema.org",
        "@type": "ItemList",
        name: "Money Market Funds in Kenya Ranked by Annual Yield",
        numberOfItems: mmfs.length,
        itemListElement: mmfs.map((f, idx) => ({
          "@type": "ListItem",
          position: idx + 1,
          name: `${f.name} Money Market Fund (${f.manager})`,
          url: canonicalUrl(`/compare/${encodeURIComponent(f.slug!)}`),
        })),
      },
      faqSchema(faqByFundType.money_market),
      breadcrumb([
        { name: "Home", path: "/" },
        { name: "Money Market Funds", path: "/funds" },
      ]),
    ],
  };
}

function stockDirectoryPage(stocks: StockRow[]): SeoPageDefinition {
  const validStocks = stocks.filter((stock) => validSegment(stock.symbol) && stock.name);
  const sortedByCap = [...validStocks].sort((a, b) => Number(b.market_cap ?? 0) - Number(a.market_cap ?? 0));
  const tableRows = sortedByCap
    .map(
      (stock) =>
        `<tr><td><a href="/stocks/${encodeURIComponent(stock.symbol!.toUpperCase())}">${escapeHtml(stock.symbol!.toUpperCase())}</a></td><td><a href="/stocks/${encodeURIComponent(stock.symbol!.toUpperCase())}">${escapeHtml(stock.name)}</a></td><td>${escapeHtml(stock.sector || "Other")}</td><td>${escapeHtml(money(stock.price) || "Unavailable")}</td><td>${escapeHtml(percent(stock.day_change_percent) || "Unavailable")}</td><td>${escapeHtml(compactNumber(stock.volume) || "Unavailable")}</td><td>${escapeHtml(money(stock.market_cap) || "Unavailable")}</td><td>${escapeHtml(stock.pe_ratio ?? "Unavailable")}</td><td>${escapeHtml(percent(stock.dividend_yield) || "Unavailable")}</td></tr>`,
    )
    .join("");
  const stockTable = `<section><h2>Nairobi Securities Exchange (NSE) Share Prices &amp; Valuation Table</h2><table><caption>NSE Listed Companies Ranked by Market Capitalisation</caption><thead><tr><th>Ticker</th><th>Company</th><th>Sector</th><th>Price (KSh)</th><th>Daily Change</th><th>Volume</th><th>Market Cap</th><th>P/E Ratio</th><th>Dividend Yield</th></tr></thead><tbody>${tableRows}</tbody></table></section>`;

  const sectors = [...new Set(validStocks.map(s => s.sector || "Other"))].sort();
  const links = sectors.map(sector => `<section><h2>${escapeHtml(sector)}</h2><ul>${validStocks.filter(s => (s.sector || "Other") === sector).map(stock => `<li><a href="/stocks/${encodeURIComponent(stock.symbol!.toUpperCase())}">${escapeHtml(stock.name)} (${escapeHtml(stock.symbol!.toUpperCase())})</a> — ${escapeHtml(money(stock.price) || "Price unavailable")}; daily movement ${escapeHtml(percent(stock.day_change_percent) || "unavailable")}; volume ${escapeHtml(compactNumber(stock.volume) || "unavailable")}; quote date ${escapeHtml(sourceDate(stock.provider_updated_at || stock.updated_at))}; source ${escapeHtml(stock.quote_source || "public market-data feed")}</li>`).join("")}</ul></section>`).join("");
  const stockFaqs: FaqItem[] = [
    {
      question: "How do I buy shares on the Nairobi Securities Exchange (NSE)?",
      answer: "Open a Central Depository System (CDS) account through a CMA-licensed stockbroker or investment bank in Kenya, fund your trading account, and place buy or sell orders for NSE-listed tickers.",
    },
    {
      question: "What are the Nairobi Securities Exchange (NSE) trading hours?",
      answer: "The NSE regular equity trading session runs Monday to Friday from 9:00 AM to 3:00 PM East Africa Time (EAT), excluding Kenyan public holidays.",
    },
    {
      question: "How are dividends taxed on Kenyan NSE stocks?",
      answer: "Dividends paid to resident retail investors on qualifying NSE shares are typically subject to a 5% withholding tax deducted at source. Verify current tax rules with KRA or your licensed broker.",
    },
  ];
  const description = "Track live Nairobi Securities Exchange (NSE) share prices today, daily gainers and losers, market cap, P/E ratios, and dividend yields for Safaricom (SCOM), Equity (EQTY), KCB, EABL, and all Kenyan listed companies.";
  const topCapStocks = sortedByCap.slice(0, 5);
  const latestStockIso =
    sortedByCap.map((s) => (s.provider_updated_at || s.updated_at)?.slice(0, 10)).find((d): d is string => Boolean(d && /^\d{4}-\d{2}-\d{2}$/.test(d))) ||
    "2026-11-02";
  const stockAnswerFirstHtml = `<p><strong>NSE Market Summary (<time datetime="${escapeHtml(latestStockIso)}">${escapeHtml(sourceDate(latestStockIso))}</time>):</strong> Track ${validStocks.length} companies listed on the Nairobi Securities Exchange (NSE) across banking, telecommunications, manufacturing, energy, and agriculture.${topCapStocks.length ? ` The largest NSE listings by market capitalisation include ${topCapStocks.map((s) => `<a href="/stocks/${encodeURIComponent(s.symbol!.toUpperCase())}">${escapeHtml(s.name)} (${escapeHtml(s.symbol!.toUpperCase())})</a> at ${escapeHtml(money(s.price) || "unavailable")}`).join(", ")}.` : ""} Quotes may be delayed; verify executable prices with a CMA-licensed stockbroker.</p>`;
  return {
    path: "/stocks",
    title: "NSE Share Prices Today – Nairobi Securities Exchange Stocks (2026)",
    description,
    heading: "Kenyan Stocks: NSE Share Prices Today",
    contentHtml: `${stockAnswerFirstHtml}${stockTable}<section><h2>NSE company directory by sector</h2>${links}</section><section><h2>Understanding market metrics</h2><p>Share price is the last reported value per share. Daily movement compares it with the feed's reference price. Volume counts traded shares; market cap measures share price times shares outstanding. These measures use reported data and do not guarantee execution prices.</p><a href="/page/market-data-methodology">Data sources and methodology</a></section>${faqContentHtml(stockFaqs)}${researchLinksHtml("stocks")}<p><a href="/markets">Open the markets dashboard</a> · <a href="/news">Read market news</a></p>`,
    jsonLd: [
      {
        "@context": "https://schema.org",
        "@type": "Dataset",
        name: "Nairobi Securities Exchange (NSE) Share Prices & Market Data",
        description,
        url: canonicalUrl("/stocks"),
        creator: { "@type": "Organization", name: "Kenya Fund Finder", url: SEO_SITE_URL },
      },
      {
        "@context": "https://schema.org",
        "@type": "ItemList",
        name: "Nairobi Securities Exchange (NSE) Listed Companies by Market Cap",
        numberOfItems: sortedByCap.length,
        itemListElement: sortedByCap.map((s, idx) => ({
          "@type": "ListItem",
          position: idx + 1,
          name: `${s.name} (${s.symbol!.toUpperCase()})`,
          url: canonicalUrl(`/stocks/${encodeURIComponent(s.symbol!.toUpperCase())}`),
        })),
      },
      faqSchema(stockFaqs),
      breadcrumb([
        { name: "Home", path: "/" },
        { name: "NSE Stocks", path: "/stocks" },
      ]),
    ],
  };
}

function newsDirectoryPage(news: NewsRow[]): SeoPageDefinition {
  const eligible = news.filter(isIndexableNewsArticle);
  const recent = eligible.slice(0, 20).map((article) => (
    `<li><a href="/news/${article.id}">${escapeHtml(article.title)}</a>${article.source ? ` — ${escapeHtml(article.source)}` : ""}</li>`
  )).join("");
  return {
    path: "/news",
    title: "Kenya Market News – Stocks, Funds, Business & Economy",
    description: "Read Kenyan stock-market, investment-fund, business and economic news with linked company data and concise market context.",
    heading: "Kenya market news",
    contentHtml: `${paragraph(`Follow current Kenyan market news and browse ${eligible.length} articles that meet the public indexing standard.`)}<p><a href="/news/archive">Browse the complete indexed news archive</a></p><section><h2>Latest indexed articles</h2><ol>${recent}</ol></section>`,
  };
}

function newsArchivePages(news: NewsRow[]): SeoPageDefinition[] {
  const eligible = news.filter(isIndexableNewsArticle);
  const pageCount = getNewsArchivePageCount(eligible.length);
  return Array.from({ length: pageCount }, (_, index) => {
    const page = index + 1;
    const path = getNewsArchivePath(page);
    const articles = getNewsArchivePage(eligible, page);
    const articleLinks = articles.map((article) => (
      `<li><a href="/news/${article.id}">${escapeHtml(article.title)}</a>${article.source ? ` — ${escapeHtml(article.source)}` : ""}</li>`
    )).join("");
    const pagination = Array.from({ length: pageCount }, (_, pageIndex) => {
      const target = pageIndex + 1;
      return `<a href="${getNewsArchivePath(target)}"${target === page ? ' aria-current="page"' : ""}>Page ${target}</a>`;
    }).join(" · ");

    return {
      path,
      title: page === 1 ? "Kenya Market News Archive | Kenya Fund Finder" : `Kenya Market News Archive – Page ${page} | Kenya Fund Finder`,
      description: `Browse page ${page} of the Kenya Fund Finder archive covering Kenyan markets, NSE stocks, funds, FX, commodities, business and the economy.`,
      heading: page === 1 ? "Kenya market news archive" : `Kenya market news archive – page ${page}`,
      contentHtml: `${paragraph(`Archive page ${page} of ${pageCount}. These articles meet the public indexing standard for a valid title, publication date, and substantive summary.`)}<ol>${articleLinks}</ol><nav aria-label="News archive pages">${pagination}</nav><p><a href="/news">Return to latest market news</a></p>`,
      jsonLd: breadcrumb([
        { name: "Home", path: "/" },
        { name: "Market News", path: "/news" },
        { name: page === 1 ? "Archive" : `Archive page ${page}`, path },
      ]),
    };
  });
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
  const [dbStocks, dbFunds] = await Promise.all([
    publicStocks<StockRow>(),
    seoPublicData<FundRow>("funds", "slug,name,manager,annual_yield,daily_yield,minimum_investment,management_fee,withdrawal_time,description,fund_type,yield_unit,cma_licensed,is_published,updated_at,logo_url,fact_sheet_date,website", "name.asc"),
  ]);
  const existingStockSymbols = new Set(dbStocks.map((s) => String(s.symbol ?? "").toUpperCase()));
  const missingFallbackStocks: StockRow[] = FALLBACK_KENYAN_STOCKS
    .filter((s) => !existingStockSymbols.has(s.symbol.toUpperCase()))
    .map((s) => ({
      symbol: s.symbol,
      name: s.name,
      sector: s.sector,
      price: s.price,
      day_change: s.day_change,
      day_change_percent: s.day_change_percent,
      volume: s.volume,
      market_cap: s.market_cap,
      pe_ratio: s.pe_ratio,
      dividend_yield: s.dividend_yield,
      year_high: s.year_high,
      year_low: s.year_low,
      updated_at: s.updated_at,
      is_active: true,
    }));
  const stocks: StockRow[] = [...dbStocks, ...missingFallbackStocks];
  const existingSlugs = new Set(dbFunds.map((f) => String(f.slug ?? "").toLowerCase()));
  const missingSerrariFunds: FundRow[] = SERRARI_MMF_SNAPSHOT_2026_11_02
    .filter((s) => !existingSlugs.has(s.slug.toLowerCase()))
    .map((s) => ({
      slug: s.slug,
      name: s.name,
      manager: s.manager,
      annual_yield: s.annual_yield,
      daily_yield: s.daily_yield,
      minimum_investment: s.minimum_investment,
      management_fee: s.management_fee,
      withdrawal_time: s.withdrawal_time,
      description: `The ${s.name} Money Market Fund (${s.currency}) is a CMA-regulated low-risk collective investment scheme managed by ${s.manager}, investing in short-term Kenyan money market instruments.`,
      fund_type: "money_market",
      yield_unit: s.yield_unit,
      cma_licensed: true,
      is_published: true,
      updated_at: `${s.asOfDate}T09:00:00+03:00`,
      logo_url: null,
      fact_sheet_date: s.asOfDate,
      website: s.website,
    }));
  const funds: FundRow[] = [...dbFunds, ...missingSerrariFunds];

  if (!stocks.some(s => validSegment(s.symbol) && s.name) || !funds.some(f => validSegment(f.slug) && f.name && f.manager) || !funds.some(f => f.fund_type === "money_market")) {
    throw new Error("SEO requires populated stock, fund and MMF directories");
  }
  const optional = await Promise.allSettled([
    supaSelect<NewsRow>("news_articles_public", "select=id,title,summary,content,source,date_published,source_published_at,created_at,updated_at,image_url,category,read_time,status&status=eq.published&order=source_published_at.desc.nullslast,date_published.desc.nullslast"),
    supaSelect<SitePageRow>("site_pages_public", "select=slug,title,content,meta,updated_at&order=slug.asc"),
  ]);
  const news: NewsRow[] = optional[0].status === "fulfilled" ? optional[0].value as NewsRow[] : [];
  const sitePages: SitePageRow[] = optional[1].status === "fulfilled" ? optional[1].value as SitePageRow[] : [];
  optional.forEach(result => { if (result.status === "rejected") console.warn("[seo-prerender] optional content unavailable:", result.reason); });

  return [
    fundDirectoryPage(funds),
    stockDirectoryPage(stocks),
    mmfHubSeo(funds),
    newsDirectoryPage(news),
    ...newsArchivePages(news),
    ...stocks.map(stock => stockPage(stock, stocks)),
    ...funds.map(fund => fundPage(fund, funds)),
    ...news.map(newsPage),
    ...sitePages
      .filter((page) => ["privacy", "terms"].includes(page.slug || "") || isIndexableSitePageSlug(page.slug))
      .map(contentPage),
  ].filter((page): page is SeoPageDefinition => Boolean(page));
}

async function main() {
  const template = readFileSync(TEMPLATE_PATH, "utf8");
  let dynamicPages: SeoPageDefinition[] = [];
  if (STRICT && SKIP_DYNAMIC) throw new Error("Production SEO builds cannot skip market data");
  if (!SKIP_DYNAMIC) {
    try {
      dynamicPages = await loadDynamicPages();
    } catch (error) {
      console.error("[seo-prerender] dynamic content fetch failed", error);
      throw error;
    }
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
