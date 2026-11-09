import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { MemoryRouter } from "react-router-dom";
import { MarketMoversCard } from "./MarketMoversCard";

describe("MarketMoversCard", () => {
  it("renders default market movers with correct stock images when stocks are empty", () => {
    render(
      <MemoryRouter>
        <MarketMoversCard stocks={[]} />
      </MemoryRouter>
    );

    expect(screen.getByText("Market Movers")).toBeInTheDocument();
    expect(screen.getByText("SGL")).toBeInTheDocument();
    expect(screen.getByText("CTUM")).toBeInTheDocument();
    expect(screen.getByText("KEGN")).toBeInTheDocument();
    expect(screen.getByText("LKL")).toBeInTheDocument();
    expect(screen.getByText("UMME")).toBeInTheDocument();
    expect(screen.getByText("KQ")).toBeInTheDocument();

    const images = screen.getAllByRole("img");
    expect(images.length).toBe(6);

    const sources = images.map((img) => img.getAttribute("src"));
    expect(sources).toContain("/images/stocks/sgl.png");
    expect(sources).toContain("/images/stocks/ctum.svg");
    expect(sources).toContain("/images/stocks/kegn.svg");
    expect(sources).toContain("/images/stocks/lkl.svg");
    expect(sources).toContain("/images/stocks/umme.svg");
    expect(sources).toContain("/images/stocks/kq.svg");
  });
});
