import { describe, expect, it } from "vitest";
import { getFundManagerLogoUrl } from "./fundBranding";

describe("getFundManagerLogoUrl", () => {
  it("prioritizes the shared manager asset over an inconsistent stored row value", () => {
    expect(getFundManagerLogoUrl("CIC Asset Management", "https://example.com/old-cic.webp")).toContain("/cic.webp");
  });

  it("shares the same logo across CIC manager-name variants", () => {
    const cic = getFundManagerLogoUrl("CIC Asset Management");
    expect(getFundManagerLogoUrl(" CIC Asset Management Ltd ")).toBe(cic);
    expect(cic).toContain("/cic.webp");
  });

  it("normalizes spacing around an Old Mutual manager name", () => {
    expect(getFundManagerLogoUrl("Old Mutual Investment Group ")).toContain("/old-mutual.webp");
  });

  it("uses the supplied Etica manager logo instead of initials", () => {
    expect(getFundManagerLogoUrl("Etica Capital Ltd")).toContain("/etica-provided-v2.webp");
  });

  it("uses the supplied NCBA logo", () => {
    expect(getFundManagerLogoUrl("NCBA Investment Bank")).toContain("/ncba-provided-v4.webp");
  });

  it("uses the shared supplied logo across Dry Associates fund rows", () => {
    expect(getFundManagerLogoUrl("Dry Associates Investment Bank")).toContain("/dry-associates-provided-v3.webp");
  });

  it("reuses shared assets for aliases in non-Money-Market tabs", () => {
    expect(getFundManagerLogoUrl("Britam Asset Managers Kenya Limited")).toContain("/britam.webp");
    expect(getFundManagerLogoUrl("GulfCap Investment Bank (GCIB)")).toContain("/gulfcap-provided-v3.webp");
    expect(getFundManagerLogoUrl("CIC Global Balanced")).toContain("/cic.webp");
    expect(getFundManagerLogoUrl("Etica Shariah")).toContain("/etica-provided-v2.webp");
    expect(getFundManagerLogoUrl("Kuza Momentum")).toContain("/kuza-provided-v3.webp");
    expect(getFundManagerLogoUrl("Lofty_Corban Private Debt")).toContain("/lofty-corban-provided-v2.webp");
  });

  it("uses the exact COOP stock image for Co-op fund rows", () => {
    expect(getFundManagerLogoUrl("Co-op Trust Investment Services Limited")).toBe(
      "https://caawgzuofnujrznwbuxk.supabase.co/storage/v1/object/public/market-logos/stocks/COOP-provided-v3.webp",
    );
  });

  it("keeps an unrecognised manager's stored image, otherwise falls back to initials", () => {
    expect(getFundManagerLogoUrl("Zimele Asset Management Limited", "https://example.com/zimele.webp")).toBe("https://example.com/zimele.webp");
    expect(getFundManagerLogoUrl("Unlisted Asset Manager")).toBeUndefined();
  });
});
