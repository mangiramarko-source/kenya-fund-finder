/**
 * backfill-mansa-history.mjs
 *
 * One-off safeguarded historical closing-price backfill for regional East African
 * stocks (USE, DSE, RSE) into `public.stock_price_history`, plus 52-week
 * `year_high` / `year_low` clamping on `public.stocks`.
 *
 * Usage:
 *   node scripts/backfill-mansa-history.mjs --dry-run --exchanges=RSE --range=1Y
 *   node scripts/backfill-mansa-history.mjs --exchanges=USE --range=1Y --max-tickers=30
 *   node scripts/backfill-mansa-history.mjs --via-edge --dry-run --exchanges=RSE --range=1Y
 */

import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const MANSA_BASE_URL = "https://mansaapi.com/api/v1/markets/exchanges";
const ALLOWED_REGIONAL_EXCHANGES = new Set(["USE", "DSE", "RSE"]);
const VALID_RANGES = new Set(["1M", "3M", "6M", "1Y", "2Y", "5Y", "10Y", "ALL"]);

function loadEnv() {
  try {
    const envPath = resolve(__dirname, "../.env");
    for (const line of readFileSync(envPath, "utf8").split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eq = trimmed.indexOf("=");
      if (eq < 0) continue;
      const key = trimmed.slice(0, eq).trim();
      const val = trimmed.slice(eq + 1).trim().replace(/^["']|["']$/g, "");
      if (!process.env[key]) process.env[key] = val;
    }
  } catch {
    // Allow environment variables supplied directly via shell
  }
}

function parseCliArgs(argv) {
  const args = {
    dryRun: false,
    viaEdge: false,
    exchanges: ["USE", "DSE", "RSE"],
    range: "1Y",
    minRows: 30,
    maxTickers: 30,
  };

  for (const raw of argv.slice(2)) {
    if (raw === "--dry-run") {
      args.dryRun = true;
    } else if (raw === "--via-edge") {
      args.viaEdge = true;
    } else if (raw.startsWith("--exchanges=")) {
      const parsed = raw
        .slice("--exchanges=".length)
        .split(",")
        .map((s) => s.trim().toUpperCase())
        .filter((s) => ALLOWED_REGIONAL_EXCHANGES.has(s));
      if (parsed.length === 0) {
        throw new Error("--exchanges must include at least one of USE, DSE, RSE (NSE is excluded to preserve Mansa quota)");
      }
      args.exchanges = [...new Set(parsed)];
    } else if (raw.startsWith("--range=")) {
      const r = raw.slice("--range=".length).trim().toUpperCase();
      if (!VALID_RANGES.has(r)) throw new Error(`Invalid --range=${r}`);
      args.range = r;
    } else if (raw.startsWith("--min-rows=")) {
      args.minRows = Math.max(1, Number(raw.slice("--min-rows=".length)) || 30);
    } else if (raw.startsWith("--max-tickers=")) {
      args.maxTickers = Math.max(1, Math.min(100, Number(raw.slice("--max-tickers=".length)) || 30));
    }
  }
  return args;
}

function parseHistoryPayload(payload, referencePrice) {
  const root = payload && typeof payload === "object" ? payload : null;
  const dataObj = root?.data && typeof root.data === "object" && !Array.isArray(root.data) ? root.data : null;
  const priceUnit = String(dataObj?.price_unit ?? root?.price_unit ?? "").trim().toLowerCase() || null;
  const divisor = priceUnit === "cents" ? 100 : 1;
  const rawPoints = Array.isArray(dataObj?.points)
    ? dataObj.points
    : Array.isArray(root?.points)
    ? root.points
    : Array.isArray(root?.data)
    ? root.data
    : Array.isArray(payload)
    ? payload
    : [];

  const byDate = new Map();
  for (const item of rawPoints) {
    if (!item || typeof item !== "object") continue;
    const rawDate = String(item.date ?? item.snapshot_date ?? item.timestamp ?? item.trade_date ?? "").trim();
    const date = /^\d{4}-\d{2}-\d{2}/.test(rawDate) ? rawDate.slice(0, 10) : "";
    if (!date) continue;
    const rawClose = Number(String(item.close ?? item.adj_close ?? item.price ?? item.last_price ?? "").replace(/,/g, ""));
    if (!Number.isFinite(rawClose) || rawClose <= 0) continue;
    const price = Number((rawClose / divisor).toFixed(4));
    if (price > 0) byDate.set(date, price);
  }

  const points = Array.from(byDate.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, price]) => ({ date, price }));

  if (points.length === 0) {
    return { points: [], blockedReason: "NO_VALID_POINTS", scaleRatio: null, rawCount: rawPoints.length, priceUnit };
  }

  let scaleRatio = null;
  let blockedReason = null;
  if (typeof referencePrice === "number" && Number.isFinite(referencePrice) && referencePrice > 0) {
    const ratio = points[points.length - 1].price / referencePrice;
    scaleRatio = Number(ratio.toFixed(4));
    if (ratio < 0.5 || ratio > 2.0) {
      blockedReason = "SCALE_MISMATCH";
    }
  }

  return { points, blockedReason, scaleRatio, rawCount: rawPoints.length, priceUnit };
}

function compute52WeekRange(livePrice, points, referenceDateIso) {
  const cutoffIso = new Date(Date.parse(`${referenceDateIso}T00:00:00Z`) - 365 * 86_400_000)
    .toISOString()
    .slice(0, 10);
  const values = [];
  if (typeof livePrice === "number" && Number.isFinite(livePrice) && livePrice > 0) values.push(livePrice);
  for (const pt of points) {
    const dt = pt.snapshot_date || pt.date || "";
    if (!dt || dt < cutoffIso || dt > referenceDateIso) continue;
    if (typeof pt.price === "number" && Number.isFinite(pt.price) && pt.price > 0) values.push(pt.price);
  }
  return values.length ? { yearHigh: Math.max(...values), yearLow: Math.min(...values) } : { yearHigh: null, yearLow: null };
}

async function fetchExistingHistoryMap(supabaseUrl, apiKey, stockIds) {
  const map = new Map();
  if (stockIds.length === 0) return map;
  const idList = stockIds.join(",");
  let offset = 0;
  const pageSize = 1000;
  while (true) {
    const url = `${supabaseUrl}/rest/v1/stock_price_history_public?select=stock_id,snapshot_date,price&stock_id=in.(${idList})&order=snapshot_date.asc&limit=${pageSize}&offset=${offset}`;
    const res = await fetch(url, {
      headers: { apikey: apiKey },
    });
    if (!res.ok) throw new Error(`Bulk history fetch failed HTTP ${res.status}: ${await res.text()}`);
    const rows = await res.json();
    for (const r of rows) {
      const arr = map.get(r.stock_id) || [];
      arr.push({ snapshot_date: r.snapshot_date, price: Number(r.price) });
      map.set(r.stock_id, arr);
    }
    if (rows.length < pageSize) break;
    offset += pageSize;
  }
  return map;
}

async function runViaEdge(supabaseUrl, args) {
  const automationsSecret = process.env.AUTOMATIONS_SECRET;
  const adminJwt = process.env.ADMIN_JWT;
  const anonKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_PUBLISHABLE_KEY || "";
  if (!automationsSecret && !adminJwt) {
    throw new Error("--via-edge requires AUTOMATIONS_SECRET or ADMIN_JWT in environment");
  }
  const headers = { "Content-Type": "application/json" };
  if (automationsSecret) {
    headers.apikey = automationsSecret;
  } else {
    headers.apikey = anonKey;
    headers.Authorization = `Bearer ${adminJwt}`;
  }
  const res = await fetch(`${supabaseUrl}/functions/v1/fetch-market-data`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      action: "backfill_history",
      exchanges: args.exchanges,
      range: args.range,
      min_existing_rows: args.minRows,
      max_tickers: args.maxTickers,
      dry_run: args.dryRun,
    }),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`Edge backfill failed HTTP ${res.status}: ${text}`);
  console.log(JSON.stringify(JSON.parse(text), null, 2));
}

async function runDirect(supabaseUrl, readKey, secretKey, mansaApiKey, args) {
  const exchangeFilter = args.exchanges.join(",");
  const stocksRes = await fetch(
    `${supabaseUrl}/rest/v1/stocks_public?select=id,symbol,exchange,exchange_ticker,price,year_high,year_low&exchange=in.(${exchangeFilter})&order=sort_order.asc`,
    { headers: { apikey: readKey } },
  );
  if (!stocksRes.ok) throw new Error(`Stocks read failed HTTP ${stocksRes.status}: ${await stocksRes.text()}`);
  const regionalRows = await stocksRes.json();

  const historyByStockId = await fetchExistingHistoryMap(
    supabaseUrl,
    readKey,
    regionalRows.map((r) => r.id),
  );

  const candidatesAll = regionalRows.filter((r) => (historyByStockId.get(r.id)?.length ?? 0) < args.minRows);
  const targets = candidatesAll.slice(0, args.maxTickers);

  console.log(`Regional stocks in [${exchangeFilter}]: ${regionalRows.length} | Needing backfill (<${args.minRows} rows): ${candidatesAll.length} | Processing: ${targets.length} (dryRun=${args.dryRun}, range=${args.range})`);

  let tierBlocked = false;
  let rateLimited = false;
  let abortedReason = null;
  let stocksWritten = 0;
  let rowsWritten = 0;
  const referenceDateIso = new Date().toISOString().slice(0, 10);
  const report = [];

  for (const row of targets) {
    const ex = String(row.exchange || "USE").toUpperCase();
    const ticker = String(row.exchange_ticker || row.symbol.replace(/^(USE|DSE|RSE)-/i, "")).trim();
    const existing = historyByStockId.get(row.id) || [];
    const url = `${MANSA_BASE_URL}/${encodeURIComponent(ex)}/stocks/${encodeURIComponent(ticker)}/history?range=${encodeURIComponent(args.range)}&order=asc`;

    const res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${mansaApiKey}`,
        Accept: "application/json",
        "User-Agent": "KenyaFundFinder-MarketSync/1.0",
      },
      signal: AbortSignal.timeout(15_000),
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      const status = res.status;
      if (status === 401 || status === 402 || status === 403) {
        tierBlocked = true;
        abortedReason = `Mansa Pro tier or valid key required (HTTP ${status})`;
        report.push({ symbol: row.symbol, exchange: ex, exchange_ticker: ticker, existing_rows: existing.length, fetched_points: 0, inserted_rows: 0, scale_ratio: null, status: "tier_blocked", error: errText.slice(0, 180) });
        break;
      }
      if (status === 429) {
        rateLimited = true;
        abortedReason = "Mansa API rate limit (HTTP 429) reached; stopped early to preserve quota";
        report.push({ symbol: row.symbol, exchange: ex, exchange_ticker: ticker, existing_rows: existing.length, fetched_points: 0, inserted_rows: 0, scale_ratio: null, status: "rate_limited", error: errText.slice(0, 180) });
        break;
      }
      report.push({ symbol: row.symbol, exchange: ex, exchange_ticker: ticker, existing_rows: existing.length, fetched_points: 0, inserted_rows: 0, scale_ratio: null, status: status === 404 ? "not_found" : `http_${status}`, error: errText.slice(0, 180) });
      continue;
    }

    const payload = await res.json();
    const parsed = parseHistoryPayload(payload, Number(row.price) || null);
    if (parsed.blockedReason || parsed.points.length === 0) {
      report.push({ symbol: row.symbol, exchange: ex, exchange_ticker: ticker, existing_rows: existing.length, fetched_points: parsed.rawCount, inserted_rows: 0, scale_ratio: parsed.scaleRatio, status: parsed.blockedReason === "SCALE_MISMATCH" ? "scale_mismatch" : "no_valid_points" });
      continue;
    }

    const existingDates = new Set(existing.map((e) => e.snapshot_date));
    const toInsert = parsed.points
      .filter((pt) => !existingDates.has(pt.date))
      .map((pt) => ({ stock_id: row.id, price: pt.price, snapshot_date: pt.date }));

    if (args.dryRun) {
      report.push({ symbol: row.symbol, exchange: ex, exchange_ticker: ticker, existing_rows: existing.length, fetched_points: parsed.points.length, inserted_rows: toInsert.length, scale_ratio: parsed.scaleRatio, status: "dry_run_ok" });
      continue;
    }

    if (!secretKey) {
      throw new Error("Live writes require SUPABASE_SECRET_KEY (sb_secret_...) in environment (or invoke deployed Edge Function with --via-edge)");
    }

    for (let i = 0; i < toInsert.length; i += 500) {
      const chunk = toInsert.slice(i, i + 500);
      const upRes = await fetch(
        `${supabaseUrl}/rest/v1/stock_price_history?on_conflict=stock_id,snapshot_date`,
        {
          method: "POST",
          headers: {
            apikey: secretKey,
            "Content-Type": "application/json",
            Prefer: "resolution=ignore-duplicates,return=minimal",
          },
          body: JSON.stringify(chunk),
        },
      );
      if (!upRes.ok) {
        throw new Error(`History upsert failed for ${row.symbol} HTTP ${upRes.status}: ${await upRes.text()}`);
      }
      rowsWritten += chunk.length;
    }

    const combined = [...existing, ...toInsert.map((pt) => ({ snapshot_date: pt.snapshot_date, price: pt.price }))];
    const clamped = compute52WeekRange(Number(row.price) || null, combined, referenceDateIso);
    if (clamped.yearHigh != null && clamped.yearLow != null) {
      await fetch(`${supabaseUrl}/rest/v1/stocks?id=eq.${encodeURIComponent(row.id)}`, {
        method: "PATCH",
        headers: {
          apikey: secretKey,
          "Content-Type": "application/json",
          Prefer: "return=minimal",
        },
        body: JSON.stringify({ year_high: clamped.yearHigh, year_low: clamped.yearLow }),
      });
    }

    stocksWritten++;
    report.push({ symbol: row.symbol, exchange: ex, exchange_ticker: ticker, existing_rows: existing.length, fetched_points: parsed.points.length, inserted_rows: toInsert.length, scale_ratio: parsed.scaleRatio, status: "ok" });
  }

  console.log(JSON.stringify({
    success: !tierBlocked && !rateLimited,
    dry_run: args.dryRun,
    exchanges: args.exchanges,
    range: args.range,
    min_existing_rows: args.minRows,
    max_tickers: args.maxTickers,
    total_regional_stocks: regionalRows.length,
    candidates_needing_backfill: candidatesAll.length,
    candidates_processed: report.length,
    stocks_written: stocksWritten,
    rows_written: rowsWritten,
    tier_blocked: tierBlocked,
    rate_limited: rateLimited,
    aborted_reason: abortedReason,
    report,
  }, null, 2));
}

loadEnv();
const args = parseCliArgs(process.argv);
const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const READ_KEY = process.env.SUPABASE_SECRET_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_PUBLISHABLE_KEY;
const SECRET_KEY = process.env.SUPABASE_SECRET_KEY || "";
const MANSA_API_KEY = process.env.MANSA_API_KEY;

if (!SUPABASE_URL) {
  console.error("Missing SUPABASE_URL / VITE_SUPABASE_URL");
  process.exit(1);
}

if (args.viaEdge) {
  await runViaEdge(SUPABASE_URL, args);
} else {
  if (!READ_KEY || !MANSA_API_KEY) {
    console.error("Missing VITE_SUPABASE_PUBLISHABLE_KEY/SUPABASE_SECRET_KEY or MANSA_API_KEY in .env (or pass --via-edge with AUTOMATIONS_SECRET)");
    process.exit(1);
  }
  await runDirect(SUPABASE_URL, READ_KEY, SECRET_KEY, MANSA_API_KEY, args);
}
