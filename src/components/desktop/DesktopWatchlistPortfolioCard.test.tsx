import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";
import { DesktopWatchlistPortfolioCard } from "./DesktopWatchlistPortfolioCard";

vi.mock("@/hooks/usePortfolio", () => ({
  usePortfolio: () => ({
    items: [],
    totalValue: 0,
    totalPnLPercent: 0,
    isLoading: false,
  }),
  getCurrentValue: (item: any) => item.units * (item.current_price || 10),
  getPnLPercent: () => 5.2,
}));

vi.mock("@/hooks/usePortfolioChanges", () => ({
  usePortfolioChanges: () => ({ changes: [] }),
}));

describe("DesktopWatchlistPortfolioCard", () => {
  it("renders empty watchlist state with benefit educational card and 3 quick-add examples", () => {
    const handleToggleAsset = vi.fn();

    render(
      <MemoryRouter>
        <DesktopWatchlistPortfolioCard
          watchlist={[]}
          stocks={[
            {
              id: "scom-1",
              symbol: "SCOM",
              name: "Safaricom PLC",
              price: 36.2,
              day_change_percent: -2.92,
              day_change: -1,
              volume: 1000,
              market_cap: 1000000,
              pe_ratio: 12,
              previous_price: 37.2,
              logo_url: null,
            },
          ]}
          funds={[]}
          rates={[]}
          commodities={[]}
          onToggleAsset={handleToggleAsset}
        />
      </MemoryRouter>
    );

    // Tab buttons exist
    expect(screen.getByText("Watchlist")).toBeInTheDocument();
    expect(screen.getByText("Portfolio")).toBeInTheDocument();

    // Benefit explainer exists
    expect(screen.getByText("Why Build a Watchlist?")).toBeInTheDocument();
    expect(screen.getByText(/Live Tracking:/)).toBeInTheDocument();
    expect(screen.getByText(/Price Alerts:/)).toBeInTheDocument();
    expect(screen.getByText(/Tailored Feed:/)).toBeInTheDocument();

    // 3 Quick Add examples exist
    expect(screen.getByText("Quick Add Examples")).toBeInTheDocument();
    expect(screen.getByText("SCOM")).toBeInTheDocument();
    expect(screen.getByText("USD/KES")).toBeInTheDocument();

    // Can click add on SCOM
    const addButtons = screen.getAllByRole("button", { name: /Add/i });
    expect(addButtons.length).toBeGreaterThan(0);
    fireEvent.click(addButtons[0]);
    expect(handleToggleAsset).toHaveBeenCalled();
  });

  it("renders populated watchlist items with symbols and prices", () => {
    render(
      <MemoryRouter>
        <DesktopWatchlistPortfolioCard
          watchlist={[
            {
              id: "w-1",
              item_type: "stock",
              item_id: "scom-1",
              item_name: "Safaricom PLC",
            },
          ]}
          stocks={[
            {
              id: "scom-1",
              symbol: "SCOM",
              name: "Safaricom PLC",
              price: 36.2,
              day_change_percent: 2.5,
              day_change: 0.8,
              volume: 1000,
              market_cap: 1000000,
              pe_ratio: 12,
              previous_price: 35.4,
              logo_url: null,
            },
          ]}
        />
      </MemoryRouter>
    );

    expect(screen.getByText("SCOM")).toBeInTheDocument();
    expect(screen.getByText("KES 36.20")).toBeInTheDocument();
    expect(screen.getByText("+2.50%")).toBeInTheDocument();
    expect(screen.getByText(/View All/)).toBeInTheDocument();
  });

  it("switches to portfolio tab when clicked", () => {
    render(
      <MemoryRouter>
        <DesktopWatchlistPortfolioCard watchlist={[]} />
      </MemoryRouter>
    );

    const portfolioTab = screen.getByRole("button", { name: /Portfolio/i });
    fireEvent.click(portfolioTab);

    expect(screen.getByText("Track Your Investments")).toBeInTheDocument();
    expect(screen.getByText("Create My Portfolio")).toBeInTheDocument();
  });
});
