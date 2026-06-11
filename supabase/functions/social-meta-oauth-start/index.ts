// Phase 2 — Step 1: build the Facebook authorize URL.
// Admin-only. Returns { authorize_url } so the client can window.location to it.
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const APP_ID = Deno.env.get("META_APP_ID")!;
const REDIRECT_URI = Deno.env.get("META_OAUTH_REDIRECT_URI")!;
const GRAPH_VERSION = Deno.env.get("META_GRAPH_API_VERSION") ?? "v21.0";

const SCOPES = [
  "pages_show_list",
  "pages_read_engagement",
  "pages_manage_posts",
  "instagram_basic",
  "instagram_content_publish",
  "business_management",
].join(",");

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return json({ error: "Unauthorized" }, 401);
    }

    const supaUser = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: claimsData, error: claimsErr } = await supaUser.auth.getClaims(
      authHeader.replace("Bearer ", ""),
    );
    if (claimsErr || !claimsData?.claims) return json({ error: "Unauthorized" }, 401);
    const userId = claimsData.claims.sub as string;

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    const { data: roleRow } = await admin
      .from("user_roles").select("role").eq("user_id", userId).eq("role", "admin").maybeSingle();
    if (!roleRow) return json({ error: "Forbidden" }, 403);

    if (!APP_ID || !REDIRECT_URI) {
      return json({ error: "Meta app not configured (missing META_APP_ID / META_OAUTH_REDIRECT_URI)" }, 500);
    }

    const state = crypto.randomUUID() + "." + crypto.randomUUID();
    const { error: stateErr } = await admin.from("social_oauth_states").insert({
      state, user_id: userId, platform: "facebook",
      redirect_to: (await safeBody(req))?.redirect_to ?? null,
    });
    if (stateErr) return json({ error: "Could not start OAuth", details: stateErr.message }, 500);

    const params = new URLSearchParams({
      client_id: APP_ID,
      redirect_uri: REDIRECT_URI,
      state,
      scope: SCOPES,
      response_type: "code",
      auth_type: "rerequest",
    });
    const authorize_url = `https://www.facebook.com/${GRAPH_VERSION}/dialog/oauth?${params}`;
    return json({ authorize_url });
  } catch (e) {
    return json({ error: "Unexpected error", details: String(e) }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
async function safeBody(req: Request): Promise<any> {
  try { return await req.clone().json(); } catch { return null; }
}
