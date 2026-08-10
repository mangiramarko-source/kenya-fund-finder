import { createClient } from "@supabase/supabase-js";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const envPath = resolve(".env");
if (existsSync(envPath)) {
  for (const line of readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const match = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (!match || process.env[match[1]]) continue;
    process.env[match[1]] = match[2].trim().replace(/^(['"])(.*)\1$/, "$2");
  }
}

const apply = process.argv.includes("--apply");
const linkOnly = process.argv.includes("--link-only");
const limitArg = process.argv.find((arg) => arg.startsWith("--limit="));
const limit = Math.min(500, Math.max(1, Number(limitArg?.split("=")[1] || 100)));
const url = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const webhookSecret = process.env.ENRICHMENT_WEBHOOK_SECRET;

if (!url || !serviceKey || !webhookSecret) {
  console.error("Missing Supabase URL, SUPABASE_SERVICE_ROLE_KEY, or ENRICHMENT_WEBHOOK_SECRET");
  process.exit(1);
}

const supabase = createClient(url, serviceKey, { auth: { persistSession: false } });
const { data, error } = await supabase
  .from("news_articles")
  .select("id, title, summary, related_stock_id, ai_insight")
  .eq("status", "published")
  .order("created_at", { ascending: false })
  .limit(limit);

if (error) throw error;

const targets = (data || []).filter((article) => !article.related_stock_id || !article.ai_insight);
console.log(`Found ${targets.length} of ${data?.length || 0} recent articles requiring stock enrichment.`);

if (!apply) {
  console.log("Dry run only. Re-run with --apply to invoke enrichment.");
  process.exit(0);
}

let succeeded = 0;
let failed = 0;
const queue = [...targets];

if (linkOnly) {
  const { data: stocks, error: stocksError } = await supabase
    .from("stocks")
    .select("id, symbol, name")
    .eq("is_active", true);
  if (stocksError) throw stocksError;

  const normalize = (value) => value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
  const suffixes = /\b(plc|limited|ltd|group|holdings|company|co|kenya)\b/g;
  for (const article of queue) {
    if (article.related_stock_id) continue;
    const haystack = ` ${normalize(`${article.title} ${article.summary || ""}`)} `;
    const matches = (stocks || []).filter((stock) => {
      const symbol = normalize(stock.symbol);
      const company = normalize(stock.name).replace(suffixes, " ").replace(/\s+/g, " ").trim();
      return (symbol.length >= 3 && haystack.includes(` ${symbol} `))
        || (company.length >= 5 && haystack.includes(` ${company} `));
    });
    if (matches.length !== 1) continue;
    const { error: updateError } = await supabase
      .from("news_articles")
      .update({ related_stock_id: matches[0].id })
      .eq("id", article.id)
      .is("related_stock_id", null);
    if (updateError) {
      failed += 1;
      console.error(`FAIL ${article.id}: ${updateError.message}`);
    } else {
      succeeded += 1;
      console.log(`LINK ${article.id}: ${matches[0].symbol}`);
    }
  }
  console.log(`Link-only backfill complete: ${succeeded} linked, ${failed} failed.`);
  if (failed) process.exitCode = 1;
  process.exit();
}

async function worker() {
  while (queue.length) {
    const article = queue.shift();
    const { data: result, error: invokeError } = await supabase.functions.invoke("enrich-stock-data", {
      body: { article_id: article.id },
      headers: { "x-webhook-secret": webhookSecret },
    });
    if (invokeError || result?.error) {
      failed += 1;
      console.error(`FAIL ${article.id}: ${result?.error || invokeError?.message}`);
    } else {
      succeeded += 1;
      console.log(`OK   ${article.id}: ${result?.data?.related_stock_id || "no stock match"}`);
    }
    await new Promise((resolve) => setTimeout(resolve, 1500));
  }
}

await worker();
console.log(`Backfill complete: ${succeeded} succeeded, ${failed} failed.`);
if (failed) process.exitCode = 1;
