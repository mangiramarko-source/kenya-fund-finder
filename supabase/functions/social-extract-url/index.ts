import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const fcKey = Deno.env.get("FIRECRAWL_API_KEY");
    if (!fcKey) return json({ error: "FIRECRAWL_API_KEY not configured" }, 500);

    const authHeader = req.headers.get("Authorization") ?? "";
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const userClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: userData } = await userClient.auth.getUser();
    const user = userData?.user;
    if (!user) return json({ error: "Unauthorized" }, 401);
    const { data: isAdmin } = await supabase.rpc("has_role", { _user_id: user.id, _role: "admin" });
    if (!isAdmin) return json({ error: "Admin only" }, 403);

    const body = await req.json().catch(() => ({}));
    const { url, platforms, content_type = "manual_url" } = body ?? {};
    if (!url || typeof url !== "string") return json({ error: "url is required" }, 400);
    if (!Array.isArray(platforms) || platforms.length === 0) {
      return json({ error: "platforms array is required" }, 400);
    }

    // Scrape with Firecrawl v2
    const fcRes = await fetch("https://api.firecrawl.dev/v2/scrape", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${fcKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        url,
        formats: ["markdown", "summary"],
        onlyMainContent: true,
      }),
    });
    const fcJson = await fcRes.json().catch(() => ({}));
    if (!fcRes.ok) {
      return json({ error: fcJson?.error || `Firecrawl failed (${fcRes.status})` }, 502);
    }

    const doc = fcJson.data ?? fcJson;
    const meta = doc?.metadata ?? {};
    const title: string = meta.title || meta.ogTitle || "";
    const description: string = meta.description || meta.ogDescription || "";
    const summary: string = doc?.summary || description || "";
    const ogImage: string | null =
      meta.ogImage || meta["og:image"] || meta.twitterImage || null;

    // Build a starter caption per platform
    const buildCaption = (platform: string) => {
      const head = title ? `${title}\n\n` : "";
      const body = summary || description || "";
      const link = `\n\n${url}`;
      if (platform === "x") {
        const max = 270 - link.length;
        const text = (head + body).slice(0, max).trim();
        return text + link;
      }
      return (head + body).trim() + link;
    };

    const rows = platforms.map((platform: string) => ({
      content_type,
      platform,
      status: "draft",
      caption: buildCaption(platform),
      hashtags: [],
      image_url: ogImage,
      source_data: { source_url: url, scraped_at: new Date().toISOString(), title, description },
      created_by: user.id,
    }));

    const { data: inserted, error } = await supabase
      .from("social_posts")
      .insert(rows)
      .select("id");

    if (error) return json({ error: error.message }, 500);

    return json({
      created_ids: inserted?.map((r) => r.id) ?? [],
      preview: { title, description, summary, image_url: ogImage },
    });
  } catch (e) {
    return json({ error: (e as Error).message }, 500);
  }
});
