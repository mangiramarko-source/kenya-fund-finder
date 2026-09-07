import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import AddInvestmentModal from "./AddInvestmentModal";

const assets = {
  mmf: [
    { id: "fund-coop", name: "Co-op Money Market Fund", ticker: "co-op-money-market", price: 1, yld: 11.31, fundType: "money_market" },
    { id: "fund-kuza", name: "Kuza Money Market Fund", ticker: "kuza-money-market", price: 1, yld: 10.8, fundType: "money_market" },
  ],
  stock: [{ id: "stock-scom", name: "Safaricom PLC", ticker: "SCOM", price: 38.6 }],
  fx: [{ id: "fx-usd", name: "KES / USD", ticker: "KES/USD", price: 129.5 }],
  fixed_income: [{ id: "tbill-91", name: "91-Day T-Bill", price: 100, yld: 15.8 }],
  commodity: [{ id: "gold", name: "Gold (USD)", ticker: "XAU", price: 2500 }],
};

vi.mock("@/hooks/usePortfolio", () => ({
  ASSET_TYPE_LABELS: {
    mmf: "Unit Trusts",
    stock: "Stocks (NSE)",
    fx: "FX (Currency)",
    fixed_income: "Fixed Income",
    commodity: "Commodities",
  },
  useLiveAssets: () => ({ data: assets }),
}));

afterEach(cleanup);

const setup = () => {
  const onAdd = vi.fn();
  const onOpenChange = vi.fn();
  const view = render(
    <AddInvestmentModal open onOpenChange={onOpenChange} onAdd={onAdd} isPending={false} />,
  );
  return { ...view, onAdd, onOpenChange };
};

describe("AddInvestmentModal", () => {
  it("uses separate rounded asset pills and switches the picker", () => {
    setup();

    const funds = screen.getByRole("button", { name: "Funds" });
    const stocks = screen.getByRole("button", { name: "Stocks" });
    expect(funds).toHaveClass("rounded-full");
    expect(stocks).toHaveClass("rounded-full");
    expect(funds).toHaveAttribute("aria-pressed", "true");

    fireEvent.click(stocks);
    expect(stocks).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByPlaceholderText("Search stocks")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Safaricom PLC/ })).toBeInTheDocument();
  });

  it("adds a selected fund using principal-based MMF values", () => {
    const { onAdd } = setup();

    fireEvent.click(screen.getByRole("button", { name: /Co-op Money Market Fund/ }));
    fireEvent.change(screen.getByLabelText("How much are you investing?"), { target: { value: "50000" } });
    expect(screen.getByText("Estimated annual return")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Add investment" }));

    expect(onAdd).toHaveBeenCalledWith({
      asset_type: "mmf",
      asset_name: "Co-op Money Market Fund",
      ticker: "co-op-money-market",
      asset_id: "fund-coop",
      units: 1,
      buy_price: 50000,
      current_price: 50000,
      current_yield: 11.31,
    });
  });

  it("calculates units from a stock amount", () => {
    const { onAdd } = setup();

    fireEvent.click(screen.getByRole("button", { name: "Stocks" }));
    fireEvent.click(screen.getByRole("button", { name: /Safaricom PLC/ }));
    fireEvent.change(screen.getByLabelText("How much are you spending?"), { target: { value: "386" } });
    fireEvent.click(screen.getByRole("button", { name: "Add investment" }));

    expect(onAdd).toHaveBeenCalledWith({
      asset_type: "stock",
      asset_name: "Safaricom PLC",
      ticker: "SCOM",
      asset_id: "stock-scom",
      units: 10,
      buy_price: 38.6,
      current_price: 38.6,
      current_yield: 0,
    });
  });

  it("keeps the call to action disabled until both an asset and amount are supplied", () => {
    setup();

    expect(screen.getByRole("button", { name: "Choose an investment" })).toBeDisabled();
    expect(screen.getByLabelText("How much are you investing?")).toBeDisabled();
  });

  it("filters fund suggestions and closes through the existing controlled-dialog callback", () => {
    const { onOpenChange } = setup();

    fireEvent.change(screen.getByPlaceholderText("Search funds"), { target: { value: "Kuza" } });
    expect(screen.getByRole("button", { name: /Kuza Money Market Fund/ })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Co-op Money Market Fund/ })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Close" }));
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });
});
