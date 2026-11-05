import React from "react";
import { describe, expect, it, vi } from "vitest";
import { render, screen, act } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import CurrencyTicker from "./CurrencyTicker";

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        order: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue({ data: [] }),
        }),
      }),
    }),
    channel: vi.fn().mockReturnValue({
      on: vi.fn().mockReturnThis(),
      subscribe: vi.fn().mockReturnThis(),
    }),
    removeChannel: vi.fn(),
  },
}));

vi.mock("@/hooks/use-mobile", () => ({
  useIsMobile: vi.fn().mockReturnValue(false),
}));

describe("CurrencyTicker light mode styling & accessibility", () => {
  it("renders with light grey background and high contrast typography", async () => {
    await act(async () => {
      render(
        <MemoryRouter>
          <CurrencyTicker />
        </MemoryRouter>
      );
    });
    const track = screen.getByTestId("currency-ticker-track");
    expect(track.className).toContain("bg-zinc-100");
    expect(track.className).toContain("border-y");
    expect(track.className).toContain("border-zinc-200/90");

    // Check high contrast text colors for label and price
    const usdLabel = screen.getAllByText("USD/KES")[0];
    expect(usdLabel.className).toContain("text-zinc-700");

    const usdPrice = screen.getAllByText("129.20")[0];
    expect(usdPrice.className).toContain("text-zinc-950");
  });

  it("contains only FX rates and commodities (no stocks)", async () => {
    await act(async () => {
      render(
        <MemoryRouter>
          <CurrencyTicker />
        </MemoryRouter>
      );
    });

    // Check FX and Commodities exist
    expect(screen.getAllByText("USD/KES").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Crude Oil").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Gold").length).toBeGreaterThan(0);

    // Verify stock symbols are NOT present
    expect(screen.queryByText("SCOM")).toBeNull();
    expect(screen.queryByText("EQTY")).toBeNull();
    expect(screen.queryByText("KCB")).toBeNull();
    expect(screen.queryByText("EABL")).toBeNull();
  });

  it("marks cloned infinite marquee items with aria-hidden='true'", async () => {
    await act(async () => {
      render(
        <MemoryRouter>
          <CurrencyTicker />
        </MemoryRouter>
      );
    });

    const links = screen.getAllByRole("link");
    // Half of the doubled items should be accessible links, and half should have aria-hidden
    const hiddenClones = document.querySelectorAll("[aria-hidden='true']");
    expect(hiddenClones.length).toBeGreaterThan(0);
  });
});
