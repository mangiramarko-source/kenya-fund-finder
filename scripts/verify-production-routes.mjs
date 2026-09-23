const baseUrl = (process.env.KFF_BASE_URL || "https://kenyafundfinder.com").replace(/\/$/, "");
const canonicalOrigin = (process.env.KFF_CANONICAL_ORIGIN || "https://kenyafundfinder.com").replace(/\/$/, "");
const defaultRoutes = [
  "/",
  "/funds",
  "/stocks",
  "/rates",
  "/commodities",
  "/treasury",
  "/news",
  "/compare",
  "/calculator",
  "/learn",
  "/privacy",
  "/terms",
];

function parseEntityRoutes() {
  const value = process.env.KFF_ENTITY_ROUTES;
  if (!value) return [];
  return value.split(",").map((route) => route.trim()).filter(Boolean).map((route) => {
    const url = new URL(route, `${baseUrl}/`);
    if (url.origin !== baseUrl) throw new Error(`Entity route is outside KFF_BASE_URL: ${route}`);
    return url.pathname;
  });
}

function parseExpectedText() {
  const value = process.env.KFF_ENTITY_EXPECTED_TEXT;
  if (!value) return {};
  const parsed = JSON.parse(value);
  if (!parsed || Array.isArray(parsed) || typeof parsed !== "object") throw new Error("KFF_ENTITY_EXPECTED_TEXT must be a JSON object keyed by route");
  return parsed;
}

const entityRoutes = parseEntityRoutes();
const expectedText = parseExpectedText();
const routes = [...new Set([...defaultRoutes, ...entityRoutes])];

function canonicalHref(html) {
  return html.match(/<link\s+rel=["']canonical["']\s+href=["']([^"']+)["']/i)?.[1] ?? null;
}

function pageTitle(html) {
  return html.match(/<title>([^<]+)<\/title>/i)?.[1]?.trim() ?? null;
}

function hasMeaningfulInternalLink(html, route) {
  return [...html.matchAll(/<a\s+[^>]*href=["']([^"']+)["']/gi)].some((match) => {
    const href = match[1];
    return href.startsWith("/") && href !== "/" && href !== route && !href.startsWith("/assets/");
  });
}

const results = await Promise.all(routes.map(async (route) => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15_000);
  try {
    const response = await fetch(`${baseUrl}${route}`, {
      headers: { "User-Agent": "KFF-read-only-route-check/1.0" },
      redirect: "follow",
      signal: controller.signal,
    });
    const html = await response.text();
    const isEntity = entityRoutes.includes(route);
    const title = pageTitle(html);
    const expected = expectedText[route];
    const checks = isEntity ? [
      ["self canonical", canonicalHref(html) === `${canonicalOrigin}${route}`],
      ["unique title", Boolean(title) && title !== "Kenya Fund Finder – NSE Stocks, Money Market Funds & FX"],
      ["expected entity text", typeof expected === "string" && expected.length > 0 && html.includes(expected)],
      ["JSON-LD", /<script\s+type=["']application\/ld\+json["'][^>]*>/i.test(html)],
      ["meaningful internal link", hasMeaningfulInternalLink(html, route)],
    ] : [];
    const failures = checks.filter(([, passed]) => !passed).map(([name]) => name);
    return { route, status: response.status, ok: response.ok && failures.length === 0, failures };
  } catch (error) {
    return { route, status: 0, ok: false, error: error instanceof Error ? error.message : String(error) };
  } finally {
    clearTimeout(timeout);
  }
}));

for (const result of results) {
  const detail = result.error ? ` — ${result.error}` : result.failures?.length ? ` — ${result.failures.join(", ")}` : "";
  console.log(`${result.ok ? "PASS" : "FAIL"} ${String(result.status).padStart(3)} ${result.route}${detail}`);
}

if (results.some((result) => !result.ok)) process.exit(1);
