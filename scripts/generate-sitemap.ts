// Generates public/sitemap.xml — runs via predev/prebuild npm hooks.
// Includes static routes plus dynamic fund-detail (/compare/:slug) and
// news-article (/news/:id) entries pulled from Supabase.

import { writeFileSync } from "fs";
import { resolve } from "path";
import { isIndexableNewsArticle, type SeoNewsArticleLike } from "../src/lib/seoNewsEligibility";
import { getNewsArchivePageCount, getNewsArchivePath } from "../src/lib/newsArchive";
import { isIndexableSitePageSlug } from "../src/lib/seoSitePageEligibility";
import { RESEARCH_ARTICLES, articlePath } from "../src/data/seoGrowthContent";
import { SERRARI_MMF_SNAPSHOT_2026_11_02 } from "../src/lib/serrariMmfSync";
import { FALLBACK_KENYAN_STOCKS } from "../src/lib/stockDataFallback";
import { seoPublicData, SEO_SUPABASE_URL, SEO_SUPABASE_KEY } from "./seo-public-data";

const BASE_URL = "https://kenyafundfinder.com";
const SUPABASE_URL = SEO_SUPABASE_URL;
const SUPABASE_ANON_KEY = SEO_SUPABASE_KEY;
const buildOutput = process.argv.includes("--build-output");
const strict = buildOutput || process.env.VERCEL === "1";

// Cap to keep sitemap well under the 50k URL / 50MB limit.
const NEWS_LIMIT = 2000;

interface SitemapEntry {
  path: string;
  lastmod?: string;
  changefreq?: "always" | "hourly" | "daily" | "weekly" | "monthly" | "yearly" | "never";
  priority?: string;
}

interface NewsSitemapRow extends SeoNewsArticleLike {
  updated_at: string | null;
}

const staticEntries: SitemapEntry[] = [
  { path: "/money-market-funds-kenya", lastmod: "2026-11-02", changefreq: "daily", priority: "1.0" },
  { path: "/mmf-calculator", changefreq: "monthly", priority: "0.9" },
  ...RESEARCH_ARTICLES.map(a => ({ path: articlePath(a), changefreq: "monthly" as const, priority: "0.8" })),
  { path: "/", changefreq: "daily", priority: "1.0" },
  { path: "/funds", lastmod: "2026-11-02", changefreq: "daily", priority: "1.0" },
  { path: "/savings", changefreq: "daily", priority: "0.9" },
  { path: "/stocks", changefreq: "daily", priority: "1.0" },
  { path: "/compare", changefreq: "daily", priority: "0.9" },
  { path: "/rates", changefreq: "daily", priority: "0.8" },
  { path: "/commodities", changefreq: "daily", priority: "0.8" },
  { path: "/markets", changefreq: "daily", priority: "0.8" },
  { path: "/treasury", changefreq: "weekly", priority: "0.8" },
  { path: "/news", changefreq: "daily", priority: "0.8" },
  { path: "/calculator", changefreq: "monthly", priority: "0.8" },
  { path: "/learn", changefreq: "monthly", priority: "0.7" },
  { path: "/learn/how-to-invest-in-money-market-funds-kenya", changefreq: "monthly", priority: "0.8" },
  { path: "/checklist", changefreq: "monthly", priority: "0.6" },
  { path: "/privacy", changefreq: "yearly", priority: "0.3" },
  { path: "/terms", changefreq: "yearly", priority: "0.3" },
];

async function supaSelect<T>(path: string): Promise<T[]> {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    headers: {
      apikey: SUPABASE_ANON_KEY,
      ...(SUPABASE_ANON_KEY.startsWith("eyJ") ? { Authorization: `Bearer ${SUPABASE_ANON_KEY}` } : {}),
    },
    signal: AbortSignal.timeout(30_000),
  });
  if (!res.ok) {
    console.warn(`[sitemap] supabase ${path} -> ${res.status}; skipping`);
    return [];
  }
  return (await res.json()) as T[];
}

// Stock data is intentionally exposed through the hardened public-data
// gateway. This avoids relying on direct table/view grants during static SEO
// generation while keeping the query restricted to public fields.
async function publicStocks<T>(select: string): Promise<T[]> {
  return seoPublicData<T>("stocks", select, "symbol.asc");
}

let fetchedNewsRows: NewsSitemapRow[] = [];

async function fetchDynamic(): Promise<SitemapEntry[]> {
  const [funds, news, pages, stocks] = await Promise.all([
    seoPublicData<{ slug: string; updated_at: string }>("funds", "slug,updated_at", "name.asc"),
    supaSelect<NewsSitemapRow>(
      `news_articles_public?select=id,title,summary,content,status,date_published,source_published_at,created_at,updated_at&status=eq.published&order=source_published_at.desc.nullslast,date_published.desc.nullslast&limit=${NEWS_LIMIT}`,
    ),
    supaSelect<{ slug: string; updated_at: string }>(
      "site_pages_public?select=slug,updated_at",
    ),
    publicStocks<{ symbol: string; updated_at: string }>("symbol,updated_at"),
  ]);
  if (!funds.length || !stocks.length) throw new Error("Sitemap requires populated stock and fund directories");

  fetchedNewsRows = news;

  const fundBySlug = new Map<string, { slug: string; updated_at: string }>();
  for (const f of funds) {
    if (f.slug) fundBySlug.set(f.slug.toLowerCase(), f);
  }
  for (const s of SERRARI_MMF_SNAPSHOT_2026_11_02) {
    if (!fundBySlug.has(s.slug.toLowerCase())) {
      fundBySlug.set(s.slug.toLowerCase(), { slug: s.slug, updated_at: s.asOfDate });
    }
  }
  const fundEntries: SitemapEntry[] = Array.from(fundBySlug.values()).map((f) => ({
    path: `/compare/${f.slug}`,
    lastmod: f.updated_at?.slice(0, 10),
    changefreq: "daily",
    priority: "0.8",
  }));
  const indexableNews = news.filter(isIndexableNewsArticle);
  const newsEntries: SitemapEntry[] = indexableNews
    .map((n) => ({
      path: `/news/${n.id}`,
      lastmod: (n.updated_at || n.source_published_at || n.date_published || n.created_at)?.slice(0, 10),
      changefreq: "weekly",
      priority: "0.5",
    }));
  const newsArchiveEntries: SitemapEntry[] = Array.from(
    { length: getNewsArchivePageCount(indexableNews.length) },
    (_, index) => ({
      path: getNewsArchivePath(index + 1),
      changefreq: "daily" as const,
      priority: "0.6",
    }),
  );
  const pageEntries: SitemapEntry[] = pages
    .filter((p) => isIndexableSitePageSlug(p.slug))
    .map((p) => ({
      path: `/page/${p.slug}`,
      lastmod: p.updated_at?.slice(0, 10),
      changefreq: "monthly",
      priority: "0.5",
    }));
  const stockBySymbol = new Map<string, { symbol: string; updated_at: string }>();
  for (const s of stocks) {
    if (s.symbol) stockBySymbol.set(s.symbol.toUpperCase(), s);
  }
  for (const fb of FALLBACK_KENYAN_STOCKS) {
    if (!stockBySymbol.has(fb.symbol.toUpperCase())) {
      stockBySymbol.set(fb.symbol.toUpperCase(), { symbol: fb.symbol, updated_at: fb.updated_at });
    }
  }
  const stockEntries: SitemapEntry[] = Array.from(stockBySymbol.values()).map((s) => ({
    path: `/stocks/${encodeURIComponent(s.symbol)}`,
    lastmod: s.updated_at?.slice(0, 10),
    changefreq: "daily",
    priority: "0.8",
  }));
  return [...fundEntries, ...newsArchiveEntries, ...newsEntries, ...pageEntries, ...stockEntries];
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function stripPublisherSuffix(title: string): string {
  return title
    .replace(
      /\s*[-|–—]\s*(Business Daily|Capital FM|Capital News|The Standard|Nation|Standard Media|Citizen Digital|Business Today|Techweez|Kenyan Wallstreet|Reuters|Bloomberg|NTV Kenya|KBC|KFF|Kenya Fund Finder).*$/i,
      "",
    )
    .trim();
}

function render(entries: SitemapEntry[]) {
  const urls = entries.map((e) =>
    [
      `  <url>`,
      `    <loc>${escapeXml(`${BASE_URL}${e.path}`)}</loc>`,
      e.lastmod ? `    <lastmod>${escapeXml(e.lastmod)}</lastmod>` : null,
      e.changefreq ? `    <changefreq>${e.changefreq}</changefreq>` : null,
      e.priority ? `    <priority>${e.priority}</priority>` : null,
      `  </url>`,
    ]
      .filter(Boolean)
      .join("\n"),
  );
  return [
    `<?xml version="1.0" encoding="UTF-8"?>`,
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`,
    ...urls,
    `</urlset>`,
  ].join("\n");
}

function renderNewsSitemap(news: NewsSitemapRow[]): string {
  const indexable = news.filter(isIndexableNewsArticle);
  const cutoff48h = Date.now() - 48 * 60 * 60 * 1000;
  let items = indexable.filter((n) => {
    const pubDateStr = n.source_published_at || n.date_published || n.created_at;
    if (!pubDateStr) return false;
    const time = new Date(pubDateStr).getTime();
    return !Number.isNaN(time) && time >= cutoff48h;
  });

  // Fallback: if fewer than 1 article in last 48h, provide up to 10 recent indexable articles so sitemap is not empty
  if (items.length === 0) {
    items = indexable.slice(0, 10);
  } else if (items.length > 1000) {
    items = items.slice(0, 1000);
  }

  const urls = items.map((n) => {
    const rawDate = n.source_published_at || n.date_published || n.created_at;
    const pubDate = rawDate ? new Date(rawDate).toISOString() : new Date().toISOString();
    const cleanTitle = stripPublisherSuffix(n.title || "Kenya Financial Market News");
    const title = escapeXml(cleanTitle || "Kenya Financial Market News");
    const loc = escapeXml(`${BASE_URL}/news/${n.id}`);

    return [
      `  <url>`,
      `    <loc>${loc}</loc>`,
      `    <news:news>`,
      `      <news:publication>`,
      `        <news:name>Kenya Fund Finder</news:name>`,
      `        <news:language>en</news:language>`,
      `      </news:publication>`,
      `      <news:publication_date>${pubDate}</news:publication_date>`,
      `      <news:title>${title}</news:title>`,
      `    </news:news>`,
      `  </url>`,
    ].join("\n");
  });

  return [
    `<?xml version="1.0" encoding="UTF-8"?>`,
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:news="http://www.google.com/schemas/sitemap-news/0.9">`,
    ...urls,
    `</urlset>`,
  ].join("\n");
}

async function main() {
  let dynamic: SitemapEntry[] = [];
  try {
    dynamic = await fetchDynamic();
  } catch (err) {
    if (strict) throw err;
    console.warn("[sitemap] dynamic fetch failed; writing static-only sitemap", err);
  }
  const all = Array.from(new Map([...staticEntries, ...dynamic].map((entry) => [entry.path, entry])).values());
  const sitemapXml = render(all);
  const newsSitemapXml = renderNewsSitemap(fetchedNewsRows);

  const sitemapTarget = resolve(buildOutput ? "dist/sitemap.xml" : "public/sitemap.xml");
  writeFileSync(sitemapTarget, sitemapXml);

  const newsSitemapTarget = resolve(buildOutput ? "dist/news-sitemap.xml" : "public/news-sitemap.xml");
  writeFileSync(newsSitemapTarget, newsSitemapXml);

  if (buildOutput) {
    try {
      writeFileSync(resolve("public/sitemap.xml"), sitemapXml);
      writeFileSync(resolve("public/news-sitemap.xml"), newsSitemapXml);
    } catch {
      // non-fatal
    }
  }

  console.log(
    `sitemap.xml written (${all.length} entries: ${staticEntries.length} static, ${dynamic.length} dynamic)`,
  );
  console.log(
    `news-sitemap.xml written (${fetchedNewsRows.length} total news rows evaluated)`,
  );
}

main().catch(error => { console.error("[sitemap] failed", error); process.exitCode = 1; });
