import { describe, it, expect, vi } from "vitest";
import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import FloatingPageCalculator from "./FloatingPageCalculator";

// Mock use-mobile to control mobile/desktop testing
vi.mock("@/hooks/use-mobile", () => ({
  useIsMobile: vi.fn(() => false),
}));

describe("FloatingPageCalculator", () => {
  it("renders the floating action button with the provided label", () => {
    render(
      <FloatingPageCalculator
        buttonLabel="MMF Calculator"
        title="Money Market Fund Calculator"
        description="Estimate net returns"
      >
        <div data-testid="test-calculator-content">Calculator Content</div>
      </FloatingPageCalculator>
    );

    const button = screen.getByRole("button", { name: /Open Money Market Fund Calculator/i });
    expect(button).toBeInTheDocument();
    expect(button).toHaveTextContent("MMF Calculator");
  });

  it("opens modal dialog on desktop when clicked", () => {
    render(
      <FloatingPageCalculator
        buttonLabel="Stock Calculator"
        title="NSE Stocks & Dividend Calculator"
        description="Project dividend yields"
        badge="NSE"
      >
        <div data-testid="test-calculator-content">Stock Calculator Body</div>
      </FloatingPageCalculator>
    );

    const button = screen.getByRole("button", { name: /Open NSE Stocks & Dividend Calculator/i });
    fireEvent.click(button);

    expect(screen.getByText("Stock Calculator Body")).toBeInTheDocument();
    expect(screen.getByText("NSE Stocks & Dividend Calculator")).toBeInTheDocument();
  });
});
