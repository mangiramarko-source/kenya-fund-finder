import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import OnboardingSetup, { type OnboardingAsset } from "./OnboardingSetup";

const assets: OnboardingAsset[] = [
  { id: "fund-1", databaseId: "00000000-0000-0000-0000-000000000001", type: "fund", name: "Alpha Fund", detail: "12% p.a." },
  { id: "stock-1", databaseId: "00000000-0000-0000-0000-000000000002", type: "stock", name: "Safaricom", detail: "SCOM · KES 18.25", price: 18.25 },
  { id: "stock-2", databaseId: "00000000-0000-0000-0000-000000000003", type: "stock", name: "Equity", detail: "EQTY · KES 46.80", price: 46.8 },
  { id: "currency-1", databaseId: "00000000-0000-0000-0000-000000000004", type: "currency", name: "US Dollar", detail: "USD/KES", price: 129.4 },
  { id: "commodity-1", databaseId: "00000000-0000-0000-0000-000000000005", type: "commodity", name: "Gold", detail: "XAU", price: 2340 },
  { id: "fixed-1", type: "fixed_income", name: "91-Day T-Bill", detail: "15.8% p.a.", price: 100, annualYield: 15.8 },
];

afterEach(cleanup);
function setup(onComplete = vi.fn().mockResolvedValue(true)) {
  render(<Dialog open><DialogContent><OnboardingSetup assets={assets} onComplete={onComplete} /></DialogContent></Dialog>);
  return onComplete;
}

describe("OnboardingSetup", () => {
  it("starts fresh with no device-import option", () => {
    setup();
    expect(screen.queryByText("Saved on this device")).not.toBeInTheDocument();
  });
  it("limits the watchlist to five and keeps fixed income for the portfolio step", () => {
    setup();
    fireEvent.click(screen.getByRole("button", { name: "Continue to watchlist" }));
    expect(screen.queryByText("91-Day T-Bill")).not.toBeInTheDocument();
    ["Alpha Fund", "Safaricom", "Equity", "US Dollar", "Gold"].forEach((name) => fireEvent.click(screen.getByRole("button", { name: new RegExp(name, "i") })));
    expect(screen.getByText(/5\/5 selected/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Continue to portfolio" }));
    expect(screen.getByText("91-Day T-Bill")).toBeInTheDocument();
  });
  it("requires an amount when a portfolio asset is selected", async () => {
    const onComplete = setup();
    fireEvent.click(screen.getByRole("button", { name: "Continue to watchlist" }));
    fireEvent.click(screen.getByRole("button", { name: "Continue to portfolio" }));
    fireEvent.click(screen.getByRole("button", { name: /Safaricom/i }));
    fireEvent.click(screen.getByRole("button", { name: "Save setup & explore" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Enter a valid KES amount");
    expect(onComplete).not.toHaveBeenCalled();
  });
});
