import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const invokeMock = vi.fn();

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    functions: { invoke: (...args: unknown[]) => invokeMock(...args) },
  },
}));

import {
  generateGeminiEducationalAnswer,
  isGeminiEducationalEnabled,
} from "./generateGeminiEducationalAnswer";

const originalEnv = { ...import.meta.env };

function setFlag(value: string | undefined) {
  // vitest exposes import.meta.env as a mutable object
  (import.meta as unknown as { env: Record<string, unknown> }).env.VITE_AI_LAB_GEMINI_ENABLED =
    value;
}

describe("generateGeminiEducationalAnswer", () => {
  beforeEach(() => {
    invokeMock.mockReset();
  });

  afterEach(() => {
    Object.assign((import.meta as unknown as { env: Record<string, unknown> }).env, originalEnv);
  });

  it("short-circuits when flag is off (does not invoke)", async () => {
    setFlag(undefined);
    expect(isGeminiEducationalEnabled()).toBe(false);
    const res = await generateGeminiEducationalAnswer("What is a money market fund?");
    expect(res.ok).toBe(false);
    expect(res.reason).toBe("disabled");
    expect(invokeMock).not.toHaveBeenCalled();
  });

  it("returns markdown on a successful, safe response", async () => {
    setFlag("true");
    invokeMock.mockResolvedValueOnce({
      data: {
        ok: true,
        text: "A money market fund is a type of pooled fund that holds short-term instruments.",
      },
      error: null,
    });
    const res = await generateGeminiEducationalAnswer("What is a money market fund?");
    expect(invokeMock).toHaveBeenCalledOnce();
    expect(res.ok).toBe(true);
    expect(res.markdown).toContain("money market fund");
    expect(res.markdown).toContain("Not personal financial advice");
  });

  it("falls back when Gemini output fails validation (numeric)", async () => {
    setFlag("true");
    invokeMock.mockResolvedValueOnce({
      data: { ok: true, text: "MMFs pay around 11% per year in Kenya." },
      error: null,
    });
    const res = await generateGeminiEducationalAnswer("What is an MMF yield?");
    expect(res.ok).toBe(false);
    expect(res.reason).toMatch(/^validation:/);
  });

  it("falls back on invoke error", async () => {
    setFlag("true");
    invokeMock.mockResolvedValueOnce({ data: null, error: { message: "boom" } });
    const res = await generateGeminiEducationalAnswer("Explain dividend yield");
    expect(res.ok).toBe(false);
    expect(res.reason).toBe("invoke_error");
  });

  it("falls back when payload.ok is false", async () => {
    setFlag("true");
    invokeMock.mockResolvedValueOnce({ data: { ok: false, reason: "not_educational" }, error: null });
    const res = await generateGeminiEducationalAnswer("What is an MMF?");
    expect(res.ok).toBe(false);
    expect(res.reason).toBe("not_educational");
  });
});
