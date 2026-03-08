import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SITE_URL = "https://kenyafundfinder.com";
const OG_IMAGE = "https://kenyafundfinder.com/og-image.png";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// Static page meta
const staticPages: Record<string, { title: string; description: string }> = {
  "/": {
    title: "Fund Finder Kenya – Compare Investment Funds in Kenya",
    description:
      "Daily-updated data on all Kenyan unit trusts: equity, money market, fixed income, bonds, and balanced funds. Compare yields, fees, and calculate returns.",
  },
  "/calculator": {
    title: "Investment Returns Calculator – Fund Finder Kenya",
    description:
      "Calculate your potential investment fund returns with our free calculator.",
  },
  "/news": {
    title: "Investment Fund News & Updates – Fund Finder Kenya",
    description:
      "Stay informed about investment funds in Kenya with the latest yield updates and market news.",
  },
  "/learn": {
    title: "Learn About Investment Funds in Kenya – Fund Finder Kenya",
    description:
      "Everything you need to know about unit trusts in Kenya – how they work, risks, returns, and CMA regulation.",
  },
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const url = new URL(req.url);
  const path = url.searchParams.get("path") || "/";

  let title = "Fund Finder Kenya – Compare Investment Funds";
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
      title = `${fund.name} – ${fund.annual_yield}% Annual Yield | MMF Compare Kenya`;
      description = `${fund.name} by ${fund.manager}. Annual yield: ${fund.annual_yield}%. Min investment: KES ${fund.minimum_investment.toLocaleString()}.`;
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
  <meta property="og:site_name" content="MMF Compare Kenya" />
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
      ...corsHeaders,
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
