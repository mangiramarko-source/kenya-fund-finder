import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import AddInvestmentModal from "./AddInvestmentModal";

const assets = {
  mmf: [
    { id: "fund-coop", name: "Co-op Money Market Fund", ticker: "co-op-money-market", price: 1, yld: 11.31, fundType: "money_market" },
    { id: "fund-kuza", name: "Kuza Money Market Fund", ticker: "kuza-money-market", price: 1, yld: 10.8, fundType: "money_market" },
    { id: "fund-cic", name: "CIC Money Market Fund", ticker: "cic-money-market", price: 1, yld: 10.5, fundType: "money_market" },
    { id: "fund-etica", name: "Etica Money Market Fund", ticker: "etica-money-market", price: 1, yld: 10.2, fundType: "money_market" },
    { id: "fund-cic-fixed", name: "CIC Fixed Income Fund", ticker: "cic-fixed-income", price: 1, yld: 11.2, fundType: "fixed_income" },
  ],
  stock: [{ id: "stock-scom", name: "Safaricom PLC", ticker: "SCOM", price: 38.6, logoUrl: "/images/stocks/safaricom.png" }],
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

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

const setup = () => {
  const onAdd = vi.fn();
  const onOpenChange = vi.fn();
  const view = render(
    <AddInvestmentModal open onOpenChange={onOpenChange} onAdd={onAdd} isPending={false} />,
  );
  return { ...view, onAdd, onOpenChange };
};

describe("AddInvestmentModal", () => {
  const mobileAssetPicker = () => within(document.querySelector('[aria-label="Mobile asset type"]')!.parentElement!);
  const mobileResults = () => within(screen.getByTestId("mobile-investment-results"));

  it("uses Watchlist-style mobile asset pills without a filter button", () => {
    setup();

    expect(document.querySelector('[aria-label="Asset type"]')).toHaveClass("hidden", "md:flex");
    expect(screen.queryByRole("button", { name: "Filters" })).not.toBeInTheDocument();
    const stocks = mobileAssetPicker().getByRole("button", { name: "Stocks" });
    expect(stocks).toHaveClass("rounded-full");
    fireEvent.click(stocks);
    expect(mobileAssetPicker().getByPlaceholderText("Search stocks")).toBeInTheDocument();
    expect(mobileResults().getByRole("button", { name: /Safaricom PLC/ }).querySelector("img")).toHaveAttribute("src", "/images/stocks/safaricom.png");
  });

  it("opens the mobile picker on Stocks", () => {
    vi.stubGlobal("matchMedia", vi.fn().mockReturnValue({ matches: true }));
    setup();

    expect(mobileAssetPicker().getByRole("button", { name: "Stocks" })).toHaveAttribute("aria-pressed", "true");
    expect(mobileAssetPicker().getByPlaceholderText("Search stocks")).toBeInTheDocument();
  });

  it("shows all grouped funds and uses a second screen for the amount", () => {
    setup();

    fireEvent.click(mobileAssetPicker().getByRole("button", { name: "Funds" }));
    expect(mobileResults().getByText("Money Market", { selector: "p" })).toBeInTheDocument();
    expect(mobileResults().getByText("Fixed Income", { selector: "p" })).toBeInTheDocument();
    expect(mobileResults().getByRole("button", { name: /Etica Money Market Fund/ })).toBeInTheDocument();

    fireEvent.change(mobileAssetPicker().getByPlaceholderText("Search funds"), { target: { value: "Co-op" } });
    fireEvent.click(mobileResults().getByRole("button", { name: /Co-op Money Market Fund/ }));

    expect(screen.getByRole("button", { name: "Back to investments" })).toBeInTheDocument();
    expect(document.getElementById("mobile-investment-amount")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Back to investments" }));
    expect(mobileAssetPicker().getByPlaceholderText("Search funds")).toHaveValue("Co-op");
    expect(mobileResults().getByRole("button", { name: /Co-op Money Market Fund/ })).toBeInTheDocument();
  });

  it("adds a selected fund using principal-based MMF values", () => {
    const { onAdd } = setup();

    fireEvent.click(mobileResults().getByRole("button", { name: /Co-op Money Market Fund/ }));
    fireEvent.change(document.getElementById("mobile-investment-amount")!, { target: { value: "50000" } });
    expect(screen.getAllByText("Estimated annual return")).not.toHaveLength(0);
    fireEvent.click(screen.getAllByRole("button", { name: "Add investment" })[0]);

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

    fireEvent.click(mobileAssetPicker().getByRole("button", { name: "Stocks" }));
    fireEvent.click(mobileResults().getByRole("button", { name: /Safaricom PLC/ }));
    fireEvent.change(document.getElementById("mobile-investment-amount")!, { target: { value: "386" } });
    fireEvent.click(screen.getAllByRole("button", { name: "Add investment" })[0]);

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

  it("searches the full fund list and closes through the existing controlled-dialog callback", () => {
    const { onOpenChange } = setup();

    fireEvent.click(mobileAssetPicker().getByRole("button", { name: "Funds" }));
    fireEvent.change(mobileAssetPicker().getByPlaceholderText("Search funds"), { target: { value: "Kuza" } });
    expect(mobileResults().getByRole("button", { name: /Kuza Money Market Fund/ })).toBeInTheDocument();
    expect(mobileResults().queryByRole("button", { name: /Co-op Money Market Fund/ })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Close" }));
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });
});
