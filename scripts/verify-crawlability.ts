import { existsSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";

const SITE_ORIGIN = "https://kenyafundfinder.com";
const DIST_DIR = resolve("dist");
const SITEMAP_PATH = resolve("public/sitemap.xml");

function normalizePath(value: string): string | null {
  try {
    const url = new URL(value, SITE_ORIGIN);
    if (url.origin !== SITE_ORIGIN) return null;
    const path = decodeURIComponent(url.pathname).replace(/\/+$/, "") || "/";
    if (path.startsWith("/assets/") || path.startsWith("/rest/")) return null;
    return path;
  } catch {
    return null;
  }
}

function outputFile(path: string): string {
  return path === "/" ? join(DIST_DIR, "index.html") : join(DIST_DIR, `${path.slice(1)}.html`);
}

function linksFrom(path: string): string[] {
  const file = outputFile(path);
  if (!existsSync(file)) return [];
  const html = readFileSync(file, "utf8");
  const links = [...html.matchAll(/\bhref=["']([^"']+)["']/gi)]
    .map((match) => normalizePath(match[1].replaceAll("&amp;", "&")))
    .filter((target): target is string => Boolean(target && existsSync(outputFile(target))));
  return [...new Set(links)];
}

function group(path: string): string {
  if (path.startsWith("/compare/")) return "fund";
  if (path.startsWith("/stocks/")) return "stock";
  if (path.startsWith("/news/archive")) return "news-archive";
  if (path.startsWith("/news/")) return "news";
  if (path.startsWith("/page/")) return "cms";
  return "core";
}

if (!existsSync(SITEMAP_PATH) || !existsSync(join(DIST_DIR, "index.html"))) {
  throw new Error("Run npm run build before verifying crawlability.");
}

const sitemap = readFileSync(SITEMAP_PATH, "utf8");
const sitemapPaths = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)]
  .map((match) => normalizePath(match[1]))
  .filter((path): path is string => Boolean(path));

const reachable = new Set<string>();
const queue = ["/"];
while (queue.length > 0) {
  const current = queue.shift()!;
  if (reachable.has(current)) continue;
  reachable.add(current);
  for (const target of linksFrom(current)) {
    if (!reachable.has(target)) queue.push(target);
  }
}

const missingFiles = sitemapPaths.filter((path) => !existsSync(outputFile(path)));
const orphans = sitemapPaths.filter((path) => !reachable.has(path));
const counts = sitemapPaths.reduce<Record<string, number>>((result, path) => {
  const key = group(path);
  result[key] = (result[key] || 0) + 1;
  return result;
}, {});

console.log(`[crawlability] ${sitemapPaths.length} sitemap URLs; ${reachable.size} internally reachable HTML routes`);
console.log(`[crawlability] groups: ${Object.entries(counts).map(([key, value]) => `${key}=${value}`).join(", ")}`);
console.log(`[crawlability] missing prerender files: ${missingFiles.length}; orphan sitemap URLs: ${orphans.length}`);

if (missingFiles.length || orphans.length) {
  if (missingFiles.length) console.error(`[crawlability] missing files:\n${missingFiles.join("\n")}`);
  if (orphans.length) console.error(`[crawlability] orphans:\n${orphans.join("\n")}`);
  process.exitCode = 1;
}

