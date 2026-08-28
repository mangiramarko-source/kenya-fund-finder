const baseUrl = (process.env.KFF_BASE_URL || "https://kenyafundfinder.com").replace(/\/$/, "");
const routes = [
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

const results = await Promise.all(routes.map(async (route) => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15_000);
  try {
    const response = await fetch(`${baseUrl}${route}`, {
      headers: { "User-Agent": "KFF-read-only-route-check/1.0" },
      redirect: "follow",
      signal: controller.signal,
    });
    return { route, status: response.status, ok: response.ok };
  } catch (error) {
    return { route, status: 0, ok: false, error: error instanceof Error ? error.message : String(error) };
  } finally {
    clearTimeout(timeout);
  }
}));

for (const result of results) {
  console.log(`${result.ok ? "PASS" : "FAIL"} ${String(result.status).padStart(3)} ${result.route}${result.error ? ` — ${result.error}` : ""}`);
}

if (results.some((result) => !result.ok)) process.exit(1);
