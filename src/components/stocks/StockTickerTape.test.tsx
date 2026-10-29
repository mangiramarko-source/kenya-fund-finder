import React from "react";
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import StockTickerTape from "./StockTickerTape";

describe("StockTickerTape light mode styling", () => {
  it("renders with light grey background and high contrast typography", () => {
    const mockStocks = [
      { id: "1", symbol: "SCOM", name: "Safaricom PLC", price: 15.65, day_change: 0.2, day_change_percent: 1.29 },
      { id: "2", symbol: "EQTY", name: "Equity Group", price: 42.50, day_change: -0.5, day_change_percent: -1.16 },
    ];

    render(<StockTickerTape stocks={mockStocks} />);
    const track = screen.getByTestId("stock-ticker-track");
    expect(track.className).toContain("bg-zinc-100");
    expect(track.className).toContain("border-y");
    expect(track.className).toContain("border-zinc-200/90");

    const scomSymbol = screen.getAllByText("SCOM")[0];
    expect(scomSymbol.className).toContain("text-zinc-950");

    const scomPrice = screen.getAllByText("KSh 15.65")[0];
    expect(scomPrice.className).toContain("text-zinc-800");
  });
});
