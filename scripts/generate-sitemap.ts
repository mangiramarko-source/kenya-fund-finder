// Generates public/sitemap.xml — runs via predev/prebuild npm hooks.
// Includes static routes plus dynamic fund-detail (/compare/:slug) and
// news-article (/news/:id) entries pulled from Supabase.

import { writeFileSync } from "fs";
import { resolve } from "path";
import { isIndexableNewsArticle, type SeoNewsArticleLike } from "../src/lib/seoNewsEligibility";
import { getNewsArchivePageCount, getNewsArchivePath } from "../src/lib/newsArchive";
import { isIndexableSitePageSlug } from "../src/lib/seoSitePageEligibility";

const BASE_URL = "https://kenyafundfinder.com";
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || "https://caawgzuofnujrznwbuxk.supabase.co";
const SUPABASE_ANON_KEY =
  process.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  process.env.VITE_SUPABASE_ANON_KEY ||
  "sb_publishable_6snC3do-2emXAMEp7-C9AA_3_kb-GkC";

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
  { path: "/", changefreq: "daily", priority: "1.0" },
  { path: "/funds", changefreq: "daily", priority: "0.9" },
  { path: "/stocks", changefreq: "daily", priority: "0.9" },
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
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
    },
  });
  if (!res.ok) {
    console.warn(`[sitemap] supabase ${path} -> ${res.status}; skipping`);
    return [];
  }
  return (await res.json()) as T[];
}

async function fetchDynamic(): Promise<SitemapEntry[]> {
  const [funds, news, pages, stocks] = await Promise.all([
    supaSelect<{ slug: string; updated_at: string }>(
      "funds_public?select=slug,updated_at&is_published=eq.true&order=name.asc",
    ),
    supaSelect<NewsSitemapRow>(
      `news_articles_public?select=id,title,summary,content,status,date_published,source_published_at,created_at,updated_at&status=eq.published&order=source_published_at.desc.nullslast,date_published.desc.nullslast&limit=${NEWS_LIMIT}`,
    ),
    supaSelect<{ slug: string; updated_at: string }>(
      "site_pages_public?select=slug,updated_at",
    ),
    supaSelect<{ symbol: string; updated_at: string }>(
      "stocks_public?select=symbol,updated_at&is_active=eq.true&order=symbol.asc",
    ),
  ]);

  const fundEntries: SitemapEntry[] = funds.map((f) => ({
    path: `/compare/${f.slug}`,
    lastmod: f.updated_at?.slice(0, 10),
    changefreq: "daily",
    priority: "0.7",
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
  const stockEntries: SitemapEntry[] = stocks.map((s) => ({
    path: `/stocks/${encodeURIComponent(s.symbol)}`,
    lastmod: s.updated_at?.slice(0, 10),
    changefreq: "daily",
    priority: "0.6",
  }));
  return [...fundEntries, ...newsArchiveEntries, ...newsEntries, ...pageEntries, ...stockEntries];
}

function render(entries: SitemapEntry[]) {
  const urls = entries.map((e) =>
    [
      `  <url>`,
      `    <loc>${BASE_URL}${e.path}</loc>`,
      e.lastmod ? `    <lastmod>${e.lastmod}</lastmod>` : null,
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

async function main() {
  let dynamic: SitemapEntry[] = [];
  try {
    dynamic = await fetchDynamic();
  } catch (err) {
    console.warn("[sitemap] dynamic fetch failed; writing static-only sitemap", err);
  }
  const all = Array.from(new Map([...staticEntries, ...dynamic].map((entry) => [entry.path, entry])).values());
  writeFileSync(resolve("public/sitemap.xml"), render(all));
  console.log(
    `sitemap.xml written (${all.length} entries: ${staticEntries.length} static, ${dynamic.length} dynamic)`,
  );
}

main();
