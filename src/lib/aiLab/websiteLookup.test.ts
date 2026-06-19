import { describe, it, expect, vi, beforeEach } from "vitest";
import type { MarketContext } from "./marketContext";
import {
  isWebsiteLookupPrompt,
  resolveWebsiteLookup,
} from "./websiteLookup";

vi.mock("@/lib/gateway", () => ({
  fetchPublicData: vi.fn(),
}));

import { fetchPublicData } from "@/lib/gateway";

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
      symbol: "Etica MMF",
      name: "Etica MMF",
      value: 11.5,
      valueLabel: "Annual yield (%)",
      changePct: null,
      aliases: ["etica"],
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
  ],
  fetchedAt: new Date().toISOString(),
};

describe("isWebsiteLookupPrompt", () => {
  it("detects stock price lookup prompts", () => {
    expect(isWebsiteLookupPrompt("What is SCOM's current price?")).toBe(true);
  });

  it("detects fund yield lookup prompts", () => {
    expect(isWebsiteLookupPrompt("Show me the yield on Etica MMF")).toBe(true);
  });

  it("does not treat scenario prompts as lookup", () => {
    expect(isWebsiteLookupPrompt("KES 10,000 in SCOM")).toBe(false);
    expect(isWebsiteLookupPrompt("If I put 100,000 in an MMF, how much do I get?")).toBe(false);
    expect(isWebsiteLookupPrompt("Compare SCOM vs EQTY")).toBe(false);
    expect(isWebsiteLookupPrompt("Latest news about Safaricom")).toBe(false);
  });

  it("does not treat advice prompts as lookup", () => {
    expect(isWebsiteLookupPrompt("Which fund should I buy?")).toBe(false);
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

  it("returns fund lookup with only existing fields", async () => {
    vi.mocked(fetchPublicData).mockResolvedValue({
      resource: "funds",
      count: 1,
      limit: 200,
      offset: 0,
      data: [
        {
          slug: "etica-mmf",
          name: "Etica MMF",
          manager: "Etica Capital",
          annual_yield: 11.5,
          minimum_investment: 1000,
          management_fee: 2,
          fund_type: "money_market",
        },
      ],
    });

    const result = await resolveWebsiteLookup("Show me the yield on Etica MMF", ctx);
    expect(result?.kind).toBe("website-lookup");
    expect(result?.entityType).toBe("fund");
    expect(result?.fields.some((f) => f.label === "Annual yield")).toBe(true);
    expect(result?.fields.some((f) => f.label === "Minimum investment")).toBe(true);
    expect(result?.pagePath).toBe("/compare/etica-mmf");
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
