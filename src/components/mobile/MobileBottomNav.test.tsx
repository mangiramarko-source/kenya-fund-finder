import { describe, it, expect, vi } from "vitest";
import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import MobileBottomNav from "./MobileBottomNav";

vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({ user: null, signOut: vi.fn() }),
}));

describe("MobileBottomNav Tab Highlighting Verification", () => {
  it("highlights the corresponding tab for core routes", () => {
    // 1. Root / home route (starts with news feed)
    const { unmount: unmountRoot } = render(
      <MemoryRouter initialEntries={["/"]}>
        <MobileBottomNav />
      </MemoryRouter>
    );
    expect(screen.getByText("News")).toHaveClass("text-emerald-600");
    unmountRoot();

    // 2. /overview route
    const { unmount: unmountOverview } = render(
      <MemoryRouter initialEntries={["/overview"]}>
        <MobileBottomNav />
      </MemoryRouter>
    );
    expect(screen.getByText("News")).toHaveClass("text-emerald-600");
    unmountOverview();

    // 3. /news route
    const { unmount: unmountNews } = render(
      <MemoryRouter initialEntries={["/news"]}>
        <MobileBottomNav />
      </MemoryRouter>
    );
    expect(screen.getByText("News")).toHaveClass("text-emerald-600");
    unmountNews();

    // 4. /news/:id article detail route
    const { unmount: unmountNewsArticle } = render(
      <MemoryRouter initialEntries={["/news/kenya-economy-update-2026"]}>
        <MobileBottomNav />
      </MemoryRouter>
    );
    expect(screen.getByText("News")).toHaveClass("text-emerald-600");
    unmountNewsArticle();

    // 5. Stocks route
    const { unmount: unmountStocks } = render(
      <MemoryRouter initialEntries={["/stocks"]}>
        <MobileBottomNav />
      </MemoryRouter>
    );
    expect(screen.getByText("Stocks")).toHaveClass("text-emerald-600");
    unmountStocks();

    // 6. MMFs route
    const { unmount: unmountFunds } = render(
      <MemoryRouter initialEntries={["/funds"]}>
        <MobileBottomNav />
      </MemoryRouter>
    );
    expect(screen.getByText("MMFs")).toHaveClass("text-emerald-600");
    unmountFunds();

    // 7. Portfolio route
    const { unmount: unmountPortfolio } = render(
      <MemoryRouter initialEntries={["/portfolio"]}>
        <MobileBottomNav />
      </MemoryRouter>
    );
    expect(screen.getByText("My Assets")).toHaveClass("text-emerald-600");
    unmountPortfolio();
  });

  it("does NOT highlight More when navigating to other standalone pages", () => {
    const standalonePages = [
      "/",
      "/overview",
      "/treasury",
      "/rates",
      "/commodities",
      "/calculator",
      "/learn",
      "/alerts",
    ];

    for (const path of standalonePages) {
      const { unmount } = render(
        <MemoryRouter initialEntries={[path]}>
          <MobileBottomNav />
        </MemoryRouter>
      );

      const moreButton = screen.getByRole("button", { name: /open more tools and markets menu/i });
      expect(moreButton).toBeInTheDocument();
      // More label should NOT have active emerald text
      const moreLabel = screen.getByText("More");
      expect(moreLabel).not.toHaveClass("text-emerald-600");
      expect(moreLabel).toHaveClass("text-zinc-950");
      unmount();
    }
  });

  it("highlights More button when the drawer is opened", () => {
    render(
      <MemoryRouter initialEntries={["/"]}>
        <MobileBottomNav />
      </MemoryRouter>
    );

    const moreButton = screen.getByRole("button", { name: /open more tools and markets menu/i });
    fireEvent.click(moreButton);

    const moreLabel = screen.getByText("More");
    expect(moreLabel).toHaveClass("text-emerald-600");
  });
});
