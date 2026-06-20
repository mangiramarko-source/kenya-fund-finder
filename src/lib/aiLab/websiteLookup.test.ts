import { describe, it, expect, vi, beforeEach } from "vitest";
import type { MarketContext } from "./marketContext";
import {
  isWebsiteLookupPrompt,
  isMoneyMarketFund,
  normalizeLookupQuery,
  parseFundLookupIntent,
  scoreFundCandidate,
  selectBestFundMatch,
  resolveWebsiteLookup,
  extractFamilyQuery,
  isInstrumentFamilyPrompt,
  type FundRow,
} from "./websiteLookup";
import { isFilterLookupPrompt } from "./responseComposer";

vi.mock("@/lib/gateway", () => ({
  fetchPublicData: vi.fn(),
}));

import { fetchPublicData } from "@/lib/gateway";

const britamFunds: FundRow[] = [
  {
    slug: "britam-balanced",
    name: "Britam Balanced Fund",
    manager: "Britam Asset Managers",
    annual_yield: 12.5,
    fund_type: "balanced",
  },
  {
    slug: "britam-mmf",
    name: "Britam Money Market Fund",
    manager: "Britam Asset Managers",
    annual_yield: 10.2,
    fund_type: "money_market",
  },
];

const extendedFunds: FundRow[] = [
  ...britamFunds,
  {
    slug: "etica-mmf",
    name: "Etica Money Market Fund",
    manager: "Etica Capital",
    annual_yield: 11.5,
    fund_type: "money_market",
  },
  {
    slug: "cic-mmf",
    name: "CIC Money Market Fund",
    manager: "CIC Asset Management",
    annual_yield: 10.8,
    fund_type: "money_market",
  },
];

const ctx: MarketContext = {
  fundCount: 2,
  avgAnnualYieldPct: 11,
  topAnnualYieldPct: 12,
  lowAnnualYieldPct: 10,
  sampleStockSymbol: "SCOM",
  sampleStockPrice: 18.5,
  sampleStockChangePct: 1.2,
  assets: [
    {
      kind: "stock",
      id: "s1",
      symbol: "SCOM",
      name: "Safaricom",
      value: 18.5,
      valueLabel: "Price (KES)",
      changePct: 1.2,
      aliases: ["scom", "safaricom"],
    },
    {
      kind: "fund",
      id: "f1",
      symbol: "Etica Money Market Fund",
      name: "Etica Money Market Fund",
      value: 11.5,
      valueLabel: "Annual yield (%)",
      changePct: null,
      aliases: ["etica", "mmf", "money market"],
    },
    {
      kind: "fx",
      id: "fx1",
      symbol: "USD",
      name: "US Dollar",
      value: 129.5,
      valueLabel: "KES per 1 unit",
      changePct: 0.1,
      aliases: ["usd"],
    },
    {
      kind: "commodity",
      id: "c1",
      symbol: "GOLD",
      name: "Gold",
      value: 2500,
      valueLabel: "Price (USD/oz)",
      changePct: 0.5,
      aliases: ["gold"],
    },
  ],
  fetchedAt: new Date().toISOString(),
};

function mockFunds(data: FundRow[]) {
  vi.mocked(fetchPublicData).mockResolvedValue({
    resource: "funds",
    count: data.length,
    limit: 200,
    offset: 0,
    data,
  });
}

describe("isWebsiteLookupPrompt", () => {
  it("detects stock price lookup prompts", () => {
    expect(isWebsiteLookupPrompt("What is SCOM's current price?")).toBe(true);
    expect(isWebsiteLookupPrompt("What is Safaricom's current price?")).toBe(true);
  });

  it("detects fund yield lookup prompts", () => {
    expect(isWebsiteLookupPrompt("Show me the yield on Etica MMF")).toBe(true);
    expect(isWebsiteLookupPrompt("Show Britam MMF yield")).toBe(true);
    expect(isWebsiteLookupPrompt("Britam MMF")).toBe(true);
    expect(isWebsiteLookupPrompt("Etica MMF")).toBe(true);
    expect(isWebsiteLookupPrompt("CIC MMF")).toBe(true);
  });

  it("does not treat scenario prompts as lookup", () => {
    expect(isWebsiteLookupPrompt("KES 10,000 in SCOM")).toBe(false);
    expect(isWebsiteLookupPrompt("If I put 100,000 in an MMF, how much do I get?")).toBe(false);
    expect(isWebsiteLookupPrompt("Compare SCOM vs EQTY")).toBe(false);
    expect(isWebsiteLookupPrompt("Latest news about Safaricom")).toBe(false);
  });

  it("does not treat filter prompts as lookup", () => {
    expect(isWebsiteLookupPrompt("Show MMFs above 10%")).toBe(false);
    expect(isFilterLookupPrompt("Show MMFs above 10%")).toBe(true);
  });

  it("does not treat advice prompts as lookup", () => {
    expect(isWebsiteLookupPrompt("Which fund should I buy?")).toBe(false);
  });
});

describe("fund scoring and disambiguation", () => {
  it("identifies money market funds", () => {
    expect(isMoneyMarketFund(britamFunds[1])).toBe(true);
    expect(isMoneyMarketFund(britamFunds[0])).toBe(false);
  });

  it("normalizes MMF aliases in queries", () => {
    expect(normalizeLookupQuery("Britam MMF")).toContain("money market");
  });

  it("scores Britam MMF above Britam Balanced Fund", () => {
    const intent = parseFundLookupIntent("Britam MMF", "Show Britam MMF yield");
    const mmfScore = scoreFundCandidate("Britam MMF", britamFunds[1], intent);
    const balancedScore = scoreFundCandidate("Britam MMF", britamFunds[0], intent);
    expect(mmfScore).toBeGreaterThan(balancedScore);
  });

  it("selectBestFundMatch returns MMF for Britam MMF query", () => {
    const intent = parseFundLookupIntent("Britam MMF", "Show Britam MMF yield");
    const selection = selectBestFundMatch(britamFunds, "Britam MMF", intent);
    expect(selection.fund?.name).toBe("Britam Money Market Fund");
    expect(selection.ambiguous).toBe(false);
  });

  it("selectBestFundMatch returns balanced fund for explicit balanced query", () => {
    const intent = parseFundLookupIntent(
      "Britam Balanced Fund",
      "Show Britam Balanced Fund yield",
    );
    const selection = selectBestFundMatch(britamFunds, "Britam Balanced Fund", intent);
    expect(selection.fund?.name).toBe("Britam Balanced Fund");
  });

  it("selectBestFundMatch returns MMF for Britam Money Market Fund query", () => {
    const intent = parseFundLookupIntent(
      "Britam Money Market Fund",
      "Show Britam Money Market Fund yield",
    );
    const selection = selectBestFundMatch(britamFunds, "Britam Money Market Fund", intent);
    expect(selection.fund?.name).toBe("Britam Money Market Fund");
  });

  it("selectBestFundMatch returns Etica MMF for Etica MMF query", () => {
    const intent = parseFundLookupIntent("Etica MMF", "Show Etica MMF yield");
    const selection = selectBestFundMatch(extendedFunds, "Etica MMF", intent);
    expect(selection.fund?.name).toBe("Etica Money Market Fund");
  });

  it("selectBestFundMatch returns CIC MMF when present", () => {
    const intent = parseFundLookupIntent("CIC MMF", "Show CIC MMF yield");
    const selection = selectBestFundMatch(extendedFunds, "CIC MMF", intent);
    expect(selection.fund?.name).toBe("CIC Money Market Fund");
  });

  it("flags brand-only Britam query as ambiguous across fund types", () => {
    const intent = parseFundLookupIntent("Britam", "Show Britam yield");
    const selection = selectBestFundMatch(britamFunds, "Britam", intent);
    expect(selection.ambiguous).toBe(true);
    expect(selection.fund).toBeNull();
  });

  it("returns no match for unknown fund names", () => {
    const intent = parseFundLookupIntent("Zzzzz Unknown Fund", "Show Zzzzz Unknown Fund yield");
    const selection = selectBestFundMatch(extendedFunds, "Zzzzz Unknown Fund", intent);
    expect(selection.fund).toBeNull();
  });
});

describe("resolveWebsiteLookup", () => {
  beforeEach(() => {
    vi.mocked(fetchPublicData).mockReset();
  });

  it("returns stock lookup with gateway fields when available", async () => {
    vi.mocked(fetchPublicData).mockResolvedValue({
      resource: "stocks",
      count: 1,
      limit: 1,
      offset: 0,
      data: [
        {
          symbol: "SCOM",
          name: "Safaricom",
          sector: "Telecommunications",
          price: 18.5,
          day_change_percent: 1.2,
          volume: 1000000,
          market_cap: 700000000000,
          pe_ratio: 12.5,
          dividend_yield: 5.1,
          year_high: 20,
          year_low: 15,
        },
      ],
    });

    const result = await resolveWebsiteLookup("What is SCOM's current price?", ctx);
    expect(result?.kind).toBe("website-lookup");
    expect(result?.entityType).toBe("stock");
    expect(result?.entitySymbol).toBe("SCOM");
    expect(result?.fields.some((f) => f.label === "Latest price")).toBe(true);
    expect(result?.pagePath).toBe("/stocks/SCOM");
    expect(result?.disclaimer).toContain("Not personal financial advice");
  });

  it("returns stock lookup for Safaricom alias", async () => {
    vi.mocked(fetchPublicData).mockResolvedValue({
      resource: "stocks",
      count: 1,
      limit: 1,
      offset: 0,
      data: [{ symbol: "SCOM", name: "Safaricom", price: 18.5 }],
    });

    const result = await resolveWebsiteLookup("What is Safaricom's current price?", ctx);
    expect(result?.entityType).toBe("stock");
    expect(result?.entitySymbol).toBe("SCOM");
  });

  it("returns Britam Money Market Fund for bare Britam MMF query", async () => {
    mockFunds(britamFunds);
    const result = await resolveWebsiteLookup("Britam MMF", ctx);
    expect(result?.notFound).not.toBe(true);
    expect(result?.entityName).toBe("Britam Money Market Fund");
  });

  it("returns Britam Money Market Fund for Britam MMF query with yield wording", async () => {
    mockFunds(britamFunds);
    const result = await resolveWebsiteLookup("Show Britam MMF yield", ctx);
    expect(result?.notFound).not.toBe(true);
    expect(result?.entityName).toBe("Britam Money Market Fund");
    expect(result?.fields.some((f) => f.label === "Annual yield")).toBe(true);
  });

  it("returns fund lookup with only existing fields for Etica MMF", async () => {
    mockFunds([
      {
        slug: "etica-mmf",
        name: "Etica Money Market Fund",
        manager: "Etica Capital",
        annual_yield: 11.5,
        minimum_investment: 1000,
        management_fee: 2,
        fund_type: "money_market",
      },
    ]);

    const result = await resolveWebsiteLookup("Show me the yield on Etica MMF", ctx);
    expect(result?.kind).toBe("website-lookup");
    expect(result?.entityType).toBe("fund");
    expect(result?.entityName).toBe("Etica Money Market Fund");
    expect(result?.fields.some((f) => f.label === "Annual yield")).toBe(true);
    expect(result?.pagePath).toBe("/compare/etica-mmf");
  });

  it("returns honest not-found response for unknown fund", async () => {
    mockFunds(extendedFunds);
    const result = await resolveWebsiteLookup("Show Zzzzz Unknown Fund yield", ctx);
    expect(result?.notFound).toBe(true);
    expect(result?.lookupMessage).toContain("could not find that exact fund");
  });

  it("returns instrument-family overview for brand-only Britam query", async () => {
    mockFunds(britamFunds);
    const result = await resolveWebsiteLookup("Britam", ctx);
    expect(result?.lookupMode).toBe("instrument-family-overview");
    expect(result?.notFound).not.toBe(true);
    const labels = result?.fields.map((f) => f.label) ?? [];
    expect(labels).toContain("Fund: Britam Money Market Fund");
    expect(labels).toContain("Fund: Britam Balanced Fund");
    const combined = JSON.stringify(result).toLowerCase();
    for (const word of BANNED_WORDS) {
      expect(combined).not.toContain(word);
    }
    const yields = result?.fields.map((f) => f.value).join(" ");
    expect(yields).toContain("10.20%");
    expect(yields).toContain("12.50%");
    expect(yields).not.toMatch(/11\.35%|average/i);
  });

  it("returns fx lookup from market context without extra fetch", async () => {
    const result = await resolveWebsiteLookup("What is the USD/KES rate?", ctx);
    expect(result?.kind).toBe("website-lookup");
    expect(result?.entityType).toBe("fx");
    expect(result?.fields.some((f) => f.label === "Rate")).toBe(true);
    expect(fetchPublicData).not.toHaveBeenCalled();
  });

  it("returns null when prompt is not a lookup", async () => {
    const result = await resolveWebsiteLookup("KES 10,000 in SCOM", ctx);
    expect(result).toBeNull();
  });
});


describe("instrument family prompt detection", () => {
  it("detects broad family prompts", () => {
    expect(isInstrumentFamilyPrompt("Britam")).toBe(true);
    expect(isInstrumentFamilyPrompt("Old Mutual")).toBe(true);
    expect(isInstrumentFamilyPrompt("KCB")).toBe(true);
    expect(extractFamilyQuery("Show Britam yield")).toBe("Britam");
  });

  it("excludes named fund and FX pair prompts", () => {
    expect(isInstrumentFamilyPrompt("Britam MMF")).toBe(false);
    expect(isInstrumentFamilyPrompt("USD/KES")).toBe(false);
    expect(isInstrumentFamilyPrompt("Show MMFs above 10%")).toBe(false);
  });
});

describe("instrument family overview lookup", () => {
  beforeEach(() => {
    vi.mocked(fetchPublicData).mockReset();
  });

  const kcbCtx: MarketContext = {
    ...ctx,
    assets: [
      ...ctx.assets.filter((a) => a.kind !== "stock"),
      {
        kind: "stock",
        id: "kcb1",
        symbol: "KCB",
        name: "KCB Group",
        value: 45,
        valueLabel: "Price (KES)",
        changePct: 0.5,
        aliases: ["kcb", "kcb group"],
      },
    ],
  };

  const kcbFunds: FundRow[] = [
    {
      slug: "kcb-mmf",
      name: "KCB Money Market Fund",
      manager: "KCB Asset Management",
      annual_yield: 10.5,
      fund_type: "money_market",
    },
  ];

  it("KCB returns overview when stock and fund both match", async () => {
    mockFunds(kcbFunds);
    const result = await resolveWebsiteLookup("KCB", kcbCtx);
    expect(result?.lookupMode).toBe("instrument-family-overview");
    const labels = result?.fields.map((f) => f.label) ?? [];
    expect(labels).toContain("Fund: KCB Money Market Fund");
    expect(labels).toContain("Stock: KCB");
  });

  it("Safaricom returns single stock lookup", async () => {
    vi.mocked(fetchPublicData).mockResolvedValue({
      resource: "stocks",
      count: 1,
      limit: 1,
      offset: 0,
      data: [{ symbol: "SCOM", name: "Safaricom", price: 18.5 }],
    });
    mockFunds([]);
    const result = await resolveWebsiteLookup("Safaricom", ctx);
    expect(result?.entityType).toBe("stock");
    expect(result?.entitySymbol).toBe("SCOM");
    expect(result?.lookupMode).not.toBe("instrument-family-overview");
  });

  it("SCOM returns single stock lookup", async () => {
    vi.mocked(fetchPublicData).mockResolvedValue({
      resource: "stocks",
      count: 1,
      limit: 1,
      offset: 0,
      data: [{ symbol: "SCOM", name: "Safaricom", price: 18.5 }],
    });
    mockFunds([]);
    const result = await resolveWebsiteLookup("SCOM", ctx);
    expect(result?.entityType).toBe("stock");
    expect(result?.entitySymbol).toBe("SCOM");
  });

  it("USD/KES returns FX single lookup", async () => {
    const result = await resolveWebsiteLookup("USD/KES", ctx);
    expect(result?.entityType).toBe("fx");
    expect(result?.lookupMode).not.toBe("instrument-family-overview");
  });

  it("Gold returns commodity single lookup when unambiguous", async () => {
    mockFunds([]);
    const result = await resolveWebsiteLookup("Gold", ctx);
    expect(result?.entityType).toBe("commodity");
    expect(result?.entityName).toBe("Gold");
  });

  it("unknown broad token returns honest not-found", async () => {
    mockFunds([]);
    const result = await resolveWebsiteLookup("ZzzzzCorp", ctx);
    expect(result?.notFound).toBe(true);
    expect(result?.lookupMessage).toContain(
      'I could not find matching instruments for "ZzzzzCorp"',
    );
  });
});

const filterFunds: FundRow[] = [
  {
    slug: "britam-balanced",
    name: "Britam Balanced Fund",
    manager: "Britam Asset Managers",
    annual_yield: 12.5,
    fund_type: "balanced",
  },
  {
    slug: "britam-mmf",
    name: "Britam Money Market Fund",
    manager: "Britam Asset Managers",
    annual_yield: 10.2,
    fund_type: "money_market",
  },
  {
    slug: "etica-mmf",
    name: "Etica Money Market Fund",
    manager: "Etica Capital",
    annual_yield: 11.5,
    fund_type: "money_market",
  },
  {
    slug: "cic-mmf",
    name: "CIC Money Market Fund",
    manager: "CIC Asset Management",
    annual_yield: 10.8,
    fund_type: "money_market",
  },
  {
    slug: "low-mmf",
    name: "Low Yield MMF",
    manager: "Sample Manager",
    annual_yield: 9.0,
    fund_type: "money_market",
  },
];

const BANNED_WORDS = ["best", "top", "safest", "recommended", "guaranteed", "risk-free"];

describe("MMF yield filter lookup", () => {
  beforeEach(() => {
    vi.mocked(fetchPublicData).mockReset();
  });

  it("Show MMFs above 10% returns matching MMFs and excludes Britam Balanced Fund", async () => {
    mockFunds(filterFunds);
    const result = await resolveWebsiteLookup("Show MMFs above 10%", ctx);
    expect(result?.lookupMode).toBe("mmf-yield-filter");
    expect(result?.notFound).not.toBe(true);
    const names = result?.fields.map((f) => f.label) ?? [];
    expect(names).toContain("Etica Money Market Fund");
    expect(names).toContain("CIC Money Market Fund");
    expect(names).toContain("Britam Money Market Fund");
    expect(names).not.toContain("Britam Balanced Fund");
    expect(names).not.toContain("Low Yield MMF");
  });

  it("MMFs over 10 works without percent sign", async () => {
    mockFunds(filterFunds);
    const result = await resolveWebsiteLookup("MMFs over 10", ctx);
    expect(result?.lookupMode).toBe("mmf-yield-filter");
    expect(result?.fields.some((f) => f.label === "Etica Money Market Fund")).toBe(true);
  });

  it("Money market funds above 9.5% works", async () => {
    mockFunds(filterFunds);
    const result = await resolveWebsiteLookup("Money market funds above 9.5%", ctx);
    expect(result?.lookupMode).toBe("mmf-yield-filter");
    expect(result?.fields.some((f) => f.label === "Low Yield MMF")).toBe(false);
    expect(result?.fields.some((f) => f.label === "Britam Money Market Fund")).toBe(true);
  });

  it("MMFs below 10% works and sorts ascending", async () => {
    mockFunds(filterFunds);
    const result = await resolveWebsiteLookup("MMFs below 10%", ctx);
    expect(result?.lookupMode).toBe("mmf-yield-filter");
    const fundFields = result?.fields.filter((f) => f.label !== "Note") ?? [];
    expect(fundFields).toHaveLength(1);
    expect(fundFields[0]?.label).toBe("Low Yield MMF");
  });

  it("no matching funds returns honest empty message", async () => {
    mockFunds(filterFunds);
    const result = await resolveWebsiteLookup("MMFs above 20%", ctx);
    expect(result?.notFound).toBe(true);
    expect(result?.lookupMessage).toContain("could not find MMFs matching that yield filter");
  });

  it("result text does not contain banned advice/ranking words", async () => {
    mockFunds(filterFunds);
    const result = await resolveWebsiteLookup("Show MMFs above 10%", ctx);
    const combined = JSON.stringify(result).toLowerCase();
    for (const word of BANNED_WORDS) {
      expect(combined).not.toContain(word);
    }
  });
});
