import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";
import PortfolioImportPrompt from "./PortfolioImportPrompt";
import { portfolioStorage } from "@/lib/portfolioStorage";

const mocks = vi.hoisted(() => ({
  user: { id: "account-1" } as { id: string } | null,
  upsert: vi.fn(),
}));

vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({ user: mocks.user, loading: false }),
}));
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: () => ({ upsert: mocks.upsert }),
  },
}));

const renderPrompt = () => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={client}><PortfolioImportPrompt /></QueryClientProvider>);
};

describe("PortfolioImportPrompt", () => {
  beforeEach(() => {
    localStorage.clear();
    mocks.user = { id: "account-1" };
    mocks.upsert.mockReset().mockResolvedValue({ error: null });
    portfolioStorage.add({ asset_type: "stock", asset_name: "Safaricom", ticker: "SCOM", units: 10, buy_price: 20, current_price: 20 });
  });

  it("imports each guest holding with a stable source id and clears it only after success", async () => {
    renderPrompt();
    expect(screen.getByRole("dialog", { name: "Import this device’s portfolio?" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Import holdings" }));
    await waitFor(() => expect(mocks.upsert).toHaveBeenCalledOnce());
    const [rows, options] = mocks.upsert.mock.calls[0];
    expect(rows[0]).toMatchObject({ user_id: "account-1", asset_name: "Safaricom" });
    expect(rows[0].client_source_id).toEqual(expect.any(String));
    expect(options).toEqual({ onConflict: "user_id,client_source_id", ignoreDuplicates: true });
    expect(portfolioStorage.list()).toHaveLength(0);
  });

  it("keeps guest holdings when import fails so it can be retried", async () => {
    mocks.upsert.mockResolvedValue({ error: new Error("offline") });
    renderPrompt();

    fireEvent.click(screen.getByRole("button", { name: "Import holdings" }));
    await waitFor(() => expect(mocks.upsert).toHaveBeenCalledOnce());
    expect(portfolioStorage.list()).toHaveLength(1);
    expect(screen.getByRole("dialog", { name: "Import this device’s portfolio?" })).toBeInTheDocument();
  });

  it("remembers a dismissal for this account and device", () => {
    const { rerender } = renderPrompt();
    fireEvent.click(screen.getByRole("button", { name: "Not now" }));
    rerender(<QueryClientProvider client={new QueryClient()}><PortfolioImportPrompt /></QueryClientProvider>);
    expect(screen.queryByRole("dialog", { name: "Import this device’s portfolio?" })).not.toBeInTheDocument();
  });
});
