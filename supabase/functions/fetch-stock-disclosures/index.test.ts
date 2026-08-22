import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { canonicalizeUrl, factsAreGrounded, robotsAllows, handleRequest } from "./index.ts";

Deno.test("canonicalizeUrl removes tracking and fragments", () => {
  assertEquals(canonicalizeUrl("https://issuer.example/reports//fy25.pdf?utm_source=x&id=7#page=2"), "https://issuer.example/reports/fy25.pdf?id=7");
});

Deno.test("robots parser rejects matching disallowed paths", () => {
  assertEquals(robotsAllows("User-agent: *\nDisallow: /private", "/private/report.pdf"), false);
  assertEquals(robotsAllows("User-agent: *\nDisallow: /private", "/investors/report.pdf"), true);
});

Deno.test("grounding rejects numeric facts absent from source", () => {
  const base = { issuer_name: "Issuer", title: "Results", disclosure_type: "dividend" as const, published_at: "2026-08-01", summary: "", corporate_action: null };
  assertEquals(factsAreGrounded({ ...base, key_facts: [{ label: "Dividend", value: "KSh 1.20" }] }, "Published 2026-08-01. Dividend declared at KSh 1.20 per share"), true);
  assertEquals(factsAreGrounded({ ...base, key_facts: [{ label: "Dividend", value: "KSh 2.40" }] }, "Published 2026-08-01. Dividend declared at KSh 1.20 per share"), false);
});

Deno.test("grounding requires the extracted publication date", () => {
  const extraction = { issuer_name: "Issuer", title: "FY 2026 Results", disclosure_type: "financial_results" as const, published_at: "2026-01-01", summary: "Profit was KSh 10", key_facts: [], corporate_action: null };
  assertEquals(factsAreGrounded(extraction, "FY 2026 Results. Profit was KSh 10."), false);
});

Deno.test("handleRequest rejects anonymous requests", async () => {
  Deno.env.set("SUPABASE_URL", "https://example.supabase.co");
  Deno.env.set("SUPABASE_PUBLISHABLE_KEY", "test-anon-key");
  Deno.env.set("SUPABASE_SECRET_KEY", "test-service-key");
  const req = new Request("https://example.supabase.co/functions/v1/fetch-stock-disclosures", { method: "POST" });
  const res = await handleRequest(req);
  assertEquals(res.status, 401);
});

Deno.test("handleRequest rejects fake JWT role claim", async () => {
  Deno.env.set("SUPABASE_URL", "https://example.supabase.co");
  Deno.env.set("SUPABASE_PUBLISHABLE_KEY", "test-anon-key");
  Deno.env.set("SUPABASE_SECRET_KEY", "test-service-key");
  const req = new Request("https://example.supabase.co/functions/v1/fetch-stock-disclosures", {
    method: "POST",
    headers: { Authorization: "Bearer eyJhbGciOiJub25lIn0.eyJyb2xlIjoic2VydmljZV9yb2xlIn0." },
  });
  const res = await handleRequest(req);
  assertEquals(res.status, 401);
});
