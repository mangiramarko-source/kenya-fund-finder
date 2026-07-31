/**
 * backfill-market-data.mjs
 *
 * Restores missing market data (FX rates, commodities, NSE stocks)
 * from 2026-07-02 to today. Uses:
 *  - open.er-api.com  → FX rates (free, no key)
 *  - api.coingecko.com → crypto prices (free)
 *  - query1.finance.yahoo.com → commodities & stocks (free)
 *
 * Run:
 *   node scripts/backfill-market-data.mjs
 *
 * Requires SUPABASE_SERVICE_ROLE_KEY in .env or env vars.
 */

import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

// ── Load .env ──────────────────────────────────────────────────────────────
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
  console.error("❌  SUPABASE_SERVICE_ROLE_KEY is missing from .env");
  console.error("   Add it from: Supabase Dashboard → Project Settings → API → service_role key");
  process.exit(1);
}

const HEADERS = {
  apikey: SERVICE_ROLE_KEY,
  Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
  "Content-Type": "application/json",
  Prefer: "return=minimal",
};

// ── Date helpers ─────────────────────────────────────────────────────────
function datesBetween(startStr, endStr) {
  const dates = [];
  const start = new Date(startStr);
  const end = new Date(endStr);
  const cur = new Date(start);
  while (cur <= end) {
    dates.push(cur.toISOString().slice(0, 10));
    cur.setDate(cur.getDate() + 1);
  }
  return dates;
}

const TODAY = new Date().toISOString().slice(0, 10);
const BACKFILL_START = "2026-07-02";

// ── REST helpers ─────────────────────────────────────────────────────────
async function supabaseGet(path, params = {}) {
  const url = new URL(`${SUPABASE_URL}/rest/v1/${path}`);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  const res = await fetch(url, { headers: { ...HEADERS, Prefer: "return=representation" } });
  if (!res.ok) throw new Error(`GET ${path} failed: ${res.status} ${await res.text()}`);
  return res.json();
}

async function supabaseUpsert(table, rows, conflict) {
  if (!rows.length) return;
  const url = `${SUPABASE_URL}/rest/v1/${table}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { ...HEADERS, Prefer: `resolution=merge-duplicates,return=minimal` },
    body: JSON.stringify(rows),
  });
  if (!res.ok) {
    const body = await res.text();
    console.warn(`  ⚠️  Upsert ${table} HTTP ${res.status}: ${body.slice(0, 200)}`);
  }
}

async function supabasePatch(table, id, data) {
  const url = `${SUPABASE_URL}/rest/v1/${table}?id=eq.${id}`;
  const res = await fetch(url, {
    method: "PATCH",
    headers: HEADERS,
    body: JSON.stringify(data),
  });
  if (!res.ok) console.warn(`  ⚠️  PATCH ${table} ${id}: ${res.status}`);
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ── Free API fetchers ────────────────────────────────────────────────────

/** Fetch KES-based FX rates for a given date from open.er-api.com */
async function fetchFxRates() {
  try {
    const res = await fetch("https://open.er-api.com/v6/latest/KES");
    if (!res.ok) throw new Error(`FX API ${res.status}`);
    const data = await res.json();
    // rates are X per 1 KES; we want KES per 1 X  → 1 / rate
    const rates = {};
    for (const [code, xPerKes] of Object.entries(data.rates || {})) {
      if (xPerKes > 0) rates[code] = parseFloat((1 / xPerKes).toFixed(4));
    }
    return rates; // e.g. { USD: 129.5, EUR: 147.2, ... }
  } catch (e) {
    console.error("  ❌ FX fetch failed:", e.message);
    return null;
  }
}

/** Fetch historical KES rate from frankfurter.app (free, historical FX) */
async function fetchHistoricalFxRates(dateStr) {
  try {
    const res = await fetch(`https://api.frankfurter.app/${dateStr}?base=USD`);
    if (!res.ok) return null;
    const data = await res.json();
    // Frankfurter gives rates vs USD. We need KES per each currency.
    // USD→KES is in data.rates.KES
    const usdPerKes = data.rates?.KES;
    if (!usdPerKes) return null;
    const kesPerUsd = usdPerKes; // 1 USD = usdPerKes KES
    const result = { USD: parseFloat(kesPerUsd.toFixed(4)) };
    // For other currencies: KES per X = (KES per USD) / (X per USD)
    for (const [code, xPerUsd] of Object.entries(data.rates)) {
      if (code === "KES" || xPerUsd <= 0) continue;
      result[code] = parseFloat((kesPerUsd / xPerUsd).toFixed(4));
    }
    return result;
  } catch {
    return null;
  }
}

/** Fetch crypto prices from CoinGecko */
async function fetchCryptoPrices(geckoIds) {
  try {
    const ids = geckoIds.join(",");
    const res = await fetch(`https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=usd`);
    if (!res.ok) throw new Error(`CoinGecko ${res.status}`);
    return await res.json(); // { bitcoin: { usd: 95000 }, ... }
  } catch (e) {
    console.error("  ❌ CoinGecko failed:", e.message);
    return {};
  }
}

/** Fetch Yahoo Finance price for a ticker */
async function fetchYahooPrice(ticker) {
  try {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(ticker)}?interval=1d&range=5d`;
    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible)" },
    });
    if (!res.ok) return null;
    const j = await res.json();
    const result = j?.chart?.result?.[0];
    if (!result) return null;
    const price = result.meta?.regularMarketPrice;
    return typeof price === "number" && price > 0 ? price : null;
  } catch {
    return null;
  }
}

/** Fetch Yahoo Finance historical closing prices for a ticker */
async function fetchYahooHistory(ticker, fromDate, toDate) {
  try {
    const from = Math.floor(new Date(fromDate).getTime() / 1000);
    const to = Math.floor(new Date(toDate + "T23:59:59Z").getTime() / 1000);
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(ticker)}?interval=1d&period1=${from}&period2=${to}`;
    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible)" },
    });
    if (!res.ok) return [];
    const j = await res.json();
    const result = j?.chart?.result?.[0];
    if (!result) return [];
    const timestamps = result.timestamps || result.timestamp || [];
    const closes = result.indicators?.quote?.[0]?.close || [];
    return timestamps.map((ts, i) => ({
      date: new Date(ts * 1000).toISOString().slice(0, 10),
      price: typeof closes[i] === "number" && closes[i] > 0 ? parseFloat(closes[i].toFixed(4)) : null,
    })).filter((d) => d.price !== null && d.date >= fromDate && d.date <= toDate);
  } catch {
    return [];
  }
}

// ── Crypto map ────────────────────────────────────────────────────────────
const CRYPTO_MAP = {
  BTC: "bitcoin", ETH: "ethereum", SOL: "solana", BNB: "binancecoin",
  XRP: "ripple", ADA: "cardano", DOGE: "dogecoin",
};

const YAHOO_COMMODITY_MAP = {
  XAU: "GC=F", GOLD: "GC=F", XAG: "SI=F", SILVER: "SI=F",
  BRENT: "BZ=F", WTI: "CL=F", CRUDE: "CL=F", OIL: "CL=F",
  NG: "NG=F", NATGAS: "NG=F", HG: "HG=F", COPPER: "HG=F",
  KC: "KC=F", COFFEE: "KC=F", CC: "CC=F", COCOA: "CC=F",
  SB: "SB=F", SUGAR: "SB=F", ZC: "ZC=F", CORN: "ZC=F",
  ZW: "ZW=F", WHEAT: "ZW=F", ZS: "ZS=F", SOY: "ZS=F",
  PL: "PL=F", PLATINUM: "PL=F", PA: "PA=F", PALLADIUM: "PA=F",
};

const NSE_YAHOO_MAP = {
  SCOM: "SCOM.NR", EQTY: "EQTY.NR", KCB: "KCB.NR", COOP: "COOP.NR",
  ABSA: "ABSA.NR", EABL: "EABL.NR", BAT: "BAT.NR", KNRE: "KNRE.NR",
  KPLC: "KPLC.NR", BAMB: "BAMB.NR", SASN: "SASN.NR", TOTL: "TOTL.NR",
  NCBA: "NCBA.NR", SCBK: "SCBK.NR", SBIC: "SBIC.NR", IMH: "IMH.NR",
  KEGN: "KEGN.NR", BKG: "BKG.NR", DTK: "DTK.NR", BRIT: "BRIT.NR",
  JUB: "JUB.NR", KQ: "KQ.NR", HFCK: "HFCK.NR", CIC: "CIC.NR",
  CTUM: "CTUM.NR", KUKZ: "KUKZ.NR", CRWN: "CRWN.NR", PORT: "PORT.NR",
  CARB: "CARB.NR", CGEN: "CGEN.NR", LBTY: "LBTY.NR", WTK: "WTK.NR",
  SMER: "SMER.NR", TPSE: "TPSE.NR", KAPC: "KAPC.NR", NMG: "NMG.NR",
  BOC: "BOC.NR", UNGA: "UNGA.NR", SLAM: "SLAM.NR", TCL: "TCL.NR",
  LKL: "LKL.NR", SGL: "SGL.NR", UMME: "UMME.NR",
};

// ── Main ──────────────────────────────────────────────────────────────────
async function main() {
  const dates = datesBetween(BACKFILL_START, TODAY);
  console.log(`\n🚀 KenyaFundFinder Market Data Backfill`);
  console.log(`   Supabase: ${SUPABASE_URL}`);
  console.log(`   Period:   ${BACKFILL_START} → ${TODAY} (${dates.length} days)\n`);

  // ══════════════════════════════════════════════════════════════════
  //  1. FX RATES
  // ══════════════════════════════════════════════════════════════════
  console.log("📈 [1/3] FX Rates...");

  const existingRates = await supabaseGet("exchange_rates", {
    select: "id,currency_code,rate",
    order: "currency_code",
  });
  console.log(`   Found ${existingRates.length} currency pairs in DB`);

  // Fetch current rates to update live values
  const currentRates = await fetchFxRates();
  if (currentRates) {
    let fxUpdated = 0;
    for (const row of existingRates) {
      const newRate = currentRates[row.currency_code];
      if (newRate && newRate > 0) {
        await supabasePatch("exchange_rates", row.id, {
          previous_rate: row.rate,
          rate: newRate,
          updated_at: new Date().toISOString(),
        });
        fxUpdated++;
      }
    }
    console.log(`   ✅ Updated ${fxUpdated} live FX rates`);
  } else {
    console.log("   ⚠️  Could not fetch current FX rates from open.er-api.com");
  }

  // Backfill historical snapshots using Frankfurter API
  console.log(`   Backfilling ${dates.length} days of FX history...`);
  let fxHistoryRows = 0;
  const fxRateIdMap = Object.fromEntries(existingRates.map((r) => [r.currency_code, r.id]));

  for (const dateStr of dates) {
    // Skip weekends (FX markets mostly closed)
    const dow = new Date(dateStr + "T12:00:00Z").getDay();
    if (dow === 0 || dow === 6) continue;

    await sleep(150); // be nice to free API
    const historicalRates = await fetchHistoricalFxRates(dateStr);
    if (!historicalRates) continue;

    const rows = [];
    for (const [code, rate] of Object.entries(historicalRates)) {
      const rateId = fxRateIdMap[code];
      if (!rateId || rate <= 0) continue;
      rows.push({
        exchange_rate_id: rateId,
        rate,
        snapshot_date: dateStr,
      });
    }

    if (rows.length > 0) {
      await supabaseUpsert("exchange_rate_history", rows, "exchange_rate_id,snapshot_date");
      fxHistoryRows += rows.length;
      process.stdout.write(`\r   📅 ${dateStr}: +${rows.length} rows (total: ${fxHistoryRows})`);
    }
  }
  console.log(`\n   ✅ FX history: inserted ${fxHistoryRows} rows\n`);

  // ══════════════════════════════════════════════════════════════════
  //  2. COMMODITIES
  // ══════════════════════════════════════════════════════════════════
  console.log("🛢️  [2/3] Commodities...");

  const commodityRows = await supabaseGet("commodities", {
    select: "id,name,symbol,price",
    order: "name",
  });
  console.log(`   Found ${commodityRows.length} commodities in DB`);

  // Separate crypto from Yahoo-based
  const cryptoItems = commodityRows.filter((c) => CRYPTO_MAP[(c.symbol || "").toUpperCase()]);
  const yahooItems = commodityRows
    .filter((c) => !CRYPTO_MAP[(c.symbol || "").toUpperCase()])
    .map((c) => {
      const sym = (c.symbol || "").toUpperCase();
      const ticker = YAHOO_COMMODITY_MAP[sym];
      return ticker ? { row: c, ticker } : null;
    })
    .filter(Boolean);

  // --- Update live crypto prices ---
  if (cryptoItems.length > 0) {
    const geckoIds = [...new Set(cryptoItems.map((c) => CRYPTO_MAP[(c.symbol || "").toUpperCase()]))];
    const cgData = await fetchCryptoPrices(geckoIds);
    let cryptoUpdated = 0;
    for (const c of cryptoItems) {
      const geckoId = CRYPTO_MAP[(c.symbol || "").toUpperCase()];
      const newPrice = cgData[geckoId]?.usd;
      if (newPrice && newPrice > 0) {
        await supabasePatch("commodities", c.id, {
          previous_price: c.price,
          price: newPrice,
          updated_at: new Date().toISOString(),
        });
        cryptoUpdated++;
      }
    }
    console.log(`   ✅ Updated ${cryptoUpdated} crypto prices`);
  }

  // --- Update live Yahoo commodity prices ---
  let yahooUpdated = 0;
  for (const { row, ticker } of yahooItems) {
    await sleep(200);
    const price = await fetchYahooPrice(ticker);
    if (price && price > 0) {
      await supabasePatch("commodities", row.id, {
        previous_price: row.price,
        price: parseFloat(price.toFixed(4)),
        updated_at: new Date().toISOString(),
      });
      yahooUpdated++;
    }
  }
  console.log(`   ✅ Updated ${yahooUpdated} Yahoo commodity prices`);

  // --- Backfill commodity history ---
  console.log(`   Backfilling commodity history via Yahoo Finance...`);
  let commHistoryRows = 0;

  // Crypto history via CoinGecko market_chart
  for (const c of cryptoItems) {
    const geckoId = CRYPTO_MAP[(c.symbol || "").toUpperCase()];
    try {
      await sleep(1200); // CoinGecko free rate limit: 10-30 calls/min
      const res = await fetch(
        `https://api.coingecko.com/api/v3/coins/${geckoId}/market_chart?vs_currency=usd&days=30&interval=daily`
      );
      if (!res.ok) continue;
      const data = await res.json();
      const prices = (data.prices || []).map(([ts, price]) => ({
        commodity_id: c.id,
        price: parseFloat(price.toFixed(4)),
        snapshot_date: new Date(ts).toISOString().slice(0, 10),
      })).filter((p) => p.snapshot_date >= BACKFILL_START && p.snapshot_date <= TODAY);

      if (prices.length > 0) {
        await supabaseUpsert("commodity_price_history", prices, "commodity_id,snapshot_date");
        commHistoryRows += prices.length;
        console.log(`   📅 ${c.name}: +${prices.length} crypto history rows`);
      }
    } catch (e) {
      console.warn(`   ⚠️  ${c.name} CoinGecko history failed:`, e.message);
    }
  }

  // Yahoo commodity history
  for (const { row, ticker } of yahooItems) {
    await sleep(300);
    const history = await fetchYahooHistory(ticker, BACKFILL_START, TODAY);
    const insertRows = history.map((h) => ({
      commodity_id: row.id,
      price: h.price,
      snapshot_date: h.date,
    }));
    if (insertRows.length > 0) {
      await supabaseUpsert("commodity_price_history", insertRows, "commodity_id,snapshot_date");
      commHistoryRows += insertRows.length;
      console.log(`   📅 ${row.name} (${ticker}): +${insertRows.length} history rows`);
    }
  }
  console.log(`   ✅ Commodity history: ${commHistoryRows} rows inserted\n`);

  // ══════════════════════════════════════════════════════════════════
  //  3. NSE STOCKS
  // ══════════════════════════════════════════════════════════════════
  console.log("📊 [3/3] NSE Stocks...");

  const stockRows = await supabaseGet("stocks", {
    select: "id,symbol,name,price,previous_price,day_change,day_change_percent,year_high,year_low",
    "is_active": "eq.true",
    order: "symbol",
  });
  console.log(`   Found ${stockRows.length} active stocks in DB`);

  let stocksUpdated = 0;
  let stockHistoryRows = 0;

  for (const stock of stockRows) {
    const sym = (stock.symbol || "").toUpperCase();
    const yahooTicker = NSE_YAHOO_MAP[sym];
    if (!yahooTicker) continue;

    await sleep(250);

    // Fetch current live price
    const livePrice = await fetchYahooPrice(yahooTicker);
    if (livePrice && livePrice > 0) {
      const rounded = parseFloat(livePrice.toFixed(2));
      const dayChange = parseFloat((rounded - (stock.price || rounded)).toFixed(2));
      const dayChangePct = stock.price > 0
        ? parseFloat(((dayChange / stock.price) * 100).toFixed(2))
        : 0;
      await supabasePatch("stocks", stock.id, {
        previous_price: stock.price,
        price: rounded,
        day_change: dayChange,
        day_change_percent: dayChangePct,
        updated_at: new Date().toISOString(),
      });
      stocksUpdated++;
    }

    await sleep(250);

    // Fetch historical prices
    const history = await fetchYahooHistory(yahooTicker, BACKFILL_START, TODAY);
    if (history.length > 0) {
      const rows = history.map((h) => ({
        stock_id: stock.id,
        price: parseFloat(h.price.toFixed(2)),
        snapshot_date: h.date,
      }));
      await supabaseUpsert("stock_price_history", rows, "stock_id,snapshot_date");
      stockHistoryRows += rows.length;
      process.stdout.write(`\r   📅 ${sym}: ${livePrice ? `live=${livePrice.toFixed(2)}` : "no live"} +${rows.length} hist rows`);
    }
  }

  console.log(`\n   ✅ Stocks: ${stocksUpdated} live prices updated, ${stockHistoryRows} history rows inserted\n`);

  // ══════════════════════════════════════════════════════════════════
  //  SUMMARY
  // ══════════════════════════════════════════════════════════════════
  console.log("═".repeat(55));
  console.log("✅  Backfill Complete!");
  console.log(`   FX:          live rates updated + history filled`);
  console.log(`   Commodities: live prices updated + history filled`);
  console.log(`   Stocks:      live prices updated + history filled`);
  console.log("═".repeat(55));
  console.log("\n⚠️  IMPORTANT: Check Supabase Dashboard → Database → pg_cron");
  console.log("   to re-enable/verify scheduled jobs that fetch market data daily.\n");
}

main().catch((e) => {
  console.error("Fatal:", e);
  process.exit(1);
});
