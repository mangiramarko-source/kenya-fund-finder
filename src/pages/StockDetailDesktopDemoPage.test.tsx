import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import StockDetailDesktopDemoPage from "./StockDetailDesktopDemoPage";

const mocks = vi.hoisted(() => ({
  user: null as { id: string } | null,
  favourite: false,
  entries: [] as Array<{ id: string; item_id: string; item_name: string }>,
  toggle: vi.fn(),
  toastMessage: vi.fn(),
  fetchPublicData: vi.fn(),
  history: {} as Record<string, Array<{ snapshot_date: string; price: number }>>,
}));

vi.mock("@/hooks/useAuth", () => ({ useAuth: () => ({ user: mocks.user }) }));
vi.mock("@/hooks/useAssetWatchlist", () => ({
  useAssetWatchlist: () => ({ entries: mocks.entries, isFavourite: () => mocks.favourite, toggle: mocks.toggle }),
}));
vi.mock("@/hooks/use-mobile", () => ({ useIsMobile: () => false }));
vi.mock("@/hooks/useMinimumLoadingDuration", () => ({ useMinimumLoadingDuration: () => false }));
vi.mock("@/hooks/useDocumentTitle", () => ({ useDocumentTitle: vi.fn() }));
vi.mock("@/components/SectionLiveStatus", () => ({ default: () => <div>Market closed</div> }));
vi.mock("@/components/MarketPageLoader", () => ({ default: () => <div>Loading</div> }));
vi.mock("@/lib/stockBranding", () => ({ getStockLogoUrl: () => null }));
vi.mock("@/lib/stockCache", () => ({
  normalizeStock: (stock: unknown) => stock,
  stockCache: { loadStocks: () => null, saveStocks: vi.fn() },
}));
vi.mock("@/lib/stockDetailDemo", () => ({
  calculateDemoReturn: () => null,
  fetchCompleteDemoHistory: async (fetchPage: (offset: number, limit: number) => Promise<unknown>) => {
    await fetchPage(0, 5000);
    return mocks.history;
  },
  filterDemoStocks: (stocks: unknown[]) => stocks,
  findDemoStock: (stocks: unknown[]) => stocks[0] ?? null,
  stockProductionPath: (symbol: string) => `/stocks/${symbol}`,
}));
vi.mock("@/lib/gateway", () => ({
  fetchPublicData: mocks.fetchPublicData,
}));
vi.mock("sonner", () => ({ toast: { message: mocks.toastMessage } }));
vi.mock("recharts", () => ({
  Area: () => null, ComposedChart: ({ children, data }: { children: React.ReactNode; data: unknown[] }) => <svg data-testid="trend-chart" data-point-count={data.length}>{children}</svg>,
  Line: () => null, ResponsiveContainer: ({ children }: { children: React.ReactNode }) => <>{children}</>, YAxis: () => null,
}));

const stockResponse = {
  data: [{
    id: "scom", symbol: "SCOM", name: "Safaricom PLC", sector: "Telecommunication",
    price: 25.5, previous_price: 25, day_change: 0.5, day_change_percent: 2,
    volume: 120000, market_cap: 1000000000, pe_ratio: null, dividend_yield: null,
    updated_at: "2026-09-02T00:00:00.000Z",
  }],
};

const renderPage = () => render(
  <MemoryRouter initialEntries={["/stocks"]}>
    <Routes><Route path="/stocks" element={<StockDetailDesktopDemoPage production />} /></Routes>
  </MemoryRouter>,
);

describe("StockDetailDesktopDemoPage", () => {
  beforeEach(() => {
    mocks.user = null;
    mocks.favourite = false;
    mocks.entries = [];
    mocks.toggle.mockReset();
    mocks.toastMessage.mockReset();
    mocks.history = {};
    mocks.fetchPublicData.mockReset();
    mocks.fetchPublicData.mockResolvedValue(stockResponse);
  });

  it("uses a compact desktop table with a watchlist column instead of 52W Range", async () => {
    const { container } = renderPage();

    await screen.findByText("SCOM");
    expect(screen.queryByText("52W Range")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Add SCOM to watchlist" })).toBeInTheDocument();
    expect(container.querySelector("table")).not.toHaveClass("min-w-[1380px]");
    expect(screen.getByRole("columnheader", { name: "Company" })).toHaveClass("w-[18%]");
    expect(screen.getByRole("columnheader", { name: "Last Price" })).toHaveClass("w-[12%]");
  });

  it("prompts guests to sign in from the star control", async () => {
    renderPage();

    fireEvent.click(await screen.findByRole("button", { name: "Add SCOM to watchlist" }));
    expect(mocks.toastMessage).toHaveBeenCalledWith("Sign in to save items to your watchlist.", expect.objectContaining({ action: expect.any(Object) }));
  });

  it("loads five years of monthly history and renders at most 60 trend points", async () => {
    mocks.history = {
      scom: Array.from({ length: 72 }, (_, index) => ({
        snapshot_date: `2020-${String((index % 12) + 1).padStart(2, "0")}-01`,
        price: 20 + index,
      })),
    };
    renderPage();

    await screen.findByText("SCOM");
    await waitFor(() => expect(mocks.fetchPublicData).toHaveBeenCalledWith(
      "stock-history-monthly-bulk",
      expect.objectContaining({ days: 1825 }),
    ));
    expect(screen.getByTestId("trend-chart")).toHaveAttribute("data-point-count", "60");
  });

  it("toggles a signed-in user's existing Watchlist", async () => {
    mocks.user = { id: "user-1" };
    renderPage();

    fireEvent.click(await screen.findByRole("button", { name: "Add SCOM to watchlist" }));
    await waitFor(() => expect(mocks.toggle).toHaveBeenCalledWith("scom", "SCOM - Safaricom PLC"));
  });

  it("shows a signed-in user's saved stocks above the desktop filters", async () => {
    mocks.user = { id: "user-1" };
    mocks.entries = [{ id: "watch-1", item_id: "scom", item_name: "SCOM - Safaricom PLC" }];
    renderPage();

    expect(await screen.findByText("Your Watchlist")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /SCOM/ })).toHaveAttribute("href", "/stocks/SCOM");
  });
});
