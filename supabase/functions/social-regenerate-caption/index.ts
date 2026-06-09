// Regenerates the caption + hashtags for an existing social_posts row.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const LOVABLE_CHAT_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";

const FORBIDDEN = [
  "best investment", "guaranteed returns", "guaranteed return", "risk-free", "risk free",
  "you should invest", "you must invest", "get rich", "put your money here",
  "no risk", "100% safe", "sure profit", "can't lose",
];
const SAFER: Record<string, string> = {
  "best investment": "an option to compare",
  "guaranteed returns": "current published yield",
  "guaranteed return": "current published yield",
  "risk-free": "low-risk (review the fact sheet)",
  "risk free": "low-risk (review the fact sheet)",
  "you should invest": "you may want to compare options",
  "you must invest": "you may want to compare options",
  "put your money here": "see where your money can grow",
  "no risk": "lower-risk", "100% safe": "lower-risk",
  "sure profit": "current published yield", "can't lose": "compare and review",
};
const DISCLAIMER_LONG = "Information is for educational purposes only. Confirm details with the fund provider before investing.";
const DISCLAIMER_SHORT = "Educational only. Confirm with provider.";

function sanitize(t: string) {
  let o = t;
  for (const p of FORBIDDEN) o = o.replace(new RegExp(p.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "ig"), SAFER[p] ?? "");
  return o.replace(/\s{2,}/g, " ").trim();
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  const json = (d: unknown, s = 200) => new Response(JSON.stringify(d), { status: s, headers: { ...corsHeaders, "Content-Type": "application/json" } });

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    if (!LOVABLE_API_KEY) return json({ error: "Internal error" }, 500);

    const auth = req.headers.get("Authorization") ?? "";
    if (!auth.toLowerCase().startsWith("bearer ")) return json({ error: "Unauthorized" }, 401);
    const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { global: { headers: { Authorization: auth } } });
    const { data: u } = await userClient.auth.getUser();
    if (!u?.user) return json({ error: "Unauthorized" }, 401);
    const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const { data: role } = await admin.from("user_roles").select("role").eq("user_id", u.user.id).eq("role", "admin").maybeSingle();
    if (!role) return json({ error: "Forbidden" }, 403);

    const body = await req.json().catch(() => ({}));
    const postId = body.post_id;
    if (!postId) return json({ error: "post_id required" }, 400);

    const { data: post } = await admin.from("social_posts").select("*").eq("id", postId).maybeSingle();
    if (!post) return json({ error: "Post not found" }, 404);
    const { data: tpl } = await admin.from("social_post_templates").select("*").eq("id", post.template_id).maybeSingle();

    const funds = post.source_data?.funds ?? [];
    const charLimit = post.platform === "x" ? 240 : post.platform === "instagram" ? 2000 : 1500;
    const fundLines = funds.map((f: any) => `${f.name} ${f.annual_yield}${f.yield_unit === "%" ? "%" : " " + f.yield_unit}`).join("\n");

    const userPrompt = [
      `Rewrite a fresh ${post.platform} caption for content type "${post.content_type}".`,
      `Caption skeleton: ${tpl?.caption_skeleton ?? ""}`,
      funds.length ? `Fund data (as of ${post.data_as_of}):\n${fundLines}` : "",
      `Max ${charLimit} characters.`,
      `Return JSON only: {"caption":"...","hashtags":["..."],"cta":"..."}`,
    ].filter(Boolean).join("\n\n");

    const res = await fetch(LOVABLE_CHAT_URL, {
      method: "POST",
      headers: { "Authorization": `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: tpl?.system_prompt ?? "Write a brand-safe educational social post for KenyaFundFinder. Never give financial advice." },
          { role: "user", content: userPrompt },
        ],
      }),
    });
    if (!res.ok) return json({ error: "Internal error" }, 500);
    const j = await res.json();
    const raw = j?.choices?.[0]?.message?.content ?? "";
    let parsed: { caption?: string; hashtags?: string[]; cta?: string } = {};
    try { const m = raw.match(/\{[\s\S]*\}/); if (m) parsed = JSON.parse(m[0]); } catch { /* noop */ }

    const cta = sanitize(parsed.cta ?? post.cta ?? "Compare options at kenyafundfinder.com");
    const disclaimer = post.platform === "x" ? DISCLAIMER_SHORT : DISCLAIMER_LONG;
    const captionBody = sanitize(parsed.caption ?? tpl?.caption_skeleton ?? "");
    const caption = `${captionBody}\n\n${cta}\n${post.utm_url ?? ""}\n\n${disclaimer}`;
    const hashtags = (parsed.hashtags ?? post.hashtags ?? []).slice(0, 8);

    await admin.from("social_posts").update({ caption, hashtags, cta, disclaimer }).eq("id", postId);
    return json({ caption, hashtags });
  } catch (e) {
    console.error("social-regenerate-caption", e);
    return json({ error: "Internal error" }, 500);
  }
});
