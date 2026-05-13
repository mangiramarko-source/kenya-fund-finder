import { describe, it, expect } from "vitest";
import { parseBulkFundText } from "./bulkFundParser";
import { matchRow } from "./bulkFundMatcher";
import { FULL_SAMPLE_PASTE, EXISTING_FUNDS } from "./__fixtures__/bulkFundSample";

/**
 * Lock-in snapshot of (manager, kind, prevAnnual, drift%) for every row in
 * the canonical sample. Any unintended change to matcher logic, prefix
 * suffix list, similarity threshold, or drift formula will fail this test.
 *
 * If you intentionally change behaviour, run `vitest -u` to update.
 */
describe("Snapshot: kind + drift stability across the full sample", () => {
  const report = parseBulkFundText(FULL_SAMPLE_PASTE);

  const rows = report.rows.map((r) => {
    const m = matchRow(
      {
        index: r.index,
        status: r.status,
        manager: r.manager,
        fund_type: r.fund_type,
        yield_unit: r.yield_unit,
        annual_yield: r.annual_yield,
      },
      EXISTING_FUNDS,
    );
    return {
      manager: r.manager,
      fund_type: r.fund_type,
      yield_unit: r.yield_unit,
      annual: r.annual_yield,
      kind: m.kind,
      fund_id: m.fund?.id ?? null,
      prevAnnual: m.prevAnnual ?? null,
      drift: m.drift !== undefined ? Number(m.drift.toFixed(4)) : null,
    };
  });

  it("matches the locked snapshot", () => {
    expect(rows).toMatchSnapshot();
  });
});
