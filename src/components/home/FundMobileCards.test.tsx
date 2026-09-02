import { render } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import type { FundFromDB } from "@/lib/api";
import FundMobileCards from "./FundMobileCards";

const fund = (overrides: Partial<FundFromDB> = {}): FundFromDB => ({
  id: "co-op-fixed-income",
  slug: "co-op-fixed-income",
  name: "Co-op Fixed Income Fund",
  manager: "Co-op Trust Investment Services Limited",
  cma_licensed: true,
  annual_yield: 10.89,
  daily_yield: 10.34,
  seven_day_yield: 10.5,
  thirty_day_yield: 10.6,
  fund_type: "fixed_income",
  minimum_investment: 5000,
  management_fee: 2,
  withdrawal_time: "3-5 days",
  description: "",
  website: "",
  fact_sheet_date: null,
  yield_unit: "%",
  is_published: true,
  logo_url: null,
  updated_at: "2026-09-02",
  ...overrides,
});

describe("FundMobileCards", () => {
  it("places a shared manager logo before the fund details on every fund category", () => {
    const { container } = render(
      <MemoryRouter>
        <FundMobileCards
          funds={[fund(), fund({ id: "co-op-mmf", fund_type: "money_market", slug: "co-op-mmf" })]}
          snapshots={{}}
          loading={false}
          hasSearch={false}
          onClearSearch={() => {}}
        />
      </MemoryRouter>,
    );

    const logos = Array.from(container.querySelectorAll("img"));
    expect(logos).toHaveLength(2);
    logos.forEach((logo) => {
      expect(logo).toHaveAttribute(
        "src",
        "https://caawgzuofnujrznwbuxk.supabase.co/storage/v1/object/public/market-logos/stocks/COOP-provided-v3.webp",
      );
      expect(logo).toHaveClass("object-cover");
      expect(logo).toHaveAttribute("loading", "lazy");
    });
  });
});
