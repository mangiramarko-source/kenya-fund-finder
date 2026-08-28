// Regenerates the image for an existing social_posts row.
import { createClient } from "../_shared/supabase-client.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const LOVABLE_IMG_URL = "https://ai.gateway.lovable.dev/v1/images/generations";

const PLATFORM_SIZE: Record<string, string> = {
  instagram: "1024x1024", facebook: "1536x1024", x: "1536x1024",
};

type FundReference = { name: string; annual_yield: number | null; yield_unit: string | null };

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
    const customPrompt: string | undefined = body.prompt;
    if (!postId) return json({ error: "post_id required" }, 400);

    const { data: post } = await admin.from("social_posts").select("*").eq("id", postId).maybeSingle();
    if (!post) return json({ error: "Post not found" }, 404);
    const { data: tpl } = await admin.from("social_post_templates").select("image_prompt").eq("id", post.template_id).maybeSingle();

    const funds = Array.isArray(post.source_data?.funds)
      ? post.source_data.funds as FundReference[]
      : [];
    const prompt = customPrompt ?? [
      tpl?.image_prompt ?? "",
      `Headline: "${post.image_headline ?? ""}"`,
      post.image_subtext ? `Subtext: "${post.image_subtext}"` : "",
      funds.length ? `Funds: ${funds.map((fund) => `${fund.name} ${fund.annual_yield}${fund.yield_unit === "%" ? "%" : " " + fund.yield_unit}`).join(", ")}` : "",
      `Date: ${post.data_as_of ?? ""}`,
      `Bottom: kenyafundfinder.com`,
      `Tiny disclaimer line: "Educational only. Confirm with provider."`,
    ].filter(Boolean).join(" ");

    const size = PLATFORM_SIZE[post.platform] ?? "1024x1024";
    const res = await fetch(LOVABLE_IMG_URL, {
      method: "POST",
      headers: { "Authorization": `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model: "google/gemini-2.5-flash-image", prompt, size, n: 1 }),
    });
    if (!res.ok) return json({ error: "Internal error" }, 500);
    const j = await res.json();
    const b64 = j?.data?.[0]?.b64_json;
    if (!b64) return json({ error: "No image" }, 500);
    const bin = atob(b64);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);

    const path = `${post.data_as_of ?? new Date().toISOString().slice(0, 10)}/${post.platform}/${crypto.randomUUID()}.png`;
    const { error: upErr } = await admin.storage.from("social-images").upload(path, bytes, { contentType: "image/png" });
    if (upErr) return json({ error: "Internal error" }, 500);
    const { data: signed } = await admin.storage.from("social-images").createSignedUrl(path, 60 * 60 * 24 * 365);
    const imageUrl = signed?.signedUrl ?? null;

    await admin.from("social_posts").update({ image_url: imageUrl }).eq("id", postId);
    return json({ image_url: imageUrl });
  } catch (e) {
    console.error("social-regenerate-image", e);
    return json({ error: "Internal error" }, 500);
  }
});
