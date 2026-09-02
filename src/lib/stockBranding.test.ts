import { describe, expect, it } from "vitest";
import { getStockLogoUrl } from "./stockBranding";

describe("getStockLogoUrl", () => {
  it("prefers the reviewed hosted logo over a temporary bundled fallback", () => {
    const hosted = "https://example.supabase.co/storage/v1/object/public/market-logos/stocks/SCOM.webp";
    expect(getStockLogoUrl("SCOM", hosted)).toBe(hosted);
  });

  it("keeps the bundled rollout fallback only for known stocks and never uses a favicon service", () => {
    expect(getStockLogoUrl("SCOM")).toBe("/images/stocks/safaricom.png");
    expect(getStockLogoUrl("UNKNOWN")).toBe("");
  });
});
