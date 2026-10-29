import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import MobileWatchlistView from "./MobileWatchlistView";

const mocks = vi.hoisted(() => ({
  add: vi.fn(),
  remove: vi.fn(),
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: () => ({
      select: () => ({
        order: () => ({
          limit: () => Promise.resolve({ data: [] }),
        }),
      }),
    }),
  },
}));
vi.mock("@/hooks/useAuth", () => ({ useAuth: () => ({ user: { id: "user-1" } }) }));
vi.mock("@/hooks/useUnifiedWatchlist", () => ({
  useUnifiedWatchlist: () => ({
    items: [
      { id: "watch-scom", user_id: "user-1", item_type: "stock", item_id: "scom", item_name: "Safaricom PLC", sort_order: 0 },
    ],
    loading: false,
    hasLocalState: false,
    add: mocks.add,
    remove: mocks.remove,
  }),
}));
vi.mock("@/hooks/usePriceAlerts", () => ({
  usePriceAlerts: () => ({ alerts: [], deleteAlert: vi.fn(), toggleAlert: vi.fn() }),
}));
vi.mock("@/components/home/MarketTicker", () => ({
  useMarketData: () => ({
    loading: false,
    stocks: [
      { id: "scom", symbol: "SCOM", name: "Safaricom PLC", price: 25.5, day_change_percent: 2 },
      { id: "kcb", symbol: "KCB", name: "KCB Group", price: 40, day_change_percent: -1 },
    ],
    rates: [],
    commodities: [],
  }),
}));
vi.mock("@/lib/api", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/api")>()),
  fetchFunds: () => Promise.resolve([]),
}));
vi.mock("@/components/SectionLiveStatus", () => ({ default: () => null }));

const renderView = () => render(
  <MemoryRouter initialEntries={["/portfolio?tab=watchlist"]}>
    <MobileWatchlistView />
  </MemoryRouter>,
);

describe("MobileWatchlistView", () => {
  beforeEach(() => {
    mocks.add.mockReset().mockResolvedValue({ ok: true });
    mocks.remove.mockReset().mockResolvedValue({ ok: true });
  });

  it("adds an item from the add sheet", async () => {
    renderView();

    fireEvent.click(await screen.findByRole("button", { name: "Add to watchlist" }));
    const sheet = await screen.findByRole("dialog");
    fireEvent.click(within(sheet).getByRole("button", { name: "Stocks" }));
    fireEvent.click(within(sheet).getByRole("button", { name: /KCB Group/ }));

    await waitFor(() => expect(mocks.add).toHaveBeenCalledWith("stock", "kcb", "KCB Group"));
  });

  it("removes a saved item", async () => {
    renderView();

    const [removeButton] = await screen.findAllByRole("button", { name: "Remove from watchlist" });
    fireEvent.click(removeButton);

    await waitFor(() => expect(mocks.remove).toHaveBeenCalledWith("watch-scom"));
  });
});
