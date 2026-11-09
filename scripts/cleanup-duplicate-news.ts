/**
 * Safe Database Duplicate News Cleanup Script (Guardrail 6).
 *
 * Defaults strictly to --dry-run mode. Prints exact duplicate clusters
 * (kept article vs. duplicate article + match reason + similarity score)
 * to the console before any deletion is executed.
 *
 * Usage:
 *   npx tsx scripts/cleanup-duplicate-news.ts            # Dry-run (safe default)
 *   npx tsx scripts/cleanup-duplicate-news.ts --dry-run  # Dry-run
 *   npx tsx scripts/cleanup-duplicate-news.ts --apply    # Execute cleanup after review
 */

import { createClient } from "@supabase/supabase-js";
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  assessNewsDuplicate,
  mergeClusteredArticles,
  type NewsDedupeCandidate,
} from "../src/lib/newsDedupe";

for (const filename of [".env", ".env.save", ".env.admin.local"]) {
  const path = resolve(filename);
  if (!existsSync(path)) continue;
  for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
    const match = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (!match || process.env[match[1]]) continue;
    process.env[match[1]] = match[2].trim().replace(/^(['"])(.*)\1$/, "$2");
  }
}

const isApply = process.argv.includes("--apply") && !process.argv.includes("--dry-run");
const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const candidateKeys = [
  process.env.SUPABASE_SECRET_KEY,
  process.env.VITE_SUPABASE_PUBLISHABLE_KEY,
  process.env.SUPABASE_PUBLISHABLE_KEY,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  process.env.VITE_SUPABASE_ANON_KEY,
].filter((k): k is string => Boolean(k));

const supabaseKey =
  candidateKeys.find((k) => k.startsWith("sb_")) || candidateKeys[0];

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing Supabase URL or key in environment.");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

interface DbNewsRow extends NewsDedupeCandidate {
  id: string;
  title: string;
  summary: string;
  content: string | null;
  source: string;
  url: string | null;
  image_url: string | null;
  date_published: string | null;
  source_published_at: string | null;
  created_at: string;
  status: string;
  ai_insight?: string | null;
  related_stock_id?: string | null;
}

async function main() {
  console.log(
    `=== KenyaFundFinder Duplicate News Cleanup [${isApply ? "APPLY MODE" : "DRY-RUN MODE (Safe Default)"}] ===`,
  );

  const { data, error } = await supabase
    .from("news_articles_public")
    .select(
      "id, title, summary, content, source, url, image_url, date_published, source_published_at, created_at, status, ai_insight, related_stock_id",
    )
    .order("source_published_at", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false })
    .limit(1000);

  if (error) {
    console.error("Failed to query news articles:", error.message);
    process.exit(1);
  }

  const rows = (data || []) as DbNewsRow[];
  console.log(`Scanned ${rows.length} published articles.`);

  const keptClusters: DbNewsRow[] = [];
  const duplicatePairs: Array<{
    keptId: string;
    keptSource: string;
    keptTitle: string;
    dupId: string;
    dupSource: string;
    dupTitle: string;
    reason: string;
    similarity: string;
  }> = [];

  for (const row of rows) {
    let matchedIndex = -1;
    let matchedReason = "";
    let matchedSim = 0;

    for (let i = 0; i < keptClusters.length; i++) {
      const assessment = assessNewsDuplicate(keptClusters[i], row);
      if (assessment.isDuplicate) {
        matchedIndex = i;
        matchedReason = assessment.reason || "cluster";
        matchedSim = assessment.similarity;
        break;
      }
    }

    if (matchedIndex === -1) {
      keptClusters.push(row);
    } else {
      const existing = keptClusters[matchedIndex];
      const merged = mergeClusteredArticles(existing, row);
      const loser = merged.id === row.id ? existing : row;
      keptClusters[matchedIndex] = merged;

      duplicatePairs.push({
        keptId: merged.id.slice(0, 8),
        keptSource: (merged.source || "").slice(0, 18),
        keptTitle: (merged.title || "").slice(0, 42),
        dupId: loser.id,
        dupSource: (loser.source || "").slice(0, 18),
        dupTitle: (loser.title || "").slice(0, 42),
        reason: matchedReason,
        similarity: matchedSim.toFixed(2),
      });
    }
  }

  if (duplicatePairs.length === 0) {
    console.log("Zero duplicate articles detected across the feed.");
    return;
  }

  console.log(`\nDetected ${duplicatePairs.length} duplicate articles across ${rows.length} scanned rows:`);
  console.table(
    duplicatePairs.map((d) => ({
      keptId: d.keptId,
      keptSource: d.keptSource,
      keptTitle: d.keptTitle,
      dupId: d.dupId.slice(0, 8),
      dupSource: d.dupSource,
      dupTitle: d.dupTitle,
      reason: d.reason,
      sim: d.similarity,
    })),
  );

  if (!isApply) {
    console.log(
      "\n[DRY-RUN] No rows were modified or deleted. Re-run with --apply to archive/delete duplicate rows.",
    );
    return;
  }

  const idsToDelete = duplicatePairs.map((d) => d.dupId);
  const adminKey = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  let deletedViaRest = false;

  if (adminKey) {
    const adminClient = createClient(supabaseUrl, adminKey);
    const { error: delError } = await adminClient
      .from("news_articles")
      .delete()
      .in("id", idsToDelete);

    if (!delError) {
      deletedViaRest = true;
    } else {
      console.warn(`REST delete returned '${delError.message}', falling back to linked Supabase SQL...`);
    }
  }

  if (!deletedViaRest) {
    const validUuidRe = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    const safeIds = idsToDelete.filter((id) => validUuidRe.test(id));
    const sqlList = safeIds.map((id) => `'${id}'`).join(", ");
    const sql = `DELETE FROM public.news_articles WHERE id IN (${sqlList});`;
    execFileSync("npx", ["supabase", "db", "query", "--linked", sql], {
      stdio: "inherit",
    });
  }

  const { count: remainingCount } = await supabase
    .from("news_articles_public")
    .select("id", { count: "exact", head: true });

  console.log(`Successfully deleted ${idsToDelete.length} duplicate rows. Remaining published articles: ${remainingCount ?? "unknown"}.`);
}

main();
