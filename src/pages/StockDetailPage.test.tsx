import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import StockDetailPage, { getOfficialWebsiteLabel, StockAboutCard } from "./StockDetailPage";

const mocks = vi.hoisted(() => ({
  fetchPublicData: vi.fn(),
}));

vi.mock("@/hooks/useAuth", () => ({ useAuth: () => ({ user: null }) }));
vi.mock("@/hooks/use-mobile", () => ({ useIsMobile: () => false }));
vi.mock("@/hooks/useMinimumLoadingDuration", () => ({ useMinimumLoadingDuration: () => false }));
vi.mock("@/hooks/useAssetWatchlist", () => ({
  useAssetWatchlist: () => ({ isFavourite: () => false, toggle: vi.fn() }),
}));
vi.mock("@/hooks/useToast", () => ({ useToast: () => ({ toast: vi.fn() }) }));
vi.mock("@/hooks/use-toast", () => ({ useToast: () => ({ toast: vi.fn() }) }));
vi.mock("@/hooks/useSoftWallTrigger", () => ({ isBotOrPrerender: () => true }));
vi.mock("@/hooks/useFeedInteractions", () => ({
  useFeedInteractions: () => ({
    interactions: new Map(),
    getPostInteraction: () => undefined,
    toggleLike: vi.fn(),
    addComment: vi.fn(),
  }),
}));
vi.mock("@/components/MarketPageLoader", () => ({ default: () => <div>Loading</div> }));
vi.mock("@/components/ResearchLinks", () => ({ default: () => null }));
vi.mock("@/components/alerts/PriceAlertComponents", () => ({
  CreateAlertDialog: ({ unit }: { unit?: string }) => <div data-testid="alert-unit">{unit}</div>,
}));
vi.mock("@/components/stocks/StockDisclosuresTab", () => ({ StockDisclosuresTab: () => null }));
vi.mock("@/components/news/ContextualStockNewsCard", () => ({ ContextualStockNewsCard: () => null }));
vi.mock("@/components/auth/InlineDataGate", () => ({ default: ({ children }: { children: React.ReactNode }) => <>{children}</> }));
vi.mock("@/components/calculator/FloatingPageCalculator", () => ({ default: () => null }));
vi.mock("@/components/calculator/StockCalculator", () => ({ default: () => null }));
vi.mock("@/components/feed/FeedItemDetailModal", () => ({ FeedItemDetailModal: () => null }));
vi.mock("@/components/kora/KoraIllustration", () => ({ default: () => null }));
vi.mock("@/lib/stockBranding", () => ({ getStockLogoUrl: () => null }));
vi.mock("@/lib/gateway", () => ({
  fetchPublicData: mocks.fetchPublicData,
}));
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: () => ({
      select: () => ({
        eq: () => ({
          order: () => ({
            limit: async () => ({ data: [], error: null }),
          }),
        }),
        or: () => ({
          eq: () => ({
            order: () => ({
              range: async () => ({ data: [], error: null }),
            }),
          }),
        }),
      }),
    }),
  },
}));
vi.mock("recharts", () => ({
  XAxis: () => null,
  YAxis: () => null,
  Tooltip: () => null,
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  CartesianGrid: () => null,
  AreaChart: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  Area: () => null,
  BarChart: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  Bar: () => null,
}));

describe("StockAboutCard", () => {
  it("renders an original company profile with an official external link", () => {
    render(
      <StockAboutCard
        companyName="Safaricom PLC"
        symbol="SCOM"
        sector="Telecommunications"
        summary="Safaricom provides mobile connectivity, digital services and M-PESA financial products in Kenya and the region."
        officialWebsite="https://www.safaricom.co.ke"
        headquarters="Nairobi, Kenya"
        telephone="+254 703 083 000"
      />,
    );

    expect(screen.getByRole("heading", { name: "About Safaricom PLC" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Company details" })).toBeInTheDocument();
    expect(screen.getByText("Company name")).toBeInTheDocument();
    expect(screen.getByText("SCOM")).toBeInTheDocument();
    expect(screen.getByText("Telecommunications")).toBeInTheDocument();
    expect(screen.getByText("Nairobi, Kenya")).toBeInTheDocument();
    const link = screen.getByRole("link", { name: /safaricom\.co\.ke/ });
    expect(link).toHaveAttribute("href", "https://www.safaricom.co.ke");
    expect(link).toHaveAttribute("target", "_blank");
    expect(link).toHaveAttribute("rel", "noopener noreferrer");
    expect(screen.getByRole("link", { name: "+254 703 083 000" })).toHaveAttribute("href", "tel:+254703083000");
    expect(screen.queryByText(/kenyanstocks/i)).not.toBeInTheDocument();
  });

  it("hides the card when an approved profile is unavailable", () => {
    const { container } = render(
      <StockAboutCard companyName="Unverified PLC" symbol="UNV" sector="Other" summary="A reviewed company description that is not accompanied by a verified official website link." />,
    );

    expect(container).toBeEmptyDOMElement();
  });

  it("rejects unsafe and malformed website addresses", () => {
    expect(getOfficialWebsiteLabel("http://example.com")).toBeNull();
    expect(getOfficialWebsiteLabel("not-a-url")).toBeNull();
    expect(getOfficialWebsiteLabel("https://www.example.com/investors")).toBe("example.com");
  });

  it("leaves unverified contact rows out of an otherwise approved profile", () => {
    render(
      <StockAboutCard
        companyName="Safaricom PLC"
        symbol="SCOM"
        sector="Telecommunications"
        summary="Safaricom provides mobile connectivity, digital services and M-PESA financial products in Kenya and the region."
        officialWebsite="https://www.safaricom.co.ke"
      />,
    );

    expect(screen.queryByText("Head office")).not.toBeInTheDocument();
    expect(screen.queryByText("Phone")).not.toBeInTheDocument();
  });
});

describe("StockDetailPage localization", () => {
  beforeEach(() => {
    localStorage.clear();
    document.head.querySelectorAll('script[type="application/ld+json"]').forEach((el) => el.remove());
    mocks.fetchPublicData.mockReset();
    mocks.fetchPublicData.mockImplementation(async (resource: string) => {
      if (resource === "stocks") {
        return {
          data: [{
            id: "use-airtel",
            symbol: "USE-AIRTEL_UGANDA",
            exchange: "USE",
            exchange_ticker: "AIRTEL_UGANDA",
            currency: "UGX",
            country_code: "UG",
            name: "Airtel Uganda Limited",
            sector: "Telecommunications",
            price: 180,
            previous_price: 175,
            day_change: 5,
            day_change_percent: 2.86,
            volume: 6900,
            market_cap: 7_200_000_000_000,
            pe_ratio: 12.5,
            dividend_yield: 5.4,
            year_high: 210,
            year_low: 140,
            logo_url: null,
            updated_at: "2026-11-16T10:00:00.000Z",
          }],
          count: 1,
          limit: 1,
          offset: 0,
        };
      }
      if (resource === "stock-financials") {
        return {
          data: [{
            id: "fp-1",
            period_end: "2025-12-31",
            period_type: "annual",
            period_label: "FY 2025",
            revenue: 2_500_000_000_000,
            operating_expense: 1_200_000_000_000,
            net_income: 350_000_000_000,
            eps: 14.25,
            net_margin: 14.0,
            operating_cash_flow: 500_000_000_000,
            total_assets: 4_000_000_000_000,
            total_liabilities: 2_100_000_000_000,
            total_equity: 1_900_000_000_000,
          }],
          count: 1,
          limit: 20,
          offset: 0,
        };
      }
      if (resource === "stock-reference-metrics") {
        return {
          data: [{
            as_of_date: "2025-12-31",
            isin: "UG0000001800",
            shares_issued: 40_000_000_000,
            book_value_per_share: 45.5,
            roe: 24.1,
            net_margin: 14.0,
          }],
          count: 1,
          limit: 1,
          offset: 0,
        };
      }
      return { data: [], count: 0, limit: 100, offset: 0 };
    });
  });

  it("renders USE/UGX stock financials, mini stats, and JSON-LD without KSh or Nairobi Securities Exchange leaks", async () => {
    const { container } = render(
      <MemoryRouter initialEntries={["/stocks/USE-AIRTEL_UGANDA"]}>
        <Routes>
          <Route path="/stocks/:symbol" element={<StockDetailPage />} />
        </Routes>
      </MemoryRouter>,
    );

    await screen.findByRole("heading", { name: "Airtel Uganda Limited" });
    await screen.findByText("USh 14.25");
    expect(screen.getByText("USh 45.50")).toBeInTheDocument();
    expect(screen.getByText("USh 2500.00B")).toBeInTheDocument();
    screen.getAllByTestId("alert-unit").forEach((el) => {
      expect(el).toHaveTextContent("USh");
    });

    // Verify rendered output never leaks Kenyan currency or exchange copy
    expect(container.textContent).not.toContain("KSh");
    expect(container.textContent).not.toContain("Nairobi Securities Exchange");

    // Verify Financials tab tables render UGX header and USh values (not KES / KSh)
    const financialsTab = screen.getByRole("tab", { name: "Financials" });
    fireEvent.mouseDown(financialsTab);
    fireEvent.click(financialsTab);
    await waitFor(() => {
      expect(screen.getByText("UGX · annual results")).toBeInTheDocument();
    });
    expect(container.textContent).not.toContain("KSh");

    // Verify all JSON-LD tags use USE / UGX and never leak KSh or Nairobi Securities Exchange
    const jsonLdRaw = Array.from(document.head.querySelectorAll('script[type="application/ld+json"]'))
      .map((el) => el.textContent || "")
      .join("\n");
    expect(jsonLdRaw).toContain("Uganda Securities Exchange (USE)");
    expect(jsonLdRaw).toContain("USE:AIRTEL_UGANDA");
    expect(jsonLdRaw).toContain("USh 180");
    expect(jsonLdRaw).not.toContain("KSh");
    expect(jsonLdRaw).not.toContain("Nairobi Securities Exchange");
  });
});
