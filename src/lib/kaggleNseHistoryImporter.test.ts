import { describe, expect, it } from "vitest";
import { normalizeKaggleNseCsv, parseNseDate } from "../../scripts/lib/kaggle-nse-history.mjs";

describe("Kaggle NSE history parsing", () => {
  it("parses both dataset date formats", () => {
    expect(parseNseDate("3-Jan-22")).toBe("2022-01-03");
    expect(parseNseDate("1/2/2008")).toBe("2008-01-02");
  });

  it("normalizes valid prices and rejects indices and invalid prices", () => {
    const csv = [
      "Date,Code,Name,Day Price,Volume",
      '3-Jan-22,SCOM,Safaricom,"35.50","1,000"',
      '3-Jan-22,^N20I,Index,"5,000","1,000"',
      "4-Jan-22,KCB,KCB,-,0",
    ].join("\n");
    expect(normalizeKaggleNseCsv(csv, { startDate: "2021-01-01", endDate: "2025-12-31" })).toEqual({
      rows: [{ symbol: "SCOM", snapshot_date: "2022-01-03", price: 35.5 }],
      rejected: 2,
    });
  });

  it("deduplicates symbol-date pairs deterministically", () => {
    const csv = [
      "Date,Code,Name,Day Price",
      "3-Jan-22,SCOM,Safaricom,35",
      "3-Jan-22,SCOM,Safaricom,36",
    ].join("\n");
    expect(normalizeKaggleNseCsv(csv, { startDate: "2021-01-01", endDate: "2025-12-31" }).rows).toEqual([
      { symbol: "SCOM", snapshot_date: "2022-01-03", price: 36 },
    ]);
  });
});
