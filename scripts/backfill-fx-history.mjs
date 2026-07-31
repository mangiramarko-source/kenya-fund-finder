import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

function loadEnv() {
  try {
    const lines = readFileSync(resolve(__dirname, "../.env"), "utf8").split("\n");
    for (const line of lines) {
      const t = line.trim();
      if (!t || t.startsWith("#")) continue;
      const eq = t.indexOf("=");
      if (eq < 0) continue;
      const k = t.slice(0, eq).trim();
      const v = t.slice(eq + 1).trim().replace(/^["']|["']$/g, "");
      if (!process.env[k]) process.env[k] = v;
    }
  } catch {}
}
loadEnv();

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || "https://caawgzuofnujrznwbuxk.supabase.co";
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SERVICE_ROLE_KEY) {
  console.error("❌ SUPABASE_SERVICE_ROLE_KEY missing");
  process.exit(1);
}

const HEADERS = {
  apikey: SERVICE_ROLE_KEY,
  Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
  "Content-Type": "application/json",
  Prefer: "resolution=merge-duplicates,return=minimal",
};

function weekdays(start, end) {
  const dates = [];
  const cur = new Date(start + "T12:00:00Z");
  const endDate = new Date(end + "T12:00:00Z");
  while (cur <= endDate) {
    if (cur.getDay() !== 0 && cur.getDay() !== 6) {
      dates.push(cur.toISOString().slice(0, 10));
    }
    cur.setDate(cur.getDate() + 1);
  }
  return dates;
}

async function run() {
  const ratesRes = await fetch(`${SUPABASE_URL}/rest/v1/exchange_rates?select=id,currency_code,rate&is_active=eq.true`, {
    headers: { apikey: SERVICE_ROLE_KEY, Authorization: `Bearer ${SERVICE_ROLE_KEY}` }
  });
  const rates = await ratesRes.json();
  console.log(`\n📈 FX History Backfill — ${rates.length} active currency pairs`);

  const existRes = await fetch(
    `${SUPABASE_URL}/rest/v1/exchange_rate_history?select=exchange_rate_id,snapshot_date&snapshot_date=gte.2026-07-02&snapshot_date=lte.2026-07-30`,
    { headers: { apikey: SERVICE_ROLE_KEY, Authorization: `Bearer ${SERVICE_ROLE_KEY}` } }
  );
  const existing = await existRes.json();
  const existSet = new Set(existing.map(r => `${r.exchange_rate_id}|${r.snapshot_date}`));
  console.log(`   Existing rows in range: ${existing.length}`);

  const dates = weekdays("2026-07-02", "2026-07-30");
  const rows = [];
  for (const rate of rates) {
    for (const date of dates) {
      const key = `${rate.id}|${date}`;
      if (!existSet.has(key)) {
        rows.push({ exchange_rate_id: rate.id, rate: rate.rate, snapshot_date: date });
      }
    }
  }

  console.log(`   Missing rows to insert: ${rows.length}`);
  if (!rows.length) {
    console.log("✅ FX history complete!");
    return;
  }

  const BATCH = 200;
  let inserted = 0;
  for (let i = 0; i < rows.length; i += BATCH) {
    const batch = rows.slice(i, i + BATCH);
    const r = await fetch(`${SUPABASE_URL}/rest/v1/exchange_rate_history`, {
      method: "POST",
      headers: HEADERS,
      body: JSON.stringify(batch),
    });
    if (r.ok) {
      inserted += batch.length;
    } else {
      const err = await r.text();
      console.warn(`  ⚠️ Batch insert warning: ${err.slice(0, 150)}`);
    }
  }
  console.log(`✅ FX history backfill complete! Inserted ${inserted} rows.\n`);
}

run().catch(e => { console.error(e); process.exit(1); });
