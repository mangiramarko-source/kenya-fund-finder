import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter } from "react-router-dom";
import { CommoditiesView } from "./CommoditiesView";
import { UniversalCompareProvider } from "@/hooks/useUniversalCompare";

const mockCommodities = [
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
];

function createQueryChain(data: unknown[] = []) {
  const result = Promise.resolve({ data, error: null });
  const chain: Record<string, unknown> = {
    select: () => chain,
    eq: () => chain,
    gte: () => chain,
    order: () => chain,
    limit: () => chain,
    then: result.then.bind(result),
    catch: result.catch.bind(result),
  };
  return chain;
}

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: (table: string) =>
      createQueryChain(table === "commodities_public" ? mockCommodities : []),
    channel: () => {
      const ch = {
        on: () => ch,
        subscribe: () => ch,
      };
      return ch;
    },
    removeChannel: () => {},
  },
}));

vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({ user: { id: "test" }, loading: false }),
}));

describe("CommoditiesView Component", () => {
  it("renders commodity desktop table without React Error #31 (Date child object)", async () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    render(
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <UniversalCompareProvider>
            <CommoditiesView />
          </UniversalCompareProvider>
        </BrowserRouter>
      </QueryClientProvider>
    );

    const goldElements = await screen.findAllByText("GOLD");
    expect(goldElements.length).toBeGreaterThan(0);
  });
});
