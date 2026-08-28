import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

function loadEnvFile() {
  const path = resolve(root, ".env");
  if (!existsSync(path)) return;

  for (const rawLine of readFileSync(path, "utf8").split("\n")) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const separator = line.indexOf("=");
    if (separator === -1) continue;

    const name = line.slice(0, separator).trim();
    let value = line.slice(separator + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (!process.env[name]) process.env[name] = value;
  }
}

loadEnvFile();

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const publishableKey =
  process.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  process.env.SUPABASE_PUBLISHABLE_KEY ||
  process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !publishableKey) {
  console.error("Missing VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY (or compatible aliases).");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, publishableKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const protectedTables = [
  { name: "profiles", column: "user_id" },
  { name: "user_roles", column: "user_id" },
  { name: "communication_preferences", column: "user_id" },
  { name: "price_alerts", column: "user_id" },
];

const publicMarketRelations = [
  "commodity_price_history",
  "commodity_price_history_public",
  "exchange_rate_history",
  "exchange_rate_history_public",
];

let failed = false;

for (const { name, column } of protectedTables) {
  const protectedResult = await supabase.from(name).select(column).limit(1);
  const leakedRows = protectedResult.data?.length ?? 0;
  const protectedOk = Boolean(protectedResult.error) || leakedRows === 0;
  console.log(`${protectedOk ? "PASS" : "FAIL"} protected ${name}`);
  if (!protectedOk) failed = true;
}

for (const name of publicMarketRelations) {
  const publicResult = await supabase.from(name).select("id").limit(1);
  const publicOk = !publicResult.error;
  console.log(`${publicOk ? "PASS" : "FAIL"} readable ${name}`);
  if (!publicOk) failed = true;
}

if (failed) {
  console.error("RLS verification failed.");
  process.exit(1);
}

console.log("RLS verification passed.");
