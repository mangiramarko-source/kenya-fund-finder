import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi, beforeEach } from "vitest";
import MarketDashboardPage from "./MarketDashboardPage";

const mockUseAuth = vi.fn();
vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => mockUseAuth(),
}));

const mockIsBotOrPrerender = vi.fn();
vi.mock("@/hooks/useSoftWallTrigger", () => ({
  isBotOrPrerender: () => mockIsBotOrPrerender(),
}));

const mockRates = [
  { id: "1", currency_code: "USD", currency_name: "US Dollar", rate: 129.5, previous_rate: 129.0, updated_at: "2026-09-01" },
  { id: "2", currency_code: "GBP", currency_name: "British Pound", rate: 168.2, previous_rate: 167.5, updated_at: "2026-09-01" },
  { id: "3", currency_code: "EUR", currency_name: "Euro", rate: 140.1, previous_rate: 139.8, updated_at: "2026-09-01" },
  { id: "4", currency_code: "KES", currency_name: "Tanzania Shilling", rate: 19.8, previous_rate: 19.5, updated_at: "2026-09-01" },
  { id: "5", currency_code: "UGX", currency_name: "Uganda Shilling", rate: 28.5, previous_rate: 28.2, updated_at: "2026-09-01" },
  { id: "6", currency_code: "ZAR", currency_name: "South African Rand", rate: 7.2, previous_rate: 7.1, updated_at: "2026-09-01" },
];

vi.mock("@/components/home/MarketTicker", () => ({
  useMarketData: () => ({
    rates: mockRates,
    commodities: [],
    stocks: [],
    loading: false,
  }),
}));

vi.mock("@/hooks/useLiveStatus", () => ({
  useLiveStatus: () => ({
    lastUpdateDate: "2026-09-01",
    isLive: false,
    showDate: true,
  }),
}));

vi.mock("@/components/calculator/MiniCurrencyConverter", () => ({
  default: () => <div data-testid="mini-converter">Converter</div>,
}));

describe("MarketDashboardPage Rule of 3 Gating", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("gates anonymous visitors to 3 FX rates, renders teasers and InlineDataGate", () => {
    mockUseAuth.mockReturnValue({ user: null, loading: false });
    mockIsBotOrPrerender.mockReturnValue(false);

    render(
      <MemoryRouter>
        <MarketDashboardPage />
      </MemoryRouter>
    );

    // First 3 currencies visible
    expect(screen.getByText("USD")).toBeDefined();
    expect(screen.getByText("GBP")).toBeDefined();
    expect(screen.getByText("EUR")).toBeDefined();

    // Teasers for 4 and 5 exist
    expect(screen.getByText("KES")).toBeDefined();
    expect(screen.getByText("UGX")).toBeDefined();

    // Item 6 should NOT be rendered
    expect(screen.queryByText("ZAR")).toBeNull();

    // Gate should be displayed
    expect(
      screen.getByRole("heading", { name: /Unlock All Central Bank of Kenya FX Rates/i })
    ).toBeDefined();

    // Summary footer shows preview text
    expect(screen.getByText(/Showing 3 of 6 fx rates \(preview\)/i)).toBeDefined();
  });

  it("shows all rates without gate for logged in users", () => {
    mockUseAuth.mockReturnValue({
      user: { id: "user-123", email: "investor@example.com" },
      loading: false,
    });
    mockIsBotOrPrerender.mockReturnValue(false);

    render(
      <MemoryRouter>
        <MarketDashboardPage />
      </MemoryRouter>
    );

    // All rates visible
    expect(screen.getByText("ZAR")).toBeDefined();

    // No gate
    expect(
      screen.queryByRole("heading", { name: /Unlock All Central Bank of Kenya FX Rates/i })
    ).toBeNull();

    // Summary footer shows full count
    expect(screen.getByText(/Showing 6 fx rates/i)).toBeDefined();
  });
});
