/**
 * One-time copy of public market data from the original Lovable Supabase project
 * into Kenya Fund Finder project caawgzuofnujrznwbuxk.
 *
 * Requires in .env:
 *   VITE_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY (Settings → API → service_role)
 *
 * Usage:
 *   node scripts/migrate-from-lovable.mjs
 *   node scripts/migrate-from-lovable.mjs --skip-news
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

const LOVABLE_URL = "https://qrmthciurngpzpjhevdj.supabase.co";
const LOVABLE_ANON =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFybXRoY2l1cm5ncHpwamhldmRqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIyNzQ1ODksImV4cCI6MjA4Nzg1MDU4OX0.WeQLthaDLzYdmSjY_tt4_ZClx68aXQe3EOjn314yygs";

const DEST_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const DEST_SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY;
const skipNews = process.argv.includes("--skip-news");

if (!DEST_URL || !DEST_SERVICE) {
  console.error(
    "\nMissing destination credentials.\n" +
      "Add to .env:\n" +
      "  VITE_SUPABASE_URL=https://caawgzuofnujrznwbuxk.supabase.co\n" +
      "  SUPABASE_SERVICE_ROLE_KEY=<from Supabase Dashboard → Settings → API → service_role>\n"
  );
  process.exit(1);
}

const source = createClient(LOVABLE_URL, LOVABLE_ANON);
const dest = createClient(DEST_URL, DEST_SERVICE, { auth: { persistSession: false } });

async function fetchAll(table, select = "*", pageSize = 1000) {
  const rows = [];
  let from = 0;
  while (true) {
    const { data, error } = await source
      .from(table)
      .select(select)
      .range(from, from + pageSize - 1);
    if (error) throw new Error(`${table} read: ${error.message}`);
    if (!data?.length) break;
    rows.push(...data);
    if (data.length < pageSize) break;
    from += pageSize;
    process.stdout.write(`  … ${table} ${rows.length} rows\r`);
  }
  if (rows.length) console.log(`  ${table}: ${rows.length} rows`);
  return rows;
}

async function upsertBatches(table, rows, batchSize = 100) {
  if (!rows.length) {
    console.log(`  ${table}: skip (empty)`);
    return;
  }
  for (let i = 0; i < rows.length; i += batchSize) {
    const chunk = rows.slice(i, i + batchSize);
    const { error } = await dest.from(table).upsert(chunk, { onConflict: "id" });
    if (error) throw new Error(`${table} upsert @${i}: ${error.message}`);
    process.stdout.write(`  ${table}: ${Math.min(i + batchSize, rows.length)}/${rows.length}\r`);
  }
  console.log(`  ${table}: upserted ${rows.length}`);
}

function stripAudit(row) {
  const { created_by, updated_by, ...rest } = row;
  return rest;
}

async function main() {
  console.log("Source (Lovable):", LOVABLE_URL);
  console.log("Destination:", DEST_URL);
  console.log("");

  const funds = (await fetchAll("funds_public")).map(stripAudit);
  await upsertBatches("funds", funds);

  await upsertBatches("fund_yield_snapshots", await fetchAll("fund_yield_snapshots"));
  await upsertBatches("stocks", (await fetchAll("stocks_public")).map(stripAudit));
  await upsertBatches("stock_price_history", await fetchAll("stock_price_history"));
  await upsertBatches("exchange_rates", await fetchAll("exchange_rates"));
  await upsertBatches("exchange_rate_history", await fetchAll("exchange_rate_history"));
  await upsertBatches("commodities", await fetchAll("commodities"));

  if (!skipNews) {
    await upsertBatches("news_articles", await fetchAll("news_articles"), 50);
  } else {
    console.log("  news_articles: skipped (--skip-news)");
  }

  await upsertBatches("site_pages", await fetchAll("site_pages"));
  await upsertBatches("social_links", await fetchAll("social_links"));

  const { count } = await dest.from("funds").select("id", { count: "exact", head: true });
  console.log("\nDone. funds count on destination:", count);
}

main().catch((e) => {
  console.error("\nMigration failed:", e.message);
  process.exit(1);
});
