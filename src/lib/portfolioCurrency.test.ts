import { describe, expect, it } from "vitest";
import { convertToKes, resolveHoldingCurrency } from "@/lib/portfolioCurrency";
import { getCostBasis, getCurrentValue, getPnL, type PortfolioItem } from "@/hooks/usePortfolio";

const makeStock = (overrides: Partial<PortfolioItem>): PortfolioItem => ({
  id: "holding-1",
  user_id: "user-1",
  asset_type: "stock",
  asset_name: "Test Stock",
  ticker: "SCOM",
  units: 100,
  buy_price: 10,
  current_price: 12,
  current_yield: 0,
  buy_date: "2026-10-01",
  notes: "",
  created_at: "2026-10-01T00:00:00Z",
  updated_at: "2026-10-01T00:00:00Z",
  ...overrides,
});

describe("portfolioCurrency multi-currency KES normalization", () => {
  it("converts UGX, TZS, and RWF amounts into KES using live rates or fallbacks", () => {
    expect(convertToKes(10_000, "KES")).toBe(10_000);
    expect(convertToKes(10_000, "UGX")).toBeCloseTo(350, 4);
    expect(convertToKes(10_000, "TZS")).toBeCloseTo(500, 4);
    expect(convertToKes(10_000, "RWF")).toBeCloseTo(920, 4);

    const liveRates = [
      { currency_code: "UGX", rate: 0.036 },
      { currency_code: "TZS", rate: 0.052 },
      { currency_code: "RWF", rate: 0.095 },
    ];
    expect(convertToKes(10_000, "UGX", liveRates)).toBeCloseTo(360, 4);
    expect(convertToKes(10_000, "RWF", liveRates)).toBeCloseTo(950, 4);
  });

  it("normalizes combined KES and UGX holdings into KES instead of summing raw numbers 1:1", () => {
    const kesHolding = makeStock({
      id: "kes-scom",
      asset_name: "Safaricom PLC",
      ticker: "SCOM",
      units: 100,
      buy_price: 30,
      current_price: 35,
    });
    const ugxHolding = makeStock({
      id: "use-mtnu",
      asset_name: "MTN Uganda",
      ticker: "USE-MTNU",
      units: 1_000,
      buy_price: 160,
      current_price: 170,
    });

    expect(resolveHoldingCurrency(kesHolding)).toBe("KES");
    expect(resolveHoldingCurrency(ugxHolding)).toBe("UGX");

    const liveRates = [{ currency_code: "UGX", rate: 0.035 }];
    const holdings = [kesHolding, ugxHolding];

    const totalValue = holdings.reduce((sum, item) => sum + getCurrentValue(item, liveRates), 0);
    const totalCost = holdings.reduce((sum, item) => sum + getCostBasis(item, liveRates), 0);
    const totalPnL = holdings.reduce((sum, item) => sum + getPnL(item, liveRates), 0);

    // 100 * 35 = 3,500 KES + (1,000 * 170 = 170,000 UGX * 0.035 = 5,950 KES) = 9,450 KES (NOT 173,500)
    expect(totalValue).toBeCloseTo(9_450, 4);
    // 100 * 30 = 3,000 KES + (1,000 * 160 = 160,000 UGX * 0.035 = 5,600 KES) = 8,600 KES
    expect(totalCost).toBeCloseTo(8_600, 4);
    expect(totalPnL).toBeCloseTo(850, 4);
  });
});
