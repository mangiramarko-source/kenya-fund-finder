import { describe, it, expect, vi } from "vitest";
import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import Navbar from "./Navbar";
import DesktopTopBar from "./DesktopTopBar";

// Mock Supabase
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue({ data: [] }),
      maybeSingle: vi.fn().mockResolvedValue({ data: null }),
    })),
    channel: vi.fn(() => ({
      on: vi.fn().mockReturnThis(),
      subscribe: vi.fn(() => ({})),
    })),
    removeChannel: vi.fn(),
  },
}));

vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({ user: null, isAdmin: false, signOut: vi.fn() }),
}));

describe("Mobile & Desktop Navigation Verification", () => {
  it("does not render Market News in the mobile sidebar drawer", () => {
    render(
      <MemoryRouter>
        <Navbar />
      </MemoryRouter>
    );

    // Open mobile sidebar drawer
    const menuButtons = screen.getAllByRole("button", { name: /Open menu/i });
    expect(menuButtons.length).toBeGreaterThanOrEqual(1);
    fireEvent.click(menuButtons[0]);

    // Market News should NOT be present anywhere in the mobile navigation drawer
    expect(screen.queryByText("Market News")).not.toBeInTheDocument();

    // Verify other DISCOVER items are rendered cleanly
    expect(screen.getByText("AI Lab")).toBeInTheDocument();
    expect(screen.getByText("Learn & Academy")).toBeInTheDocument();
    expect(screen.getByText("Calculators")).toBeInTheDocument();
    expect(screen.getByText("Alerts")).toBeInTheDocument();
  });

  it("renders desktop navigation links cleanly on desktop bar", () => {
    render(
      <MemoryRouter>
        <DesktopTopBar />
      </MemoryRouter>
    );

    expect(screen.getByText("Overview")).toBeInTheDocument();
    expect(screen.getByText("Stocks")).toBeInTheDocument();
    expect(screen.getByText("MMF")).toBeInTheDocument();
    expect(screen.getByText("T-Bills")).toBeInTheDocument();
    expect(screen.getByText("FX Rates")).toBeInTheDocument();
    expect(screen.getByText("Commodities")).toBeInTheDocument();
    expect(screen.getByText("Portfolio")).toBeInTheDocument();
    expect(screen.getByText("Calculator")).toBeInTheDocument();
  });
});
