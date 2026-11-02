import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi, beforeEach } from "vitest";
import FundSubTable from "./FundSubTable";
import type { FundFromDB } from "@/lib/api";

const mockUseAuth = vi.fn();
vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => mockUseAuth(),
}));

const mockIsBotOrPrerender = vi.fn();
vi.mock("@/hooks/useSoftWallTrigger", () => ({
  isBotOrPrerender: () => mockIsBotOrPrerender(),
}));

const createMockFund = (index: number): FundFromDB => ({
  id: `fund-${index}`,
  slug: `fund-${index}`,
  name: `Fund Number ${index}`,
  manager: `Manager ${index}`,
  annual_yield: 18 - index,
  daily_yield: 17.5 - index,
  fund_type: "money_market",
  cma_licensed: true,
  seven_day_yield: 17.8 - index,
  thirty_day_yield: 17.6 - index,
  minimum_investment: 1000 * index,
  management_fee: 1.5,
  withdrawal_time: "Instant",
  description: "",
  website: "",
  fact_sheet_date: null,
  yield_unit: "%",
  is_published: true,
  logo_url: null,
  updated_at: "2026-09-01",
});

const mockFunds: FundFromDB[] = Array.from({ length: 6 }, (_, i) => createMockFund(i + 1));

describe("FundSubTable Rule of 3 Gating", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("gates anonymous human visitors to 3 items, displays teaser rows and InlineDataGate", () => {
    mockUseAuth.mockReturnValue({ user: null, loading: false });
    mockIsBotOrPrerender.mockReturnValue(false);

    render(
      <MemoryRouter>
        <FundSubTable
          title="Percentage Yields (%)"
          funds={mockFunds}
          snapshots={{}}
          sortKey="annual_yield"
          sortDir="desc"
          toggleSort={vi.fn()}
          bestYield={17}
          totalInCategory={mockFunds.length}
        />
      </MemoryRouter>
    );

    // Active items 1-3 should be visible
    expect(screen.getAllByText("Fund Number 1").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Fund Number 2").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Fund Number 3").length).toBeGreaterThan(0);

    // Teasers for 4 and 5 exist with aria-hidden
    expect(screen.getAllByText("Fund Number 4").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Fund Number 5").length).toBeGreaterThan(0);

    // Item 6 should NOT be rendered at all
    expect(screen.queryByText("Fund Number 6")).toBeNull();

    // InlineDataGate should be displayed
    expect(
      screen.getAllByRole("heading", { name: /Unlock All Funds in Side-by-Side Comparison/i }).length
    ).toBeGreaterThan(0);
  });

  it("shows all funds without gate for authenticated users", () => {
    mockUseAuth.mockReturnValue({
      user: { id: "user-123", email: "investor@example.com" },
      loading: false,
    });
    mockIsBotOrPrerender.mockReturnValue(false);

    render(
      <MemoryRouter>
        <FundSubTable
          title="Percentage Yields (%)"
          funds={mockFunds}
          snapshots={{}}
          sortKey="annual_yield"
          sortDir="desc"
          toggleSort={vi.fn()}
          bestYield={17}
          totalInCategory={mockFunds.length}
        />
      </MemoryRouter>
    );

    // All 6 funds visible
    expect(screen.getAllByText("Fund Number 1").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Fund Number 6").length).toBeGreaterThan(0);

    // No gate
    expect(
      screen.queryByRole("heading", { name: /Unlock All Funds in Side-by-Side Comparison/i })
    ).toBeNull();
  });

  it("shows all funds for search engine bots / prerendering to preserve SEO", () => {
    mockUseAuth.mockReturnValue({ user: null, loading: false });
    mockIsBotOrPrerender.mockReturnValue(true);

    render(
      <MemoryRouter>
        <FundSubTable
          title="Percentage Yields (%)"
          funds={mockFunds}
          snapshots={{}}
          sortKey="annual_yield"
          sortDir="desc"
          toggleSort={vi.fn()}
          bestYield={17}
          totalInCategory={mockFunds.length}
        />
      </MemoryRouter>
    );

    // All funds visible to bot
    expect(screen.getAllByText("Fund Number 6").length).toBeGreaterThan(0);

    // No gate for bot
    expect(
      screen.queryByRole("heading", { name: /Unlock All Funds in Side-by-Side Comparison/i })
    ).toBeNull();
  });
});
