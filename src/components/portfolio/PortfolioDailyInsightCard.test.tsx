import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import PortfolioDailyInsightCard, { portfolioDailyInsight } from "./PortfolioDailyInsightCard";
import type { AppNotification } from "@/components/alerts/NotificationProvider";

const base: AppNotification = { id: "daily", user_id: "user", title: "Portfolio up today", message: "", type: "portfolio_daily", is_read: false, created_at: "2026-09-09T14:15:00.000Z", metadata: { opening_value: 100000, closing_value: 110000, change: 10000, percent_change: 10, movers: [{ asset_name: "ABSA Bank Kenya", change: 5000 }] } };

describe("PortfolioDailyInsightCard", () => {
  it("renders a gain with values, leading mover, and EAT update time", () => {
    render(<PortfolioDailyInsightCard notification={base} />);
    expect(screen.getByText("Your portfolio gained today")).toBeInTheDocument();
    expect(screen.getByText("+KES 10,000.00")).toBeInTheDocument();
    expect(screen.getByText("ABSA Bank Kenya had the largest effect on today’s move.")).toBeInTheDocument();
    expect(screen.getByText(/Last market update:/)).toHaveTextContent("EAT");
  });

  it("formats loss and unchanged updates without fabricated mover copy", () => {
    expect(portfolioDailyInsight({ ...base, metadata: { ...base.metadata, change: -2450, percent_change: -2.45 } }).title).toBe("Your portfolio declined today");
    expect(portfolioDailyInsight({ ...base, metadata: { ...base.metadata, change: 0, percent_change: 0, movers: [] } }).mover).toMatch(/No material market movement/);
  });

  it("renders a pending state when no verified daily summary exists", () => {
    render(<PortfolioDailyInsightCard notification={null} />);
    expect(screen.getByText("Your first portfolio update is on the way")).toBeInTheDocument();
    expect(screen.queryByText(/KES 10,000/)).not.toBeInTheDocument();
  });

  it("can place the update time in a shared portfolio-card footer", () => {
    render(<PortfolioDailyInsightCard notification={base} showUpdatedAt={false} />);
    expect(screen.queryByText(/Last market update:/)).not.toBeInTheDocument();
  });
});
