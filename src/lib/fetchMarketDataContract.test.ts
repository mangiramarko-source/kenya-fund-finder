import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const source = readFileSync(
  resolve(process.cwd(), "supabase/functions/fetch-market-data/index.ts"),
  "utf8",
);

describe("fetch-market-data stock query contract", () => {
  it("selects every field used by market-summary aggregation", () => {
    expect(source).toContain("market_cap, pe_ratio, year_high");
    expect(source).toContain("pe_ratio: number | null");
  });

  it("fails explicitly when active stocks cannot be loaded", () => {
    expect(source).toContain("error: stocksReadError");
    expect(source).toContain("Stock read failed");
  });
});
