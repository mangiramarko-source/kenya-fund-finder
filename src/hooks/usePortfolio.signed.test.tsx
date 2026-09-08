import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { portfolioStorage } from "@/lib/portfolioStorage";
import { usePortfolio } from "./usePortfolio";

const mocks = vi.hoisted(() => ({
  remoteRows: [] as Array<Record<string, unknown>>,
  readError: null as unknown,
  insertError: null as unknown,
}));

vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({ user: { id: "account-1" } }),
}));

vi.mock("@/integrations/supabase/client", () => {
  const marketQuery = () => ({
    select: () => ({ order: () => Promise.resolve({ data: [], error: null }) }),
  });
  const portfolioQuery = () => ({
    select: () => ({ order: () => Promise.resolve({ data: mocks.remoteRows, error: mocks.readError }) }),
    insert: () => ({
      select: () => ({ single: () => Promise.resolve({ data: null, error: mocks.insertError }) }),
    }),
  });
  return { supabase: { from: (table: string) => table === "mock_portfolios" ? portfolioQuery() : marketQuery() } };
});

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>{children}</QueryClientProvider>
);

describe("usePortfolio for signed-in users", () => {
  beforeEach(() => {
    localStorage.clear();
    mocks.readError = null;
    mocks.insertError = null;
    mocks.remoteRows = [{
      id: "remote-holding", user_id: "account-1", asset_type: "stock", asset_name: "Remote Co", ticker: "REM",
      asset_id: null, units: 1, buy_price: 10, current_price: 10, current_yield: 0,
      buy_date: "2026-01-01T00:00:00.000Z", notes: "", created_at: "2026-01-01T00:00:00.000Z", updated_at: "2026-01-01T00:00:00.000Z",
    }];
  });

  it("does not merge browser-local guest holdings into an account portfolio", async () => {
    portfolioStorage.add({ asset_type: "stock", asset_name: "Local Co", units: 1, buy_price: 10, current_price: 10 });
    const { result } = renderHook(() => usePortfolio(), { wrapper });

    await waitFor(() => expect(result.current.items).toHaveLength(1));
    expect(result.current.items[0].asset_name).toBe("Remote Co");
  });

  it("does not create a local-only holding when an account write fails", async () => {
    mocks.insertError = new Error("offline");
    const { result } = renderHook(() => usePortfolio(), { wrapper });
    await waitFor(() => expect(result.current.items).toHaveLength(1));

    await expect(result.current.addItem.mutateAsync({ asset_type: "stock", asset_name: "Unsaved Co", units: 1, buy_price: 10, current_price: 10 })).rejects.toThrow("offline");
    expect(portfolioStorage.list()).toHaveLength(0);
  });
});
