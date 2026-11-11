import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import InlineDataGate from "./InlineDataGate";
import { trackEvent } from "@/lib/analytics";

vi.mock("@/lib/analytics", () => ({
  trackEvent: vi.fn(),
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: {
      signInWithOAuth: vi.fn().mockResolvedValue({ error: null }),
    },
  },
}));

describe("InlineDataGate Component", () => {
  it("renders remaining count badge correctly", () => {
    render(
      <MemoryRouter initialEntries={["/funds?category=money_market"]}>
        <InlineDataGate
          category="funds"
          totalCount={35}
          visibleCount={3}
          title="Unlock All CMA-Regulated Kenyan Funds"
          description="Create a free account to compare real yields after 15% tax."
        />
      </MemoryRouter>
    );

    expect(screen.getByText("32+ More Available")).toBeInTheDocument();
    expect(screen.getByText("Unlock All CMA-Regulated Kenyan Funds")).toBeInTheDocument();
    expect(screen.getByText("Create a free account to compare real yields after 15% tax.")).toBeInTheDocument();
  });

  it("links to /auth with mode=signup and preserved query string for email signup", () => {
    render(
      <MemoryRouter initialEntries={["/stocks?sector=Banking&sort=dividend"]}>
        <InlineDataGate
          category="stocks"
          totalCount={45}
          visibleCount={3}
          title="Unlock All 45+ NSE Listed Stocks"
          description="See all prices and dividends."
        />
      </MemoryRouter>
    );

    const emailLink = screen.getByRole("link", { name: /continue with email/i });
    expect(emailLink).toHaveAttribute(
      "href",
      "/auth?mode=signup&redirect=%2Fstocks%3Fsector%3DBanking%26sort%3Ddividend"
    );

    const signInLink = screen.getByRole("link", { name: /^sign in$/i });
    expect(signInLink).toHaveAttribute(
      "href",
      "/auth?mode=signin&redirect=%2Fstocks%3Fsector%3DBanking%26sort%3Ddividend"
    );
  });

  it("tracks analytics event when Google Sign In is clicked", () => {
    render(
      <MemoryRouter initialEntries={["/funds"]}>
        <InlineDataGate
          category="funds"
          totalCount={35}
          visibleCount={3}
          title="Unlock All Funds"
          description="Description"
        />
      </MemoryRouter>
    );

    const googleBtn = screen.getByRole("button", { name: /continue with google/i });
    fireEvent.click(googleBtn);

    expect(trackEvent).toHaveBeenCalledWith("signup_started", {
      method: "google",
      source: "inline_gate_funds",
    });
  });

  it("tracks analytics event when Microsoft Sign In is clicked", () => {
    render(
      <MemoryRouter initialEntries={["/news"]}>
        <InlineDataGate
          category="news"
          totalCount={104}
          visibleCount={3}
          title="Unlock All Kenyan Market News"
          description="Description"
        />
      </MemoryRouter>
    );

    const msBtn = screen.getByRole("button", { name: /continue with microsoft/i });
    fireEvent.click(msBtn);

    expect(trackEvent).toHaveBeenCalledWith("signup_started", {
      method: "microsoft",
      source: "inline_gate_news",
    });
  });
});
