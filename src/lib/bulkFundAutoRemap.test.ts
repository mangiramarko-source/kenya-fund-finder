import { describe, it, expect } from "vitest";
import {
  planAutoRemap,
  formatAutoRemapToast,
  detectDuplicateAcceptedFundIds,
  type PlannerInput,
  DEFAULT_MIN_SIM,
} from "./bulkFundAutoRemap";
import type { ExistingFund } from "./bulkFundMatcher";

const existing: ExistingFund[] = [
  { id: "mm-britam",  manager: "Britam Asset Managers",            fund_type: "money_market", yield_unit: "%",   annual_yield: 9.5  },
  { id: "mm-cytonn",  manager: "Cytonn Asset Managers",            fund_type: "money_market", yield_unit: "%",   annual_yield: 11.2 },
  { id: "mm-cic",     manager: "CIC Asset Management",             fund_type: "money_market", yield_unit: "%",   annual_yield: 8.4  },
  { id: "mm-cytusd",  manager: "Cytonn Asset Managers",            fund_type: "money_market", yield_unit: "USD", annual_yield: 5.5  },
  { id: "eq-britam",  manager: "Britam Equity",                    fund_type: "equity",       yield_unit: "KES", annual_yield: 148  },
];

const newRow = (index: number, manager: string, ft = "money_market", yu = "%"): PlannerInput => ({
  row: { index, status: "ok", manager, fund_type: ft, yield_unit: yu },
  skipped: false,
  match: { kind: "new" },
});

describe("planAutoRemap — dedupe regression", () => {
  it("two NEW rows targeting the same fund: only the higher-similarity row links, the other becomes a collision", () => {
    const rows: PlannerInput[] = [
      newRow(0, "Britam Asset Managers"),    // sim ~1.0 with mm-britam
      newRow(1, "Britam"),                   // sim ~0.30 with mm-britam (lower)
    ];
    const plan = planAutoRemap(rows, existing, 0.2);

    expect(plan.links.map((l) => l.rowIndex)).toEqual([0]);
    expect(plan.links[0].fundId).toBe("mm-britam");

    expect(plan.collisions).toHaveLength(1);
    expect(plan.collisions[0].rowIndex).toBe(1);
    expect(plan.collisions[0].targetFund.id).toBe("mm-britam");
    expect(plan.collisions[0].reason).toBe("lost-to-higher-similarity");

    expect(plan.skippedClaimed).toBe(1);
    expect(plan.skippedLowSim).toBe(0);
  });

  it("never assigns the same fund_id to two rows even with many collisions", () => {
    const rows: PlannerInput[] = [
      newRow(0, "Britam Asset Managers"),
      newRow(1, "Britam Capital"),
      newRow(2, "Britam Holdings"),
      newRow(3, "Cytonn Asset Managers"),
      newRow(4, "Cytonn Capital"),
    ];
    const plan = planAutoRemap(rows, existing);
    const linkedFundIds = plan.links.map((l) => l.fundId);
    expect(new Set(linkedFundIds).size).toBe(linkedFundIds.length);
  });

  it("respects funds already accepted by manual remap", () => {
    const rows: PlannerInput[] = [
      { ...newRow(0, "Britam Asset Managers"), match: undefined, acceptedFundId: "mm-britam" },
      newRow(1, "Britam"),
    ];
    const plan = planAutoRemap(rows, existing, 0.2);
    expect(plan.links).toHaveLength(0);
    expect(plan.collisions).toHaveLength(1);
    expect(plan.collisions[0].reason).toBe("already-accepted-elsewhere");
  });

  it("respects funds already exact-matched by the matcher", () => {
    const rows: PlannerInput[] = [
      { ...newRow(0, "Britam"), match: { kind: "matched", fund: existing[0], prevAnnual: 9.5 } },
      newRow(1, "Britam Capital"),
    ];
    const plan = planAutoRemap(rows, existing, 0.2);
    expect(plan.links).toHaveLength(0);
    expect(plan.collisions[0].reason).toBe("already-exact-matched");
  });

  it("skips below-threshold candidates without producing a collision", () => {
    const rows: PlannerInput[] = [newRow(0, "Zzz Totally Different Manager")];
    const plan = planAutoRemap(rows, existing, DEFAULT_MIN_SIM);
    expect(plan.links).toHaveLength(0);
    expect(plan.skippedLowSim).toBe(1);
    expect(plan.collisions).toHaveLength(0);
  });

  it("never crosses fund_type or yield_unit boundaries", () => {
    const rows: PlannerInput[] = [
      newRow(0, "Britam Asset Managers", "equity", "KES"), // must NOT pick mm-britam
      newRow(1, "Cytonn Asset Managers", "money_market", "USD"), // must pick mm-cytusd, not mm-cytonn
    ];
    const plan = planAutoRemap(rows, existing);
    const link0 = plan.links.find((l) => l.rowIndex === 0);
    const link1 = plan.links.find((l) => l.rowIndex === 1);
    expect(link0?.fundId).toBe("eq-britam");
    expect(link1?.fundId).toBe("mm-cytusd");
  });
});

describe("formatAutoRemapToast — accuracy", () => {
  it("reports skippedLowSim and skippedClaimed in the description when there are links", () => {
    const out = formatAutoRemapToast({
      links: [{ rowIndex: 0, fundId: "mm-britam", fund: existing[0], similarity: 0.9 }],
      collisions: [],
      skippedLowSim: 2,
      skippedClaimed: 3,
      skippedNoCandidate: 0,
      minSim: 0.5,
    });
    expect(out.level).toBe("success");
    expect(out.title).toBe("Auto-linked 1 row to existing funds");
    expect(out.description).toContain("2 below similarity gate");
    expect(out.description).toContain("3 duplicate-target rows left as NEW");
  });

  it("omits extras when there are no skipped rows", () => {
    const out = formatAutoRemapToast({
      links: [
        { rowIndex: 0, fundId: "mm-britam", fund: existing[0], similarity: 0.9 },
        { rowIndex: 1, fundId: "mm-cytonn", fund: existing[1], similarity: 0.95 },
      ],
      collisions: [],
      skippedLowSim: 0,
      skippedClaimed: 0,
      skippedNoCandidate: 0,
      minSim: 0.5,
    });
    expect(out.title).toBe("Auto-linked 2 rows to existing funds");
    expect(out.description).not.toContain("below");
    expect(out.description).not.toContain("duplicate-target");
  });

  it("info-level when nothing linked, listing both reasons in the title", () => {
    const out = formatAutoRemapToast({
      links: [],
      collisions: [],
      skippedLowSim: 4,
      skippedClaimed: 1,
      skippedNoCandidate: 0,
      minSim: 0.5,
    });
    expect(out.level).toBe("info");
    expect(out.title).toContain("4 below 50% similarity");
    expect(out.title).toContain("1 would collide");
  });

  it("info-level fallback when nothing linked and no reasons", () => {
    const out = formatAutoRemapToast({
      links: [], collisions: [],
      skippedLowSim: 0, skippedClaimed: 0, skippedNoCandidate: 7,
      minSim: 0.5,
    });
    expect(out.title).toBe("No NEW rows had a same fund-type + same yield-unit existing fund");
  });
});

describe("detectDuplicateAcceptedFundIds — sync-time guard", () => {
  it("returns the offending fund_id and all row indices when two rows accept the same fund", () => {
    const dups = detectDuplicateAcceptedFundIds([
      { rowIndex: 0, acceptedFundId: "mm-britam" },
      { rowIndex: 3, acceptedFundId: "mm-britam" },
      { rowIndex: 5, acceptedFundId: "mm-cytonn" },
    ]);
    expect(dups).toHaveLength(1);
    expect(dups[0].fundId).toBe("mm-britam");
    expect(dups[0].rowIndices).toEqual([0, 3]);
  });

  it("ignores skipped rows", () => {
    const dups = detectDuplicateAcceptedFundIds([
      { rowIndex: 0, acceptedFundId: "mm-britam" },
      { rowIndex: 3, acceptedFundId: "mm-britam", skipped: true },
    ]);
    expect(dups).toHaveLength(0);
  });

  it("returns empty when every fund_id is unique", () => {
    expect(detectDuplicateAcceptedFundIds([
      { rowIndex: 0, acceptedFundId: "a" },
      { rowIndex: 1, acceptedFundId: "b" },
      { rowIndex: 2 }, // no acceptedFundId
    ])).toEqual([]);
  });
});
