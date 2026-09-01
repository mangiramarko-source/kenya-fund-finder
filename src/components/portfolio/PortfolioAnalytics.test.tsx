import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import MonthlyIncomeCard from "./MonthlyIncomeCard";
import PortfolioActivity from "./PortfolioActivity";
import PortfolioCharts from "./PortfolioCharts";
import PortfolioWeeklyChanges from "./PortfolioWeeklyChanges";
import WeightedYieldCard from "./WeightedYieldCard";

vi.mock("recharts", () => ({
  Area: () => null,
  AreaChart: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  CartesianGrid: () => null,
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  Tooltip: () => null,
  XAxis: () => null,
  YAxis: () => null,
}));

describe("Portfolio analytics dashboard", () => {
  it("uses the market-page metric cards and preserves metric content", () => {
    const { container } = render(
      <>
        <WeightedYieldCard weightedAvgYield={11.31} hasFunds />
        <MonthlyIncomeCard monthlyIncome={17900.53} currency="KES" hasFunds />
      </>,
    );

    expect(screen.getByText("Weighted average yield")).toBeInTheDocument();
    expect(screen.getByText("11.31%")).toBeInTheDocument();
    expect(screen.getByText("Estimated monthly income")).toBeInTheDocument();
    expect(screen.getByText(/17,900\.53/)).toBeInTheDocument();
    expect(container.querySelectorAll(".rounded-\\[22px\\]")).toHaveLength(2);
  });

  it("combines performance metrics with the token-based chart and allocation cards", () => {
    render(
      <PortfolioCharts
        allocation={{ mmf: 0, stock: 0, fx: 0, fixed_income: 0, commodity: 0 }}
        totalValue={0}
        currency="KES"
        weightedAvgYield={null}
        monthlyIncome={0}
        hasFunds={false}
      />,
    );

    expect(screen.getByText("Asset allocation")).toBeInTheDocument();
    expect(screen.getByText("Portfolio performance")).toBeInTheDocument();
    expect(screen.getAllByText("No investments yet")).toHaveLength(2);
  });

  it("keeps analytics loading and activity empty states within the shared dashboard treatment", () => {
    const { container } = render(
      <>
        <PortfolioWeeklyChanges changes={[]} loading />
        <PortfolioActivity events={[]} />
      </>,
    );

    expect(screen.getByText("Loading…")).toBeInTheDocument();
    expect(screen.getByText("No portfolio activity yet")).toBeInTheDocument();
    expect(container.querySelector(".rounded-\\[22px\\]")).toBeInTheDocument();
  });
});
