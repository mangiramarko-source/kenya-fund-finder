import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { MiniSparkline } from "./StocksPage";

describe("StocksPage MiniSparkline", () => {
  it("renders an upward trending green sparkline when historical price rises", () => {
    // Arrival order descending from backend: newest first
    const descendingHistory = [
      { snapshot_date: "2026-11-03", price: 25.0 },
      { snapshot_date: "2026-11-02", price: 23.5 },
      { snapshot_date: "2026-11-01", price: 22.0 },
      { snapshot_date: "2026-10-31", price: 20.0 },
    ];

    const { container } = render(
      <MiniSparkline data={descendingHistory} price={26.0} dayChange={1.0} width={64} height={24} />
    );

    const svg = container.querySelector("svg");
    expect(svg).toBeInTheDocument();
    expect(svg).toHaveAttribute("width", "64");
    expect(svg).toHaveAttribute("height", "24");

    const path = svg?.querySelector("path[stroke]");
    expect(path).toBeInTheDocument();
    // In SVG, rising price means final point y is less than first point y (y=0 is top)
    expect(path).toHaveAttribute("stroke", "hsl(152 60% 42%)");
  });

  it("renders a downward trending red sparkline when historical price drops", () => {
    const descendingHistory = [
      { snapshot_date: "2026-11-03", price: 18.0 },
      { snapshot_date: "2026-11-02", price: 20.0 },
      { snapshot_date: "2026-11-01", price: 22.0 },
      { snapshot_date: "2026-10-31", price: 25.0 },
    ];

    const { container } = render(
      <MiniSparkline data={descendingHistory} price={17.5} dayChange={-0.5} width={64} height={24} />
    );

    const svg = container.querySelector("svg");
    expect(svg).toBeInTheDocument();

    const path = svg?.querySelector("path[stroke]");
    expect(path).toBeInTheDocument();
    expect(path).toHaveAttribute("stroke", "hsl(var(--destructive))");
  });

  it("renders a centered flat line when historical prices have no range", () => {
    const flatHistory = [
      { snapshot_date: "2026-11-01", price: 5.0 },
      { snapshot_date: "2026-11-02", price: 5.0 },
      { snapshot_date: "2026-11-03", price: 5.0 },
    ];

    const { container } = render(
      <MiniSparkline data={flatHistory} price={5.0} dayChange={0} width={64} height={24} />
    );

    const svg = container.querySelector("svg");
    expect(svg).toBeInTheDocument();

    const strokePath = svg?.querySelector("path[stroke]");
    expect(strokePath).toHaveAttribute("stroke", "hsl(var(--muted-foreground))");

    // All points should sit at height / 2 = 12
    const d = strokePath?.getAttribute("d");
    expect(d).toContain(",12.0");
  });

  it("returns dash fallback when no history exists and 1-day change is zero", () => {
    const { container } = render(
      <MiniSparkline data={[]} price={10.0} dayChange={0} width={64} height={24} />
    );

    expect(container.textContent).toBe("—");
  });

  it("falls back to 2-point 1-day movement when history is empty but dayChange is non-zero", () => {
    const { container } = render(
      <MiniSparkline data={[]} price={10.0} dayChange={0.5} width={64} height={24} />
    );

    const svg = container.querySelector("svg");
    expect(svg).toBeInTheDocument();
    const path = svg?.querySelector("path[stroke]");
    expect(path).toHaveAttribute("stroke", "hsl(152 60% 42%)");
  });
});
