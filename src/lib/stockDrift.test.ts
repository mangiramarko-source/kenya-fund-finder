import { describe, expect, it } from "vitest";
import { evaluateStockQuoteDrift, type StockQuote } from "../../supabase/functions/fetch-market-data/stock-quotes";

const baseQuote: StockQuote = {
  price: 50,
  previousPrice: 48,
  dayChange: 2,
  dayChangePct: 4.17,
  volume: 10000,
  source: "primary",
  quoteSource: "rapidapi",
  providerUpdatedAt: "2026-11-06T10:00:00Z",
  asOfDate: null,
};

describe("Stock drift evaluation & edge case guardrails", () => {
  it("guards against zero or negative DB price and reports unpriced_or_new without division by zero", () => {
    // Zero DB price
    const resZero = evaluateStockQuoteDrift({
      dbPrice: 0,
      dbVolume: 1000,
      dbDayChange: 0,
      quote: baseQuote,
    });
    expect(resZero.status).toBe("unpriced_or_new");
    expect(resZero.driftPct).toBeNull();

    // Null DB price
    const resNull = evaluateStockQuoteDrift({
      dbPrice: null,
      dbVolume: 1000,
      dbDayChange: 0,
      quote: baseQuote,
    });
    expect(resNull.status).toBe("unpriced_or_new");
    expect(resNull.driftPct).toBeNull();

    // Negative DB price
    const resNeg = evaluateStockQuoteDrift({
      dbPrice: -10,
      dbVolume: 1000,
      dbDayChange: 0,
      quote: baseQuote,
    });
    expect(resNeg.status).toBe("unpriced_or_new");
    expect(resNeg.driftPct).toBeNull();
  });

  it("treats quote price 0, null, or negative as missing instead of a -100% price collapse", () => {
    const quoteZero: StockQuote = { ...baseQuote, price: 0 };
    const resZero = evaluateStockQuoteDrift({
      dbPrice: 50,
      dbVolume: 10000,
      dbDayChange: 2,
      quote: quoteZero,
    });
    expect(resZero.status).toBe("missing");
    expect(resZero.driftPct).toBeNull();

    const quoteNull = { ...baseQuote, price: null as unknown as number };
    const resNull = evaluateStockQuoteDrift({
      dbPrice: 50,
      dbVolume: 10000,
      dbDayChange: 2,
      quote: quoteNull,
    });
    expect(resNull.status).toBe("missing");
    expect(resNull.driftPct).toBeNull();
  });

  it("categorizes cached quote as cached", () => {
    const cachedQuote: StockQuote = { ...baseQuote, source: "cache" };
    const res = evaluateStockQuoteDrift({
      dbPrice: 50,
      dbVolume: 10000,
      dbDayChange: 2,
      quote: cachedQuote,
    });
    expect(res.status).toBe("cached");
    expect(res.driftPct).toBeNull();
  });

  it("flags identical quote and DB fields as unchanged", () => {
    const res = evaluateStockQuoteDrift({
      dbPrice: 50,
      dbVolume: 10000,
      dbDayChange: 2,
      quote: baseQuote,
    });
    expect(res.status).toBe("unchanged");
    expect(res.driftPct).toBe(0);
  });

  it("categorizes price change within 20% as would_update", () => {
    // 50 -> 55 is +10%
    const quote: StockQuote = { ...baseQuote, price: 55, dayChange: 7 };
    const res = evaluateStockQuoteDrift({
      dbPrice: 50,
      dbVolume: 10000,
      dbDayChange: 2,
      quote,
    });
    expect(res.status).toBe("would_update");
    expect(res.driftPct).toBe(10);
  });

  it("blocks price drift > 20% with drift_blocked when allowHighDrift is false", () => {
    // 50 -> 65 is +30% drift
    const quote: StockQuote = { ...baseQuote, price: 65, dayChange: 17 };
    const res = evaluateStockQuoteDrift({
      dbPrice: 50,
      dbVolume: 10000,
      dbDayChange: 2,
      quote,
      allowHighDrift: false,
    });
    expect(res.status).toBe("drift_blocked");
    expect(res.driftPct).toBe(30);
  });

  it("allows price drift > 20% when allowHighDrift is true", () => {
    // 50 -> 65 is +30% drift
    const quote: StockQuote = { ...baseQuote, price: 65, dayChange: 17 };
    const res = evaluateStockQuoteDrift({
      dbPrice: 50,
      dbVolume: 10000,
      dbDayChange: 2,
      quote,
      allowHighDrift: true,
    });
    expect(res.status).toBe("would_update");
    expect(res.driftPct).toBe(30);
  });
});
