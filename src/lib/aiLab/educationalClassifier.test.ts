import { describe, it, expect } from "vitest";
import { classifyEducational } from "./educationalClassifier";

describe("classifyEducational", () => {
  it("matches definitional questions", () => {
    expect(classifyEducational("What is a money market fund?")).toBe(true);
    expect(classifyEducational("Explain dividend yield")).toBe(true);
    expect(classifyEducational("Difference between NAV and yield")).toBe(true);
    expect(classifyEducational("How does compounding work?")).toBe(true);
    expect(classifyEducational("Define unit trust")).toBe(true);
  });

  it("rejects scenario / numeric prompts", () => {
    expect(classifyEducational("KES 10,000 in SCOM")).toBe(false);
    expect(classifyEducational("Model KES 100k in an MMF at 11%")).toBe(false);
    expect(classifyEducational("What happens if SCOM drops 5%?")).toBe(false);
  });

  it("rejects comparison prompts", () => {
    expect(classifyEducational("Compare SCOM vs EQTY")).toBe(false);
  });

  it("rejects advice-seeking prompts", () => {
    expect(classifyEducational("Should I buy SCOM?")).toBe(false);
    expect(classifyEducational("Recommend a fund for me")).toBe(false);
  });

  it("rejects news prompts", () => {
    expect(classifyEducational("Latest news about Safaricom")).toBe(false);
  });

  it("rejects empty or trivial prompts", () => {
    expect(classifyEducational("")).toBe(false);
    expect(classifyEducational("hi")).toBe(false);
  });
});
