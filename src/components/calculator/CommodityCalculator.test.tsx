import { describe, it, expect, vi } from "vitest";
import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import CommodityCalculator from "./CommodityCalculator";

// Mock Supabase client
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: () => ({
      select: () => ({
        order: () => Promise.resolve({ data: [], error: null }),
        eq: () => ({
          maybeSingle: () => Promise.resolve({ data: { rate: 129.5 }, error: null }),
        }),
      }),
    }),
  },
}));

describe("CommodityCalculator", () => {
  it("renders commodity selector and valuation view by default", () => {
    render(<CommodityCalculator />);

    expect(screen.getByText("Select Commodity")).toBeInTheDocument();
    expect(screen.getByText("Valuation & KES Converter")).toBeInTheDocument();
    expect(screen.getByText("P&L & Return Simulator")).toBeInTheDocument();
    expect(screen.getByText(/Total Value in KES/i)).toBeInTheDocument();
  });

  it("switches to P&L & Return Simulator mode", () => {
    render(<CommodityCalculator />);

    const pnlTab = screen.getByRole("button", { name: /P&L & Return Simulator/i });
    fireEvent.click(pnlTab);

    expect(screen.getByText("Buy / Entry Price (USD)")).toBeInTheDocument();
    expect(screen.getByText("Target / Exit Price (USD)")).toBeInTheDocument();
    expect(screen.getByText(/Net Return \/ P&L/i)).toBeInTheDocument();
  });
});
