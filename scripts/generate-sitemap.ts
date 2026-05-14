// Runs before `vite dev` and `vite build`; writes public/sitemap.xml.
// Pulls dynamic fund + news routes from Supabase so crawlers see every page.

import { writeFileSync } from "fs";
import { resolve } from "path";
import { createClient } from "@supabase/supabase-js";

const BASE_URL = "https://kenyafundfinder.com";
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || "https://qrmthciurngpzpjhevdj.supabase.co";
const SUPABASE_KEY =
  process.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFybXRoY2l1cm5ncHpwamhldmRqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIyNzQ1ODksImV4cCI6MjA4Nzg1MDU4OX0.WeQLthaDLzYdmSjY_tt4_ZClx68aXQe3EOjn314yygs";

interface Entry {
  path: string;
  changefreq?: "always" | "hourly" | "daily" | "weekly" | "monthly" | "yearly" | "never";
  priority?: string;
  lastmod?: string;
}

const staticEntries: Entry[] = [
  { path: "/", changefreq: "daily", priority: "1.0" },
  { path: "/funds", changefreq: "daily", priority: "0.9" },
  { path: "/stocks", changefreq: "daily", priority: "0.9" },
  { path: "/compare", changefreq: "daily", priority: "0.9" },
  { path: "/rates", changefreq: "daily", priority: "0.8" },
  { path: "/commodities", changefreq: "daily", priority: "0.8" },
  { path: "/markets", changefreq: "daily", priority: "0.8" },
  { path: "/news", changefreq: "daily", priority: "0.8" },
  { path: "/overview", changefreq: "daily", priority: "0.8" },
  { path: "/calculator", changefreq: "monthly", priority: "0.8" },
  { path: "/alerts", changefreq: "monthly", priority: "0.7" },
  { path: "/learn", changefreq: "monthly", priority: "0.7" },
  { path: "/checklist", changefreq: "monthly", priority: "0.6" },
  { path: "/auth", changefreq: "yearly", priority: "0.3" },
  { path: "/privacy", changefreq: "yearly", priority: "0.3" },
  { path: "/terms", changefreq: "yearly", priority: "0.3" },
];

function render(entries: Entry[]) {
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
      .join("\n")
  );
  return [
    `<?xml version="1.0" encoding="UTF-8"?>`,
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`,
    ...urls,
    `</urlset>`,
  ].join("\n");
}

async function main() {
  const entries: Entry[] = [...staticEntries];
  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

    const { data: funds } = await supabase
      .from("funds")
      .select("slug, updated_at")
      .eq("is_published", true);
    for (const f of funds ?? []) {
      if (!f.slug) continue;
      entries.push({
        path: `/compare/${f.slug}`,
        changefreq: "daily",
        priority: "0.7",
        lastmod: f.updated_at ? new Date(f.updated_at).toISOString().slice(0, 10) : undefined,
      });
    }

    // News articles — paginate past the 1000-row default limit.
    const pageSize = 1000;
    let from = 0;
    while (true) {
      const { data: news } = await supabase
        .from("news_articles")
        .select("id, date_published")
        .eq("status", "published")
        .order("date_published", { ascending: false })
        .range(from, from + pageSize - 1);
      if (!news || news.length === 0) break;
      for (const n of news) {
        entries.push({
          path: `/news/${n.id}`,
          changefreq: "monthly",
          priority: "0.5",
          lastmod: n.date_published ? new Date(n.date_published).toISOString().slice(0, 10) : undefined,
        });
      }
      if (news.length < pageSize) break;
      from += pageSize;
    }
  } catch (e) {
    console.warn("[sitemap] dynamic fetch failed, writing static-only sitemap:", e);
  }

  writeFileSync(resolve("public/sitemap.xml"), render(entries));
  console.log(`sitemap.xml written (${entries.length} entries)`);
}

main();
