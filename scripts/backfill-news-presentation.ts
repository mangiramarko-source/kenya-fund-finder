import { createClient } from "@supabase/supabase-js";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { cleanNewsTitle, isDuplicateNewsText } from "../supabase/functions/_shared/news-text";

for (const filename of [".env", ".env.save"]) {
  const envPath = resolve(filename);
  if (!existsSync(envPath)) continue;
  for (const line of readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const match = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (!match || process.env[match[1]]) continue;
    process.env[match[1]] = match[2].trim().replace(/^(['"])(.*)\1$/, "$2");
  }
}

const apply = process.argv.includes("--apply");
const url = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceKey) {
  console.error("Missing Supabase URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const supabase = createClient(url, serviceKey, { auth: { persistSession: false } });
const pageSize = 500;
const articles: Array<{
  id: string;
  title: string;
  summary: string;
  content: string | null;
  source: string;
}> = [];

for (let offset = 0; ; offset += pageSize) {
  const { data, error } = await supabase
    .from("news_articles")
    .select("id,title,summary,content,source")
    .eq("status", "published")
    .order("created_at", { ascending: false })
    .range(offset, offset + pageSize - 1);
  if (error) throw error;
  articles.push(...(data || []));
  if (!data || data.length < pageSize) break;
}

const changes = articles.flatMap((article) => {
  const title = cleanNewsTitle(article.title, article.source);
  const duplicateSummary = isDuplicateNewsText(article.title, article.summary, article.source);
  const payload: { title?: string; summary?: string } = {};
  if (title && title !== article.title) payload.title = title;
  if (duplicateSummary && article.summary !== "") payload.summary = "";
  return Object.keys(payload).length ? [{ article, payload }] : [];
});

console.log(`Scanned ${articles.length} published articles; ${changes.length} require normalization.`);
for (const { article, payload } of changes.slice(0, 20)) {
  console.log(`${article.id}: ${JSON.stringify(payload)}`);
}
if (changes.length > 20) console.log(`...and ${changes.length - 20} more.`);

if (!apply) {
  console.log("Dry run only. Re-run with --apply to save these idempotent changes.");
  process.exit(0);
}

let updated = 0;
let failed = 0;
const queue = [...changes];

async function worker() {
  while (queue.length) {
    const change = queue.shift();
    if (!change) return;
    const { error } = await supabase
      .from("news_articles")
      .update(change.payload)
      .eq("id", change.article.id);
    if (error) {
      failed += 1;
      console.error(`FAIL ${change.article.id}: ${error.message}`);
    } else {
      updated += 1;
    }
  }
}

await Promise.all(Array.from({ length: 5 }, () => worker()));
console.log(`Backfill complete: ${updated} updated, ${failed} failed.`);
if (failed) process.exitCode = 1;
