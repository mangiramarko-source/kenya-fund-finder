import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { normalizeIceRows } from "./lib/ice-stock-history.mjs";

const envPath = resolve(".env");
if (existsSync(envPath)) {
  for (const line of readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const match = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (!match || process.env[match[1]]) continue;
    process.env[match[1]] = match[2].trim().replace(/^(['"])(.*)\1$/, "$2");
  }
}

const apply = process.argv.includes("--apply");
const concurrencyArg = process.argv.find((arg) => arg.startsWith("--concurrency="));
const concurrency = Math.min(8, Math.max(1, Number(concurrencyArg?.split("=")[1] || 3)));
const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const iceBaseUrl = process.env.ICE_API_BASE_URL;
const iceToken = process.env.ICE_API_TOKEN;
const iceExchangeId = process.env.ICE_NSE_EXCHANGE_ID;
const checkpointPath = process.env.ICE_BACKFILL_CHECKPOINT || "/tmp/kff-ice-stock-history-checkpoint.json";
const reportPath = process.env.ICE_BACKFILL_REPORT || "/tmp/kff-ice-stock-history-report.json";

if (!supabaseUrl || !serviceKey || !iceBaseUrl || !iceToken || !iceExchangeId) {
  console.error("Missing Supabase or ICE configuration. Required: SUPABASE_URL/VITE_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, ICE_API_BASE_URL, ICE_API_TOKEN, ICE_NSE_EXCHANGE_ID");
  process.exit(1);
}

const supabaseHeaders = {
  apikey: serviceKey,
  Authorization: `Bearer ${serviceKey}`,
  "Content-Type": "application/json",
};

const endDate = new Date();
const startDate = new Date(endDate);
startDate.setUTCFullYear(startDate.getUTCFullYear() - 5);
const dateOnly = (date) => date.toISOString().slice(0, 10);

const checkpoint = existsSync(checkpointPath)
  ? JSON.parse(readFileSync(checkpointPath, "utf8"))
  : { completed: {}, started_at: new Date().toISOString() };

const sleep = (milliseconds) => new Promise((resolvePromise) => setTimeout(resolvePromise, milliseconds));

async function fetchWithRetry(url, init, attempts = 3) {
  let lastError;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      const response = await fetch(url, init);
      if (response.ok) return response;
      lastError = new Error(`HTTP ${response.status}: ${(await response.text()).slice(0, 300)}`);
    } catch (error) {
      lastError = error;
    }
    if (attempt < attempts) await sleep(500 * attempt);
  }
  throw lastError;
}

async function fetchIceHistory(symbol) {
  const rows = [];
  let cursor = null;
  do {
    const url = new URL("historical-prices", iceBaseUrl.endsWith("/") ? iceBaseUrl : `${iceBaseUrl}/`);
    url.searchParams.set("exchange", iceExchangeId);
    url.searchParams.set("symbol", symbol);
    url.searchParams.set("start_date", dateOnly(startDate));
    url.searchParams.set("end_date", dateOnly(endDate));
    url.searchParams.set("frequency", "daily");
    url.searchParams.set("limit", "1000");
    if (cursor) url.searchParams.set("cursor", cursor);

    const response = await fetchWithRetry(url, {
      headers: { Authorization: `Bearer ${iceToken}`, Accept: "application/json" },
    });
    const payload = await response.json();
    rows.push(...normalizeIceRows(payload, { startDate, endDate }));
    cursor = payload?.next_cursor || payload?.nextCursor || payload?.pagination?.next_cursor || null;
  } while (cursor);

  return [...new Map(rows.map((row) => [row.snapshot_date, row])).values()]
    .sort((left, right) => left.snapshot_date.localeCompare(right.snapshot_date));
}

async function upsertRows(stockId, rows) {
  for (let index = 0; index < rows.length; index += 250) {
    const batch = rows.slice(index, index + 250).map((row) => ({ stock_id: stockId, ...row }));
    await fetchWithRetry(`${supabaseUrl}/rest/v1/stock_price_history?on_conflict=stock_id,snapshot_date`, {
      method: "POST",
      headers: { ...supabaseHeaders, Prefer: "resolution=merge-duplicates,return=minimal" },
      body: JSON.stringify(batch),
    });
  }
}

async function coverage(stock) {
  const base = `${supabaseUrl}/rest/v1/stock_price_history?stock_id=eq.${stock.id}&select=snapshot_date`;
  const earliestResponse = await fetchWithRetry(`${base}&order=snapshot_date.asc&limit=1`, {
    headers: { ...supabaseHeaders, Prefer: "count=exact" },
  });
  const latestResponse = await fetchWithRetry(`${base}&order=snapshot_date.desc&limit=1`, { headers: supabaseHeaders });
  const earliest = (await earliestResponse.json())[0]?.snapshot_date || null;
  const latest = (await latestResponse.json())[0]?.snapshot_date || null;
  const contentRange = earliestResponse.headers.get("content-range") || "*/0";
  return { symbol: stock.symbol, earliest, latest, points: Number(contentRange.split("/")[1] || 0) };
}

const stocksResponse = await fetchWithRetry(
  `${supabaseUrl}/rest/v1/stocks?select=id,symbol,name&is_active=eq.true&order=symbol.asc`,
  { headers: supabaseHeaders },
);
const stocks = await stocksResponse.json();
const queue = stocks.filter((stock) => !checkpoint.completed[stock.symbol]);
const report = { apply, started_at: new Date().toISOString(), completed: [], unmatched: [], failed: [], coverage: [] };

async function worker() {
  while (queue.length) {
    const stock = queue.shift();
    try {
      const rows = await fetchIceHistory(stock.symbol);
      if (!rows.length) {
        report.unmatched.push({ symbol: stock.symbol, reason: "ICE returned no valid daily closing prices" });
        continue;
      }
      if (apply) {
        await upsertRows(stock.id, rows);
        checkpoint.completed[stock.symbol] = { rows: rows.length, completed_at: new Date().toISOString() };
        writeFileSync(checkpointPath, JSON.stringify(checkpoint, null, 2));
      }
      report.completed.push({ symbol: stock.symbol, rows: rows.length, earliest: rows[0].snapshot_date, latest: rows.at(-1).snapshot_date });
      console.log(`${apply ? "APPLY" : "DRY"} ${stock.symbol}: ${rows.length} rows (${rows[0].snapshot_date} → ${rows.at(-1).snapshot_date})`);
    } catch (error) {
      report.failed.push({ symbol: stock.symbol, error: error instanceof Error ? error.message : String(error) });
      console.error(`FAIL ${stock.symbol}:`, error instanceof Error ? error.message : error);
    }
  }
}

await Promise.all(Array.from({ length: concurrency }, () => worker()));
if (apply) {
  for (const stock of stocks) report.coverage.push(await coverage(stock));
}
report.finished_at = new Date().toISOString();
writeFileSync(reportPath, JSON.stringify(report, null, 2));

console.log(`\n${apply ? "Backfill" : "Dry run"} complete: ${report.completed.length} matched, ${report.unmatched.length} unmatched, ${report.failed.length} failed.`);
console.log(`Report: ${reportPath}`);
if (!apply) console.log("No database rows were changed. Re-run with --apply after reviewing the report.");
if (report.failed.length) process.exitCode = 1;
