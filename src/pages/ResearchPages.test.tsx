import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import MmfCalculatorPage from "./MmfCalculatorPage";
import MmfResearchPage from "./MmfResearchPage";
import ResearchArticlePage from "./ResearchArticlePage";
import SeoRoutePolicy from "@/components/SeoRoutePolicy";
import { fetchPublicData } from "@/lib/gateway";

vi.mock("@/lib/gateway", () => ({ fetchPublicData: vi.fn() }));
const mount = (component: React.ReactNode, route: string) => render(<MemoryRouter initialEntries={[route]}><QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}><SeoRoutePolicy />{component}</QueryClientProvider></MemoryRouter>);
afterEach(() => { cleanup(); vi.clearAllMocks(); });

describe("Research page journeys", () => {
  it("keeps guides indexable after React loads and provides official sources", async () => {
    mount(<ResearchArticlePage />, "/learn/how-to-buy-kenyan-shares");
    expect(screen.getByRole("heading", { level: 1, name: "How to buy Kenyan shares" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "CDSC account-opening guidance" })).toHaveAttribute("href", "https://cdsckenya.com/faq/");
    await waitFor(() => expect(document.querySelector('meta[name="robots"]')).toHaveAttribute("content", expect.stringContaining("index, follow")));
    expect(document.querySelector('link[rel="canonical"]')).toHaveAttribute("href", "https://kenyafundfinder.com/learn/how-to-buy-kenyan-shares");
  });
  it("reuses the interactive calculator and updates the projection", () => {
    mount(<MmfCalculatorPage />, "/mmf-calculator");
    fireEvent.change(screen.getByLabelText("Annual yield (%)"), { target: { value: "10" } });
    fireEvent.change(screen.getByLabelText("Monthly top-up (KES)"), { target: { value: "0" } });
    fireEvent.change(screen.getByLabelText("Mgmt fee (% p.a.)"), { target: { value: "0" } });
    fireEvent.click(screen.getByRole("switch"));
    expect(screen.getByText(/108,500/)).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Kenya MMF Calculator");
  });
  it("loads comparison records and exposes fund profile and source links", async () => {
    vi.mocked(fetchPublicData).mockResolvedValue({ resource: "funds", count: 1, limit: 200, offset: 0, data: [{ slug: "etica-mmf", name: "Etica", manager: "Etica Capital", fund_type: "money_market", annual_yield: 10, yield_unit: "%", management_fee: null, minimum_investment: 100, withdrawal_time: "2 days", updated_at: "2026-10-01", fact_sheet_date: "2026-09-01", website: "https://example.com/fund" }] });
    mount(<MmfResearchPage />, "/money-market-funds-kenya");
    expect(await screen.findByRole("link", { name: "Etica" })).toHaveAttribute("href", "/compare/etica-mmf");
    expect(screen.getByText("8.5%")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Manager's published website" })).toHaveAttribute("href", "https://example.com/fund");
  });
  it("offers recovery when public data is unavailable", async () => {
    vi.mocked(fetchPublicData).mockRejectedValue(new Error("offline"));
    mount(<MmfResearchPage />, "/money-market-funds-kenya");
    expect(await screen.findByRole("button", { name: "Retry fund data" })).toBeInTheDocument();
    expect(screen.getByText(/Fund data is temporarily unavailable/)).toBeInTheDocument();
  });
});
