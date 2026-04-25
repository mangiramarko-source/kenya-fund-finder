import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SITE_URL = "https://kenyafundfinder.com";
const OG_IMAGE = "https://kenyafundfinder.com/og-image.png";

const ALLOWED_ORIGINS = ["https://kenyafundfinder.com", "https://kenya-fund-finder.lovable.app"];

function getCorsHeaders(req: Request) {
  const origin = req.headers.get("origin") || "";
  const allowedOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Headers":
      "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  };
}

// Static page meta
const staticPages: Record<string, { title: string; description: string }> = {
  "/": {
    title: "Kenya Fund Finder – Compare Investment Funds in Kenya",
    description:
      "Daily-updated data on all Kenyan unit trusts: equity, money market, fixed income, bonds, and balanced funds. Compare yields, fees, and calculate returns.",
  },
  "/calculator": {
    title: "Investment Returns Calculator – Kenya Fund Finder",
    description:
      "Calculate your potential investment fund returns with our free calculator.",
  },
  "/news": {
    title: "Investment Fund News & Updates – Kenya Fund Finder",
    description:
      "Stay informed about investment funds in Kenya with the latest yield updates and market news.",
  },
  "/learn": {
    title: "Learn About Investment Funds in Kenya – Kenya Fund Finder",
    description:
      "Everything you need to know about unit trusts in Kenya – how they work, risks, returns, and CMA regulation.",
  },
  "/rates": {
    title: "FX Exchange Rates – Kenya Fund Finder",
    description:
      "Live foreign exchange rates against the Kenya Shilling. Track USD, EUR, GBP and more.",
  },
  "/commodities": {
    title: "Commodity Prices – Kenya Fund Finder",
    description:
      "Track gold, oil, and cryptocurrency prices. Indicative commodity pricing updated regularly.",
  },
};

Deno.serve(async (req) => {
  const cors = getCorsHeaders(req);
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: cors });
  }

  const url = new URL(req.url);
  const path = url.searchParams.get("path") || "/";

  let title = "Kenya Fund Finder – Compare Investment Funds";
  let description = "Daily-updated data on all Kenyan unit trusts. Compare yields, fees, and calculate returns.";
  let pageUrl = `${SITE_URL}${path}`;
  let image = OG_IMAGE;

  // Check static pages first
  if (staticPages[path]) {
    title = staticPages[path].title;
    description = staticPages[path].description;
  }
  // Check fund detail pages
  else if (path.startsWith("/compare/") && path.split("/").length === 3) {
    const slug = path.split("/")[2];
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data: fund } = await supabase
      .from("funds")
      .select("name, manager, annual_yield, minimum_investment, description, slug")
      .eq("slug", slug)
      .eq("is_published", true)
      .single();

    if (fund) {
      title = `${fund.name} – ${fund.annual_yield}% Annual Yield | Kenya Fund Finder`;
      description = `${fund.name} by ${fund.manager}. Annual yield: ${fund.annual_yield}%. Min investment: KES ${fund.minimum_investment.toLocaleString()}.`;
    }
  }
  // Check news article pages
  else if (path.startsWith("/news/") && path.split("/").length === 3) {
    const articleId = path.split("/")[2];
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data: article } = await supabase
      .from("news_articles")
      .select("title, summary, category, date_published, source, image_url")
      .eq("id", articleId)
      .eq("status", "published")
      .single();

    if (article) {
      title = `${article.title} – Kenya Fund Finder`;
      description = article.summary;
      // Use article's own image if available and absolute http(s)
      if (article.image_url && /^https?:\/\//i.test(article.image_url)) {
        image = article.image_url;
      }
    }
  }

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>${escapeHtml(title)}</title>
  <meta name="description" content="${escapeHtml(description)}" />
  <link rel="canonical" href="${escapeHtml(pageUrl)}" />
  <meta property="og:title" content="${escapeHtml(title)}" />
  <meta property="og:description" content="${escapeHtml(description)}" />
  <meta property="og:url" content="${escapeHtml(pageUrl)}" />
  <meta property="og:type" content="website" />
  <meta property="og:image" content="${escapeHtml(image)}" />
  <meta property="og:site_name" content="Kenya Fund Finder" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${escapeHtml(title)}" />
  <meta name="twitter:description" content="${escapeHtml(description)}" />
  <meta name="twitter:image" content="${escapeHtml(image)}" />
</head>
<body>
  <p>${escapeHtml(description)}</p>
</body>
</html>`;

  return new Response(html, {
    headers: {
      ...cors,
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  });
});

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
