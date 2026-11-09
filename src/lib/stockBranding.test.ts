import { describe, expect, it } from "vitest";
import { getStockLogoUrl, getBundledStockLogoUrl, resolveTickerSymbol } from "./stockBranding";

describe("getStockLogoUrl", () => {
  it("prefers the reviewed hosted logo over a temporary bundled fallback", () => {
    const hosted = "https://example.supabase.co/storage/v1/object/public/market-logos/stocks/SCOM.webp";
    expect(getStockLogoUrl("SCOM", hosted)).toBe(hosted);
  });

  it("keeps the bundled rollout fallback only for known stocks and never uses a favicon service", () => {
    expect(getStockLogoUrl("SCOM")).toBe("/images/stocks/safaricom.png");
    expect(getStockLogoUrl("UNKNOWN")).toBe("");
  });

  it("resolves market movers tickers (SGL, CTUM, KEGN, LKL, UMME, KQ)", () => {
    expect(getStockLogoUrl("SGL")).toBe("/images/stocks/sgl.png");
    expect(getStockLogoUrl("CTUM")).toBe("/images/stocks/ctum.svg");
    expect(getStockLogoUrl("KEGN")).toBe("/images/stocks/kegn.svg");
    expect(getStockLogoUrl("LKL")).toBe("/images/stocks/lkl.svg");
    expect(getStockLogoUrl("UMME")).toBe("/images/stocks/umme.svg");
    expect(getStockLogoUrl("KQ")).toBe("/images/stocks/kq.svg");
  });

  it("resolves SAFA alias and company names to the correct stock logo", () => {
    expect(resolveTickerSymbol("SAFA")).toBe("SCOM");
    expect(getStockLogoUrl("SAFA")).toBe("/images/stocks/safaricom.png");
    expect(getStockLogoUrl("STK", null, "Safaricom PLC")).toBe("/images/stocks/safaricom.png");
    expect(getBundledStockLogoUrl("SAFA")).toBe("/images/stocks/safaricom.png");
    expect(getBundledStockLogoUrl("STK", "Safaricom PLC")).toBe("/images/stocks/safaricom.png");
  });
});
