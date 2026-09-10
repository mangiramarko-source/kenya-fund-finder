import { describe, expect, it } from "vitest";
import { isDailyMarketSummaryResult } from "../../../supabase/functions/_shared/daily-market-summary";

const fxPayload = {
  kind: "daily-market-summary",
  title: "FX rate summary",
  sections: [{
    kind: "fx",
    title: "FX rate summary",
    summary: "Rates are KES per 1 unit.",
    metrics: [{ label: "USD/KES", value: "129.4666", detail: "+0.03%", trend: "positive" }],
    highlights: [],
    unavailable: false,
  }],
  disclaimer: "Data only. Not personal financial advice.",
};

describe("daily market summary contract", () => {
  it("accepts a server-provided FX summary", () => {
    expect(isDailyMarketSummaryResult(fxPayload)).toBe(true);
  });

  it("rejects duplicate sections and unbounded metric lists", () => {
    expect(isDailyMarketSummaryResult({ ...fxPayload, sections: [fxPayload.sections[0], fxPayload.sections[0]] })).toBe(false);
    expect(isDailyMarketSummaryResult({
      ...fxPayload,
      sections: [{ ...fxPayload.sections[0], metrics: Array.from({ length: 5 }, () => fxPayload.sections[0].metrics[0]) }],
    })).toBe(false);
  });

  it("accepts every summary topic, including an explicit unavailable state", () => {
    expect(isDailyMarketSummaryResult({
      ...fxPayload,
      title: "Daily market summary",
      sections: [
        { ...fxPayload.sections[0], kind: "stocks", title: "Stocks summary" },
        { ...fxPayload.sections[0], kind: "mmf", title: "MMF summary" },
        { ...fxPayload.sections[0], kind: "fx", title: "FX rate summary" },
        {
          kind: "commodities",
          title: "Commodities summary",
          summary: "No active commodity quote is currently available.",
          metrics: [],
          highlights: [],
          unavailable: true,
        },
      ],
    })).toBe(true);
  });
});
