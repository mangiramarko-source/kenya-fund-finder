import { describe, expect, it, vi, beforeEach } from "vitest";

const invokeMock = vi.fn();
vi.mock("@/integrations/supabase/client", () => ({
  supabase: { functions: { invoke: (...args: unknown[]) => invokeMock(...args) } },
}));

import { askAiLabAssistant, isContextualFollowUp } from "./assistant";

describe("AI Lab remote assistant contract", () => {
  beforeEach(() => invokeMock.mockReset());

  it("recognizes a context-dependent follow-up", () => {
    expect(isContextualFollowUp("make it 20k", true)).toBe(true);
    expect(isContextualFollowUp("make it 20k", false)).toBe(false);
  });

  it("accepts a canonical KFF rewrite", async () => {
    invokeMock.mockResolvedValueOnce({ data: { kind: "kff_rewrite", prompt: "KES 20,000 in SCOM" }, error: null });
    await expect(askAiLabAssistant("make it 20k", [])).resolves.toEqual({ kind: "kff_rewrite", prompt: "KES 20,000 in SCOM" });
  });

  it("rejects web answers without usable sources", async () => {
    invokeMock.mockResolvedValueOnce({ data: { kind: "web_answer", text: "A current update", sources: [] }, error: null });
    await expect(askAiLabAssistant("latest news", [])).resolves.toEqual({ kind: "unavailable", reason: "web_sources_unavailable" });
  });
});
