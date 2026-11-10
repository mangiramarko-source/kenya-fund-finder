import React from "react";
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import Layout from "./Layout";

vi.mock("./Navbar", () => ({ default: () => null }));
vi.mock("./Footer", () => ({ default: () => null }));
vi.mock("./SkipToContent", () => ({ default: () => null }));
vi.mock("./DesktopTopBar", () => ({ default: () => null }));
vi.mock("./OfflineBanner", () => ({ default: () => null }));
vi.mock("./MobileAiLabFab", () => ({ default: () => null }));
vi.mock("./mobile/MobileBottomNav", () => ({ default: () => null }));
vi.mock("@/components/ai-lab/DesktopAiLabChat", () => ({ default: () => null }));
vi.mock("./CurrencyTicker", () => ({ default: () => <div data-testid="currency-ticker" /> }));
vi.mock("@/hooks/usePageView", () => ({ usePageView: vi.fn() }));

function renderLayout(path: string) {
  render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path={path} element={<Layout><div>Page content</div></Layout>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("Layout ticker placement", () => {
  it.each(["/", "/stocks", "/news", "/funds", "/savings", "/rates"] as const)(
    "mounts one ticker on %s",
    (path) => {
      renderLayout(path);
      expect(screen.getAllByTestId("currency-ticker")).toHaveLength(1);
    }
  );

  it("renders ticker in natural flow on mobile /news and hides the mobile spacer", () => {
    renderLayout("/news");
    const ticker = screen.getByTestId("currency-ticker");
    const tickerContainer = ticker.parentElement;
    expect(tickerContainer).toHaveClass("relative");
    expect(tickerContainer).toHaveClass("md:fixed");

    // The h-9 spacer should be hidden on mobile for /news
    const spacer = tickerContainer?.nextElementSibling;
    expect(spacer).toHaveClass("hidden");
    expect(spacer).toHaveClass("md:block");
  });

  it("renders fixed ticker on other routes like /stocks", () => {
    renderLayout("/stocks");
    const ticker = screen.getByTestId("currency-ticker");
    const tickerContainer = ticker.parentElement;
    expect(tickerContainer).toHaveClass("fixed");
    expect(tickerContainer).toHaveClass("top-safe-nav");

    const spacer = tickerContainer?.nextElementSibling;
    expect(spacer).not.toHaveClass("hidden");
    expect(spacer).toHaveClass("h-9");
  });
});
