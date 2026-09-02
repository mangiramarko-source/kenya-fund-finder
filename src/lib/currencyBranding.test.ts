import { describe, expect, it } from "vitest";
import { getCurrencyFlagUrl, KENYA_FLAG_URL } from "./currencyBranding";

describe("currency branding", () => {
  it("maps every listed FX currency to its country flag", () => {
    ["USD", "EUR", "GBP", "JPY", "CHF", "CAD", "AUD", "CNY", "UGX", "ZAR", "INR", "TZS", "AED", "SAR"].forEach((code) => {
      expect(getCurrencyFlagUrl(code)).toMatch(/^https:\/\/flagcdn\.com\/w80\/[a-z]{2}\.png$/);
    });
  });

  it("keeps an unknown currency on the code fallback", () => {
    expect(getCurrencyFlagUrl("XYZ")).toBeUndefined();
    expect(KENYA_FLAG_URL).toBe("https://flagcdn.com/w80/ke.png");
  });
});
