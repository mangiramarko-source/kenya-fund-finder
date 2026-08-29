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

const DIST_DIR = resolve("dist");
const TEMPLATE_PATH = join(DIST_DIR, "index.html");
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || "https://caawgzuofnujrznwbuxk.supabase.co";
const SUPABASE_ANON_KEY =
  process.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  process.env.VITE_SUPABASE_ANON_KEY ||
  "sb_publishable_6snC3do-2emXAMEp7-C9AA_3_kb-GkC";
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
    {
      path: "/",
      title: "Kenya Fund Finder – NSE Stocks, Money Market Funds & FX",
      description: "Compare CMA-regulated money market funds, NSE share prices, FX rates and commodities in Kenya. Track performance, charts and market news.",
      heading: "Kenya investment markets in one place",
      image: SEO_DEFAULT_OG_IMAGE,
      contentHtml: [
        paragraph("Kenya Fund Finder brings public information about Kenyan investment funds and markets into one place so you can research options before making a decision."),
        '<section><h2>Compare Kenyan investment options</h2><p>Review published yields, fees, minimum deposits and withdrawal periods on the <a href="/funds">fund directory</a>, compare selected products side by side with the <a href="/compare">fund comparison tool</a>, estimate possible returns using the <a href="/calculator">investment calculator</a>, and use the <a href="/checklist">fund checklist</a> when evaluating an option.</p></section>',
        '<section><h2>Follow markets and rates</h2><p>Explore <a href="/stocks">Nairobi Securities Exchange stocks</a>, <a href="/treasury">Kenya Treasury bills and bonds</a>, <a href="/rates">foreign exchange rates</a>, <a href="/commodities">commodity prices</a>, or open the combined <a href="/markets">markets dashboard</a>.</p></section>',
        '<section><h2>Learn before you invest</h2><p>Read current <a href="/news">Kenyan market news</a>, browse plain-language answers in the <a href="/learn">investing learning centre</a>, or follow the practical guide on <a href="/learn/how-to-invest-in-money-market-funds-kenya">how to invest in a Kenyan money market fund</a>. Verify product details with the fund manager and the relevant regulator before investing.</p></section>',
        '<section><h2>About and policies</h2><p>Learn <a href="/page/about">about Kenya Fund Finder</a>, <a href="/page/contact">contact the team</a>, and review the <a href="/privacy">privacy policy</a> and <a href="/terms">terms of use</a>.</p></section>',
      ].join(""),
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
      contentHtml: `${paragraph("Read practical educational guides about Kenyan investment products and markets.")}${faqContentHtml(faqByFundType.general)}`,
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
    title: buildFundSeoTitle(fund.name, fund.slug),
    description,
    heading: fund.name,
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
  const grouped = new Map<string, FundRow[]>();
  for (const fund of validFunds) {
    const group = fund.fund_type?.replaceAll("_", " ") || "Other funds";
    grouped.set(group, [...(grouped.get(group) || []), fund]);
  }
  const groups = [...grouped.entries()].map(([label, rows]) => (
    `<section><h2>${escapeHtml(label)}</h2><ul>${rows.map((fund) => (
      `<li><a href="/compare/${encodeURIComponent(fund.slug!)}">${escapeHtml(fund.name)}</a> — ${escapeHtml(fund.manager)}</li>`
    )).join("")}</ul></section>`
  )).join("");

  return {
    path: "/funds",
    title: "Money Market Funds in Kenya – Compare Yields & Fees",
    description: "Compare CMA-regulated money market funds and unit trusts in Kenya by annual yield, fees, minimum investment and withdrawal time.",
    heading: "Money market funds and unit trusts in Kenya",
    contentHtml: `${paragraph(`Browse ${validFunds.length} published Kenyan unit trust funds. Compare current terms on each fund page and verify details with the manager before investing.`)}${groups}<p><a href="/calculator">Estimate possible returns</a> · <a href="/checklist">Use the fund checklist</a> · <a href="/learn/how-to-invest-in-money-market-funds-kenya">Read the money market fund guide</a></p>`,
  };
}

function stockDirectoryPage(stocks: StockRow[]): SeoPageDefinition {
  const validStocks = stocks.filter((stock) => validSegment(stock.symbol) && stock.name);
  const links = validStocks.map((stock) => (
    `<li><a href="/stocks/${encodeURIComponent(stock.symbol!)}">${escapeHtml(stock.name)} (${escapeHtml(stock.symbol!.toUpperCase())})</a>${stock.sector ? ` — ${escapeHtml(stock.sector)}` : ""}</li>`
  )).join("");
  return {
    path: "/stocks",
    title: "NSE Share Prices Today – Kenyan Stocks Market Data",
    description: "Track Nairobi Securities Exchange share prices, daily changes, market capitalisation, dividend yields and price charts for Kenyan listed companies.",
    heading: "Nairobi Securities Exchange share prices",
    contentHtml: `${paragraph(`Browse ${validStocks.length} active NSE listings with current market data and company detail pages.`)}<section><h2>NSE company directory</h2><ul>${links}</ul></section><p><a href="/markets">Open the markets dashboard</a> · <a href="/news">Read market news</a></p>`,
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
  const [stocks, funds, news, sitePages] = await Promise.all([
    supaSelect<StockRow>("stocks_public", "select=symbol,name,sector,price,day_change,day_change_percent,volume,market_cap,pe_ratio,dividend_yield,year_high,year_low,updated_at,is_active&is_active=eq.true&order=sort_order.asc"),
    supaSelect<FundRow>("funds_public", "select=slug,name,manager,annual_yield,daily_yield,minimum_investment,management_fee,withdrawal_time,description,fund_type,yield_unit,cma_licensed,is_published,updated_at,logo_url&is_published=eq.true&order=name.asc"),
    supaSelect<NewsRow>("news_articles_public", "select=id,title,summary,content,source,date_published,source_published_at,created_at,updated_at,image_url,category,read_time,status&status=eq.published&order=source_published_at.desc.nullslast,date_published.desc.nullslast"),
    supaSelect<SitePageRow>("site_pages_public", "select=slug,title,content,meta,updated_at&order=slug.asc"),
  ]);

  return [
    fundDirectoryPage(funds),
    stockDirectoryPage(stocks),
    newsDirectoryPage(news),
    ...newsArchivePages(news),
    ...stocks.map(stockPage),
    ...funds.map(fundPage),
    ...news.map(newsPage),
    ...sitePages
      .filter((page) => ["privacy", "terms"].includes(page.slug || "") || isIndexableSitePageSlug(page.slug))
      .map(contentPage),
  ].filter((page): page is SeoPageDefinition => Boolean(page));
}

async function main() {
  const template = readFileSync(TEMPLATE_PATH, "utf8");
  let dynamicPages: SeoPageDefinition[] = [];
  if (!SKIP_DYNAMIC) {
    try {
      dynamicPages = await loadDynamicPages();
    } catch (error) {
      console.error("[seo-prerender] dynamic content fetch failed", error);
      if (STRICT) process.exitCode = 1;
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
