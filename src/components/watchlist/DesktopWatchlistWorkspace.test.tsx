import { fireEvent, render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import DesktopWatchlistWorkspace from "./DesktopWatchlistWorkspace";

const mocks = vi.hoisted(() => ({
  items: [] as Array<{ id: string; user_id: string; item_type: "stock" | "fund"; item_id: string; item_name: string; sort_order: number }>,
  fetchFunds: vi.fn(),
}));

vi.mock("@/hooks/useAuth", () => ({ useAuth: () => ({ user: null }) }));
vi.mock("@/hooks/useUnifiedWatchlist", () => ({
  useUnifiedWatchlist: () => ({
    items: mocks.items,
    loading: false,
    add: vi.fn(),
    remove: vi.fn(),
    reorder: vi.fn(),
  }),
}));
vi.mock("@/hooks/usePriceAlerts", () => ({
  usePriceAlerts: () => ({ alerts: [], loading: false, deleteAlert: vi.fn(), toggleAlert: vi.fn() }),
}));
vi.mock("@/components/home/MarketTicker", () => ({
  useMarketData: () => ({
    loading: false,
    stocks: [{ id: "scom", symbol: "SCOM", name: "Safaricom PLC", price: 25.5, day_change_percent: 2 }],
    rates: [],
    commodities: [],
  }),
}));
vi.mock("@/lib/api", () => ({ fetchFunds: mocks.fetchFunds }));
vi.mock("@/components/SectionLiveStatus", () => ({ default: () => <div>Market closed</div> }));

const renderWorkspace = () => render(
  <MemoryRouter initialEntries={["/watchlist"]}>
    <DesktopWatchlistWorkspace active="watchlist" />
  </MemoryRouter>,
);

describe("DesktopWatchlistWorkspace", () => {
  beforeEach(() => {
    mocks.items = [
      { id: "watch-stock", user_id: "user-1", item_type: "stock", item_id: "scom", item_name: "SCOM - Safaricom PLC", sort_order: 0 },
      { id: "watch-fund", user_id: "user-1", item_type: "fund", item_id: "fund-1", item_name: "Alpha Fund", sort_order: 1 },
    ];
    mocks.fetchFunds.mockReset();
    mocks.fetchFunds.mockResolvedValue([
      { id: "fund-1", name: "Alpha Fund", manager: "Alpha", annual_yield: 12.5, slug: "alpha-fund" },
    ]);
  });

  it("places asset filters inside the Saved assets card and filters rows", async () => {
    renderWorkspace();

    expect(await screen.findByText("SCOM")).toBeInTheDocument();
    const workspaceNav = screen.getByRole("navigation", { name: "Watchlist workspace" });
    expect(within(workspaceNav).queryByRole("button", { name: "All assets" })).not.toBeInTheDocument();
    expect(within(workspaceNav).getByRole("link", { name: /Alerts/ })).toHaveAttribute("href", "/alerts");

    const typeNav = screen.getByRole("navigation", { name: "Saved asset type" });
    const allAssets = within(typeNav).getByRole("button", { name: "All assets" });
    expect(allAssets).toHaveClass("text-emerald-500");
    expect(within(typeNav).getByRole("button", { name: "Stocks" })).toBeInTheDocument();
    expect(within(typeNav).getByRole("button", { name: "Funds" })).toBeInTheDocument();

    fireEvent.click(within(typeNav).getByRole("button", { name: "Stocks" }));
    expect(screen.getByText("SCOM")).toBeInTheDocument();
    expect(screen.queryByText("Alpha Fund")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /Reorder/ }));
    expect(screen.getByRole("button", { name: /Done/ })).toBeInTheDocument();
    expect(screen.getByTitle("Move down")).toBeInTheDocument();

    expect(screen.getByRole("button", { name: /Add assets/ })).toBeEnabled();
  });

  it("keeps the table tabs available when a search has no matches", async () => {
    renderWorkspace();

    await screen.findByText("SCOM");
    fireEvent.change(screen.getByPlaceholderText("Search saved assets..."), { target: { value: "missing" } });

    expect(screen.getByRole("navigation", { name: "Saved asset type" })).toBeInTheDocument();
    expect(screen.getByText("No matching saved assets")).toBeInTheDocument();
  });
});
