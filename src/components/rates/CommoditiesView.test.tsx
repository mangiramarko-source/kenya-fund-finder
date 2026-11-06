import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import { CommoditiesView } from "./CommoditiesView";
import { UniversalCompareProvider } from "@/hooks/useUniversalCompare";

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: () => ({
      select: () => ({
        order: () =>
          Promise.resolve({
            data: [
              {
                id: "comm-gold",
                name: "Gold",
                symbol: "GOLD",
                price: 3200,
                previous_price: 3150,
                unit: "USD/oz",
                updated_at: "2026-11-05T10:00:00Z",
              },
              {
                id: "comm-oil",
                name: "Crude Oil",
                symbol: "OIL",
                price: 75.5,
                previous_price: 74.0,
                unit: "USD/bbl",
                updated_at: "2026-11-05T10:00:00Z",
              },
            ],
            error: null,
          }),
      }),
    }),
    channel: () => ({
      on: () => ({
        subscribe: () => ({}),
      }),
    }),
    removeChannel: () => {},
  },
}));

vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({ user: { id: "test" }, loading: false }),
}));

describe("CommoditiesView Component", () => {
  it("renders commodity desktop table without React Error #31 (Date child object)", async () => {
    render(
      <BrowserRouter>
        <UniversalCompareProvider>
          <CommoditiesView />
        </UniversalCompareProvider>
      </BrowserRouter>
    );

    const goldElements = await screen.findAllByText("GOLD");
    expect(goldElements.length).toBeGreaterThan(0);
  });
});
