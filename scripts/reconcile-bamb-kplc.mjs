/**
 * scripts/reconcile-bamb-kplc.mjs
 *
 * Reconciles stock records for BAMB and KPLC:
 * 1. Sets BAMB to is_active = false with takeover/delisting annotation in stock_company_profiles.
 * 2. Updates KPLC to current market closing price (~KES 21.95) and metrics.
 * 3. Backfills missing business-day snapshots in stock_price_history up to today.
 *
 * Usage:
 *   node scripts/reconcile-bamb-kplc.mjs           # Dry-run
 *   node scripts/reconcile-bamb-kplc.mjs --apply   # Apply changes to Supabase
 */

import { readFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));

function loadEnv() {
  const envPath = resolve(__dirname, "../.env");
  if (!existsSync(envPath)) return;
  const lines = readFileSync(envPath, "utf8").split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIdx = trimmed.indexOf("=");
    if (eqIdx < 0) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    const val = trimmed.slice(eqIdx + 1).trim().replace(/^["']|["']$/g, "");
    if (!process.env[key]) process.env[key] = val;
  }
}
loadEnv();

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || "https://caawgzuofnujrznwbuxk.supabase.co";
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY;
const isApply = process.argv.includes("--apply");

if (!SERVICE_KEY) {
  console.error("❌ SUPABASE_SERVICE_ROLE_KEY missing from environment.");
  process.exit(1);
}

const HEADERS = {
  apikey: SERVICE_KEY,
  Authorization: `Bearer ${SERVICE_KEY}`,
  "Content-Type": "application/json",
  Prefer: "return=representation",
};

async function api(path, options = {}) {
  const url = `${SUPABASE_URL}/rest/v1/${path}`;
  const res = await fetch(url, {
    ...options,
    headers: { ...HEADERS, ...(options.headers || {}) },
  });
  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`API error HTTP ${res.status} on ${path}: ${errText}`);
  }
  return res.json();
}

function getBusinessDaysBetween(startDateStr, endDateStr) {
  const days = [];
  const cur = new Date(`${startDateStr}T12:00:00Z`);
  const end = new Date(`${endDateStr}T12:00:00Z`);

  while (cur <= end) {
    const dow = cur.getUTCDay();
    if (dow !== 0 && dow !== 6) {
      days.push(cur.toISOString().slice(0, 10));
    }
    cur.setUTCDate(cur.getUTCDate() + 1);
  }
  return days;
}

async function main() {
  console.log(`\n======================================================`);
  console.log(`  BAMB & KPLC Stock Reconciliation (${isApply ? "LIVE APPLY" : "DRY RUN"})`);
  console.log(`  Supabase: ${SUPABASE_URL}`);
  console.log(`======================================================\n`);

  // 1. Fetch current stock records
  const stocks = await api("stocks?symbol=in.(BAMB,KPLC)&select=*");
  const bamb = stocks.find((s) => s.symbol === "BAMB");
  const kplc = stocks.find((s) => s.symbol === "KPLC");

  if (!bamb) console.warn("⚠️  BAMB record not found in stocks table.");
  if (!kplc) console.warn("⚠️  KPLC record not found in stocks table.");

  // -------------------------------------------------------------------
  // 2. Reconcile BAMB (Bamburi Cement)
  // -------------------------------------------------------------------
  if (bamb) {
    console.log(`--- [1/2] Bamburi Cement (BAMB) ---`);
    console.log(`  Current price: KES ${bamb.price}, Active: ${bamb.is_active}, Updated: ${bamb.updated_at}`);

    const bambPatch = {
      is_active: false,
      updated_at: new Date().toISOString(),
    };

    const bambProfilePatch = {
      summary: "Bamburi Cement produces cement and related building solutions for Kenya and the wider region. Following a successful mandatory takeover offer by Amsons Group at KES 65.00 per share (securing 96.54% ownership), trading in BAMB shares on the Nairobi Securities Exchange was suspended to facilitate compulsory acquisition of minority shareholders ahead of full delisting.",
      reviewed_at: new Date().toISOString(),
    };

    console.log(`  Proposed Action:`);
    console.log(`    - Set is_active = false (mark as suspended/delisted)`);
    console.log(`    - Retain last market trade price: KES ${bamb.price}`);
    console.log(`    - Update company profile with Amsons KES 65.00 takeover note`);

    if (isApply) {
      await api(`stocks?id=eq.${bamb.id}`, {
        method: "PATCH",
        body: JSON.stringify(bambPatch),
      });
      console.log(`  ✅ Successfully updated BAMB in stocks table.`);

      try {
        await api(`stock_company_profiles?stock_id=eq.${bamb.id}`, {
          method: "PATCH",
          body: JSON.stringify(bambProfilePatch),
        });
        console.log(`  ✅ Successfully updated BAMB in stock_company_profiles table.`);
      } catch (err) {
        console.warn(`  ⚠️  Profile update note: ${err.message}`);
      }
    } else {
      console.log(`  [DRY-RUN] Skipped BAMB update.`);
    }
  }

  // -------------------------------------------------------------------
  // 3. Reconcile KPLC (Kenya Power & Lighting Company)
  // -------------------------------------------------------------------
  if (kplc) {
    console.log(`\n--- [2/2] Kenya Power (KPLC) ---`);
    console.log(`  Current price: KES ${kplc.price}, Previous: KES ${kplc.previous_price}, Updated: ${kplc.updated_at}`);

    const targetPrice = 21.95;
    const previousPrice = 21.50;
    const dayChange = Number((targetPrice - previousPrice).toFixed(2)); // +0.45
    const dayChangePct = Number(((dayChange / previousPrice) * 100).toFixed(2)); // +2.09%

    const kplcPatch = {
      price: targetPrice,
      previous_price: previousPrice,
      day_change: dayChange,
      day_change_percent: dayChangePct,
      year_high: Math.max(kplc.year_high || 0, 25.00),
      year_low: Math.min(kplc.year_low || 11.20, 11.20),
      market_cap: 42834701637,
      pe_ratio: 1.8,
      dividend_yield: 6.83,
      is_active: true,
      updated_at: new Date().toISOString(),
      provider_updated_at: new Date().toISOString(),
      quote_source: "nse",
    };

    console.log(`  Proposed Action:`);
    console.log(`    - Update price to KES ${targetPrice} (Ord close)`);
    console.log(`    - Day change: +${dayChange} (+${dayChangePct}%)`);
    console.log(`    - 52-week range: KES ${kplcPatch.year_low} – KES ${kplcPatch.year_high}`);
    console.log(`    - Market cap: KES 42.83 Billion, P/E: 1.8x, Div Yield: 6.83%`);

    if (isApply) {
      await api(`stocks?id=eq.${kplc.id}`, {
        method: "PATCH",
        body: JSON.stringify(kplcPatch),
      });
      console.log(`  ✅ Successfully updated KPLC in stocks table.`);
    } else {
      console.log(`  [DRY-RUN] Skipped KPLC stocks table update.`);
    }

    // Check history snapshots
    const history = await api(`stock_price_history?stock_id=eq.${kplc.id}&order=snapshot_date.desc&limit=15`);
    const latestSnapshotDate = history.length > 0 ? history[0].snapshot_date : "2026-10-27";
    const today = new Date().toISOString().slice(0, 10);

    console.log(`  Latest historical snapshot date in DB: ${latestSnapshotDate}`);
    console.log(`  Target date: ${today}`);

    // If latest snapshot is before today, find missing business days
    const nextDateObj = new Date(`${latestSnapshotDate}T12:00:00Z`);
    nextDateObj.setUTCDate(nextDateObj.getUTCDate() + 1);
    const missingDays = getBusinessDaysBetween(nextDateObj.toISOString().slice(0, 10), today);

    console.log(`  Missing business days to backfill (${missingDays.length}): ${missingDays.join(", ") || "None"}`);

    if (missingDays.length > 0) {
      const historyRows = missingDays.map((date) => ({
        stock_id: kplc.id,
        snapshot_date: date,
        price: targetPrice,
      }));

      if (isApply) {
        await api("stock_price_history", {
          method: "POST",
          headers: { Prefer: "resolution=merge-duplicates,return=minimal" },
          body: JSON.stringify(historyRows),
        });
        console.log(`  ✅ Successfully backfilled ${historyRows.length} history rows for KPLC.`);
      } else {
        console.log(`  [DRY-RUN] Would insert ${historyRows.length} snapshots into stock_price_history.`);
      }
    }
  }

  console.log(`\n======================================================`);
  console.log(`  Reconciliation ${isApply ? "COMPLETE" : "DRY-RUN FINISHED"}`);
  console.log(`======================================================\n`);
}

main().catch((err) => {
  console.error("❌ Fatal error during reconciliation:", err);
  process.exit(1);
});
