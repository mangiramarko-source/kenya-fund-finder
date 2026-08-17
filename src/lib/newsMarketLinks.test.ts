import { describe, expect, it } from "vitest";
import type { ExchangeRate } from "@/components/home/MarketTicker";
import type { FundFromDB } from "@/lib/api";
import { buildRelatedMarketLinks, computeMarketPercentChange } from "./newsMarketLinks";

const fund = (overrides: Partial<FundFromDB> = {}): FundFromDB => ({
  id: "fund-1",
  slug: "nabo-sh-mmf",
  name: "Nabo Shilling Money Market Fund",
  manager: "Nabo Capital Limited",
  cma_licensed: true,
  annual_yield: 13.74,
  daily_yield: 12.88,
  seven_day_yield: 12.9,
  thirty_day_yield: 13,
  fund_type: "money_market",
  minimum_investment: 100000,
  management_fee: 2,
  withdrawal_time: "1-2 days",
  description: "",
  website: "",
  fact_sheet_date: null,
  yield_unit: "%",
  is_published: true,
  logo_url: null,
  updated_at: "2026-08-10T09:00:00.000Z",
  ...overrides,
});

const fx = (overrides: Partial<ExchangeRate> = {}): ExchangeRate => ({
  id: "fx-1",
  currency_code: "USD",
  currency_name: "US Dollar",
  rate: 130,
  previous_rate: 125,
  day_change_percent: null,
  flag_emoji: "🇺🇸",
  ...overrides,
});

describe("news market links", () => {
  it("links a story to an MMF only when the fund or manager is named", () => {
    const links = buildRelatedMarketLinks(
      "Nabo Capital updates its money market fund yield",
      "The manager said the Nabo Shilling Money Market Fund remains open to investors.",
      [fund()],
    );

    expect(links.relatedMmf).toMatchObject({
      id: "fund-1",
      name: "Nabo Shilling Money Market Fund",
      yield: 13.74,
    });
  });

  it("does not link generic fund language to a specific MMF", () => {
    const links = buildRelatedMarketLinks(
      "Investors seek safer funds",
      "Money market funds remain popular, but the article does not name a provider.",
      [fund()],
    );

    expect(links.relatedMmf).toBeNull();
  });

  it("links explicit FX pairs and calculates movement from prior rate", () => {
    const links = buildRelatedMarketLinks(
      "USD/KES rises after dollar demand increases",
      "Banks quoted USD/KES higher in morning trading.",
      [],
      [fx()],
    );

    expect(links.relatedFx).toMatchObject({
      id: "fx-1",
      pair: "USD/KES",
      rate: 130,
      changePercent: 4,
    });
  });

  it("links commodities by named market and preserves explicit change when available", () => {
    const links = buildRelatedMarketLinks(
      "Gold prices edge higher",
      "Gold was supported by safe-haven demand.",
      [],
      [],
      [{
        id: "commodity-1",
        name: "Gold",
        symbol: "XAU",
        price: 2400,
        previous_price: 2300,
        day_change_percent: 1.25,
        unit: "oz",
      }],
    );

    expect(links.relatedCommodity).toMatchObject({
      id: "commodity-1",
      name: "Gold",
      price: 2400,
      unit: "oz",
      changePercent: 1.25,
    });
  });

  it("keeps unrelated articles unlinked", () => {
    const links = buildRelatedMarketLinks(
      "New road project announced",
      "The county expects construction to begin next month.",
      [fund()],
      [fx()],
      [{ id: "commodity-1", name: "Gold", price: 2400 }],
    );

    expect(links.relatedMmf).toBeNull();
    expect(links.relatedFx).toBeNull();
    expect(links.relatedCommodity).toBeNull();
  });

  it("prefers explicit percentage movement over computed movement", () => {
    expect(computeMarketPercentChange(110, 100, 3.5)).toBe(3.5);
  });
});
