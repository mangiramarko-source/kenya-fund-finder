import { describe, expect, it } from "vitest";
import {
  QUERY_CONTRACT_VERSION,
  continueQueryWithParameters,
  continueQueryWithSelection,
  continueQueryWithText,
  resolveQuery,
  validateQuerySemanticFrame,
  type CanonicalFinancialEntity,
  type QuerySemanticFrameV1,
} from "../../../supabase/functions/_shared/universal-query";

const entity = (value: Partial<CanonicalFinancialEntity> & Pick<CanonicalFinancialEntity, "id" | "kind" | "displayLabel" | "sourceKey">): CanonicalFinancialEntity => ({
  aliases: [],
  ...value,
});

const catalog: CanonicalFinancialEntity[] = [
  entity({ id: "stock:kcb", kind: "stock", displayLabel: "KCB Group", shortLabel: "KCB", sourceKey: "KCB", market: "NSE", aliases: ["kcb", "kcb group"] }),
  entity({ id: "fund:kcb-mmf", kind: "fund", subtype: "money_market", displayLabel: "KCB Money Market Fund", sourceKey: "kcb-mmf", manager: "KCB Asset Management", aliases: ["kcb", "kcb mmf", "kcb money market"] }),
  entity({ id: "fund:kcb-fixed", kind: "fund", subtype: "fixed_income", displayLabel: "KCB Fixed Income Fund", sourceKey: "kcb-fixed", manager: "KCB Asset Management", aliases: ["kcb", "kcb fixed income"] }),
  entity({ id: "stock:eqty", kind: "stock", displayLabel: "Equity Group", shortLabel: "EQTY", sourceKey: "EQTY", market: "NSE", aliases: ["equity", "equity group"] }),
  entity({ id: "fund:equity-mmf", kind: "fund", subtype: "money_market", displayLabel: "Equity Money Market Fund", sourceKey: "equity-mmf", manager: "Equity Investment Bank", aliases: ["equity", "equity mmf"] }),
  entity({ id: "fund:cic-mmf", kind: "fund", subtype: "money_market", displayLabel: "CIC Money Market Fund", sourceKey: "cic-mmf", manager: "CIC Asset Management", aliases: ["cic", "cic mmf"] }),
  entity({ id: "fund:cic-balanced", kind: "fund", subtype: "balanced", displayLabel: "CIC Balanced Fund", sourceKey: "cic-balanced", manager: "CIC Asset Management", aliases: ["cic", "cic balanced"] }),
  entity({ id: "fund:britam-mmf", kind: "fund", subtype: "money_market", displayLabel: "Britam Money Market Fund", sourceKey: "britam-mmf", manager: "Britam Asset Managers", aliases: ["britam", "britam mmf"] }),
  entity({ id: "fund:britam-balanced", kind: "fund", subtype: "balanced", displayLabel: "Britam Balanced Fund", sourceKey: "britam-balanced", manager: "Britam Asset Managers", aliases: ["britam", "britam balanced"] }),
  entity({ id: "fx:usd", kind: "fx", displayLabel: "US Dollar", shortLabel: "USD", sourceKey: "USD", market: "KES", aliases: ["usd", "dollar", "us dollar"] }),
];

const frame = (action: QuerySemanticFrameV1["action"], mentions: string[]): QuerySemanticFrameV1 => ({
  version: QUERY_CONTRACT_VERSION,
  action,
  confidence: "high",
  entityMentions: mentions.map((text, index) => ({ text, role: index === 0 ? "primary" : "secondary" })),
  requestedMetrics: [],
  parameters: {},
  contextReferences: [],
});

describe("universal financial query resolver", () => {
  it.each(["KCB", "CIC", "Britam", "Equity"])("never silently resolves ambiguous brand %s", (brand) => {
    const result = resolveQuery(frame("lookup", [brand]), catalog);
    expect(result.status).toBe("ambiguous");
    if (result.status === "ambiguous") expect(result.candidates.length).toBeGreaterThanOrEqual(2);
  });

  it.each([
    ["KCB stock", "stock:kcb"],
    ["KCB shares", "stock:kcb"],
    ["KCB MMF", "fund:kcb-mmf"],
    ["KCB money market fund", "fund:kcb-mmf"],
    ["KCB Fixed Income Fund", "fund:kcb-fixed"],
  ])("resolves explicit wording %s", (query, expectedId) => {
    const result = resolveQuery(frame("lookup", [query]), catalog);
    expect(result.status).toBe("resolved");
    if (result.status === "resolved") expect(result.entities[0].id).toBe(expectedId);
  });

  it("detects a bare ticker brand across longer catalog labels without curated bare aliases", () => {
    const sourceShaped = catalog.map((item) => item.kind === "fund"
      ? { ...item, aliases: [item.displayLabel, item.manager ?? ""].filter(Boolean) }
      : item);
    const ambiguous = resolveQuery(frame("lookup", ["KCB"]), sourceShaped);
    expect(ambiguous.status).toBe("ambiguous");

    const explicit = resolveQuery(frame("lookup", ["KCB MMF"]), sourceShaped);
    expect(explicit.status).toBe("resolved");
    if (explicit.status === "resolved") expect(explicit.entities[0].id).toBe("fund:kcb-mmf");
  });

  it("preserves an incomplete compare through choice and typed continuation", () => {
    const first = resolveQuery(frame("compare", ["KCB"]), catalog);
    expect(first.status).toBe("ambiguous");
    if (first.status !== "ambiguous") return;

    const selected = continueQueryWithSelection(first.continuationToken, "stock:kcb", catalog);
    expect(selected?.status).toBe("resolved");
    if (!selected || selected.status !== "resolved") return;
    expect(selected.ready).toBe(false);
    expect(selected.missingEntityRole).toBe("secondary");

    const completed = continueQueryWithText(selected.continuationToken!, "Equity stock", catalog);
    expect(completed?.status).toBe("resolved");
    if (completed?.status === "resolved") {
      expect(completed.ready).toBe(true);
      expect(completed.entities.map((item) => item.id)).toEqual(["stock:kcb", "stock:eqty"]);
    }
  });

  it("does not treat numeric comparison targets as scenario parameters", () => {
    const first = resolveQuery(frame("compare", ["KCB"]), catalog);
    expect(first.status).toBe("ambiguous");
    if (first.status !== "ambiguous") return;

    const selected = continueQueryWithSelection(first.continuationToken, "stock:kcb", catalog);
    expect(selected?.status).toBe("resolved");
    if (!selected || selected.status !== "resolved") return;

    const replyFrame: QuerySemanticFrameV1 = {
      ...frame("scenario", ["USD"]),
      parameters: { amount: 10_000, currency: "USD", scenarioKind: "fx-conversion" },
    };
    expect(continueQueryWithParameters(selected.continuationToken!, replyFrame, catalog)).toBeNull();

    const completed = continueQueryWithText(selected.continuationToken!, "10k USD", catalog);
    expect(completed?.status).toBe("resolved");
    if (completed?.status === "resolved") {
      expect(completed.ready).toBe(true);
      expect(completed.entities.map((item) => item.id)).toEqual(["stock:kcb", "fx:usd"]);
    }
  });

  it("allows a market-wide daily report without inventing an entity", () => {
    const result = resolveQuery({
      ...frame("overview", []),
      topic: "daily-market-report:stocks",
      requestedMetrics: ["latest available market snapshot"],
    }, catalog);
    expect(result.status).toBe("resolved");
    if (result.status === "resolved") {
      expect(result.ready).toBe(true);
      expect(result.entities).toEqual([]);
    }
  });

  it("rejects model-created IDs and market facts at the semantic-frame boundary", () => {
    expect(validateQuerySemanticFrame({ ...frame("lookup", ["KCB"]), price: 50 }).ok).toBe(false);
    expect(validateQuerySemanticFrame({
      ...frame("lookup", ["KCB"]),
      entityMentions: [{ text: "KCB", role: "primary", canonicalId: "stock:kcb" }],
    }).ok).toBe(false);
  });
});
