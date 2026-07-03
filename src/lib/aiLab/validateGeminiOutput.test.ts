import { describe, it, expect } from "vitest";
import { validateGeminiOutput } from "./validateGeminiOutput";

describe("validateGeminiOutput", () => {
  it("accepts clean educational prose", () => {
    const res = validateGeminiOutput(
      "A money market fund is a type of pooled investment that holds short-term debt. It aims to preserve capital while paying modest interest.",
    );
    expect(res.ok).toBe(true);
  });

  it("rejects empty text", () => {
    expect(validateGeminiOutput("   ").ok).toBe(false);
    expect(validateGeminiOutput("").reason).toBe("empty");
  });

  it("rejects the NOT_EDUCATIONAL sentinel", () => {
    expect(validateGeminiOutput("NOT_EDUCATIONAL").ok).toBe(false);
  });

  it("rejects overlong text", () => {
    const res = validateGeminiOutput("a".repeat(601));
    expect(res.ok).toBe(false);
    expect(res.reason).toBe("too_long");
  });

  it("rejects numeric percentages", () => {
    const res = validateGeminiOutput("MMFs currently pay around 11% per year.");
    expect(res.ok).toBe(false);
    expect(res.reason).toBe("numeric_money");
  });

  it("rejects currency amounts", () => {
    const res = validateGeminiOutput("You could put KES 100000 into a fund.");
    expect(res.ok).toBe(false);
  });

  it("rejects advisory phrasing", () => {
    const res = validateGeminiOutput("You should buy this fund for the best returns.");
    expect(res.ok).toBe(false);
  });

  it("rejects prediction phrasing", () => {
    const res = validateGeminiOutput("Prices will rise strongly next quarter.");
    expect(res.ok).toBe(false);
  });

  it("rejects URLs", () => {
    const res = validateGeminiOutput("See https://example.com for more info.");
    expect(res.ok).toBe(false);
  });

  it("rejects ticker-like tokens", () => {
    const res = validateGeminiOutput("Consider looking at SCOM before deciding.");
    expect(res.ok).toBe(false);
    expect(res.reason).toBe("ticker_like");
  });

  it("allows common acronyms like MMF and NAV", () => {
    const res = validateGeminiOutput(
      "A MMF is a mutual fund. NAV is the net asset value per unit, calculated daily.",
    );
    expect(res.ok).toBe(true);
  });
});
