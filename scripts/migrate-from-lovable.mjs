/**
 * One-time copy of public market data from the original Lovable Supabase project
 * into Kenya Fund Finder project caawgzuofnujrznwbuxk.
 *
 * Requires in .env:
 *   VITE_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY (Settings → API → service_role)
 *
 * Copies: funds, snapshots, stocks, stock history, FX, commodities, commodity
 * history, site pages, social links; news unless --skip-news.
 * Safe to re-run (upsert on id). Orphan fund snapshots are filtered out.
 *
 * Usage:
 *   npm run db:migrate-lovable          # full (includes ~8k news rows)
 *   npm run db:migrate-lovable:quick    # same without news
 */

import { createClient } from "@supabase/supabase-js";
import { readFileSync, existsSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { spawnSync } from "child_process";

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

/** Source reads use *_public views where RLS blocks anon on base tables. */
const SOURCE_PUBLIC_VIEWS = {
  exchange_rates: "exchange_rates_public",
  exchange_rate_history: "exchange_rate_history_public",
  commodities: "commodities_public",
  commodity_price_history: "commodity_price_history_public",
  news_articles: "news_articles_public",
  site_pages: "site_pages_public",
  social_links: "social_links_public",
};

function rlsReadHint(table, errorMessage) {
  const denied =
    /permission denied/i.test(errorMessage) ||
    /42501/.test(errorMessage) ||
    /row-level security/i.test(errorMessage);
  if (!denied) return "";
  const view = SOURCE_PUBLIC_VIEWS[table] ?? `${table}_public`;
  return ` Anon key cannot read ${table} (RLS). Use ${view} as the source instead.`;
}

async function probeSourceRead(table) {
  const { error } = await source.from(table).select("id").limit(1);
  return error?.message ?? null;
}

async function preflightSourceAccess() {
  const checks = [
    { source: "funds_public", note: "funds" },
    { source: "fund_yield_snapshots", note: "snapshots" },
    { source: "stocks_public", note: "stocks" },
    { source: "stock_price_history", note: "stock history" },
    { source: "exchange_rates_public", note: "exchange_rates" },
    { source: "exchange_rate_history_public", note: "exchange_rate_history" },
    { source: "commodities_public", note: "commodities" },
    { source: "commodity_price_history_public", note: "commodity_price_history" },
    { source: "site_pages_public", note: "site_pages" },
    { source: "social_links_public", note: "social_links" },
  ];
  if (!skipNews) {
    checks.push({ source: "news_articles_public", note: "news_articles" });
  }

  const blocked = [];
  for (const { source: src, note } of checks) {
    const err = await probeSourceRead(src);
    if (err) blocked.push({ src, note, err });
  }

  if (blocked.length) {
    console.error("\nSource preflight failed — cannot read from Lovable with anon key:\n");
    for (const { src, note, err } of blocked) {
      console.error(`  ${src} (${note}): ${err}`);
      const hint = rlsReadHint(note, err);
      if (hint) console.error(`    →${hint}`);
    }
    console.error(
      "\nThe migration script reads published data via *_public views. " +
        "If a view is blocked, check RLS/grants on the Lovable project.\n"
    );
    process.exit(1);
  }
  console.log("Source preflight: all tables/views readable.\n");
}

async function fetchAll(table, select = "*", pageSize = 1000) {
  const rows = [];
  let from = 0;
  while (true) {
    const { data, error } = await source
      .from(table)
      .select(select)
      .range(from, from + pageSize - 1);
    if (error) {
      throw new Error(`${table} read: ${error.message}.${rlsReadHint(table, error.message)}`);
    }
    if (!data?.length) break;
    rows.push(...data);
    if (data.length < pageSize) break;
    from += pageSize;
    process.stdout.write(`  … ${table} ${rows.length} rows\r`);
  }
  if (rows.length) console.log(`  ${table}: ${rows.length} rows`);
  return rows;
}

async function copyFromSource(sourceTable, destTable, transform = (row) => row, options = {}) {
  const rows = (await fetchAll(sourceTable)).map(transform);
  await upsertBatches(destTable, rows, options.batchSize ?? 100, options.onConflict ?? "id");
}

async function upsertBatches(table, rows, batchSize = 100, onConflict = "id") {
  if (!rows.length) {
    console.log(`  ${table}: skip (empty)`);
    return;
  }
  for (let i = 0; i < rows.length; i += batchSize) {
    const chunk = rows.slice(i, i + batchSize);
    const { error } = await dest.from(table).upsert(chunk, { onConflict });
    if (error) throw new Error(`${table} upsert @${i}: ${error.message}`);
    process.stdout.write(`  ${table}: ${Math.min(i + batchSize, rows.length)}/${rows.length}\r`);
  }
  console.log(`  ${table}: upserted ${rows.length}`);
}

function stripAudit(row) {
  const { created_by, updated_by, ...rest } = row;
  return rest;
}

function omitKeys(row, keys) {
  const out = { ...row };
  for (const key of keys) delete out[key];
  return out;
}

async function tableMissing(table) {
  const { error } = await dest.from(table).select("id").limit(1);
  return Boolean(error?.message?.includes("Could not find the table"));
}

async function ensurePriceHistorySchema() {
  const required = ["stock_price_history", "commodity_price_history"];
  const missing = [];
  for (const table of required) {
    if (await tableMissing(table)) missing.push(table);
  }
  if (!missing.length) return;

  console.log("Missing destination tables:", missing.join(", "));

  const dbUrl = process.env.SUPABASE_DB_URL || process.env.DATABASE_URL;
  if (dbUrl) {
    console.log("Applying repair migration via SUPABASE_DB_URL...\n");
    const result = spawnSync("node", [resolve(__dirname, "apply-repair-schema.mjs")], {
      cwd: root,
      stdio: "inherit",
      env: process.env,
    });
    if (result.status !== 0) process.exit(result.status ?? 1);

    for (const table of required) {
      if (await tableMissing(table)) {
        throw new Error(`Repair migration ran but ${table} is still missing.`);
      }
    }
    console.log("Schema repair complete.\n");
    return;
  }

  console.error(
    "\nCannot import price history until these tables exist.\n\n" +
      "Option A — SQL Editor (fastest):\n" +
      "  1. Open https://supabase.com/dashboard/project/caawgzuofnujrznwbuxk/sql/new\n" +
      "  2. Paste all of scripts/output/repair-price-history-tables.sql\n" +
      "  3. Click Run\n\n" +
      "Option B — CLI apply:\n" +
      "  Add SUPABASE_DB_URL to .env (Dashboard → Settings → Database → URI)\n" +
      "  npm run db:apply-repair-schema\n\n" +
      "Then re-run: npm run db:migrate-lovable:quick\n"
  );
  process.exit(1);
}

async function main() {
  console.log("Source (Lovable):", LOVABLE_URL);
  console.log("Destination:", DEST_URL);
  console.log("");

  await ensurePriceHistorySchema();
  await preflightSourceAccess();

  const funds = (await fetchAll("funds_public")).map(stripAudit);
  const fundIds = new Set(funds.map((f) => f.id));
  await upsertBatches("funds", funds);

  const snapshots = (await fetchAll("fund_yield_snapshots")).filter((s) => fundIds.has(s.fund_id));
  await upsertBatches("fund_yield_snapshots", snapshots);

  await copyFromSource("stocks_public", "stocks", stripAudit);
  await copyFromSource("stock_price_history", "stock_price_history");
  await copyFromSource("exchange_rates_public", "exchange_rates", (row) => ({
    ...stripAudit(row),
    is_active: true,
  }));
  await copyFromSource("exchange_rate_history_public", "exchange_rate_history", (row) =>
    omitKeys(row, ["currency_code"])
  );
  await copyFromSource("commodities_public", "commodities", (row) => ({
    ...stripAudit(row),
    is_active: true,
  }));
  await copyFromSource("commodity_price_history_public", "commodity_price_history", (row) =>
    omitKeys(row, ["symbol"])
  );

  if (!skipNews) {
    const news = (await fetchAll("news_articles_public")).map(stripAudit);
    await upsertBatches("news_articles", news, 50);
  } else {
    console.log("  news_articles: skipped (--skip-news)");
  }

  await copyFromSource("site_pages_public", "site_pages", stripAudit, { onConflict: "slug" });
  await copyFromSource("social_links_public", "social_links", (row) => ({
    ...stripAudit(row),
    is_active: true,
  }));

  console.log("\n--- Destination row counts ---");
  for (const table of [
    "funds",
    "fund_yield_snapshots",
    "stocks",
    "stock_price_history",
    "exchange_rates",
    "exchange_rate_history",
    "commodities",
    "commodity_price_history",
    "news_articles",
    "site_pages",
    "social_links",
  ]) {
    const { count, error } = await dest.from(table).select("id", { count: "exact", head: true });
    if (error) console.log(`  ${table}: error (${error.message})`);
    else console.log(`  ${table}: ${count ?? 0}`);
  }
  console.log("\nDone. Run npm run db:check-counts for a full report.");
}

main().catch((e) => {
  console.error("\nMigration failed:", e.message);
  process.exit(1);
});
