// Phase 2 — Step 2: Facebook redirects here with ?code & ?state.
// Validates state, exchanges code -> short-lived user token -> long-lived user token,
// lists Pages, stores tokens server-side in social_account_tokens, then redirects
// admin back to /admin/social/accounts. NO publishing yet (test_mode=true).
import { createClient } from "../_shared/supabase-client.ts";

const APP_ID = Deno.env.get("META_APP_ID")!;
const APP_SECRET = Deno.env.get("META_APP_SECRET")!;
const REDIRECT_URI = Deno.env.get("META_OAUTH_REDIRECT_URI")!;
const GRAPH_VERSION = Deno.env.get("META_GRAPH_API_VERSION") ?? "v21.0";
const APP_RETURN_URL =
  Deno.env.get("META_APP_RETURN_URL") ?? "https://www.kenyafundfinder.com/admin";

type TokenResponse = { access_token?: string; expires_in?: number };
type ManagedPage = {
  id: string;
  name: string;
  access_token: string;
  instagram_business_account?: { id?: string };
};
type PagesResponse = { data?: ManagedPage[] };

Deno.serve(async (req) => {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const fbError = url.searchParams.get("error");

  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  if (fbError) return redirect(`${APP_RETURN_URL}?meta_oauth=denied&reason=${encodeURIComponent(fbError)}`);
  if (!code || !state) return redirect(`${APP_RETURN_URL}?meta_oauth=error&reason=missing_params`);

  // 1. Validate + consume state
  const { data: st } = await admin
    .from("social_oauth_states").select("*").eq("state", state).maybeSingle();
  if (!st) return redirect(`${APP_RETURN_URL}?meta_oauth=error&reason=bad_state`);
  if (st.consumed_at) return redirect(`${APP_RETURN_URL}?meta_oauth=error&reason=state_reused`);
  if (new Date(st.expires_at).getTime() < Date.now()) {
    return redirect(`${APP_RETURN_URL}?meta_oauth=error&reason=state_expired`);
  }
  await admin.from("social_oauth_states").update({ consumed_at: new Date().toISOString() }).eq("state", state);

  try {
    // 2. Short-lived user token
    const shortRes = await fetch(
      `https://graph.facebook.com/${GRAPH_VERSION}/oauth/access_token?` +
      new URLSearchParams({
        client_id: APP_ID, client_secret: APP_SECRET,
        redirect_uri: REDIRECT_URI, code,
      }),
    );
    const shortJson = await shortRes.json() as TokenResponse;
    if (!shortRes.ok || !shortJson.access_token) {
      return redirect(`${APP_RETURN_URL}?meta_oauth=error&reason=token_exchange&msg=${enc(shortJson)}`);
    }

    // 3. Long-lived user token
    const longRes = await fetch(
      `https://graph.facebook.com/${GRAPH_VERSION}/oauth/access_token?` +
      new URLSearchParams({
        grant_type: "fb_exchange_token",
        client_id: APP_ID, client_secret: APP_SECRET,
        fb_exchange_token: shortJson.access_token,
      }),
    );
    const longJson = await longRes.json() as TokenResponse;
    const userToken: string = longJson.access_token ?? shortJson.access_token;
    const expiresIn: number | undefined = longJson.expires_in;

    // 4. List Pages the user manages
    const pagesRes = await fetch(
      `https://graph.facebook.com/${GRAPH_VERSION}/me/accounts?fields=id,name,access_token,instagram_business_account&access_token=${userToken}`,
    );
    const pagesJson = await pagesRes.json() as PagesResponse;
    const pages = pagesJson.data ?? [];

    if (pages.length === 0) {
      return redirect(`${APP_RETURN_URL}/social/accounts?meta_oauth=no_pages`);
    }

    // 5. Upsert one social_accounts + social_account_tokens row per Page (test_mode)
    for (const p of pages) {
      const { data: acct, error: acctErr } = await admin
        .from("social_accounts")
        .upsert({
          platform: "facebook",
          handle: p.id,
          display_name: p.name,
          connection_status: "connected",
          meta: {
            page_id: p.id,
            ig_business_id: p.instagram_business_account?.id ?? null,
            connected_by: st.user_id,
            connected_at: new Date().toISOString(),
            test_mode: true,
          },
        }, { onConflict: "platform,handle" })
        .select("id").single();
      if (acctErr) continue;

      await admin.from("social_account_tokens").upsert({
        account_id: acct.id,
        platform: "facebook",
        page_id: p.id,
        ig_business_id: p.instagram_business_account?.id ?? null,
        user_access_token: userToken,
        page_access_token: p.access_token,
        token_type: "long_lived",
        scopes: ["pages_show_list", "pages_manage_posts", "instagram_content_publish"],
        expires_at: expiresIn ? new Date(Date.now() + expiresIn * 1000).toISOString() : null,
        test_mode: true,
      }, { onConflict: "account_id" });
    }

    return redirect(`${APP_RETURN_URL}/social/accounts?meta_oauth=connected&pages=${pages.length}`);
  } catch (e) {
    return redirect(`${APP_RETURN_URL}/social/accounts?meta_oauth=error&reason=exception&msg=${enc(String(e))}`);
  }
});

function redirect(to: string) {
  return new Response(null, { status: 302, headers: { Location: to } });
}
function enc(v: unknown) {
  return encodeURIComponent(typeof v === "string" ? v : JSON.stringify(v));
}
