import { render } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import FundGrid from "./FundGrid";
import FundMobileCards from "./FundMobileCards";
import type { FundFromDB, YieldSnapshot } from "@/lib/api";

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: false } },
});

vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({ user: { id: "test-user" } }),
}));

vi.mock("@/hooks/useSoftWallTrigger", () => ({
  isBotOrPrerender: () => true,
}));

vi.mock("@/hooks/useCompare", () => ({
  useCompare: () => ({
    selected: [],
    add: vi.fn(),
    remove: vi.fn(),
    clear: vi.fn(),
    isSelected: vi.fn().mockReturnValue(false),
    isFull: false,
    isOpen: false,
    setIsOpen: vi.fn(),
  }),
}));

const mockFund: FundFromDB = {
  id: "fund-test-1",
  slug: "test-fund-1",
  name: "Test Capital MMF",
  manager: "Test Asset Management",
  annual_yield: 12.5,
  daily_yield: 12.0,
  fund_type: "money_market",
  cma_licensed: true,
  seven_day_yield: 12.2,
  thirty_day_yield: 12.1,
  minimum_investment: 1000,
  management_fee: 1.5,
  withdrawal_time: "Instant",
  description: "",
  website: "",
  fact_sheet_date: null,
  yield_unit: "%",
  is_published: true,
  logo_url: null,
  updated_at: "2026-11-04",
};

describe("Fund Sparklines", () => {
  it("renders a multi-point trend SVG when historical snapshots vary over time", () => {
    const snapshots: YieldSnapshot[] = [
      { fund_id: "fund-test-1", annual_yield: 11.2, daily_yield: 10.8, snapshot_date: "2026-07-01" },
      { fund_id: "fund-test-1", annual_yield: 11.8, daily_yield: 11.2, snapshot_date: "2026-08-01" },
      { fund_id: "fund-test-1", annual_yield: 12.1, daily_yield: 11.6, snapshot_date: "2026-09-01" },
      { fund_id: "fund-test-1", annual_yield: 12.5, daily_yield: 12.0, snapshot_date: "2026-11-04" },
    ];

    const { container } = render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <FundGrid
            funds={[mockFund]}
            snapshots={{}}
            allSnapshots={{ "fund-test-1": snapshots }}
            loading={false}
          />
        </MemoryRouter>
      </QueryClientProvider>
    );

    const sparklineTd = container.querySelector("td.text-center");
    const svg = sparklineTd?.querySelector("svg");
    expect(svg).toBeInTheDocument();
    const paths = svg?.querySelectorAll("path");
    expect(paths && paths.length > 0).toBe(true);

    // Trend is up: 11.2 -> 12.5
    const strokePath = paths?.[1] || paths?.[0];
    expect(strokePath).toHaveAttribute("stroke", "#10b981");
  });

  it("does not render a fake flat 2-point line when only a single snapshot exists", () => {
    const todayIso = new Date().toISOString().split("T")[0];
    const singleSnapshot: YieldSnapshot[] = [
      { fund_id: "fund-test-1", annual_yield: 12.5, daily_yield: 12.0, snapshot_date: todayIso },
    ];

    const { container } = render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <FundGrid
            funds={[mockFund]}
            snapshots={{}}
            allSnapshots={{ "fund-test-1": singleSnapshot }}
            loading={false}
          />
        </MemoryRouter>
      </QueryClientProvider>
    );

    // Should display a dash '—' instead of a fake SVG sparkline
    const dash = container.querySelector("td:nth-child(4)");
    expect(dash?.textContent?.trim()).toBe("—");
  });

  it("renders mobile card sparkline properly with history", () => {
    const snapshots: YieldSnapshot[] = [
      { fund_id: "fund-test-1", annual_yield: 11.2, daily_yield: 10.8, snapshot_date: "2026-07-01" },
      { fund_id: "fund-test-1", annual_yield: 12.5, daily_yield: 12.0, snapshot_date: "2026-11-04" },
    ];

    const { container } = render(
      <MemoryRouter>
        <FundMobileCards
          funds={[mockFund]}
          snapshots={{}}
          allSnapshots={{ "fund-test-1": snapshots }}
          loading={false}
          hasSearch={false}
          onClearSearch={() => {}}
        />
      </MemoryRouter>
    );

    const svg = container.querySelector("svg");
    expect(svg).toBeInTheDocument();
    expect(svg?.querySelector("path")).toHaveAttribute("stroke", "hsl(152 60% 42%)");
  });
});
