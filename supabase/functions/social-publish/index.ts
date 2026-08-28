// Phase 2.1 — publish a social_posts row to Facebook Page.
// Admin-only. Honors test_mode on the token row: when true, validates everything
// and writes a posted_at + facebook_post_id="TEST-..." without calling Graph.
import { createClient } from "../_shared/supabase-client.ts";
import { corsHeaders } from "../_shared/cors-headers.ts";

const GRAPH_VERSION = Deno.env.get("META_GRAPH_API_VERSION") ?? "v21.0";

type FacebookPublishResponse = {
  id?: string;
  post_id?: string;
  [key: string]: unknown;
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) return j({ error: "Unauthorized" }, 401);

    const supaUser = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: claimsData, error: cErr } = await supaUser.auth.getClaims(
      authHeader.replace("Bearer ", ""),
    );
    if (cErr || !claimsData?.claims) return j({ error: "Unauthorized" }, 401);
    const userId = claimsData.claims.sub as string;

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    const { data: roleRow } = await admin
      .from("user_roles").select("role").eq("user_id", userId).eq("role", "admin").maybeSingle();
    if (!roleRow) return j({ error: "Forbidden" }, 403);

    const body = await req.json().catch(() => ({}));
    const { post_id, account_id, force_live } = body as {
      post_id?: string; account_id?: string; force_live?: boolean;
    };
    if (!post_id) return j({ error: "post_id required" }, 400);

    // 1. Load post
    const { data: post, error: pErr } = await admin
      .from("social_posts").select("*").eq("id", post_id).maybeSingle();
    if (pErr || !post) return j({ error: "Post not found" }, 404);
    if (post.platform !== "facebook") {
      return j({ error: `Phase 2.1 only publishes facebook posts (got ${post.platform})` }, 400);
    }
    if (["posted", "manually_posted"].includes(post.status)) {
      return j({ error: `Post already in status ${post.status}` }, 400);
    }

    // 2. Find a connected Facebook account (use provided account_id or first connected)
    let acctQuery = admin
      .from("social_accounts")
      .select("id, handle, display_name, meta")
      .eq("platform", "facebook")
      .eq("connection_status", "connected");
    if (account_id) acctQuery = acctQuery.eq("id", account_id);
    const { data: acct } = await acctQuery.limit(1).maybeSingle();
    if (!acct) return j({ error: "No connected Facebook Page. Connect one in Social → Accounts." }, 400);

    // 3. Load token
    const { data: tok } = await admin
      .from("social_account_tokens")
      .select("*").eq("account_id", acct.id).maybeSingle();
    if (!tok?.page_access_token) return j({ error: "Token missing for this account. Reconnect." }, 400);
    if (tok.expires_at && new Date(tok.expires_at).getTime() < Date.now()) {
      return j({ error: "Page access token expired. Reconnect Facebook." }, 400);
    }

    // 4. Build message (caption + hashtags + link)
    const hashtags = (post.hashtags ?? []).map((h: string) => `#${h}`).join(" ");
    const link = post.utm_url ?? "";
    const message = [post.caption, hashtags, link].filter(Boolean).join("\n\n").trim();

    // 5. Resolve image URL (sign if private path)
    let imageUrl: string | null = null;
    if (post.image_url) {
      if (/^https?:\/\//i.test(post.image_url)) {
        imageUrl = post.image_url;
      } else {
        const { data: signed } = await admin.storage
          .from("social-images")
          .createSignedUrl(post.image_url, 3600);
        imageUrl = signed?.signedUrl ?? null;
      }
    }

    const testMode = tok.test_mode && !force_live;

    // 6. Publish (or simulate)
    let fbPostId: string | null = null;
    let fbResponse: FacebookPublishResponse | null = null;
    if (testMode) {
      fbPostId = `TEST-${crypto.randomUUID()}`;
      fbResponse = { test_mode: true, would_post: { message, image: imageUrl, page_id: acct.handle } };
    } else {
      const graphRes = imageUrl
        ? await fetch(`https://graph.facebook.com/${GRAPH_VERSION}/${acct.handle}/photos`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              url: imageUrl,
              caption: message,
              access_token: tok.page_access_token,
            }),
          })
        : await fetch(`https://graph.facebook.com/${GRAPH_VERSION}/${acct.handle}/feed`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              message,
              ...(link ? { link } : {}),
              access_token: tok.page_access_token,
            }),
          });
      fbResponse = await graphRes.json() as FacebookPublishResponse;
      if (!graphRes.ok) {
        await admin.from("social_posts").update({
          status: "failed",
          error_message: JSON.stringify(fbResponse).slice(0, 2000),
        }).eq("id", post_id);
        await admin.from("social_post_analytics").insert({
          post_id, event: "failed", platform: "facebook",
          content_type: post.content_type, meta: fbResponse,
        });
        return j({ error: "Facebook publish failed", details: fbResponse }, 502);
      }
      fbPostId = fbResponse.post_id ?? fbResponse.id ?? null;
    }

    // 7. Mark posted
    await admin.from("social_posts").update({
      status: "posted",
      posted_at: new Date().toISOString(),
      error_message: null,
      source_data: { ...(post.source_data ?? {}), facebook_post_id: fbPostId, test_mode: testMode },
    }).eq("id", post_id);

    await admin.from("social_post_analytics").insert({
      post_id, event: "posted", platform: "facebook",
      content_type: post.content_type,
      meta: { facebook_post_id: fbPostId, test_mode: testMode },
    });

    return j({ ok: true, test_mode: testMode, facebook_post_id: fbPostId, response: fbResponse });
  } catch (e) {
    return j({ error: "Unexpected error", details: String(e) }, 500);
  }
});

function j(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status, headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
