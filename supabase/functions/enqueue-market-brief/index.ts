import { createClient } from "https://esm.sh/@supabase/supabase-js@2.98.0";
import { normalizeEmail } from "../_shared/communications.ts";
import { authorizePrivilegedRequest } from "../_shared/privileged-auth.ts";
import { getSupabaseSecretKey } from "../_shared/supabase-keys.ts";

const headers = { "Content-Type": "application/json" };

Deno.serve(async (request) => {
  if (request.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405, headers });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  if (!supabaseUrl) return new Response(JSON.stringify({ error: "Server configuration error" }), { status: 500, headers });
  const supabase = createClient(supabaseUrl, getSupabaseSecretKey(), {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const authorization = await authorizePrivilegedRequest(request, {
    namedSecretKeysJson: Deno.env.get("SUPABASE_SECRET_KEYS"),
    secretName: "automations",
    verifyUser: async (token) => (await supabase.auth.getUser(token)).data.user?.id ?? null,
    isAdmin: async (userId) => Boolean((await supabase.from("user_roles").select("id").eq("user_id", userId).eq("role", "admin").maybeSingle()).data),
  });
  if (!authorization.ok) {
    return new Response(JSON.stringify({ error: authorization.status === 401 ? "Unauthorized" : "Forbidden" }), { status: authorization.status, headers });
  }

  const body = await request.json().catch(() => ({})) as { overview_id?: string };
  let overviewQuery = supabase
    .from("market_overviews")
    .select("id,market_date,status")
    .eq("status", "ready");
  overviewQuery = body.overview_id
    ? overviewQuery.eq("id", body.overview_id)
    : overviewQuery.order("market_date", { ascending: false }).limit(1);
  const { data: overview, error: overviewError } = await overviewQuery.maybeSingle();
  if (overviewError) throw overviewError;
  if (!overview) {
    return new Response(JSON.stringify({ error: "No ready market overview" }), { status: 409, headers });
  }

  const { data: preferences, error: preferenceError } = await supabase
    .from("communication_preferences")
    .select("user_id")
    .eq("market_brief_email", true);
  if (preferenceError) throw preferenceError;

  const rows: Array<Record<string, unknown>> = [];
  for (const preference of preferences ?? []) {
    const { data: userResult } = await supabase.auth.admin.getUserById(preference.user_id);
    const email = userResult.user?.email ? normalizeEmail(userResult.user.email) : "";
    if (!email) continue;
    const { data: suppression } = await supabase
      .from("communication_suppressions")
      .select("id")
      .eq("email_normalized", email)
      .is("lifted_at", null)
      .in("scope", ["all_email", "market_brief"])
      .limit(1);
    if ((suppression?.length ?? 0) > 0) continue;
    rows.push({
      user_id: preference.user_id,
      category: "market_brief",
      idempotency_key: `market_brief:${overview.id}:${preference.user_id}`,
      payload: { overview_id: overview.id, market_date: overview.market_date },
    });
  }

  if (rows.length === 0) {
    return new Response(JSON.stringify({ overview_id: overview.id, enqueued: 0 }), { headers });
  }

  const { data, error } = await supabase
    .from("communication_outbox")
    .upsert(rows, { onConflict: "idempotency_key", ignoreDuplicates: true })
    .select("id");
  if (error) throw error;

  return new Response(JSON.stringify({ overview_id: overview.id, eligible: rows.length, enqueued: data?.length ?? 0 }), { headers });
});
