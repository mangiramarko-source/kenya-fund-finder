import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { MemoryRouter } from "react-router-dom";
import { DesktopNavigationShortcutsCard } from "./DesktopNavigationShortcutsCard";

describe("DesktopNavigationShortcutsCard", () => {
  it("renders all categories and key app navigation links", () => {
    render(
      <MemoryRouter>
        <DesktopNavigationShortcutsCard />
      </MemoryRouter>
    );

    // Header exists
    expect(screen.getByText("Explore & Tools")).toBeInTheDocument();

    // Category section titles
    expect(screen.getByText("Savings & Fixed Income")).toBeInTheDocument();
    expect(screen.getByText("Markets & Tools")).toBeInTheDocument();
    expect(screen.getByText("Education & Research")).toBeInTheDocument();

    // Key shortcut destinations
    expect(screen.getByText("Treasury Bills & Bonds")).toBeInTheDocument();
    expect(screen.getByText("Bank Fixed Deposits")).toBeInTheDocument();
    expect(screen.getByText("SACCO Dividends")).toBeInTheDocument();
    expect(screen.getByText("Financial Calculators")).toBeInTheDocument();
    expect(screen.getByText("Commodities Market")).toBeInTheDocument();
    expect(screen.getByText("Compare Assets")).toBeInTheDocument();
    expect(screen.getByText("Learn & Guides")).toBeInTheDocument();
  });
});
