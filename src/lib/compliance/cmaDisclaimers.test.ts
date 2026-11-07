import { describe, it, expect } from "vitest";
import {
  CMA_DISCLAIMERS,
  POST_CATEGORIES,
  getDisclaimerText,
  getDefaultDisclaimerForCategory,
} from "./cmaDisclaimers";

describe("CMA Disclaimers & Compliance Safeguards", () => {
  it("provides standard CMA disclaimer referencing the Capital Markets Act", () => {
    const disclaimer = getDisclaimerText("cma_standard");
    expect(disclaimer).toContain("Capital Markets Act");
    expect(disclaimer).toContain("not a licensed investment advisor");
  });

  it("provides educational and opinion disclaimers", () => {
    const edu = getDisclaimerText("educational");
    expect(edu).toContain("Educational content only");

    const opinion = getDisclaimerText("opinion");
    expect(opinion).toContain("Market commentary and personal observations");
  });

  it("maps market_update to cma_standard by default", () => {
    expect(getDefaultDisclaimerForCategory("market_update")).toBe("cma_standard");
  });

  it("maps educational to educational disclaimer by default", () => {
    expect(getDefaultDisclaimerForCategory("educational")).toBe("educational");
  });

  it("maps opinion to opinion disclaimer by default", () => {
    expect(getDefaultDisclaimerForCategory("opinion")).toBe("opinion");
  });

  it("has valid metadata for all defined categories", () => {
    const keys = Object.keys(POST_CATEGORIES);
    expect(keys).toContain("market_update");
    expect(keys).toContain("educational");
    expect(keys).toContain("opinion");
    expect(keys).toContain("platform_announcement");

    for (const key of keys) {
      const meta = POST_CATEGORIES[key as keyof typeof POST_CATEGORIES];
      expect(meta.label).toBeDefined();
      expect(meta.badgeLabel).toBeDefined();
      expect(meta.defaultDisclaimer).toBeDefined();
    }
  });
});
