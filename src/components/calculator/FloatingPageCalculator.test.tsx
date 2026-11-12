import { describe, it, expect, vi, beforeEach } from "vitest";
import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import FloatingPageCalculator from "./FloatingPageCalculator";

// Mock use-mobile to control mobile/desktop testing
vi.mock("@/hooks/use-mobile", () => ({
  useIsMobile: vi.fn(() => false),
}));

const mockUniversalCompare = vi.hoisted(() => ({
  selected: [] as any[],
}));
const mockLegacyCompare = vi.hoisted(() => ({
  selected: [] as any[],
}));

vi.mock("@/hooks/useUniversalCompare", () => ({
  useUniversalCompare: () => mockUniversalCompare,
}));

vi.mock("@/hooks/useCompare", () => ({
  useCompare: () => mockLegacyCompare,
}));

describe("FloatingPageCalculator", () => {
  beforeEach(() => {
    mockUniversalCompare.selected = [];
    mockLegacyCompare.selected = [];
  });

  it("renders the floating action button with the provided label", () => {
    render(
      <FloatingPageCalculator
        buttonLabel="MMF Calculator"
        title="MMF Calculator"
        description="Estimate net returns"
      >
        <div data-testid="test-calculator-content">Calculator Content</div>
      </FloatingPageCalculator>
    );

    const button = screen.getByRole("button", { name: /Open MMF Calculator/i });
    expect(button).toBeInTheDocument();
    expect(button).toHaveTextContent("MMF Calculator");
    expect(button.className).toContain("flex");
    expect(button.className).not.toContain("hidden md:flex");
  });

  it("hides on mobile (hidden md:flex) when universal comparison has selected items", () => {
    mockUniversalCompare.selected = [{ id: "stock-1", title: "Safaricom" }];

    render(
      <FloatingPageCalculator
        buttonLabel="Stock Calculator"
        title="Stocks & Dividend Calculator"
      >
        <div>Content</div>
      </FloatingPageCalculator>
    );

    const button = screen.getByRole("button", { name: /Open Stocks & Dividend Calculator/i });
    expect(button.className).toContain("hidden md:flex");
  });

  it("hides on mobile (hidden md:flex) when legacy compare has selected items", () => {
    mockLegacyCompare.selected = [{ id: "fund-1", name: "CIC MMF" } as any];

    render(
      <FloatingPageCalculator
        buttonLabel="MMF Calculator"
        title="MMF Calculator"
      >
        <div>Content</div>
      </FloatingPageCalculator>
    );

    const button = screen.getByRole("button", { name: /Open MMF Calculator/i });
    expect(button.className).toContain("hidden md:flex");
  });

  it("opens modal dialog on desktop when clicked with clean text header", () => {
    render(
      <FloatingPageCalculator
        buttonLabel="Stock Calculator"
        title="Stocks & Dividend Calculator"
        description="Project dividend yields"
      >
        <div data-testid="test-calculator-content">Stock Calculator Body</div>
      </FloatingPageCalculator>
    );

    const button = screen.getByRole("button", { name: /Open Stocks & Dividend Calculator/i });
    fireEvent.click(button);

    expect(screen.getByText("Stock Calculator Body")).toBeInTheDocument();
    expect(screen.getByText("Stocks & Dividend Calculator")).toBeInTheDocument();
  });
});
