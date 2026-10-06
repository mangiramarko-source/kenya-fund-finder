import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { RESEARCH_ARTICLES, articlePath } from "../src/data/seoGrowthContent";
import { verifySeoGrowthHtml } from "../src/lib/seoGrowthVerification";

const liveIndex = process.argv.indexOf("--live");
const liveOrigin = liveIndex >= 0 ? process.argv[liveIndex + 1] : undefined;
if (liveIndex >= 0 && !liveOrigin) throw new Error("Supply an origin after --live");
const paths = ["/stocks", "/funds", "/money-market-funds-kenya", "/mmf-calculator", ...RESEARCH_ARTICLES.map(articlePath)];
let failures = 0;
for (const path of paths) {
  try {
    let html: string;
    if (liveOrigin) {
      const response = await fetch(new URL(path, liveOrigin), { signal: AbortSignal.timeout(30_000), headers: { "User-Agent": "KFF-SEO-Verification/1.0" } });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      if (response.headers.get("x-robots-tag")?.includes("noindex")) throw new Error("noindex response header");
      html = await response.text();
    } else html = readFileSync(resolve(`dist${path}.html`), "utf8");
    const errors = verifySeoGrowthHtml(path, html);
    if (errors.length) throw new Error(errors.join("; "));
    console.log(`[seo-growth] PASS ${path}`);
  } catch (error) {
    failures++;
    console.error(`[seo-growth] FAIL ${path}: ${error instanceof Error ? error.message : error}`);
  }
}
if (failures) process.exitCode = 1;
else console.log(`[seo-growth] ${paths.length} ${liveOrigin ? "live" : "built"} routes verified without JavaScript`);
