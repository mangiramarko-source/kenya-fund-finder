/**
 * backfill-stock-history.mjs
 *
 * Fills missing NSE stock price history for July 2–30, 2026
 * using each stock's current price as a proxy (since Yahoo Finance
 * .NR tickers are unavailable outside RapidAPI).
 *
 * This ensures charts show continuous data rather than a blank gap.
 * Run: node scripts/backfill-stock-history.mjs
 */

import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

function loadEnv() {
  try {
    const envPath = resolve(__dirname, "../.env");
    const lines = readFileSync(envPath, "utf8").split("\n");
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eqIdx = trimmed.indexOf("=");
      if (eqIdx < 0) continue;
      const key = trimmed.slice(0, eqIdx).trim();
      const val = trimmed.slice(eqIdx + 1).trim().replace(/^["']|["']$/g, "");
      if (!process.env[key]) process.env[key] = val;
    }
  } catch {}
}
loadEnv();

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || "https://caawgzuofnujrznwbuxk.supabase.co";
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SERVICE_ROLE_KEY) {
  console.error("❌  SUPABASE_SERVICE_ROLE_KEY missing from .env");
  process.exit(1);
}

const HEADERS = {
  apikey: SERVICE_ROLE_KEY,
  Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
  "Content-Type": "application/json",
  Prefer: "resolution=merge-duplicates,return=minimal",
};

function datesBetween(start, end) {
  const dates = [];
  const cur = new Date(start + "T12:00:00Z");
  const endDate = new Date(end + "T12:00:00Z");
  while (cur <= endDate) {
    const dow = cur.getDay();
    if (dow !== 0 && dow !== 6) { // weekdays only (NSE closed weekends)
      dates.push(cur.toISOString().slice(0, 10));
    }
    cur.setDate(cur.getDate() + 1);
  }
  return dates;
}

async function run() {
  // Get all active stocks with current prices
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/stocks?select=id,symbol,price&is_active=eq.true&order=symbol`,
    { headers: { apikey: SERVICE_ROLE_KEY, Authorization: `Bearer ${SERVICE_ROLE_KEY}` } }
  );
  const stocks = await res.json();
  console.log(`\n📊 NSE Stock History Backfill`);
  console.log(`   Project: ${SUPABASE_URL}`);
  console.log(`   Stocks:  ${stocks.length} active`);

  // Dates to fill: July 2 → July 30 (weekdays only)
  const dates = datesBetween("2026-07-02", "2026-07-30");
  console.log(`   Dates:   ${dates[0]} → ${dates[dates.length - 1]} (${dates.length} trading days)\n`);

  // Get existing history to avoid duplicates
  const existRes = await fetch(
    `${SUPABASE_URL}/rest/v1/stock_price_history?select=stock_id,snapshot_date&snapshot_date=gte.2026-07-02&snapshot_date=lte.2026-07-30`,
    { headers: { apikey: SERVICE_ROLE_KEY, Authorization: `Bearer ${SERVICE_ROLE_KEY}` } }
  );
  const existing = await existRes.json();
  const existingSet = new Set(existing.map(r => `${r.stock_id}|${r.snapshot_date}`));
  console.log(`   Existing rows in range: ${existing.length}`);

  // Build insert rows for all missing combinations
  const rows = [];
  for (const stock of stocks) {
    if (!stock.price || stock.price <= 0) continue;
    for (const date of dates) {
      const key = `${stock.id}|${date}`;
      if (!existingSet.has(key)) {
        rows.push({
          stock_id: stock.id,
          price: stock.price,
          snapshot_date: date,
        });
      }
    }
  }

  console.log(`   Missing rows to insert: ${rows.length}`);

  if (rows.length === 0) {
    console.log("\n✅ Nothing to insert — stock history is already complete.");
    return;
  }

  // Insert in batches of 200
  const BATCH = 200;
  let inserted = 0;
  for (let i = 0; i < rows.length; i += BATCH) {
    const batch = rows.slice(i, i + BATCH);
    const r = await fetch(`${SUPABASE_URL}/rest/v1/stock_price_history`, {
      method: "POST",
      headers: HEADERS,
      body: JSON.stringify(batch),
    });
    if (!r.ok) {
      const body = await r.text();
      if (!body.includes("duplicate key")) {
        console.warn(`  ⚠️  Batch ${i / BATCH + 1} failed: ${body.slice(0, 150)}`);
      }
    } else {
      inserted += batch.length;
    }
    process.stdout.write(`\r   Inserted: ${inserted}/${rows.length} rows`);
  }

  console.log(`\n\n✅ Stock history backfill complete!`);
  console.log(`   Inserted ${inserted} rows for ${stocks.length} stocks × ${dates.length} trading days`);
  console.log(`\n   Note: Prices for July 2–30 use each stock's current price as a proxy.`);
  console.log(`   Future daily snapshots will record actual closing prices via pg_cron.\n`);
}

run().catch(e => { console.error("Fatal:", e); process.exit(1); });
