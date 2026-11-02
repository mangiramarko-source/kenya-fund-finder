import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import FundGrid from "./FundGrid";
import type { FundFromDB } from "@/lib/api";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
    },
  },
});

const renderWithProviders = (ui: React.ReactElement, initialEntries = ["/funds"]) => {
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={initialEntries}>
        {ui}
      </MemoryRouter>
    </QueryClientProvider>
  );
};

const mockUseAuth = vi.fn();
vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => mockUseAuth(),
}));

const mockIsBotOrPrerender = vi.fn();
vi.mock("@/hooks/useSoftWallTrigger", () => ({
  isBotOrPrerender: () => mockIsBotOrPrerender(),
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

const mockFunds: FundFromDB[] = [
  {
    id: "fund-1",
    slug: "fund-1",
    name: "Alpha Money Market Fund",
    manager: "Alpha Capital",
    annual_yield: 16.5,
    daily_yield: 16.0,
    fund_type: "money_market",
    cma_licensed: true,
    seven_day_yield: 16.2,
    thirty_day_yield: 16.1,
    minimum_investment: 1000,
    management_fee: 1.5,
    withdrawal_time: "Instant",
    description: "",
    website: "",
    fact_sheet_date: null,
    yield_unit: "%",
    is_published: true,
    logo_url: null,
    updated_at: "2026-09-01",
  },
  {
    id: "fund-2",
    slug: "fund-2",
    name: "Beta High Yield Fund",
    manager: "Beta Asset Management",
    annual_yield: 15.5,
    daily_yield: 15.0,
    fund_type: "money_market",
    cma_licensed: true,
    seven_day_yield: 15.2,
    thirty_day_yield: 15.1,
    minimum_investment: 5000,
    management_fee: 2.0,
    withdrawal_time: "24 hours",
    description: "",
    website: "",
    fact_sheet_date: null,
    yield_unit: "%",
    is_published: true,
    logo_url: null,
    updated_at: "2026-09-01",
  },
  {
    id: "fund-3",
    slug: "fund-3",
    name: "Gamma Treasury Fund",
    manager: "Gamma Securities",
    annual_yield: 14.8,
    daily_yield: 14.5,
    fund_type: "money_market",
    cma_licensed: true,
    seven_day_yield: 14.6,
    thirty_day_yield: 14.7,
    minimum_investment: 10000,
    management_fee: 1.2,
    withdrawal_time: "2-3 days",
    description: "",
    website: "",
    fact_sheet_date: null,
    yield_unit: "%",
    is_published: true,
    logo_url: null,
    updated_at: "2026-09-01",
  },
  {
    id: "fund-4",
    slug: "fund-4",
    name: "Delta Income Fund",
    manager: "Delta Custody",
    annual_yield: 13.5,
    daily_yield: 13.2,
    fund_type: "money_market",
    cma_licensed: true,
    seven_day_yield: 13.3,
    thirty_day_yield: 13.4,
    minimum_investment: 2500,
    management_fee: 1.8,
    withdrawal_time: "1-2 days",
    description: "",
    website: "",
    fact_sheet_date: null,
    yield_unit: "%",
    is_published: true,
    logo_url: null,
    updated_at: "2026-09-01",
  },
  {
    id: "fund-5",
    slug: "fund-5",
    name: "Epsilon Liquid Fund",
    manager: "Epsilon Trustees",
    annual_yield: 12.0,
    daily_yield: 11.9,
    fund_type: "money_market",
    cma_licensed: true,
    seven_day_yield: 12.0,
    thirty_day_yield: 12.0,
    minimum_investment: 500,
    management_fee: 2.2,
    withdrawal_time: "Instant",
    description: "",
    website: "",
    fact_sheet_date: null,
    yield_unit: "%",
    is_published: true,
    logo_url: null,
    updated_at: "2026-09-01",
  },
  {
    id: "fund-6",
    slug: "fund-6",
    name: "Zeta Stable Fund",
    manager: "Zeta Capital",
    annual_yield: 11.5,
    daily_yield: 11.2,
    fund_type: "money_market",
    cma_licensed: true,
    seven_day_yield: 11.3,
    thirty_day_yield: 11.4,
    minimum_investment: 1000,
    management_fee: 1.0,
    withdrawal_time: "1 day",
    description: "",
    website: "",
    fact_sheet_date: null,
    yield_unit: "%",
    is_published: true,
    logo_url: null,
    updated_at: "2026-09-01",
  },
];

describe("FundGrid Rule of 3 Gating Live Preview Test", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("gates anonymous human visitors to 3 items and displays InlineDataGate + teaser rows", () => {
    mockUseAuth.mockReturnValue({ user: null, loading: false });
    mockIsBotOrPrerender.mockReturnValue(false);

    renderWithProviders(<FundGrid funds={mockFunds} snapshots={{}} loading={false} />);

    // Visible active funds: exactly top 3
    expect(screen.getAllByText("Alpha Money Market Fund").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Beta High Yield Fund").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Gamma Treasury Fund").length).toBeGreaterThan(0);

    // Funds 4 and 5 appear in blurred teaser rows (aria-hidden), with redacted numeric yields
    const teaserRow4 = screen.getAllByText("Delta Income Fund");
    expect(teaserRow4.length).toBeGreaterThan(0);
    expect(screen.queryByText("13.5%")).not.toBeInTheDocument();
    expect(screen.queryByText("12%")).not.toBeInTheDocument();
    expect(screen.getAllByText("••.••%").length).toBeGreaterThan(0);

    // InlineDataGate is rendered with remaining count badge
    expect(screen.getAllByText("Unlock All 35+ CMA-Regulated Kenyan Funds").length).toBeGreaterThan(0);
    expect(screen.getAllByText(/More Available/i).length).toBeGreaterThan(0);

    // Footer reflects 3 of 6 funds preview
    expect(screen.getByText(/showing 3 of 6 money market funds \(preview\)/i)).toBeInTheDocument();
  });

  it("prevents unauthenticated search or sort manipulation from revealing hidden funds (#4-#6)", () => {
    mockUseAuth.mockReturnValue({ user: null, loading: false });
    mockIsBotOrPrerender.mockReturnValue(false);

    // Attempt to search for hidden fund #6 ("Zeta") or sort ascending
    renderWithProviders(
      <FundGrid funds={mockFunds} snapshots={{}} loading={false} />,
      ["/funds?q=Zeta&sort=annual_yield&dir=asc"]
    );

    // Hidden fund #6 must NOT be revealed
    expect(screen.queryByText("Zeta Stable Fund")).not.toBeInTheDocument();
    expect(screen.queryByText("11.5%")).not.toBeInTheDocument();

    // Gate remains enforced
    expect(screen.getAllByText("Unlock All 35+ CMA-Regulated Kenyan Funds").length).toBeGreaterThan(0);
  });

  it("renders all 6 funds un-gated for logged in users without InlineDataGate", () => {
    mockUseAuth.mockReturnValue({ user: { id: "user-123", email: "user@example.com" }, loading: false });
    mockIsBotOrPrerender.mockReturnValue(false);

    renderWithProviders(<FundGrid funds={mockFunds} snapshots={{}} loading={false} />);

    // Fund 6 is visible
    expect(screen.getAllByText("Zeta Stable Fund").length).toBeGreaterThan(0);

    // InlineDataGate is NOT rendered
    expect(screen.queryByText(/Unlock All/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/More Available/i)).not.toBeInTheDocument();

    // Footer shows full count
    expect(screen.getByText(/showing 6 of 6 money market funds/i)).toBeInTheDocument();
  });

  it("renders all 6 funds un-gated for search engine bots or prerendering", () => {
    mockUseAuth.mockReturnValue({ user: null, loading: false });
    mockIsBotOrPrerender.mockReturnValue(true);

    renderWithProviders(<FundGrid funds={mockFunds} snapshots={{}} loading={false} />);

    // Fund 6 is directly visible for bots to index
    expect(screen.getAllByText("Zeta Stable Fund").length).toBeGreaterThan(0);
    expect(screen.queryByText(/Unlock All/i)).not.toBeInTheDocument();
    expect(screen.getByText(/showing 6 of 6 money market funds/i)).toBeInTheDocument();
  });

  it("does not render InlineDataGate when results are filtered down to 3 or fewer items", () => {
    mockUseAuth.mockReturnValue({ user: null, loading: false });
    mockIsBotOrPrerender.mockReturnValue(false);

    // Only pass 2 funds
    renderWithProviders(<FundGrid funds={mockFunds.slice(0, 2)} snapshots={{}} loading={false} />);

    expect(screen.queryByText(/Unlock All/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/More Available/i)).not.toBeInTheDocument();
    expect(screen.getByText(/showing 2 of 2 money market funds/i)).toBeInTheDocument();
  });
});
