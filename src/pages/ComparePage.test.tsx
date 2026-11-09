import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import ComparePage from "./ComparePage";

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: false } },
});

const renderWithProviders = (initialEntries = ["/compare?tab=stocks"]) => {
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={initialEntries}>
        <ComparePage />
      </MemoryRouter>
    </QueryClientProvider>
  );
};

// Mock API calls
vi.mock("@/lib/api", () => ({
  fetchFunds: vi.fn().mockResolvedValue([
    {
      id: "fund-1",
      name: "Kuza Asset MMF",
      manager: "Kuza Asset Management",
      annual_yield: 14.25,
      effective_yield: 14.25,
      fund_type: "money_market",
      slug: "kuza-mmf",
      minimum_investment: 1000,
      management_fee: 1.5,
    },
    {
      id: "fund-2",
      name: "Etica Money Market Fund",
      manager: "Etica Capital",
      annual_yield: 14.10,
      effective_yield: 14.10,
      fund_type: "money_market",
      slug: "etica-mmf",
      minimum_investment: 500,
      management_fee: 2.0,
    },
  ]),
  fetchLatestSnapshots: vi.fn().mockResolvedValue([]),
}));

vi.mock("@/lib/gateway", () => ({
  fetchPublicData: vi.fn().mockImplementation((table: string) => {
    if (table === "stocks") {
      return Promise.resolve([
        {
          id: "s1",
          symbol: "SCOM",
          name: "Safaricom PLC",
          price: 36.5,
          day_change_percent: 1.2,
          pe_ratio: 14.5,
          dividend_yield: 5.2,
          market_cap: 1460000000000,
          sector: "Telecommunication",
        },
        {
          id: "s2",
          symbol: "EQTY",
          name: "Equity Group Holdings",
          price: 44.0,
          day_change_percent: -0.5,
          pe_ratio: 4.8,
          dividend_yield: 8.5,
          market_cap: 166000000000,
          sector: "Banking",
        },
      ]);
    }
    if (table === "cbk_exchange_rates") {
      return Promise.resolve([
        { id: "r1", currency_code: "USD", currency_name: "US Dollar", rate: 129.5 },
        { id: "r2", currency_code: "EUR", currency_name: "Euro", rate: 138.2 },
      ]);
    }
    return Promise.resolve([]);
  }),
}));

vi.mock("@/lib/savingsApi", () => ({
  fetchBankFixedDeposits: vi.fn().mockResolvedValue([
    {
      id: "fd-1",
      bankName: "Equity Bank",
      bankCode: "EQTY",
      bankTier: 1,
      currency: "KES",
      tenorMonths: 12,
      grossYieldPct: 12.0,
      netYieldPct: 10.2,
      minDeposit: 50000,
    },
  ]),
  fetchSaccoRecords: vi.fn().mockResolvedValue([
    {
      id: "sac-1",
      name: "Stima SACCO",
      code: "STIMA",
      interestOnDepositsPct: 11.5,
      netInterestPct: 9.77,
      minMonthlyContribution: 1000,
      membershipCategory: "Open to All",
    },
  ]),
}));

describe("ComparePage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders the asset comparison hub with category tabs and default stock duel", async () => {
    renderWithProviders(["/compare?tab=stocks"]);

    // Header exists
    expect(screen.getByText("Asset Comparison Hub")).toBeInTheDocument();

    // Category tabs exist
    expect(screen.getByRole("button", { name: /NSE Stocks/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Funds & MMFs/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Forex Rates/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Savings & Fixed Deposits/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Cross-Asset Duel/i })).toBeInTheDocument();

    // Popular duels preset bar
    await waitFor(() => {
      expect(screen.getByText(/Safaricom vs Equity Bank/i)).toBeInTheDocument();
    });

    // Detailed metric breakdown
    expect(screen.getByText("Detailed Metric Breakdown")).toBeInTheDocument();
    expect(screen.getByText("P/E Valuation Multiple")).toBeInTheDocument();
    expect(screen.getByText("Annual Dividend Yield")).toBeInTheDocument();

    // Projected Return Comparison
    expect(screen.getByText("1-Year Projected Return Comparison")).toBeInTheDocument();
  });

  it("switches to Funds & MMFs tab and shows fund comparison workbench", async () => {
    renderWithProviders(["/compare?tab=funds"]);

    await waitFor(() => {
      expect(screen.getByText(/Effective Annual Yield \(EAR\)/i)).toBeInTheDocument();
    });

    expect(screen.getByText(/Annual Management Fee/i)).toBeInTheDocument();
    expect(screen.getByText(/Explore Regulated Unit Trust Funds & MMFs/i)).toBeInTheDocument();
  });
});
