import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import MarketPageLoader from "./MarketPageLoader";

describe("MarketPageLoader", () => {
  it("announces the page-specific loading message", () => {
    render(<MarketPageLoader message="Loading latest stock data…" />);

    const status = screen.getByRole("status");
    expect(status).toHaveAttribute("aria-busy", "true");
    expect(status).toHaveTextContent("Loading latest stock data…");
  });

  it("merges optional layout classes", () => {
    render(<MarketPageLoader message="Loading…" className="min-h-[60vh]" />);

    expect(screen.getByRole("status")).toHaveClass("min-h-[60vh]");
  });
});
