import { describe, it, expect } from "vitest";
import type { User } from "@supabase/supabase-js";
import { canUseGeminiEducationalAssist } from "./geminiEligibility";

const fakeUser = { id: "u1", email: "a@b.com" } as unknown as User;

const base = {
  user: fakeUser,
  prompt: "What is a money market fund?",
  resultKind: "unknown" as const,
  flagEnabled: true,
};

describe("canUseGeminiEducationalAssist", () => {
  it("allows the happy path", () => {
    expect(canUseGeminiEducationalAssist(base)).toBe(true);
  });

  it("blocks when flag disabled", () => {
    expect(canUseGeminiEducationalAssist({ ...base, flagEnabled: false })).toBe(false);
  });

  it("allows anonymous educational prompts when flag enabled", () => {
    expect(canUseGeminiEducationalAssist({ ...base, user: null })).toBe(true);
  });

  it("blocks anonymous educational prompts when flag disabled", () => {
    expect(
      canUseGeminiEducationalAssist({ ...base, user: null, flagEnabled: false }),
    ).toBe(false);
  });

  it("blocks non-unknown router results", () => {
    for (const kind of ["scenario", "compare", "refusal", "news", "website"] as const) {
      expect(
        // @ts-expect-error narrow kind for test
        canUseGeminiEducationalAssist({ ...base, resultKind: kind }),
      ).toBe(false);
    }
  });

  it("blocks non-educational prompts", () => {
    const cases = [
      "KES 10,000 in SCOM",
      "compare safaricom and kcb",
      "latest news",
      "Should I buy Safaricom?",
      "What is the best MMF?",
      "asdf asdf asdf",
    ];
    for (const p of cases) {
      expect(canUseGeminiEducationalAssist({ ...base, prompt: p })).toBe(false);
      expect(canUseGeminiEducationalAssist({ ...base, user: null, prompt: p })).toBe(false);
    }
  });

  it("allows classic educational prompts", () => {
    for (const p of [
      "explain money market funds in Kenya",
      "how does compounding work?",
      "difference between NAV and yield",
    ]) {
      expect(canUseGeminiEducationalAssist({ ...base, prompt: p })).toBe(true);
    }
  });
});
