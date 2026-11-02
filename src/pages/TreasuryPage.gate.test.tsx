import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import TreasuryPage from "./TreasuryPage";
import type { TreasuryBond, TBillAuction } from "@/hooks/useTreasuryData";

class MockResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}
global.ResizeObserver = MockResizeObserver as unknown as typeof ResizeObserver;

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: false } },
});

const mockUseAuth = vi.fn();
vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => mockUseAuth(),
}));

const mockIsBotOrPrerender = vi.fn();
vi.mock("@/hooks/useSoftWallTrigger", () => ({
  isBotOrPrerender: () => mockIsBotOrPrerender(),
}));

const mockTBills: TBillAuction[] = [
  {
    id: "tb-1",
    type: "91-Day",
    days: 91,
    approx: "3 Months",
    auctionDate: "2026-09-01",
    valueDate: "2026-09-05",
    amountOffered: "KES 4.0B",
    bidsReceived: "KES 5.2B",
    performanceRate: 130,
    acceptedAmount: "KES 4.0B",
    averageYield: 15.8,
    previousYield: 15.9,
    minInvestment: "KES 100,000",
  },
  {
    id: "tb-2",
    type: "182-Day",
    days: 182,
    approx: "6 Months",
    auctionDate: "2026-09-01",
    valueDate: "2026-09-05",
    amountOffered: "KES 10.0B",
    bidsReceived: "KES 12.5B",
    performanceRate: 125,
    acceptedAmount: "KES 10.0B",
    averageYield: 16.2,
    previousYield: 16.3,
    minInvestment: "KES 100,000",
  },
  {
    id: "tb-3",
    type: "364-Day",
    days: 364,
    approx: "1 Year",
    auctionDate: "2026-09-01",
    valueDate: "2026-09-05",
    amountOffered: "KES 10.0B",
    bidsReceived: "KES 11.0B",
    performanceRate: 110,
    acceptedAmount: "KES 10.0B",
    averageYield: 16.5,
    previousYield: 16.7,
    minInvestment: "KES 100,000",
  },
];

const mockBonds: TreasuryBond[] = Array.from({ length: 6 }, (_, i) => ({
  id: `bond-${i + 1}`,
  issueNo: `FXD1/2026/0${i + 1}`,
  isin: `KE500000${i + 1}`,
  couponRate: 16.0 - i * 0.5,
  valueDate: "2026-01-01",
  maturityDate: `203${i}-01-01`,
  tenorYears: 5 + i,
  status: "Active",
  name: `Kenya Treasury Bond ${i + 1}`,
  amountIssued: "KES 30B",
  explanation: "Standard fixed coupon bond",
}));

vi.mock("@/hooks/useTreasuryData", () => ({
  useTreasuryData: () => ({
    data: {
      tbills: mockTBills,
      bonds: mockBonds,
      rateHistory: {},
      lastVerifiedAt: "2026-09-01",
    },
    isLoading: false,
    isError: false,
  }),
}));

vi.mock("@/hooks/useMinimumLoadingDuration", () => ({
  useMinimumLoadingDuration: () => false,
}));

describe("TreasuryPage Rule of 3 Gating", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("gates anonymous visitors on Treasury Bills and Bonds with InlineDataGate", async () => {
    mockUseAuth.mockReturnValue({ user: null, loading: false });
    mockIsBotOrPrerender.mockReturnValue(false);

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={["/treasury"]}>
          <TreasuryPage />
        </MemoryRouter>
      </QueryClientProvider>
    );

    // T-Bills gate is present on default tab
    expect(
      screen.getByRole("heading", { name: /Unlock Weekly CBK Auction Bids & Full Rate History/i })
    ).toBeDefined();

    // Switch to Treasury Bonds tab
    fireEvent.click(screen.getByRole("button", { name: /Treasury Bonds/i }));

    // Bonds: top 3 are rendered in DOM
    expect(screen.getAllByText("FXD1/2026/01").length).toBeGreaterThan(0);
    expect(screen.getAllByText("FXD1/2026/02").length).toBeGreaterThan(0);
    expect(screen.getAllByText("FXD1/2026/03").length).toBeGreaterThan(0);

    // Teasers for 4 and 5 exist
    expect(screen.getAllByText("FXD1/2026/04").length).toBeGreaterThan(0);
    expect(screen.getAllByText("FXD1/2026/05").length).toBeGreaterThan(0);

    // Bond 6 is sliced out
    expect(screen.queryByText("FXD1/2026/06")).toBeNull();

    // Bonds gate is present
    expect(
      screen.getAllByRole("heading", { name: /Unlock All Kenyan Treasury Bonds & IFBs/i }).length
    ).toBeGreaterThan(0);
  });

  it("shows all bonds without gate for authenticated users", () => {
    mockUseAuth.mockReturnValue({
      user: { id: "user-123", email: "investor@example.com" },
      loading: false,
    });
    mockIsBotOrPrerender.mockReturnValue(false);

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={["/treasury"]}>
          <TreasuryPage />
        </MemoryRouter>
      </QueryClientProvider>
    );

    // Switch to Treasury Bonds tab
    fireEvent.click(screen.getByRole("button", { name: /Treasury Bonds/i }));

    // All bonds visible
    expect(screen.getAllByText("FXD1/2026/06").length).toBeGreaterThan(0);

    // No gates rendered
    expect(
      screen.queryByRole("heading", { name: /Unlock Weekly CBK Auction Bids & Full Rate History/i })
    ).toBeNull();
    expect(
      screen.queryByRole("heading", { name: /Unlock All Kenyan Treasury Bonds & IFBs/i })
    ).toBeNull();
  });
});
