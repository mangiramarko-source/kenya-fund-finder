/**
 * Print row counts for important Supabase tables/views.
 *
 * Uses anon key from .env (no service role required for public tables).
 *
 * Usage:
 *   npm run db:check-counts
 *   node scripts/check-supabase-row-counts.mjs --json
 */

import { createClient } from "@supabase/supabase-js";
import { readFileSync, existsSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");

function loadEnv() {
  const path = resolve(root, ".env");
  if (!existsSync(path)) return;
  for (const line of readFileSync(path, "utf8").split("\n")) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const i = t.indexOf("=");
    if (i === -1) continue;
    const key = t.slice(0, i).trim();
    let val = t.slice(i + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = val;
  }
}

loadEnv();

const url = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const key =
  process.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  process.env.SUPABASE_PUBLISHABLE_KEY ||
  process.env.SUPABASE_ANON_KEY;
const jsonOut = process.argv.includes("--json");

if (!url || !key) {
  console.error(
    "\nMissing credentials. Set in .env:\n" +
      "  VITE_SUPABASE_URL\n" +
      "  VITE_SUPABASE_PUBLISHABLE_KEY\n"
  );
  process.exit(1);
}

const supabase = createClient(url, key, { auth: { persistSession: false } });

const TABLES = [
  { name: "funds", note: "core" },
  { name: "funds_public", note: "view" },
  { name: "fund_yield_snapshots", note: "core" },
  { name: "stocks", note: "core" },
  { name: "stocks_public", note: "view" },
  { name: "stock_price_history", note: "core" },
  { name: "exchange_rates", note: "core" },
  { name: "exchange_rates_public", note: "view" },
  { name: "exchange_rate_history", note: "core" },
  { name: "commodities", note: "core" },
  { name: "commodities_public", note: "view" },
  { name: "commodity_price_history", note: "core" },
  { name: "news_articles", note: "core" },
  { name: "news_articles_public", note: "view" },
  { name: "site_pages", note: "core" },
  { name: "site_pages_public", note: "view" },
  { name: "social_links", note: "core" },
  { name: "profiles", note: "auth" },
  { name: "user_roles", note: "auth" },
];

async function countTable(name) {
  const { count, error } = await supabase.from(name).select("*", { count: "exact", head: true });
  if (error) return { name, count: null, status: "error", detail: error.message };
  return { name, count: count ?? 0, status: count === 0 ? "empty" : "ok", detail: "" };
}

async function main() {
  const results = [];
  for (const { name, note } of TABLES) {
    const row = await countTable(name);
    results.push({ ...row, note });
  }

  if (jsonOut) {
    console.log(JSON.stringify({ project: url, counts: results }, null, 2));
    return;
  }

  console.log(`\nSupabase row counts\nProject: ${url}\n`);
  console.log(`${"Table".padEnd(28)} ${"Count".padStart(8)}  Status`);
  console.log("-".repeat(50));
  for (const r of results) {
    const countStr = r.count === null ? "—" : String(r.count);
    const status = r.status === "error" ? `ERR: ${r.detail}` : r.status;
    console.log(`${r.name.padEnd(28)} ${countStr.padStart(8)}  ${status}`);
  }
  console.log("\nRun npm run db:migrate-lovable:quick if core tables are empty.");
}

main().catch((e) => {
  console.error("Check failed:", e.message);
  process.exit(1);
});
