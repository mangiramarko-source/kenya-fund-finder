import { describe, it, expect } from "vitest";
import { parseSimplePaste, type SimpleFundLookup } from "./simpleUnitTrustPaste";

const FUNDS: SimpleFundLookup[] = [
  { id: "11111111-1111-1111-1111-111111111111", slug: "britam-money-market", manager: "Britam", name: "Britam MMF", fund_type: "money_market", yield_unit: "%", annual_yield: 9.5, daily_yield: 9.1 },
  { id: "22222222-2222-2222-2222-222222222222", slug: "icea-money-market", manager: "ICEA", name: "ICEA MMF", fund_type: "money_market", yield_unit: "%", annual_yield: 8.0, daily_yield: 7.7 },
  { id: "33333333-3333-3333-3333-333333333333", slug: "cytonn-money-market-usd", manager: "Cytonn", name: "Cytonn USD", fund_type: "money_market", yield_unit: "USD", annual_yield: 5.7, daily_yield: 5.5 },
];

describe("parseSimplePaste", () => {
  it("parses a basic TSV block by slug", () => {
    const r = parseSimplePaste(
      `britam-money-market\t9.26\t9.71\nicea-money-market\t7.75\t8.06`,
      FUNDS,
    );
    expect(r.okCount).toBe(2);
    expect(r.blockedCount).toBe(0);
    expect(r.rows[0].fund?.slug).toBe("britam-money-market");
    expect(r.rows[0].daily).toBe(9.26);
    expect(r.rows[0].annual).toBe(9.71);
  });

  it("accepts CSV when no tabs are present", () => {
    const r = parseSimplePaste(`britam-money-market,9.26,9.71`, FUNDS);
    expect(r.okCount).toBe(1);
  });

  it("skips blank lines, comments and an optional header", () => {
    const r = parseSimplePaste(
      `fund\tdaily\tannual\n\n# notes\nbritam-money-market\t9\t10`,
      FUNDS,
    );
    expect(r.rows.length).toBe(1);
    expect(r.okCount).toBe(1);
  });

  it("resolves by uuid id and is case-insensitive", () => {
    const r = parseSimplePaste(`11111111-1111-1111-1111-111111111111\t9\t10\nICEA-MONEY-MARKET\t7\t8`, FUNDS);
    expect(r.okCount).toBe(2);
  });

  it("strips %, commas, currency tokens from numbers", () => {
    const r = parseSimplePaste(`britam-money-market\t9.26%\t9.71%`, FUNDS);
    expect(r.rows[0].annual).toBe(9.71);
  });

  it("flags BAD_FORMAT when column count is wrong", () => {
    const r = parseSimplePaste(`britam-money-market\t9.26`, FUNDS);
    expect(r.rows[0].status).toBe("BAD_FORMAT");
  });

  it("flags BAD_NUMBER for non-numeric or out-of-range values", () => {
    const r = parseSimplePaste(`britam-money-market\tabc\t9\nicea-money-market\t9\t99999`, FUNDS);
    expect(r.rows[0].status).toBe("BAD_NUMBER");
    expect(r.rows[1].status).toBe("BAD_NUMBER");
  });

  it("flags UNKNOWN_FUND and never auto-creates", () => {
    const r = parseSimplePaste(`unknown-slug\t9\t10`, FUNDS);
    expect(r.rows[0].status).toBe("UNKNOWN_FUND");
  });

  it("flags DUPLICATE_FUND_ID on the second occurrence", () => {
    const r = parseSimplePaste(
      `britam-money-market\t9\t10\nbritam-money-market\t8\t9`,
      FUNDS,
    );
    expect(r.rows[0].status).toBe("OK");
    expect(r.rows[1].status).toBe("DUPLICATE_FUND_ID");
  });

  it("computes drift % and warns on HIGH_DRIFT", () => {
    const r = parseSimplePaste(`britam-money-market\t9\t15`, FUNDS); // 9.5 → 15 ≈ 57%
    expect(r.rows[0].drift).toBeGreaterThan(25);
    expect(r.rows[0].warnings.some((w) => w.startsWith("HIGH_DRIFT"))).toBe(true);
    expect(r.highDriftCount).toBe(1);
  });

  it("warns LIKELY_SWAPPED when daily >> annual on % units", () => {
    const r = parseSimplePaste(`britam-money-market\t12\t9`, FUNDS);
    expect(r.rows[0].warnings.some((w) => w.startsWith("LIKELY_SWAPPED"))).toBe(true);
  });

  it("does not warn LIKELY_SWAPPED for NAV-priced (USD) funds", () => {
    const r = parseSimplePaste(`cytonn-money-market-usd\t12\t5`, FUNDS);
    expect(r.rows[0].warnings.some((w) => w.startsWith("LIKELY_SWAPPED"))).toBe(false);
  });
});
