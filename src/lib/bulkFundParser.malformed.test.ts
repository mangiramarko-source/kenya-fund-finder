import { describe, it, expect } from "vitest";
import { parseBulkFundText } from "./bulkFundParser";

/**
 * Defensive tests for messy / malformed real-world paste input.
 *
 * Contract: the parser MUST never silently fabricate rows. Missing data is
 * surfaced via status === "unparsed" / "category-missing" or warnings — never
 * as a confidently-classified row with hallucinated numbers.
 */

const find = (rows: ReturnType<typeof parseBulkFundText>["rows"], manager: string) =>
  rows.find((r) => r.manager.toLowerCase() === manager.toLowerCase());

describe("Parser: malformed inputs are still classified correctly", () => {
  it("missing annual yield → row is flagged 'unparsed' (no fabricated value)", () => {
    const r = parseBulkFundText("Money Market Fund BritamSh9.26");
    const britam = r.rows[0];
    expect(britam.status).toBe("unparsed");
    expect(britam.annual_yield).toBeNull();
    expect(britam.warnings.some((w) => /Missing/i.test(w))).toBe(true);
  });

  it("missing both yields → no row produced at all", () => {
    const r = parseBulkFundText("Money Market Fund Britam");
    expect(r.rows.length).toBe(0);
  });

  it("rows before any category header are flagged 'category-missing'", () => {
    const r = parseBulkFundText("BritamSh9.269.71");
    expect(r.rows[0].status).toBe("category-missing");
    expect(r.rows[0].fund_type).toBeNull();
  });

  it("extra whitespace between manager, currency, and numbers does not break parse", () => {
    const r = parseBulkFundText("Money Market Fund    Britam   Sh   9.26   9.71");
    const britam = find(r.rows, "Britam");
    expect(britam?.status).toBe("ok");
    expect(britam?.daily_yield).toBe(9.26);
    expect(britam?.annual_yield).toBe(9.71);
  });

  it("underscores in manager names are preserved (parser keeps them; matcher normalises)", () => {
    const r = parseBulkFundText("Money Market Fund Lofty_CorbanSh10.1710.66");
    const lofty = r.rows[0];
    expect(lofty.status).toBe("ok");
    expect(lofty.manager).toBe("Lofty_Corban");
    expect(lofty.daily_yield).toBe(10.17);
    expect(lofty.annual_yield).toBe(10.66);
  });

  it("hyphenated manager names are preserved", () => {
    const r = parseBulkFundText("Bond Fund Lofty-CorbanSh13.7813.78");
    const lofty = r.rows[0];
    expect(lofty.status).toBe("ok");
    expect(lofty.manager).toBe("Lofty-Corban");
  });

  it("commas in numbers degrade to 'unparsed' (documented gap — values must be plain decimals)", () => {
    // The currency regex requires plain decimals. Comma-formatted values
    // like "1,234.56" cause the row to surface as `unparsed`/partial — never
    // a silently-fabricated "ok" row. Admin must clean the source.
    const r = parseBulkFundText("Equity Fund BritamSh1,234.561,250.00");
    const britam = find(r.rows, "Britam");
    expect(britam?.status).not.toBe("ok");
  });

  it("trailing date/timestamp like '13 May 2026' is dropped, not treated as a row", () => {
    const r = parseBulkFundText("Money Market Fund BritamSh9.269.71 13 May 2026");
    expect(r.rows.length).toBe(1);
    expect(r.rows[0].manager).toBe("Britam");
  });

  it("multiple categories interleaved → fund_type tracks the most recent header", () => {
    const r = parseBulkFundText(
      "Money Market Fund BritamSh9.269.71 Equity Fund BritamSh147.35152.48 Bond Fund BritamSh9.6310.11",
    );
    expect(r.rows.length).toBe(3);
    expect(r.rows[0].fund_type).toBe("money_market");
    expect(r.rows[1].fund_type).toBe("equity");
    expect(r.rows[2].fund_type).toBe("bond");
  });

  it("typo in header ('Money Markett Fund') is recorded as unknown header", () => {
    const r = parseBulkFundText("Money Markett Fund BritamSh9.269.71");
    expect(r.unknownHeaders.some((h) => /Markett/.test(h))).toBe(true);
  });

  it("USD currency token sets yield_unit USD regardless of fund_type", () => {
    const r = parseBulkFundText("Money Market Fund CytonnUSD5.575.72");
    expect(r.rows[0].yield_unit).toBe("USD");
  });

  it("GBP currency token sets yield_unit GBP", () => {
    const r = parseBulkFundText("Money Market Fund SomeoneGBP4.105.00");
    expect(r.rows[0].yield_unit).toBe("GBP");
  });

  it("negative yields are parsed but flagged with a warning", () => {
    const r = parseBulkFundText("Money Market Fund BritamSh-1.50-2.00");
    expect(r.rows[0].status).toBe("ok");
    expect(r.rows[0].warnings.some((w) => /[Nn]egative/.test(w))).toBe(true);
  });

  it("MM% with annual >100 is auto-corrected to KES + warning (anti-mislabel)", () => {
    const r = parseBulkFundText("Money Market Fund BritamSh145.87145.87");
    expect(r.rows[0].yield_unit).toBe("KES");
  });

  it("empty input yields zero rows, no crash", () => {
    const r = parseBulkFundText("");
    expect(r.rows.length).toBe(0);
  });

  it("only-whitespace input yields zero rows", () => {
    const r = parseBulkFundText("   \n   \t  ");
    expect(r.rows.length).toBe(0);
  });
});
