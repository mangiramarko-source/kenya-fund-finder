import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { MarketEspressoHeader } from "./MarketEspressoHeader";

describe("MarketEspressoHeader", () => {
  it("renders the 5 asset category pills and default stocks summary", () => {
    render(
      <MemoryRouter>
        <MarketEspressoHeader />
      </MemoryRouter>
    );

    expect(screen.getByText("60s Market Espresso")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /stocks/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /mmfs/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /t-bills & bonds/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /fx rates/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /commodities/i })).toBeInTheDocument();

    // Default view shows Stocks
    expect(screen.getByText("1,742.80")).toBeInTheDocument();
    expect(screen.getByText(/safaricom/i)).toBeInTheDocument();
  });

  it("switches to MMFs summary when clicking MMFs pill", () => {
    render(
      <MemoryRouter>
        <MarketEspressoHeader />
      </MemoryRouter>
    );

    fireEvent.click(screen.getByRole("button", { name: /mmfs/i }));
    expect(screen.getByText("16.85%")).toBeInTheDocument();
    expect(screen.getByText(/shilling funds remain prime destinations/i)).toBeInTheDocument();
    expect(screen.getByText("Compare 35+ MMFs")).toBeInTheDocument();
  });

  it("switches to FX Rates summary when clicking FX pill", () => {
    render(
      <MemoryRouter>
        <MarketEspressoHeader />
      </MemoryRouter>
    );

    fireEvent.click(screen.getByRole("button", { name: /fx rates/i }));
    expect(screen.getByText("129.20")).toBeInTheDocument();
    expect(screen.getByText(/the kenya shilling held steady/i)).toBeInTheDocument();
    expect(screen.getByText("Live Currency Converter")).toBeInTheDocument();
  });
});
