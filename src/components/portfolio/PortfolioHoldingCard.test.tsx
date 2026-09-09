import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import PortfolioHoldingCard, { holdingOneDayPerformance } from "./PortfolioHoldingCard";
import type { PortfolioItem } from "@/hooks/usePortfolio";
import type { ChangeRow } from "@/hooks/usePortfolioChanges";

const stock: PortfolioItem = { id: "absa", user_id: "user", asset_type: "stock", asset_name: "ABSA Bank Kenya", ticker: "ABSA", units: 10, buy_price: 100, current_price: 110, current_yield: 0, buy_date: "2026-09-01", notes: "", created_at: "", updated_at: "" };
const quoteChange: ChangeRow = { itemId: "absa", assetType: "stock", assetName: "ABSA Bank Kenya", current: 110, previous: 108, delta: 2, deltaPct: 1.8518518519, unit: "KES" };

describe("PortfolioHoldingCard", () => {
  it("renders a verified positive 1D result and total holding return", () => {
    render(<PortfolioHoldingCard item={stock} currency="KES" change={quoteChange} presentation="mobile" />);
    expect(screen.getByText("ABSA Bank Kenya")).toBeInTheDocument();
    expect(screen.getByText("1D")).toBeInTheDocument();
    expect(screen.getByText("+1.9%")).toBeInTheDocument();
    expect(screen.getByTestId("one-day-performance")).toHaveAttribute("data-direction", "gain");
    expect(screen.getByTestId("overall-performance")).toHaveAttribute("data-direction", "gain");
    expect(screen.getByTestId("overall-performance")).toHaveTextContent("+10.0%");
  });

  it("uses loss and zero styling without turning zero movement into a gain", () => {
    const { rerender } = render(<PortfolioHoldingCard item={stock} currency="KES" change={{ ...quoteChange, delta: -2, deltaPct: -1.9 }} presentation="mobile" />);
    expect(screen.getByTestId("one-day-performance")).toHaveAttribute("data-direction", "loss");
    rerender(<PortfolioHoldingCard item={{ ...stock, current_price: 100 }} currency="KES" change={{ ...quoteChange, delta: 0, deltaPct: 0 }} presentation="mobile" />);
    expect(screen.getByTestId("one-day-performance")).toHaveAttribute("data-direction", "flat");
    expect(screen.getByTestId("overall-performance")).toHaveAttribute("data-direction", "flat");
  });

  it("does not fabricate a 1D holding result for a yield change or missing quote", () => {
    const yieldChange: ChangeRow = { ...quoteChange, unit: "%", delta: 0.2, deltaPct: 1.2 };
    expect(holdingOneDayPerformance(stock, yieldChange)).toEqual({ available: false, percent: null, amount: null });
    expect(holdingOneDayPerformance(stock)).toEqual({ available: false, percent: null, amount: null });
    render(<PortfolioHoldingCard item={stock} currency="KES" change={yieldChange} presentation="mobile" />);
    expect(screen.getByLabelText("No verified 1-day performance data")).toHaveTextContent("Unavailable");
  });
});
