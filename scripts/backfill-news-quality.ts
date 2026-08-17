import { createClient } from "@supabase/supabase-js";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import {
  evaluateNewsQuality,
  isSubstantiveNewsText,
  NEWS_CLASSIFICATION_VERSION,
} from "../supabase/functions/_shared/news-quality";
import { matchStockWithEvidence } from "../supabase/functions/_shared/stock-match";

for (const filename of [".env", ".env.save", ".env.admin.local"]) {
  const path = resolve(filename);
  if (!existsSync(path)) continue;
  for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
    const match = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (!match || process.env[match[1]]) continue;
    process.env[match[1]] = match[2].trim().replace(/^(['"])(.*)\1$/, "$2");
  }
}

const apply = process.argv.includes("--apply");
const reset = process.argv.includes("--reset");
const limitArg = process.argv.find((arg) => arg.startsWith("--limit="));
const limit = limitArg ? Math.max(1, Number(limitArg.split("=")[1])) : Number.POSITIVE_INFINITY;
const runMode = apply ? "apply" : "dry-run";
const checkpointPath = resolve(`.cache/news-quality-backfill-${runMode}-checkpoint.json`);
const reportPath = resolve(`.cache/news-quality-backfill-${runMode}-report.json`);
const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceKey) {
  console.error("Missing Supabase URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

mkdirSync(dirname(checkpointPath), { recursive: true });
type BackfillReport = {
  scanned: number;
  incomplete: number;
  processed: number;
  recovered: number;
  published: number;
  pendingReview: number;
  stockLinksSet: number;
  stockLinksCleared: number;
  failures: Array<{ id: string; error: string }>;
  reasons: Record<string, number>;
  samples: Array<{ id: string; status: string; title: string; reasons: string[]; stock: string | null }>;
};

type BackfillCheckpoint = {
  completed: string[];
  report?: BackfillReport;
};

if (reset && existsSync(checkpointPath)) writeFileSync(checkpointPath, JSON.stringify({ completed: [] }));
const checkpoint = existsSync(checkpointPath)
  ? JSON.parse(readFileSync(checkpointPath, "utf8")) as BackfillCheckpoint
  : { completed: [] };
const completed = new Set(checkpoint.completed);
const supabase = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });

type Article = {
  id: string;
  title: string;
  summary: string;
  content: string | null;
  source: string;
  url: string | null;
  status: string;
  date_published: string | null;
  source_published_at: string | null;
  related_stock_id: string | null;
};

async function loadAll<T>(table: string, select: string): Promise<T[]> {
  const rows: T[] = [];
  for (let offset = 0; ; offset += 500) {
    const { data, error } = await supabase.from(table).select(select).range(offset, offset + 499);
    if (error) throw error;
    rows.push(...((data || []) as T[]));
    if (!data || data.length < 500) return rows;
  }
}

async function fetchSourceText(url: string): Promise<string | null> {
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 12_000);
      const response = await fetch(url, {
        signal: controller.signal,
        redirect: "follow",
        headers: { "User-Agent": "KenyaFundFinder/1.0 (+https://kenyafundfinder.com)" },
      });
      clearTimeout(timeout);
      if (!response.ok) continue;
      const html = await response.text();
      const cleanedHtml = html.replace(/<(script|style|noscript|nav|footer|header|aside|form)\b[^>]*>[\s\S]*?<\/\1>/gi, " ");
      const contentPatterns = [
        /<article\b[^>]*>([\s\S]*?)<\/article>/i,
        /<main\b[^>]*>([\s\S]*?)<\/main>/i,
        /<[^>]+itemprop=["']articleBody["'][^>]*>([\s\S]*?)<\/[^>]+>/i,
        /<[^>]+class=["'][^"']*(?:article-body|post-content|entry-content)[^"']*["'][^>]*>([\s\S]*?)<\/[^>]+>/i,
      ];
      for (const pattern of contentPatterns) {
        const segment = cleanedHtml.match(pattern)?.[1] || "";
        const text = segment.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
        if (isSubstantiveNewsText(text)) return text.slice(0, 12_000);
      }
    } catch {
      if (attempt === 0) await new Promise((resolveDelay) => setTimeout(resolveDelay, 500));
    }
  }
  return null;
}

const [articles, stocks] = await Promise.all([
  loadAll<Article>("news_articles", "id,title,summary,content,source,url,status,date_published,source_published_at,related_stock_id"),
  loadAll<{ id: string; symbol: string; name: string }>("stocks", "id,symbol,name"),
]);

const incomplete = articles.filter((article) =>
  !isSubstantiveNewsText(article.summary) && !isSubstantiveNewsText(article.content)
);

console.log(`Scanned ${articles.length} articles; ${incomplete.length} lack substantive summary and content.`);
if (apply && incomplete.length && completed.size === 0) {
  for (let index = 0; index < incomplete.length; index += 100) {
    const ids = incomplete.slice(index, index + 100).map((article) => article.id);
    const { error } = await supabase
      .from("news_articles")
      .update({
        status: "pending_review",
        quality_reasons: ["insufficient_content"],
        quality_checked_at: new Date().toISOString(),
      })
      .in("id", ids);
    if (error) throw error;
  }
  console.log(`Hidden ${incomplete.length} incomplete articles before recovery.`);
}

const report: BackfillReport = checkpoint.report || {
  scanned: articles.length,
  incomplete: incomplete.length,
  processed: 0,
  recovered: 0,
  published: 0,
  pendingReview: 0,
  stockLinksSet: 0,
  stockLinksCleared: 0,
  failures: [],
  reasons: {},
  samples: [],
};
report.scanned = articles.length;
report.incomplete = incomplete.length;

const targets = articles.filter((article) => !completed.has(article.id)).slice(0, limit);
for (const article of targets) {
  try {
    let content = article.content;
    if (!isSubstantiveNewsText(article.summary) && !isSubstantiveNewsText(content) && article.url) {
      const recovered = await fetchSourceText(article.url);
      if (recovered) {
        content = recovered;
        report.recovered += 1;
      }
    }

    const qualityTimestamp = article.source_published_at
      || (article.date_published ? `${article.date_published}T00:00:00.000Z` : null);
    const quality = evaluateNewsQuality({
      title: article.title,
      summary: article.summary,
      content,
      source: article.source,
      url: article.url,
      sourcePublishedAt: qualityTimestamp,
    }, { enforceFreshness: false });
    const stockMatch = matchStockWithEvidence({
      title: quality.title,
      body: `${quality.summary}\n${quality.content || ""}`,
    }, stocks);
    const nextStockId = stockMatch?.stock.id || null;

    for (const reason of quality.reasons) report.reasons[reason] = (report.reasons[reason] || 0) + 1;
    if (quality.status === "published") report.published += 1;
    else report.pendingReview += 1;
    if (nextStockId && nextStockId !== article.related_stock_id) report.stockLinksSet += 1;
    if (!nextStockId && article.related_stock_id) report.stockLinksCleared += 1;
    if (report.samples.length < 25 && (quality.reasons.length > 0 || nextStockId !== article.related_stock_id)) {
      report.samples.push({
        id: article.id,
        status: quality.status,
        title: quality.title,
        reasons: quality.reasons,
        stock: stockMatch?.stock.symbol || null,
      });
    }

    if (apply) {
      const payload: Record<string, unknown> = {
        title: quality.title,
        summary: quality.summary,
        content: quality.content,
        category: quality.category,
        status: quality.status,
        quality_reasons: quality.reasons,
        quality_checked_at: new Date().toISOString(),
        classification_version: NEWS_CLASSIFICATION_VERSION,
        related_stock_id: nextStockId,
        ai_insight: nextStockId === article.related_stock_id ? undefined : null,
        stock_match_evidence: stockMatch ? {
          kind: stockMatch.kind,
          evidence: stockMatch.evidence,
          score: stockMatch.score,
        } : null,
      };
      if (quality.sourcePublishedAt) payload.source_published_at = quality.sourcePublishedAt;
      if (payload.ai_insight === undefined) delete payload.ai_insight;
      const { error } = await supabase.from("news_articles").update(payload).eq("id", article.id);
      if (error) throw error;
    }

    completed.add(article.id);
    report.processed += 1;
    checkpoint.completed = [...completed];
    checkpoint.report = report;
    writeFileSync(checkpointPath, JSON.stringify(checkpoint, null, 2));
  } catch (error) {
    report.failures.push({ id: article.id, error: error instanceof Error ? error.message : String(error) });
    checkpoint.report = report;
    writeFileSync(checkpointPath, JSON.stringify(checkpoint, null, 2));
  }
}

writeFileSync(reportPath, JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
console.log(apply ? `Apply complete. Report: ${reportPath}` : "Dry run only. Re-run with --apply after reviewing the report.");
if (report.failures.length) process.exitCode = 1;
