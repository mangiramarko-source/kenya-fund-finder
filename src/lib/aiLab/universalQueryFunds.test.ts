import { describe, expect, it } from "vitest";
import {
  continueQueryWithParameters,
  createParameterContinuationToken,
  resolveQuery,
  type CanonicalFinancialEntity,
  type QuerySemanticFrameV1,
} from "../../../supabase/functions/_shared/universal-query";

const catalog: CanonicalFinancialEntity[] = [
  {
    id: "fund:kcb-kes-mmf",
    kind: "fund",
    subtype: "money_market",
    displayLabel: "KCB Money Market Fund",
    sourceKey: "kcb-money-market",
    manager: "KCB Asset Management",
    market: "%",
    aliases: ["KCB MMF", "KCB"],
  },
  {
    id: "fund:kcb-usd-mmf",
    kind: "fund",
    subtype: "money_market",
    displayLabel: "KCB USD Money Market Fund",
    sourceKey: "kcb-usd-money-market",
    manager: "KCB Asset Management",
    market: "USD",
    aliases: ["KCB USD MMF", "KCB"],
  },
  {
    id: "fund:kcb-fixed-income",
    kind: "fund",
    subtype: "fixed_income",
    displayLabel: "KCB Fixed Income Fund",
    sourceKey: "kcb-fixed-income",
    manager: "KCB Asset Management",
    market: "%",
    aliases: ["KCB Fixed Income", "KCB"],
  },
  {
    id: "fund:etica-shariah",
    kind: "fund",
    subtype: "special",
    displayLabel: "Etica Shariah Fund",
    sourceKey: "etica-shariah",
    manager: "Etica Capital",
    market: "%",
    aliases: ["Etica Shariah"],
  },
];

function frame(mention: string, action: QuerySemanticFrameV1["action"] = "scenario"): QuerySemanticFrameV1 {
  return {
    version: 1,
    action,
    confidence: "high",
    entityMentions: [{ text: mention, role: "primary", expectedKinds: ["fund"] }],
    requestedMetrics: [],
    parameters: action === "scenario" ? { scenarioKind: "asset-amount" } : {},
    contextReferences: [],
  };
}

describe("universal fund resolution", () => {
  it("asks which product for a generic MMF instead of guessing", () => {
    const result = resolveQuery(frame("an MMF"), catalog);
    expect(result.status).toBe("ambiguous");
    if (result.status !== "ambiguous") return;
    expect(result.candidates).toHaveLength(2);
    expect(result.candidates.map((candidate) => candidate.id)).toEqual([
      "fund:kcb-kes-mmf",
      "fund:kcb-usd-mmf",
    ]);
  });

  it("keeps same-manager KES-yield and USD-unit MMFs ambiguous and labels the class", () => {
    const result = resolveQuery(frame("KCB MMF"), catalog);
    expect(result.status).toBe("ambiguous");
    if (result.status !== "ambiguous") return;
    expect(result.candidates.map((candidate) => candidate.description)).toEqual([
      "money market · KCB Asset Management",
      "money market · USD class · KCB Asset Management",
    ]);
  });

  it("uses the requested fund category to resolve a manager product", () => {
    const fixedIncome = resolveQuery(frame("KCB fixed income"), catalog);
    expect(fixedIncome.status).toBe("resolved");
    if (fixedIncome.status === "resolved") expect(fixedIncome.entities[0].id).toBe("fund:kcb-fixed-income");

    const shariah = resolveQuery(frame("Etica Shariah fund", "lookup"), catalog);
    expect(shariah.status).toBe("resolved");
    if (shariah.status === "resolved") expect(shariah.entities[0].id).toBe("fund:etica-shariah");
  });

  it("preserves the selected fund when the user supplies the missing amount", () => {
    const original = frame("KCB USD MMF");
    const token = createParameterContinuationToken(original, ["fund:kcb-usd-mmf"]);
    const followUp: QuerySemanticFrameV1 = {
      version: 1,
      action: "scenario",
      confidence: "high",
      entityMentions: [],
      requestedMetrics: [],
      parameters: { amount: 10_000, currency: "KES" },
      contextReferences: ["last_entity"],
    };
    const result = continueQueryWithParameters(token, followUp, catalog);
    expect(result?.status).toBe("resolved");
    if (result?.status !== "resolved") return;
    expect(result.entities[0].id).toBe("fund:kcb-usd-mmf");
    expect(result.frame.parameters.amount).toBe(10_000);
  });
});
