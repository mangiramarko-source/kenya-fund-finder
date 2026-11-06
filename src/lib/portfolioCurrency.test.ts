import { describe, expect, it } from "vitest";
import {
  convertFromKes,
  formatPortfolioCurrency,
  getActiveExchangeRate,
} from "./portfolioCurrency";
import type { ExchangeRate } from "@/components/home/MarketTicker";

const mockRates: ExchangeRate[] = [
  { id: "1", currency_code: "USD", currency_name: "US Dollar", rate: 130, previous_rate: 129, updated_at: "" },
  { id: "2", currency_code: "EUR", currency_name: "Euro", rate: 140, previous_rate: 139, updated_at: "" },
  { id: "3", currency_code: "GBP", currency_name: "British Pound", rate: 160, previous_rate: 159, updated_at: "" },
];

describe("portfolioCurrency", () => {
  it("converts KES values accurately using live rates", () => {
    expect(convertFromKes(1300, "USD", mockRates)).toBe(10);
    expect(convertFromKes(1400, "EUR", mockRates)).toBe(10);
    expect(convertFromKes(1600, "GBP", mockRates)).toBe(10);
    expect(convertFromKes(5000, "KES", mockRates)).toBe(5000);
  });

  it("falls back gracefully when live rate is not present", () => {
    const usdFallback = convertFromKes(12942, "USD", []);
    expect(usdFallback).toBeCloseTo(100, 0);
  });

  it("formats currency values with symbols and correct digits", () => {
    const formattedUsd = formatPortfolioCurrency(1300, "USD", mockRates);
    expect(formattedUsd).toContain("10.00");

    const formattedKes = formatPortfolioCurrency(5000, "KES", mockRates);
    expect(formattedKes).toContain("5,000.00");
  });

  it("returns active exchange rate label and live status", () => {
    const activeUsd = getActiveExchangeRate("USD", mockRates);
    expect(activeUsd.isLive).toBe(true);
    expect(activeUsd.rate).toBe(130);
    expect(activeUsd.label).toBe("1 USD = 130.00 KES");

    const kes = getActiveExchangeRate("KES", mockRates);
    expect(kes.rate).toBe(1);
    expect(kes.label).toBe("KES (Base)");
  });
});
