import { describe, it, expect, vi } from "vitest";
import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import CalculatorPage from "./CalculatorPage";

// Mock recharts ResponsiveContainer so it renders cleanly in jsdom tests
vi.mock("recharts", async () => {
  const actual = await vi.importActual<typeof import("recharts")>("recharts");
  return {
    ...actual,
    ResponsiveContainer: ({ children }: any) => (
      <div data-testid="responsive-container" style={{ width: 400, height: 250 }}>
        {children}
      </div>
    ),
  };
});

// Mock Supabase client
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: () => ({
      select: () => ({
        order: () => Promise.resolve({ data: [], error: null }),
        eq: () => ({
          order: () => Promise.resolve({ data: [], error: null }),
        }),
      }),
    }),
  },
}));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: false, gcTime: 0 },
  },
});

const renderCalculator = (initialRoute = "/calculator") => {
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[initialRoute]}>
        <CalculatorPage />
      </MemoryRouter>
    </QueryClientProvider>
  );
};

describe("CalculatorPage Multi-Asset Experience", () => {
  it("renders the calculator header and all asset class tabs", () => {
    renderCalculator();

    expect(screen.getByRole("heading", { name: /Kenya Investment Calculators/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Money Market Funds/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /T-Bills & Bonds/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /NSE Stocks/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Compare Assets/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /FX Converter/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /PAYE & SHIF/i })).toBeInTheDocument();
  });

  it("renders MMF calculator by default with live selector and projection cards", () => {
    renderCalculator();

    expect(screen.getByText(/Projected Balance/i)).toBeInTheDocument();
    expect(screen.getByText(/Net profit in pocket after 15% tax/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Initial Deposit/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Monthly Top-up/i)).toBeInTheDocument();
  });

  it("switches to T-Bills & Bonds calculator when tab is clicked", () => {
    renderCalculator();

    const tbillTab = screen.getByRole("button", { name: /T-Bills & Bonds/i });
    fireEvent.click(tbillTab);

    expect(screen.getByText(/CBK Sovereign Securities/i)).toBeInTheDocument();
    expect(screen.getByText(/91-Day Treasury Bill/i)).toBeInTheDocument();
    expect(screen.getByText(/364-Day Treasury Bill/i)).toBeInTheDocument();
    expect(screen.getByText(/Infrastructure Bond/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Face Value/i)).toBeInTheDocument();
  });

  it("switches to NSE Stocks calculator when tab is clicked", () => {
    renderCalculator();

    const stockTab = screen.getByRole("button", { name: /NSE Stocks/i });
    fireEvent.click(stockTab);

    expect(screen.getByText(/NSE Equity Market/i)).toBeInTheDocument();
    expect(screen.getByText(/Reinvest Dividends \(DRIP\)/i)).toBeInTheDocument();
    expect(screen.getByText(/Include NSE & CDSC Brokerage Fees/i)).toBeInTheDocument();
    expect(screen.getByText(/By Investment Amount/i)).toBeInTheDocument();
  });

  it("switches to Cross-Asset Benchmark when tab is clicked", () => {
    renderCalculator();

    const benchmarkTab = screen.getByRole("button", { name: /Compare Assets/i });
    fireEvent.click(benchmarkTab);

    expect(screen.getByText(/Side-by-Side Asset Benchmark/i)).toBeInTheDocument();
    expect(screen.getByText(/Compare What KSh 100,000 Earns/i)).toBeInTheDocument();
    expect(screen.getByText(/CBK Tax-Free Infrastructure Bond/i)).toBeInTheDocument();
    expect(screen.getByText(/Top Money Market Fund/i)).toBeInTheDocument();
  });

  it("supports deep linking via query params (?tab=stocks)", () => {
    renderCalculator("/calculator?tab=stocks");

    expect(screen.getByText(/NSE Equity Market/i)).toBeInTheDocument();
  });

  it("supports deep linking via query params (?tab=tbills)", () => {
    renderCalculator("/calculator?tab=tbills");

    expect(screen.getByText(/CBK Sovereign Securities/i)).toBeInTheDocument();
  });
});
