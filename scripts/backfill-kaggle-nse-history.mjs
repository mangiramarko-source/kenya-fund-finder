import { existsSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { basename, extname, resolve } from "node:path";
import { execFileSync } from "node:child_process";
import { normalizeKaggleNseCsv } from "./lib/kaggle-nse-history.mjs";

const envPath = resolve(".env");
if (existsSync(envPath)) {
  for (const line of readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const match = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (!match || process.env[match[1]]) continue;
    process.env[match[1]] = match[2].trim().replace(/^(['"])(.*)\1$/, "$2");
  }
}

const sourceArg = process.argv.find((argument) => argument.startsWith("--source="));
const sourcePath = resolve(sourceArg?.slice("--source=".length) || "");
const apply = process.argv.includes("--apply");
const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const checkpointPath = process.env.KAGGLE_NSE_CHECKPOINT || "/tmp/kff-kaggle-nse-checkpoint.json";
const reportPath = process.env.KAGGLE_NSE_REPORT || "/tmp/kff-kaggle-nse-report.json";
const endDate = new Date().toISOString().slice(0, 10);
const startDate = "2007-01-01";

if (!sourceArg || !existsSync(sourcePath)) {
  console.error("Pass an existing CSV or ZIP with --source=/path/to/file");
  process.exit(1);
}
if (!supabaseUrl || !serviceKey) {
  console.error("Missing VITE_SUPABASE_URL/SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const headers = {
  apikey: serviceKey,
  Authorization: `Bearer ${serviceKey}`,
  "Content-Type": "application/json",
};

async function request(url, init = {}) {
  const response = await fetch(url, init);
  if (!response.ok) throw new Error(`HTTP ${response.status}: ${(await response.text()).slice(0, 300)}`);
  return response;
}

function readSources() {
  if (extname(sourcePath).toLowerCase() === ".csv") {
    return [{ name: basename(sourcePath), text: readFileSync(sourcePath, "utf8") }];
  }
  const entries = execFileSync("unzip", ["-Z1", sourcePath], { encoding: "utf8" })
    .split(/\r?\n/)
    .filter((name) => /NSE_data_all_stocks_20\d{2}\.csv$/i.test(name));
  return entries.map((name) => ({
    name,
    text: execFileSync("unzip", ["-p", sourcePath, name], { encoding: "utf8", maxBuffer: 30 * 1024 * 1024 }),
  }));
}

const sourceFiles = readSources();
const normalized = sourceFiles.map(({ name, text }) => ({ name, ...normalizeKaggleNseCsv(text, { startDate, endDate }) }));
const rows = [...new Map(normalized.flatMap((file) => file.rows).map((row) => [`${row.symbol}|${row.snapshot_date}`, row])).values()];
const rowsBySymbol = Map.groupBy(rows, (row) => row.symbol);
const symbolAliases = new Map([["NSE20", "NSE"]]);

const stocksResponse = await request(`${supabaseUrl}/rest/v1/stocks?select=id,symbol,name&is_active=eq.true&order=symbol.asc`, { headers });
const stocks = await stocksResponse.json();
const sourceStat = statSync(sourcePath);
const checkpointFingerprint = `${sourcePath}:${sourceStat.size}:${Math.trunc(sourceStat.mtimeMs)}:${startDate}:${endDate}:day-price`;
const savedCheckpoint = existsSync(checkpointPath) ? JSON.parse(readFileSync(checkpointPath, "utf8")) : null;
const checkpoint = savedCheckpoint?.fingerprint === checkpointFingerprint
  ? savedCheckpoint
  : { fingerprint: checkpointFingerprint, completed: {}, started_at: new Date().toISOString() };
const report = {
  apply,
  source: sourcePath,
  window: { start: startDate, end: endDate },
  files: normalized.map((file) => ({ name: file.name, rows: file.rows.length, rejected: file.rejected })),
  matched: [],
  unmatched_dataset_symbols: [],
  stocks_without_data: [],
  failed: [],
};

const matchedDatasetSymbols = new Set(stocks.map((stock) => symbolAliases.get(stock.symbol.toUpperCase()) || stock.symbol.toUpperCase()));
report.unmatched_dataset_symbols = [...rowsBySymbol.keys()].filter((symbol) => !matchedDatasetSymbols.has(symbol)).sort();

for (const stock of stocks) {
  const datasetSymbol = symbolAliases.get(stock.symbol.toUpperCase()) || stock.symbol.toUpperCase();
  const stockRows = rowsBySymbol.get(datasetSymbol) || [];
  if (!stockRows.length) {
    report.stocks_without_data.push({ symbol: stock.symbol, name: stock.name });
    continue;
  }

  try {
    if (apply && !checkpoint.completed[stock.symbol]) {
      for (let index = 0; index < stockRows.length; index += 250) {
        const batch = stockRows.slice(index, index + 250).map(({ snapshot_date, price }) => ({
          stock_id: stock.id,
          snapshot_date,
          price,
        }));
        await request(`${supabaseUrl}/rest/v1/stock_price_history?on_conflict=stock_id,snapshot_date`, {
          method: "POST",
          headers: { ...headers, Prefer: "resolution=merge-duplicates,return=minimal" },
          body: JSON.stringify(batch),
        });
      }
      checkpoint.completed[stock.symbol] = { rows: stockRows.length, completed_at: new Date().toISOString() };
      writeFileSync(checkpointPath, JSON.stringify(checkpoint, null, 2));
    }
    report.matched.push({
      symbol: stock.symbol,
      dataset_symbol: datasetSymbol,
      rows: stockRows.length,
      earliest: stockRows[0].snapshot_date,
      latest: stockRows.at(-1).snapshot_date,
      resumed: apply && Boolean(savedCheckpoint?.fingerprint === checkpointFingerprint && savedCheckpoint.completed?.[stock.symbol]),
    });
    console.log(`${apply ? "APPLY" : "DRY"} ${stock.symbol}: ${stockRows.length} (${stockRows[0].snapshot_date} → ${stockRows.at(-1).snapshot_date})`);
  } catch (error) {
    report.failed.push({ symbol: stock.symbol, error: error instanceof Error ? error.message : String(error) });
  }
}

report.finished_at = new Date().toISOString();
writeFileSync(reportPath, JSON.stringify(report, null, 2));
console.log(`\n${apply ? "Backfill" : "Dry run"}: ${report.matched.length} matched, ${report.stocks_without_data.length} stocks without data, ${report.failed.length} failed.`);
console.log(`Report: ${reportPath}`);
if (!apply) console.log("No database rows were changed. Review the report, then re-run with --apply.");
if (report.failed.length) process.exitCode = 1;
