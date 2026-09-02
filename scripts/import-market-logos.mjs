import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { createClient } from "@supabase/supabase-js";
import sharp from "sharp";
import { fundManagerLogoCatalog, stockLogoCatalog } from "./market-logo-catalog.mjs";
import { fileExtension, isOfficialAssetUrl, matchesFundManager } from "./market-logo-utils.mjs";

const APPLY = process.argv.includes("--apply");
const REPORT_PATH = process.env.MARKET_LOGO_REPORT || join(tmpdir(), "kff-market-logo-report.json");
const SOURCE_TIMEOUT_MS = 15_000;
const MIN_SOURCE_DIMENSION = 128;
const BUCKET = "market-logos";
const limitFlag = process.argv.indexOf("--limit");
const IMPORT_LIMIT = limitFlag >= 0 ? Number(process.argv[limitFlag + 1]) : Number.POSITIVE_INFINITY;
const offsetFlag = process.argv.indexOf("--offset");
const IMPORT_OFFSET = offsetFlag >= 0 ? Number(process.argv[offsetFlag + 1]) : 0;
const outputFlag = process.argv.indexOf("--output-dir");
const OUTPUT_DIR = outputFlag >= 0 ? process.argv[outputFlag + 1] : null;
const CONCURRENCY = 5;

const resolveUrl = (value, sourcePage) => {
  try { return new URL(value, sourcePage).toString(); } catch { return null; }
};

function findOfficialLogoCandidates(html, sourcePage) {
  const candidates = new Map();
  const add = (value, context) => {
    const resolved = resolveUrl(value, sourcePage);
    if (!resolved || !isOfficialAssetUrl(resolved, sourcePage) || !fileExtension(resolved)) return;
    const haystack = `${value} ${context}`.toLowerCase();
    if (/(sprite|banner|hero|social|facebook|instagram|linkedin|youtube)/.test(haystack)) return;
    const score = (haystack.includes("logo") ? 100 : 0) + (haystack.includes("apple-touch-icon") ? 40 : 0) + (haystack.includes("icon") ? 20 : 0);
    if (score >= 100) candidates.set(resolved, Math.max(candidates.get(resolved) || 0, score));
  };

  for (const match of html.matchAll(/<(?:img|link)[^>]+>/gi)) {
    const tag = match[0];
    const value = tag.match(/(?:src|href)=["']([^"']+)["']/i)?.[1];
    if (value) add(value, tag);
  }
  return [...candidates.entries()]
    .sort(([, left], [, right]) => right - left)
    .map(([url]) => url);
}

async function fetchBuffer(url) {
  const response = await fetch(url, { signal: AbortSignal.timeout(SOURCE_TIMEOUT_MS), headers: { "User-Agent": "KenyaFundFinder/1.0 logo-review" } });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return Buffer.from(await response.arrayBuffer());
}

async function discoverLogo(entry) {
  if (entry.sourceImageUrl) {
    if (!isOfficialAssetUrl(entry.sourceImageUrl, entry.sourcePage) || !fileExtension(entry.sourceImageUrl)) {
      throw new Error("Configured source image is not a supported file on the approved official domain");
    }
    const source = await fetchBuffer(entry.sourceImageUrl);
    const metadata = await sharp(source, { animated: false }).metadata();
    const webp = await sharp(source, { animated: false })
      .rotate()
      .resize(512, 512, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 }, withoutEnlargement: true })
      .webp({ quality: 90, alphaQuality: 100 })
      .toBuffer();
    return { sourceImageUrl: entry.sourceImageUrl, sourceWidth: metadata.width ?? null, sourceHeight: metadata.height ?? null, webp };
  }
  const page = await fetch(entry.sourcePage, { signal: AbortSignal.timeout(SOURCE_TIMEOUT_MS), headers: { "User-Agent": "KenyaFundFinder/1.0 logo-review" } });
  if (!page.ok) throw new Error(`Source page HTTP ${page.status}`);
  const candidates = findOfficialLogoCandidates(await page.text(), entry.sourcePage);
  let lastError = "No official logo candidate found";

  for (const sourceImageUrl of candidates) {
    try {
      const source = await fetchBuffer(sourceImageUrl);
      const metadata = await sharp(source, { animated: false }).metadata();
      const smallestDimension = Math.min(metadata.width || Infinity, metadata.height || Infinity);
      if (metadata.format !== "svg" && smallestDimension < MIN_SOURCE_DIMENSION) {
        lastError = `Candidate below ${MIN_SOURCE_DIMENSION}px`;
        continue;
      }
      const webp = await sharp(source, { animated: false })
        .rotate()
        .resize(512, 512, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 }, withoutEnlargement: true })
        .webp({ quality: 90, alphaQuality: 100 })
        .toBuffer();
      return { sourceImageUrl, sourceWidth: metadata.width ?? null, sourceHeight: metadata.height ?? null, webp };
    } catch (error) {
      lastError = error instanceof Error ? error.message : "Unable to process candidate";
    }
  }
  throw new Error(lastError);
}

async function buildReport() {
  const entries = [...stockLogoCatalog, ...fundManagerLogoCatalog].slice(IMPORT_OFFSET, IMPORT_OFFSET + IMPORT_LIMIT);
  const results = [];
  for (let offset = 0; offset < entries.length; offset += CONCURRENCY) {
    const batch = await Promise.all(entries.slice(offset, offset + CONCURRENCY).map(async (entry) => {
      try {
        const asset = await discoverLogo(entry);
        console.log(`READY  ${entry.kind}:${entry.key} ← ${asset.sourceImageUrl}`);
        return { ...entry, status: "ready", sourceImageUrl: asset.sourceImageUrl, sourceWidth: asset.sourceWidth, sourceHeight: asset.sourceHeight, webp: asset.webp };
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unable to discover logo";
        console.warn(`SKIP   ${entry.kind}:${entry.key} — ${message}`);
        return { ...entry, status: "skipped", reason: message };
      }
    }));
    results.push(...batch);
  }
  return results;
}

async function applyResults(results) {
  if (process.env.MARKET_LOGO_APPLY_APPROVED !== "true") {
    throw new Error("Refusing to upload without MARKET_LOGO_APPLY_APPROVED=true after reviewing the dry-run report.");
  }
  const url = process.env.SUPABASE_URL;
  // Supabase's legacy JWT service-role keys are disabled on this project.
  // A current secret key is intentionally server-only and is never exposed to
  // the browser or committed to this repository.
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) {
    throw new Error("SUPABASE_URL and a current SUPABASE_SECRET_KEY are required for --apply. Use --output-dir after dry-run review when that server-only key is unavailable.");
  }
  const client = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: funds, error: fundsError } = await client.from("funds").select("id, manager").eq("is_published", true);
  if (fundsError) throw fundsError;

  for (const result of results.filter((entry) => entry.status === "ready")) {
    const path = `${result.kind === "stock" ? "stocks" : "fund-managers"}/${result.key}.webp`;
    const { error: uploadError } = await client.storage.from(BUCKET).upload(path, result.webp, { contentType: "image/webp", upsert: true, cacheControl: "31536000" });
    if (uploadError) throw uploadError;
    const { data: publicUrl } = client.storage.from(BUCKET).getPublicUrl(path);

    if (result.kind === "stock") {
      const { error } = await client.from("stocks").update({ logo_url: publicUrl.publicUrl }).eq("symbol", result.key);
      if (error) throw error;
      continue;
    }

    const matchingIds = (funds || [])
      .filter((fund) => matchesFundManager(fund.manager, result.managers))
      .map((fund) => fund.id);
    if (!matchingIds.length) {
      console.warn(`NO FUND MATCH ${result.key}`);
      continue;
    }
    const { error } = await client.from("funds").update({ logo_url: publicUrl.publicUrl }).in("id", matchingIds);
    if (error) throw error;
  }
}

const results = await buildReport();
if (OUTPUT_DIR) {
  await mkdir(OUTPUT_DIR, { recursive: true });
  await Promise.all(results.filter((entry) => entry.status === "ready").map((entry) =>
    writeFile(join(OUTPUT_DIR, `${entry.kind === "stock" ? "stocks" : "fund-managers"}-${entry.key}.webp`), entry.webp),
  ));
}
const serializableReport = results.map(({ webp, ...result }) => result);
await writeFile(REPORT_PATH, `${JSON.stringify(serializableReport, null, 2)}\n`);
console.log(`Wrote review report to ${REPORT_PATH}`);
if (APPLY) await applyResults(results);
