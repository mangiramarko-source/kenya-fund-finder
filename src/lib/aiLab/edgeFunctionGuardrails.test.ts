import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "../../..");

function readProjectFile(path: string): string {
  return readFileSync(join(root, path), "utf8");
}

describe("ai-lab-explain public guardrails", () => {
  it("is public at the Supabase gateway", () => {
    const config = readProjectFile("supabase/config.toml");
    expect(config).toMatch(/\[functions\.ai-lab-explain\]\s+verify_jwt = false/);
  });

  it("does not require JWT claims in the function body", () => {
    const source = readProjectFile("supabase/functions/ai-lab-explain/index.ts");
    expect(source).not.toMatch(/getClaims|getUser|Unauthorized/);
  });

  it("rate-limits with the existing service-role RPC before the Gemini call", () => {
    const source = readProjectFile("supabase/functions/ai-lab-explain/index.ts");
    const rateLimitIndex = source.indexOf('rpc("check_rate_limit"');
    const gatewayIndex = source.indexOf("fetch(AI_GATEWAY_URL");

    expect(source).toContain('Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")');
    expect(source).toContain("p_ip_hash");
    expect(source).toContain("p_window_seconds: RATE_WINDOW_SECONDS");
    expect(source).toContain("p_max_requests: RATE_MAX_REQUESTS");
    expect(source).toContain('RATE_WINDOW_SECONDS = 60');
    expect(source).toContain('RATE_MAX_REQUESTS = 5');
    expect(source).toContain('"Retry-After": String(RATE_WINDOW_SECONDS)');
    expect(rateLimitIndex).toBeGreaterThan(-1);
    expect(gatewayIndex).toBeGreaterThan(-1);
    expect(rateLimitIndex).toBeLessThan(gatewayIndex);
  });

  it("derives client IP from the expected headers and never logs raw prompts", () => {
    const source = readProjectFile("supabase/functions/ai-lab-explain/index.ts");
    expect(source).toContain('req.headers.get("cf-connecting-ip")');
    expect(source).toContain('req.headers.get("x-real-ip")');
    expect(source).toContain('req.headers.get("x-forwarded-for")?.split(",")[0]?.trim()');
    expect(source).not.toMatch(/console\.(log|warn|error)\([^)]*rawPrompt/);
  });

  it("returns safe fallback JSON for non-educational and gateway failures", () => {
    const source = readProjectFile("supabase/functions/ai-lab-explain/index.ts");
    expect(source).toContain('{ ok: false, reason: "not_educational" }');
    expect(source).toContain('{ ok: false, reason: "gateway_unavailable" }');
  });
});
