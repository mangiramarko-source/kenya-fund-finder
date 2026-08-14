import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SITE_URL = "https://kenyafundfinder.com";

const staticRoutes = [
  { path: "/", priority: "1.0", changefreq: "daily" },
  { path: "/funds", priority: "0.9", changefreq: "daily" },
  { path: "/stocks", priority: "0.9", changefreq: "daily" },
  { path: "/compare", priority: "0.9", changefreq: "daily" },
  { path: "/rates", priority: "0.8", changefreq: "daily" },
  { path: "/commodities", priority: "0.8", changefreq: "daily" },
  { path: "/markets", priority: "0.8", changefreq: "daily" },
  { path: "/treasury", priority: "0.8", changefreq: "daily" },
  { path: "/news", priority: "0.8", changefreq: "daily" },
  { path: "/overview", priority: "0.8", changefreq: "daily" },
  { path: "/calculator", priority: "0.8", changefreq: "monthly" },
  { path: "/alerts", priority: "0.7", changefreq: "monthly" },
  { path: "/learn", priority: "0.7", changefreq: "monthly" },
  { path: "/checklist", priority: "0.6", changefreq: "monthly" },
  { path: "/privacy", priority: "0.3", changefreq: "yearly" },
  { path: "/terms", priority: "0.3", changefreq: "yearly" },
];

Deno.serve(async () => {
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  // Fetch published funds
  const { data: funds } = await supabase
    .from("funds")
    .select("slug, updated_at")
    .eq("is_published", true);

  // Fetch active stocks
  const { data: stocks } = await supabase
    .from("stocks")
    .select("symbol, updated_at")
    .eq("is_active", true);

  // Fetch published news
  const { data: news } = await supabase
    .from("news_articles")
    .select("id, date_published")
    .eq("status", "published");

  // Fetch site pages
  const { data: sitePages } = await supabase
    .from("site_pages")
    .select("slug, updated_at");

  const today = new Date().toISOString().split("T")[0];

  let xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
`;

  // Static routes
  for (const route of staticRoutes) {
    xml += `  <url>
    <loc>${SITE_URL}${route.path}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>${route.changefreq}</changefreq>
    <priority>${route.priority}</priority>
  </url>
`;
  }

  // Fund detail pages
  if (funds) {
    for (const fund of funds) {
      xml += `  <url>
    <loc>${SITE_URL}/compare/${fund.slug}</loc>
    <lastmod>${fund.updated_at?.split("T")[0] || today}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.7</priority>
  </url>
`;
    }
  }

  // Stock detail pages
  if (stocks) {
    for (const stock of stocks) {
      xml += `  <url>
    <loc>${SITE_URL}/stocks/${stock.symbol}</loc>
    <lastmod>${stock.updated_at?.split("T")[0] || today}</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.7</priority>
  </url>
`;
    }
  }

  // News article pages
  if (news) {
    for (const article of news) {
      xml += `  <url>
    <loc>${SITE_URL}/news/${article.id}</loc>
    <lastmod>${article.date_published?.split("T")[0] || today}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.6</priority>
  </url>
`;
    }
  }

  // CMS site pages
  if (sitePages) {
    for (const page of sitePages) {
      xml += `  <url>
    <loc>${SITE_URL}/page/${page.slug}</loc>
    <lastmod>${page.updated_at?.split("T")[0] || today}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.5</priority>
  </url>
`;
    }
  }

  xml += `</urlset>`;

  return new Response(xml, {
    headers: {
      "Content-Type": "application/xml",
      "Cache-Control": "public, max-age=3600",
    },
  });
});
