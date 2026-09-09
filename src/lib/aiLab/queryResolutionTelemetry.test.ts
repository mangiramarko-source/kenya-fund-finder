import { beforeEach, describe, expect, it, vi } from "vitest";
import { QUERY_CONTRACT_VERSION, type QuerySemanticFrameV1 } from "../../../supabase/functions/_shared/universal-query";
import { recordQueryResolutionTelemetry, redactQueryForTelemetry } from "./queryResolutionTelemetry";

const { invoke } = vi.hoisted(() => ({ invoke: vi.fn() }));
vi.mock("@/integrations/supabase/client", () => ({
  supabase: { functions: { invoke } },
}));

const frame: QuerySemanticFrameV1 = {
  version: QUERY_CONTRACT_VERSION,
  action: "lookup",
  confidence: "low",
  entityMentions: [{ text: "unknown wording", role: "primary" }],
  requestedMetrics: [],
  parameters: { amount: 100_000 },
  contextReferences: [],
};

describe("query resolution telemetry", () => {
  beforeEach(() => invoke.mockReset());

  it("redacts contact details and financial amounts before transport", () => {
    const value = redactQueryForTelemetry("Email Me@Test.com or +254 712 345 678 about KES 100,000 in KCB");
    expect(value).not.toContain("me@test.com");
    expect(value).not.toContain("712");
    expect(value).not.toContain("100,000");
    expect(value).toContain("[email]");
    expect(value).toContain("[number]");
    expect(value).toContain("[amount]");
  });

  it("sends a bounded redacted event and never throws on failure", async () => {
    invoke.mockResolvedValueOnce({ data: { ok: true }, error: null });
    await expect(recordQueryResolutionTelemetry({
      query: "KES 100,000 in KCB",
      frame,
      outcome: "ambiguous",
      candidateIds: Array.from({ length: 12 }, (_, index) => `candidate:${index}`),
    })).resolves.toBe(true);
    const body = invoke.mock.calls[0][1]?.body as { telemetry: { query: string; candidateIds: string[] } };
    expect(body.telemetry.query).toContain("[amount]");
    expect(body.telemetry.candidateIds).toHaveLength(8);

    invoke.mockRejectedValueOnce(new Error("offline"));
    await expect(recordQueryResolutionTelemetry({ query: "KCB", frame, outcome: "not_found" })).resolves.toBe(false);
  });
});
