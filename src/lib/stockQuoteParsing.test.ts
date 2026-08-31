import { describe, expect, it } from "vitest";
import { matchRapidApiStocks, parseRapidApiStockResponse, providerTimestamp } from "../../supabase/functions/fetch-market-data/stock-quotes";

const scom = { ticker: "SCOM", price: "37.85", change: "2.16", volume: "37145213", isin: "KE1000001402" };
const meta = { cached: true, lastUpdated: "2026-08-31T15:20:07.022Z" };
const envelope = (data: unknown[]) => ({ success: true, data, meta, timestamp: "2026-08-31T15:23:39.121Z" });

describe("RapidAPI stock percentage semantics", () => {
  it.each([
    ["SCOM", "37.85", "2.16", 37.05, 0.8],
    ["COOP", "37.25", "0.40", 37.1, 0.15],
    ["ABSA", "34.25", "0.15", 34.2, 0.05],
    // Rounded provider percentages imply an approximate, not exact, previous close.
    ["EABL", "279.25", "-0.27", 280.01, -0.76],
    ["NCBA", "90.50", "-0.28", 90.75, -0.25],
    ["KCB", "93.50", "0", 93.5, 0],
    ["EQTY", "93.25", "0", 93.25, 0],
  ])("derives %s prices from percentage movement", (ticker, price, change, previousPrice, dayChange) => {
    const { quotes } = parseRapidApiStockResponse(envelope([{ ...scom, ticker, price, change }]));
    expect(quotes.get(ticker)).toMatchObject({
      price: Number(price), previousPrice, dayChange, dayChangePct: Number(change),
      source: "primary", quoteSource: "rapidapi", asOfDate: null,
    });
  });

  it("accepts a percent suffix, numeric fields and comma-delimited volumes", () => {
    const { quotes } = parseRapidApiStockResponse(envelope([{ ...scom, price: 37.85, change: "+2.16%", volume: "37,145,213" }]));
    expect(quotes.get("SCOM")).toMatchObject({ dayChangePct: 2.16, dayChange: 0.8, volume: 37145213 });
  });

  it.each([
    { change: undefined }, { change: null }, { change: "" }, { change: "N/A" },
    { change: "2.16 KSh" }, { change: "2.16junk" }, { change: "-100" }, { change: "-101" },
    { change: Infinity }, { price: "0" }, { price: "-1" }, { price: "NaN" },
    { price: Infinity }, { volume: "-1" }, { volume: "1.5" }, { volume: "" }, { ticker: "" },
  ])("rejects invalid data without converting it to zero: %j", (invalid) => {
    const result = parseRapidApiStockResponse(envelope([{ ...scom, ...invalid }]));
    expect(result.quotes.size).toBe(0);
    expect(result.diagnostics.rejected).toBe(1);
  });

  it.each([null, [], {}, { success: false, data: [] }, { data: {} }])("rejects malformed response %j", (payload) => {
    expect(() => parseRapidApiStockResponse(payload)).toThrow("Invalid RapidAPI stock response");
  });

  it("reports the raw instrument count separately from accepted and tracked quotes", () => {
    const parsed = parseRapidApiStockResponse(envelope([scom, { ...scom, ticker: "OTHER" }, { ...scom, ticker: "INVALID", change: "N/A" }]));
    expect(parsed.diagnostics).toMatchObject({ returned: 3, accepted: 2, rejected: 1 });
    expect([...matchRapidApiStocks(["SCOM"], parsed.quotes).quotes.keys()]).toEqual(["SCOM"]);
  });
});

describe("stock provenance", () => {
  it("separates provider cache time from response time and exchange quote date", () => {
    const result = parseRapidApiStockResponse(envelope([scom]));
    expect(result.quotes.get("SCOM")).toMatchObject({ providerUpdatedAt: meta.lastUpdated, asOfDate: null });
    expect(result.diagnostics).toMatchObject({ provider_updated_at: meta.lastUpdated, response_timestamp: "2026-08-31T15:23:39.121Z", cached: true });
  });

  it.each([undefined, null, "yesterday", "2026-08-31", "2026-08-31T15:20:07", "2026-13-31T15:20:07Z"])("does not substitute response or ingestion time for invalid/missing provider time: %s", (lastUpdated) => {
    const result = parseRapidApiStockResponse({ ...envelope([scom]), meta: { cached: true, lastUpdated } });
    expect(result.quotes.get("SCOM")?.providerUpdatedAt).toBeNull();
    expect(result.diagnostics.provider_timestamp_status).toBe("missing_or_invalid");
  });

  it("normalizes an explicit EAT offset to UTC", () => {
    expect(providerTimestamp("2026-08-31T18:20:07.022+03:00")).toBe(meta.lastUpdated);
  });
});

describe("NSE listed-company provider alias", () => {
  const nse = { ticker: "NSE", name: "Nairobi Securities Exchange 4.00", isin: "KE3000009674", price: "27.55", change: "5.76", volume: "1371575" };

  it("maps the company to the existing NSE20 key without creating another stock", () => {
    const { quotes } = parseRapidApiStockResponse(envelope([scom, nse]));
    const matched = matchRapidApiStocks(["SCOM", "NSE20"], quotes);
    expect([...matched.quotes.keys()]).toEqual(["SCOM", "NSE20"]);
    expect(matched.quotes.get("NSE20")).toMatchObject({ price: 27.55, dayChangePct: 5.76, quoteSource: "rapidapi" });
    expect(matched.rejectedAliases).toEqual([]);
  });

  it.each([undefined, "", "WRONG-INDEX-ISIN"])("rejects an unconfirmed company identity (%s)", (isin) => {
    const { quotes } = parseRapidApiStockResponse(envelope([{ ...nse, isin }]));
    const matched = matchRapidApiStocks(["NSE20"], quotes);
    expect(matched.quotes.size).toBe(0);
    expect(matched.rejectedAliases).toEqual(["NSE20"]);
  });

  it("does not treat a provider NSE20 index as the listed company", () => {
    const { quotes } = parseRapidApiStockResponse(envelope([{ ...nse, ticker: "NSE20" }]));
    expect(matchRapidApiStocks(["NSE20"], quotes).quotes.size).toBe(0);
  });
});
