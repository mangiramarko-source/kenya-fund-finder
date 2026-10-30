import { render, screen, fireEvent } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import OverviewAssetCard, { OverviewAssetCardProps } from "./OverviewAssetCard";

describe("OverviewAssetCard", () => {
  it("renders a holding card correctly with badge and positive 1D return", () => {
    const onClick = vi.fn();
    const props: OverviewAssetCardProps = {
      type: "holding",
      title: "Safaricom PLC",
      subtitle: "SCOM",
      categoryLabel: "STOCKS",
      badgeLabel: "HOLDING",
      badgeTone: "emerald",
      primaryValue: "KES 15,250",
      secondaryValue: "1,000 units · +4.8% overall",
      oneDay: {
        available: true,
        percent: 1.25,
        amount: 180,
        unit: "KES",
      },
      assetType: "stock",
      onClick,
    };

    render(<OverviewAssetCard {...props} />);

    expect(screen.getByText("Safaricom PLC")).toBeInTheDocument();
    expect(screen.getByText("SCOM")).toBeInTheDocument();
    expect(screen.getByText("STOCKS")).toBeInTheDocument();
    expect(screen.getByText("HOLDING")).toBeInTheDocument();
    expect(screen.getByText("KES 15,250")).toBeInTheDocument();
    expect(screen.getByText("1,000 units · +4.8% overall")).toBeInTheDocument();
    expect(screen.getByText("+1.25%")).toBeInTheDocument();
    expect(screen.getByText("(KES 180.00)")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button"));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("renders a watching card correctly with negative 1D return", () => {
    const props: OverviewAssetCardProps = {
      type: "watching",
      title: "Equity Group Holdings",
      subtitle: "EQTY",
      categoryLabel: "STOCKS",
      badgeLabel: "WATCHING",
      badgeTone: "sky",
      primaryValue: "KES 42.50",
      secondaryValue: "Banking · NSE",
      oneDay: {
        available: true,
        percent: -0.85,
        amount: 0.35,
        unit: "KES",
      },
      assetType: "stock",
    };

    render(<OverviewAssetCard {...props} />);

    expect(screen.getByText("Equity Group Holdings")).toBeInTheDocument();
    expect(screen.getByText("EQTY")).toBeInTheDocument();
    expect(screen.getByText("WATCHING")).toBeInTheDocument();
    expect(screen.getByText("KES 42.50")).toBeInTheDocument();
    expect(screen.getByText("-0.85%")).toBeInTheDocument();
  });

  it("handles keyboard Enter key trigger", () => {
    const onClick = vi.fn();
    const props: OverviewAssetCardProps = {
      type: "watching",
      title: "US Dollar / KES",
      categoryLabel: "FX",
      primaryValue: "KES 129.50",
      onClick,
    };

    render(<OverviewAssetCard {...props} />);
    const card = screen.getByRole("button");
    fireEvent.keyDown(card, { key: "Enter" });
    expect(onClick).toHaveBeenCalledTimes(1);
  });
});
