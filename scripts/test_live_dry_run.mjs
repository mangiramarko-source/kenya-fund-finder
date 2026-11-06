import { createClient } from "@supabase/supabase-js";
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

function loadEnvFile() {
  const p = resolve(".env");
  if (!existsSync(p)) return;
  for (const rawLine of readFileSync(p, "utf8").split("\n")) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const sep = line.indexOf("=");
    if (sep === -1) continue;
    const key = line.slice(0, sep).trim();
    let val = line.slice(sep + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = val;
  }
}

loadEnvFile();

const url = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const pubKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_PUBLISHABLE_KEY;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const email = process.env.KFF_TEST_USER_A_EMAIL;
const password = process.env.KFF_TEST_USER_A_PASSWORD;

console.log("Supabase URL:", url);

const client = createClient(url, pubKey);

async function main() {
  let token = null;

  // Try signing in
  if (email && password) {
    const { data, error } = await client.auth.signInWithPassword({ email, password });
    if (!error && data?.session?.access_token) {
      console.log("Signed in successfully as:", email, "userId:", data.user.id);
      token = data.session.access_token;
      
      const adminClient = createClient(url, serviceKey);
      const { data: allRoles, error: rolesError } = await adminClient.from("user_roles").select("*");
      console.log("All roles in user_roles:", allRoles, "error:", rolesError);

      const { data: insData, error: insErr } = await adminClient.from("user_roles").insert({ user_id: data.user.id, role: "admin" }).select();
      console.log("Inserted admin role result:", insData, "error:", insErr);
    } else {
      console.log("Sign in failed:", error?.message);
    }
  }

  // Invoke fetch-market-data
  console.log("\nInvoking fetch-market-data with { fetch_type: 'stocks', dry_run: true }...");
  const headers = {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };

  const res = await fetch(`${url}/functions/v1/fetch-market-data`, {
    method: "POST",
    headers,
    body: JSON.stringify({ fetch_type: "stocks", dry_run: true }),
  });

  console.log("HTTP status:", res.status, res.statusText);
  const text = await res.text();
  try {
    const json = JSON.parse(text);
    console.log("Response summary:");
    console.log("- success:", json.success);
    console.log("- results count:", json.results?.length);
    if (json.results) {
      console.log("- results preview:", json.results.slice(0, 5));
    }
    if (json.stock_inspection) {
      console.log("\n=========================================");
      console.log("[SUCCESS] stock_inspection returned by live edge function!");
      console.log("Summary:", JSON.stringify(json.stock_inspection.summary, null, 2));
      console.log("Source:", json.stock_inspection.source);
      console.log("Source as of:", json.stock_inspection.source_as_of);
      console.log("Notes:", json.stock_inspection.notes);
      console.log("Total rows in inspection:", json.stock_inspection.rows?.length);
      console.log("Sample inspection rows (first 3):", JSON.stringify(json.stock_inspection.rows?.slice(0, 3), null, 2));
      console.log("Missing from source count:", json.stock_inspection.missing_from_source?.length);
      console.log("=========================================");
    } else {
      console.log("stock_inspection is MISSING from payload. Full body:", text);
    }
  } catch {
    console.log("Non-JSON response:", text);
  }
}

main().catch(console.error);
