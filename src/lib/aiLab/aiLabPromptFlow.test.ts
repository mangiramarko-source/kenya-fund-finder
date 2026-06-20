import { describe, it, expect, vi, beforeEach } from "vitest";
import type { MarketContext } from "./marketContext";
import { processAiLabUserPrompt } from "./chat";
import { isNamedFundLookupPrompt, isWebsiteLookupPrompt } from "./websiteLookup";
import type { FundRow } from "./websiteLookup";

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
  fundCount: 4,
  avgAnnualYieldPct: 11,
  topAnnualYieldPct: 12.5,
  lowAnnualYieldPct: 10.2,
  sampleStockSymbol: "SCOM",
  sampleStockPrice: 18.5,
  sampleStockChangePct: 1.2,
  assets: [
    {
      kind: "stock",
      symbol: "SCOM",
      name: "Safaricom",
      value: 18.5,
      valueLabel: "Price (KES)",
      changePct: 1.2,
      aliases: ["scom", "safaricom"],
    },
    {
      kind: "fund",
      symbol: "Etica Money Market Fund",
      name: "Etica Money Market Fund",
      value: 11.5,
      valueLabel: "Annual yield (%)",
      changePct: null,
      aliases: ["etica", "mmf"],
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

const GENERIC_UNKNOWN =
  "I couldn't find enough matching data or assumptions to answer that safely";

describe("named fund lookup prompt detection", () => {
  it("treats bare Britam MMF as a website lookup prompt", () => {
    expect(isNamedFundLookupPrompt("Britam MMF")).toBe(true);
    expect(isWebsiteLookupPrompt("Britam MMF")).toBe(true);
  });

  it("treats bare Etica MMF and CIC MMF as website lookup prompts", () => {
    expect(isWebsiteLookupPrompt("Etica MMF")).toBe(true);
    expect(isWebsiteLookupPrompt("CIC MMF")).toBe(true);
  });

  it("does not treat scenario prompts as named fund lookups", () => {
    expect(isWebsiteLookupPrompt("If I put 100,000 in an MMF, how much do I get?")).toBe(false);
    expect(isWebsiteLookupPrompt("KES 10,000 in SCOM")).toBe(false);
  });
});

describe("processAiLabUserPrompt — top-level chat flow", () => {
  beforeEach(() => {
    vi.mocked(fetchPublicData).mockReset();
  });

  it("Britam MMF routes through website-lookup to MMF, not generic unknown", async () => {
    mockFunds(britamFunds);
    const out = await processAiLabUserPrompt("Britam MMF", ctx);
    expect(out.route).toBe("website-lookup");
    expect(out.text).not.toContain(GENERIC_UNKNOWN);
    expect(out.result?.kind).toBe("website-lookup");
    if (out.result?.kind === "website-lookup") {
      expect(out.result.entityName).toBe("Britam Money Market Fund");
      expect(out.result.notFound).not.toBe(true);
    }
  });

  it("Etica MMF routes through website-lookup to MMF or honest not-found", async () => {
    mockFunds(extendedFunds);
    const out = await processAiLabUserPrompt("Etica MMF", ctx);
    expect(out.route).toBe("website-lookup");
    expect(out.text).not.toContain(GENERIC_UNKNOWN);
    if (out.result?.kind === "website-lookup") {
      expect(out.result.entityName).toBe("Etica Money Market Fund");
    }
  });

  it("CIC MMF routes through website-lookup to MMF or honest not-found", async () => {
    mockFunds(extendedFunds);
    const out = await processAiLabUserPrompt("CIC MMF", ctx);
    expect(out.route).toBe("website-lookup");
    expect(out.text).not.toContain(GENERIC_UNKNOWN);
    if (out.result?.kind === "website-lookup") {
      expect(out.result.entityName).toBe("CIC Money Market Fund");
    }
  });

  it("unknown specific fund returns honest not-found, not generic unknown", async () => {
    mockFunds(extendedFunds);
    const out = await processAiLabUserPrompt("Random Unknown Fund XYZ", ctx);
    expect(out.route).toBe("website-lookup");
    expect(out.text).not.toContain(GENERIC_UNKNOWN);
    expect(out.text.toLowerCase()).toContain("could not find that exact fund");
    if (out.result?.kind === "website-lookup") {
      expect(out.result.notFound).toBe(true);
    }
  });

  it("brand-only Britam returns instrument-family overview, not generic unknown or averaged answer", async () => {
    mockFunds(britamFunds);
    const out = await processAiLabUserPrompt("Britam", ctx);
    expect(out.route).toBe("website-lookup");
    expect(out.text).not.toContain(GENERIC_UNKNOWN);
    expect(out.text.toLowerCase()).toContain("matching instruments");
    if (out.result?.kind === "website-lookup") {
      expect(out.result.lookupMode).toBe("instrument-family-overview");
      expect(out.result.entityName).not.toBe("Britam Balanced Fund");
      const labels = out.result.fields.map((f) => f.label);
      expect(labels).toContain("Fund: Britam Money Market Fund");
      expect(labels).toContain("Fund: Britam Balanced Fund");
    }
  });

  it("KCB returns overview through top-level flow when stock and fund match", async () => {
    const kcbCtx: MarketContext = {
      ...ctx,
      assets: [
        ...ctx.assets,
        {
          kind: "stock",
          symbol: "KCB",
          name: "KCB Group",
          value: 45,
          valueLabel: "Price (KES)",
          changePct: 0.5,
          aliases: ["kcb"],
        },
      ],
    };
    mockFunds([
      {
        slug: "kcb-mmf",
        name: "KCB Money Market Fund",
        manager: "KCB Asset Management",
        annual_yield: 10.5,
        fund_type: "money_market",
      },
    ]);
    const out = await processAiLabUserPrompt("KCB", kcbCtx);
    expect(out.route).toBe("website-lookup");
    expect(out.text).not.toContain(GENERIC_UNKNOWN);
    if (out.result?.kind === "website-lookup") {
      expect(out.result.lookupMode).toBe("instrument-family-overview");
    }
  });

  it("Safaricom returns stock lookup through top-level flow", async () => {
    vi.mocked(fetchPublicData).mockImplementation(async (resource) => {
      if (resource === "funds") {
        return { resource: "funds", count: 0, limit: 200, offset: 0, data: [] };
      }
      return {
        resource: "stocks",
        count: 1,
        limit: 1,
        offset: 0,
        data: [{ symbol: "SCOM", name: "Safaricom", price: 18.5 }],
      };
    });
    const out = await processAiLabUserPrompt("Safaricom", ctx);
    expect(out.route).toBe("website-lookup");
    if (out.result?.kind === "website-lookup") {
      expect(out.result.entityType).toBe("stock");
      expect(out.result.entitySymbol).toBe("SCOM");
    }
  });

    it("Show MMFs above 10% routes through website-lookup as MMF yield filter", async () => {
    mockFunds([
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
    ]);
    const out = await processAiLabUserPrompt("Show MMFs above 10%", ctx);
    expect(out.route).toBe("website-lookup");
    expect(out.text.toLowerCase()).not.toContain("can't filter");
    expect(out.text).not.toContain(GENERIC_UNKNOWN);
    if (out.result?.kind === "website-lookup") {
      expect(out.result.lookupMode).toBe("mmf-yield-filter");
      const labels = out.result.fields.map((f) => f.label);
      expect(labels).not.toContain("Britam Balanced Fund");
    }
  });

  it("Show best MMFs stays on filter-unsupported path", async () => {
    const out = await processAiLabUserPrompt("Show best MMFs", ctx);
    expect(out.route).toBe("filter-unsupported");
    expect(out.text.toLowerCase()).toContain("can't filter funds");
  });

  describe("hypothetical scenario E2E", () => {
    it("answers SCOM amount scenario with illustrative narrative", async () => {
      const out = await processAiLabUserPrompt("I have 100,000, what happens if I put it in SCOM?", ctx);
      expect(out.result?.kind).toBe("stock-amount");
      expect(out.text).toContain("Approximate shares are illustrative only");
      expect(out.text).toContain("Data only. Not personal financial advice.");
    });

    it("refuses advice-style allocation question", async () => {
      const out = await processAiLabUserPrompt("Where should I put 100,000?", ctx);
      expect(out.result?.kind).toBe("refusal");
      expect(out.text.toLowerCase()).toContain("can't tell you what to buy, sell, or choose");
    });
  });


  it("Rank funds by yield stays on filter-unsupported path", async () => {
    const out = await processAiLabUserPrompt("Rank funds by yield", ctx);
    expect(out.route).toBe("filter-unsupported");
    expect(out.text.toLowerCase()).toContain("can't filter funds");
  });
});
