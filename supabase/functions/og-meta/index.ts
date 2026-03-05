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
    title: "MMF Compare Kenya – Compare Money Market Funds",
    description:
      "Compare CMA-regulated Money Market Funds in Kenya. See yields, fees, and calculate returns.",
  },
  "/compare": {
    title: "Compare Money Market Funds – Kenya MMF Comparison",
    description:
      "Side-by-side comparison of Kenya's top money market funds by yield, fees, and minimum investment.",
  },
  "/calculator": {
    title: "MMF Returns Calculator – Kenya Money Market Fund",
    description:
      "Calculate your potential money market fund returns with our free calculator.",
  },
  "/news": {
    title: "MMF News & Updates – Kenya Money Market Funds",
    description:
      "Stay informed about Money Market Funds in Kenya with the latest yield updates and market news.",
  },
  "/learn": {
    title: "Learn About Money Market Funds in Kenya",
    description:
      "Everything you need to know about MMFs in Kenya – how they work, risks, returns, and CMA regulation.",
  },
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const url = new URL(req.url);
  const path = url.searchParams.get("path") || "/";

  let title = "MMF Compare Kenya";
  let description = "Compare Money Market Funds in Kenya.";
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
