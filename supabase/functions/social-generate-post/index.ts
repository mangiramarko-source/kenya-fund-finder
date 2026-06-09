// Generates AI captions + image cards for a KenyaFundFinder social post,
// uploads images to social-images bucket, inserts social_posts rows (one per platform).
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const LOVABLE_CHAT_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";
const LOVABLE_IMG_URL = "https://ai.gateway.lovable.dev/v1/images/generations";

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
  "no risk": "lower-risk",
  "100% safe": "lower-risk",
  "sure profit": "current published yield",
  "can't lose": "compare and review",
};

const DISCLAIMER_LONG = "Information is for educational purposes only. Confirm details with the fund provider before investing.";
const DISCLAIMER_SHORT = "Educational only. Confirm with provider.";

const PLATFORM_SIZE: Record<string, string> = {
  instagram: "1024x1024",
  facebook: "1536x1024",
  x: "1536x1024",
};
const PLATFORM_LABEL: Record<string, string> = {
  instagram: "Instagram", facebook: "Facebook", x: "X/Twitter",
};

function sanitize(text: string): string {
  let out = text;
  for (const p of FORBIDDEN) {
    const re = new RegExp(p.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "ig");
    out = out.replace(re, SAFER[p] ?? "");
  }
  return out.replace(/\s{2,}/g, " ").trim();
}

function buildUtm(platform: string, campaign: string): string {
  const u = new URL("https://kenyafundfinder.com");
  u.searchParams.set("utm_source", platform === "x" ? "x" : platform);
  u.searchParams.set("utm_medium", "social");
  u.searchParams.set("utm_campaign", campaign);
  return u.toString();
}

async function callChat(apiKey: string, model: string, system: string, user: string): Promise<string> {
  const res = await fetch(LOVABLE_CHAT_URL, {
    method: "POST",
    headers: { "Authorization": `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model,
      messages: [{ role: "system", content: system }, { role: "user", content: user }],
    }),
  });
  if (!res.ok) {
    const t = await res.text().catch(() => "");
    throw new Error(`AI chat ${res.status}: ${t.slice(0, 200)}`);
  }
  const json = await res.json();
  return json?.choices?.[0]?.message?.content ?? "";
}

async function generateImage(apiKey: string, prompt: string, size: string): Promise<Uint8Array> {
  const res = await fetch(LOVABLE_IMG_URL, {
    method: "POST",
    headers: { "Authorization": `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash-image",
      prompt,
      size,
      n: 1,
    }),
  });
  if (!res.ok) {
    const t = await res.text().catch(() => "");
    throw new Error(`AI image ${res.status}: ${t.slice(0, 200)}`);
  }
  const json = await res.json();
  const b64 = json?.data?.[0]?.b64_json;
  if (!b64) throw new Error("no image returned");
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  const json = (data: unknown, status = 200) =>
    new Response(JSON.stringify(data), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    if (!LOVABLE_API_KEY) return json({ error: "Internal error" }, 500);

    // Admin gate
    const auth = req.headers.get("Authorization") ?? "";
    if (!auth.toLowerCase().startsWith("bearer ")) return json({ error: "Unauthorized" }, 401);
    const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { global: { headers: { Authorization: auth } } });
    const { data: u } = await userClient.auth.getUser();
    if (!u?.user) return json({ error: "Unauthorized" }, 401);
    const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const { data: role } = await admin.from("user_roles").select("role").eq("user_id", u.user.id).eq("role", "admin").maybeSingle();
    if (!role) return json({ error: "Forbidden" }, 403);

    const body = await req.json().catch(() => ({}));
    const contentType: string = body.content_type;
    const platforms: string[] = Array.isArray(body.platforms) ? body.platforms : ["instagram", "facebook", "x"];
    const requestedFundIds: string[] = Array.isArray(body.fund_ids) ? body.fund_ids : [];
    const customNote: string = body.custom_note ?? "";
    if (!contentType) return json({ error: "content_type required" }, 400);

    // Load template
    const { data: tpl } = await admin.from("social_post_templates").select("*").eq("key", contentType).maybeSingle();
    if (!tpl) return json({ error: "Template not found" }, 404);

    // Load fund data
    let funds: any[] = [];
    if (requestedFundIds.length > 0) {
      const { data } = await admin.from("funds")
        .select("id, name, manager, annual_yield, daily_yield, yield_unit, fund_type, minimum_investment, fact_sheet_date")
        .in("id", requestedFundIds);
      funds = data ?? [];
    } else if (["daily_mmf_update", "top_kes_mmf", "top_usd_mmf", "weekly_summary", "fund_comparison", "fund_spotlight", "new_fund_added"].includes(contentType)) {
      const currency = contentType === "top_usd_mmf" ? "USD" : contentType === "top_kes_mmf" ? "KES" : null;
      let q = admin.from("funds").select("id, name, manager, annual_yield, daily_yield, yield_unit, fund_type, minimum_investment, fact_sheet_date")
        .eq("fund_type", "money_market").eq("is_published", true).order("annual_yield", { ascending: false }).limit(contentType === "fund_spotlight" ? 1 : contentType === "fund_comparison" ? 2 : 3);
      if (currency) q = q.eq("yield_unit", currency);
      const { data } = await q;
      funds = data ?? [];
    }

    const dataAsOf = new Date().toISOString().slice(0, 10);
    const fundSummary = funds.map(f => `${f.name} (${f.manager}): ${f.annual_yield}${f.yield_unit === "%" ? "%" : " " + f.yield_unit} annual`).join("\n");
    const yieldValues = funds.reduce((acc: Record<string, unknown>, f: any) => {
      acc[f.id] = { name: f.name, annual_yield: f.annual_yield, yield_unit: f.yield_unit };
      return acc;
    }, {});

    const createdIds: string[] = [];
    const errors: string[] = [];

    for (const platform of platforms) {
      try {
        const platLabel = PLATFORM_LABEL[platform] ?? platform;
        const charLimit = platform === "x" ? 240 : platform === "instagram" ? 2000 : 1500;
        const utmUrl = buildUtm(platform, contentType);

        const userPrompt = [
          `Write a ${platLabel} caption for content type "${tpl.name}".`,
          `Caption skeleton: ${tpl.caption_skeleton ?? ""}`,
          `Custom note from admin: ${customNote || "(none)"}`,
          funds.length ? `Fund data (as of ${dataAsOf}):\n${fundSummary}` : "",
          `Max ${charLimit} characters.`,
          `Return JSON only: {"caption":"...","hashtags":["..."],"image_headline":"...","image_subtext":"...","cta":"..."}`,
          `Hashtags 3-8. CTA must reference comparing/learning, never advising.`,
        ].filter(Boolean).join("\n\n");

        const raw = await callChat(LOVABLE_API_KEY, "google/gemini-2.5-flash", tpl.system_prompt, userPrompt);
        let parsed: { caption?: string; hashtags?: string[]; image_headline?: string; image_subtext?: string; cta?: string } = {};
        try {
          const m = raw.match(/\{[\s\S]*\}/);
          if (m) parsed = JSON.parse(m[0]);
        } catch { /* fall back below */ }

        const captionRaw = parsed.caption ?? tpl.caption_skeleton ?? "";
        const cta = sanitize(parsed.cta ?? "Compare options at kenyafundfinder.com");
        const disclaimer = platform === "x" ? DISCLAIMER_SHORT : DISCLAIMER_LONG;
        const hashtags = (parsed.hashtags ?? tpl.hashtags_default ?? []).slice(0, 8);
        const caption = `${sanitize(captionRaw)}\n\n${cta}\n${utmUrl}\n\n${disclaimer}`;
        const imageHeadline = sanitize(parsed.image_headline ?? tpl.name);
        const imageSubtext = sanitize(parsed.image_subtext ?? "");

        // Generate image
        const imgSize = PLATFORM_SIZE[platform];
        const imgPrompt = [
          tpl.image_prompt,
          `Headline text: "${imageHeadline}"`,
          imageSubtext ? `Subtext: "${imageSubtext}"` : "",
          funds.length ? `Show these funds: ${funds.map(f => `${f.name} ${f.annual_yield}${f.yield_unit === "%" ? "%" : " " + f.yield_unit}`).join(", ")}` : "",
          `Date label: ${dataAsOf}`,
          `Bottom: kenyafundfinder.com`,
          `Tiny disclaimer line: "Educational only. Confirm with provider."`,
          `Aspect ratio for ${platLabel}.`,
        ].filter(Boolean).join(" ");

        let imageUrl: string | null = null;
        try {
          const imgBytes = await generateImage(LOVABLE_API_KEY, imgPrompt, imgSize);
          const path = `${dataAsOf}/${platform}/${crypto.randomUUID()}.png`;
          const { error: upErr } = await admin.storage.from("social-images").upload(path, imgBytes, { contentType: "image/png", upsert: false });
          if (!upErr) {
            const { data: signed } = await admin.storage.from("social-images").createSignedUrl(path, 60 * 60 * 24 * 365);
            imageUrl = signed?.signedUrl ?? null;
          }
        } catch (e) {
          console.error("image gen failed", platform, e);
        }

        const { data: ins, error: insErr } = await admin.from("social_posts").insert({
          template_id: tpl.id,
          content_type: contentType,
          platform,
          status: "draft",
          caption,
          hashtags,
          image_headline: imageHeadline,
          image_subtext: imageSubtext,
          cta,
          disclaimer,
          utm_url: utmUrl,
          image_url: imageUrl,
          image_size: imgSize,
          source_data: { funds, custom_note: customNote },
          fund_ids: funds.map(f => f.id),
          fund_names: funds.map(f => f.name),
          yield_values: yieldValues,
          data_as_of: dataAsOf,
          created_by: u.user.id,
        }).select("id").single();

        if (insErr) throw insErr;
        createdIds.push(ins.id);
        await admin.from("social_post_analytics").insert({
          post_id: ins.id, event: "generated", platform, content_type: contentType,
        });
      } catch (e: any) {
        console.error("platform generation failed", platform, e);
        errors.push(`${platform}: ${e?.message ?? "error"}`);
      }
    }

    return json({ created_ids: createdIds, errors });
  } catch (e) {
    console.error("social-generate-post", e);
    return json({ error: "Internal error" }, 500);
  }
});
