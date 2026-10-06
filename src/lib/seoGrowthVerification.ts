import { canonicalUrl } from "./seoPrerender";

export function verifySeoGrowthHtml(path: string, html: string): string[] {
  const errors: string[] = [];
  const body = html.match(/<main\s+id="seo-prerender"[^>]*>([\s\S]*?)<\/main>/)?.[1] || "";
  if (!body || !/<h1\b/.test(body)) errors.push("missing prerendered heading and content");
  if (!html.includes(`<link rel="canonical" href="${canonicalUrl(path)}"`)) errors.push("incorrect canonical");
  if (!/<meta name="robots" content="index, follow/.test(html)) errors.push("page is not explicitly indexable");
  if (!html.includes(`hreflang="en-KE" href="${canonicalUrl(path)}"`)) errors.push("incorrect language alternate");
  const links = (pattern: RegExp) => new Set([...body.matchAll(pattern)].map(m => m[1])).size;
  if (path === "/stocks") {
    if (links(/href="(\/stocks\/[A-Za-z0-9_-]+)"/g) < 10) errors.push("stock directory has fewer than ten company links");
    if (!/Safaricom/i.test(body)) errors.push("representative Safaricom listing missing");
    if (!/quote date \d{1,2} [A-Za-z]+ \d{4}/.test(body)) errors.push("quote timestamps missing");
    if (!body.includes("daily movement") || !body.includes("volume")) errors.push("market metrics missing");
  }
  if (path === "/funds" || path === "/money-market-funds-kenya") {
    if (links(/href="(\/compare\/[A-Za-z0-9_-]+)"/g) < 5) errors.push("fund directory has fewer than five product links");
    if (!/Etica|NCBA|Britam|CIC/i.test(body)) errors.push("representative manager missing");
    if (!/fact.sheet/i.test(body)) errors.push("source dates missing");
  }
  return errors;
}
