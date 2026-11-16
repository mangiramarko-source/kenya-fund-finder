import { afterEach, describe, it, expect, vi } from "vitest";
import React from "react";
import { render, screen, fireEvent, within } from "@testing-library/react";
import { MemoryRouter, useLocation } from "react-router-dom";
import Navbar from "./Navbar";
import DesktopTopBar from "./DesktopTopBar";

const LocationProbe = () => {
  const loc = useLocation();
  return <div data-testid="location-probe">{`${loc.pathname}${loc.search}`}</div>;
};

const notificationState = vi.hoisted(() => ({ unreadCount: 0 }));
const authState = vi.hoisted(() => ({ user: { id: "user-1", email: "test@example.com" } as any }));

// Mock Supabase
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue({ data: [] }),
      maybeSingle: vi.fn().mockResolvedValue({ data: null }),
    })),
    channel: vi.fn(() => ({
      on: vi.fn().mockReturnThis(),
      subscribe: vi.fn(() => ({})),
    })),
    removeChannel: vi.fn(),
  },
}));

vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({ user: authState.user, isAdmin: false, signOut: vi.fn() }),
}));

vi.mock("@/lib/analytics", () => ({ trackEvent: vi.fn(), trackPageView: vi.fn() }));

vi.mock("@/components/alerts/NotificationProvider", () => ({
  useNotifications: () => ({ notifications: [], unreadCount: notificationState.unreadCount, markAllRead: vi.fn(), deleteNotification: vi.fn(), clearAllNotifications: vi.fn(), openNotification: vi.fn() }),
}));

vi.mock("@/lib/savingsApi", () => ({
  fetchBankFixedDeposits: vi.fn().mockResolvedValue([]),
  fetchSaccoRecords: vi.fn().mockResolvedValue([]),
}));

vi.mock("@/lib/gateway", () => ({
  fetchPublicData: vi.fn().mockResolvedValue({ data: [] }),
}));

vi.mock("@/lib/api", async () => {
  const actual = await vi.importActual<typeof import("@/lib/api")>("@/lib/api");
  return {
    ...actual,
    fetchFunds: vi.fn().mockResolvedValue([]),
  };
});

describe("Mobile & Desktop Navigation Verification", () => {
  afterEach(() => { notificationState.unreadCount = 0; });

  it("renders mobile top header with search, notifications, and profile button", () => {
    render(
      <MemoryRouter>
        <Navbar />
      </MemoryRouter>
    );

    expect(screen.queryByRole("button", { name: /sign in for notifications/i })).not.toBeInTheDocument();

    // Profile button opens account sheet
    const profileButton = screen.getByRole("button", { name: /open account & settings/i });
    expect(profileButton).toBeInTheDocument();
    fireEvent.click(profileButton);

    const accountSheet = screen.getByRole("dialog", { name: /account (&|and) settings/i });
    expect(accountSheet).toBeInTheDocument();
    expect(within(accountSheet).getByText("Account & Settings")).toBeInTheDocument();
    expect(within(accountSheet).getByText("Dark Appearance")).toBeInTheDocument();
    expect(within(accountSheet).getByText("Price Alerts")).toBeInTheDocument();
  });

  it("renders KFF brand logo on overview, section dropdown triggers on market pages, and back header on detail subpages", () => {
    // 1. Home / Overview renders KFF logo
    const { unmount: unmountHome } = render(
      <MemoryRouter initialEntries={["/"]}>
        <Navbar />
      </MemoryRouter>
    );
    expect(screen.getByRole("link", { name: /KenyaFundFinder Home|KFF/i })).toBeInTheDocument();
    unmountHome();

    // 2. /stocks renders country dropdown trigger on mobile top nav
    const { unmount: unmountStocks } = render(
      <MemoryRouter initialEntries={["/stocks"]}>
        <Navbar />
      </MemoryRouter>
    );
    expect(screen.getByTestId("mobile-country-trigger")).toHaveTextContent("Kenya");
    unmountStocks();

    // 3. /funds renders Money Market category dropdown trigger on mobile top nav
    const { unmount: unmountFunds } = render(
      <MemoryRouter initialEntries={["/funds"]}>
        <Navbar />
      </MemoryRouter>
    );
    expect(screen.getByTestId("mobile-funds-trigger")).toHaveTextContent("Money Market");
    unmountFunds();

    // 4. /savings renders Banking dropdown trigger on mobile top nav
    const { unmount: unmountSavings } = render(
      <MemoryRouter initialEntries={["/savings"]}>
        <Navbar />
      </MemoryRouter>
    );
    expect(screen.getByTestId("mobile-banking-trigger")).toHaveTextContent("Fixed Deposits");
    unmountSavings();

    // 5. /rates and /commodities render FX / Commodities dropdown trigger on mobile top nav
    const { unmount: unmountRates } = render(
      <MemoryRouter initialEntries={["/rates"]}>
        <Navbar />
      </MemoryRouter>
    );
    expect(screen.getByTestId("mobile-macro-trigger")).toHaveTextContent("FX Rates");
    unmountRates();

    const { unmount: unmountCommodities } = render(
      <MemoryRouter initialEntries={["/commodities"]}>
        <Navbar />
      </MemoryRouter>
    );
    expect(screen.getByTestId("mobile-macro-trigger")).toHaveTextContent("Commodities");
    unmountCommodities();

    // 6. Nested detail route renders Back button and Title
    const { unmount: unmountSummary } = render(
      <MemoryRouter initialEntries={["/portfolio/summary"]}>
        <Navbar />
      </MemoryRouter>
    );
    expect(screen.getByRole("button", { name: /go back/i })).toBeInTheDocument();
    expect(screen.getByText("Summary")).toBeInTheDocument();
    unmountSummary();
  });

  it("opens MMF category bottom sheet from mobile top nav and updates URL query params", () => {
    render(
      <MemoryRouter initialEntries={["/funds?movement=gainers"]}>
        <Navbar />
        <LocationProbe />
      </MemoryRouter>
    );

    const trigger = screen.getByTestId("mobile-funds-trigger");
    expect(trigger).toHaveTextContent("Money Market");
    fireEvent.click(trigger);

    const sheet = screen.getByRole("dialog", { name: /filter by category/i });
    expect(sheet).toBeInTheDocument();
    expect(within(sheet).getByText("Filter by Category")).toBeInTheDocument();

    fireEvent.click(within(sheet).getByTestId("section-option-fixed_income"));
    expect(screen.getByTestId("location-probe")).toHaveTextContent("/funds?category=fixed_income");
    expect(screen.getByTestId("mobile-funds-trigger")).toHaveTextContent("Fixed Income");
  });

  it("opens Banking bottom sheet from mobile top nav and switches between Fixed Deposits, SACCOs, and T-Bills", () => {
    render(
      <MemoryRouter initialEntries={["/savings"]}>
        <Navbar />
        <LocationProbe />
      </MemoryRouter>
    );

    const trigger = screen.getByTestId("mobile-banking-trigger");
    expect(trigger).toHaveTextContent("Fixed Deposits");
    fireEvent.click(trigger);

    let sheet = screen.getByRole("dialog", { name: /banking (&|and) fixed income/i });
    expect(within(sheet).getByText("Bank Fixed Deposits")).toBeInTheDocument();
    expect(within(sheet).getByText("Regulated SACCOs")).toBeInTheDocument();
    expect(within(sheet).getByText("Treasury Bills & Bonds")).toBeInTheDocument();

    fireEvent.click(within(sheet).getByTestId("section-option-saccos"));
    expect(screen.getByTestId("location-probe")).toHaveTextContent("/savings?tab=saccos");
    expect(screen.getByTestId("mobile-banking-trigger")).toHaveTextContent("SACCOs");

    fireEvent.click(screen.getByTestId("mobile-banking-trigger"));
    sheet = screen.getByRole("dialog", { name: /banking (&|and) fixed income/i });
    fireEvent.click(within(sheet).getByTestId("section-option-tbills"));
    expect(screen.getByTestId("location-probe")).toHaveTextContent("/savings?tab=tbills");
    expect(screen.getByTestId("mobile-banking-trigger")).toHaveTextContent("T-Bills & Bonds");

    fireEvent.click(screen.getByTestId("mobile-banking-trigger"));
    sheet = screen.getByRole("dialog", { name: /banking (&|and) fixed income/i });
    fireEvent.click(within(sheet).getByTestId("section-option-fixed-deposits"));
    expect(screen.getByTestId("location-probe")).toHaveTextContent("/savings");
    expect(screen.getByTestId("mobile-banking-trigger")).toHaveTextContent("Fixed Deposits");
  });

  it("opens FX & Commodities bottom sheet from mobile top nav and switches between /rates and commodities", () => {
    const { unmount } = render(
      <MemoryRouter initialEntries={["/rates"]}>
        <Navbar />
        <LocationProbe />
      </MemoryRouter>
    );

    fireEvent.click(screen.getByTestId("mobile-macro-trigger"));
    let sheet = screen.getByRole("dialog", { name: /fx (&|and) commodities/i });
    fireEvent.click(within(sheet).getByTestId("section-option-commodities"));
    expect(screen.getByTestId("location-probe")).toHaveTextContent("/rates?tab=commodities");
    expect(screen.getByTestId("mobile-macro-trigger")).toHaveTextContent("Commodities");

    fireEvent.click(screen.getByTestId("mobile-macro-trigger"));
    sheet = screen.getByRole("dialog", { name: /fx (&|and) commodities/i });
    fireEvent.click(within(sheet).getByTestId("section-option-fx"));
    expect(screen.getByTestId("location-probe")).toHaveTextContent("/rates");
    expect(screen.getByTestId("mobile-macro-trigger")).toHaveTextContent("FX Rates");
    unmount();

    render(
      <MemoryRouter initialEntries={["/commodities"]}>
        <Navbar />
        <LocationProbe />
      </MemoryRouter>
    );
    expect(screen.getByTestId("mobile-macro-trigger")).toHaveTextContent("Commodities");
    fireEvent.click(screen.getByTestId("mobile-macro-trigger"));
    sheet = screen.getByRole("dialog", { name: /fx (&|and) commodities/i });
    fireEvent.click(within(sheet).getByTestId("section-option-fx"));
    expect(screen.getByTestId("location-probe")).toHaveTextContent("/rates");
  });

  it("shows unread state on the dedicated mobile notification button", () => {
    notificationState.unreadCount = 12;
    const { unmount } = render(<MemoryRouter><Navbar /></MemoryRouter>);

    expect(screen.getByRole("button", { name: "Open notifications, 12 unread" })).toHaveTextContent("9+");
    unmount();

    notificationState.unreadCount = 1;
    render(<MemoryRouter initialEntries={["/alerts"]}><Navbar /></MemoryRouter>);
    expect(screen.getByRole("button", { name: /open account & settings/i })).toBeInTheDocument();
  });

  it("renders desktop navigation links cleanly on desktop bar", () => {
    render(
      <MemoryRouter>
        <DesktopTopBar />
      </MemoryRouter>
    );

    expect(screen.getByText("Overview")).toBeInTheDocument();
    expect(screen.getByText("Stocks")).toBeInTheDocument();
    expect(screen.getByText("MMFs")).toBeInTheDocument();
    expect(screen.getByText("T-Bills & Bonds")).toBeInTheDocument();
    expect(screen.getByText("Banking")).toBeInTheDocument();
    expect(screen.getByText("FX & Commodities")).toBeInTheDocument();
    expect(screen.getByText("Calculator")).toBeInTheDocument();
    expect(screen.getByText("Portfolio")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /open account menu/i }));
    const drawer = screen.getByRole("dialog", { name: "User" });
    expect(drawer).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Close account menu" })).toBeInTheDocument();
    expect(screen.getAllByText("My Alerts").length).toBeGreaterThan(0);
    fireEvent.click(screen.getByRole("button", { name: "Close account menu" }));
    expect(screen.queryByRole("dialog", { name: "User" })).not.toBeInTheDocument();
  });

  it("renders guest user button without any hardcoded MA initials when not signed in", () => {
    authState.user = null;
    render(
      <MemoryRouter>
        <Navbar />
      </MemoryRouter>
    );

    const button = screen.getByRole("button", { name: /open account & settings/i });
    expect(button).toBeInTheDocument();
    // Ensure "MA" is not present anywhere in the profile button or navbar
    expect(within(button).queryByText("MA")).not.toBeInTheDocument();
    expect(screen.queryByText("MA")).not.toBeInTheDocument();
  });

  it.each(["/news", "/"] as const)(
    "handles mobile %s logo-to-Market News swap and tap-to-top scroll",
    (route) => {
      // 1. Initial render at top of route renders KFF logo
      const headerEl = document.createElement("div");
      headerEl.id = "market-news-header";
      // Mock getBoundingClientRect to indicate header is below navbar (not scrolled past)
      headerEl.getBoundingClientRect = vi.fn(() => ({
        top: 150,
        bottom: 200,
        left: 0,
        right: 390,
        width: 390,
        height: 50,
        x: 0,
        y: 150,
        toJSON: () => {},
      }));
      document.body.appendChild(headerEl);

      const { unmount } = render(
        <MemoryRouter initialEntries={[route]}>
          <Navbar />
        </MemoryRouter>
      );

      expect(screen.getByRole("link", { name: /KenyaFundFinder Home|KFF/i })).toBeInTheDocument();
      expect(screen.queryByRole("button", { name: "Scroll to top of Market News" })).not.toBeInTheDocument();
      unmount();

      // 2. When scrolled past Market News (bottom <= 64) with new count
      headerEl.setAttribute("data-new-count", "38");
      headerEl.getBoundingClientRect = vi.fn(() => ({
        top: -20,
        bottom: 30, // <= 64, header has scrolled past mobile navbar
        left: 0,
        right: 390,
        width: 390,
        height: 50,
        x: 0,
        y: -20,
        toJSON: () => {},
      }));

      const scrollToSpy = vi.spyOn(window, "scrollTo").mockImplementation(() => {});

      render(
        <MemoryRouter initialEntries={[route]}>
          <Navbar />
        </MemoryRouter>
      );

      // Should now show Market News button instead of logo, with "38 new today"
      const newsButton = screen.getByRole("button", { name: "Scroll to top of Market News" });
      expect(newsButton).toBeInTheDocument();
      expect(within(newsButton).getByText("Market News")).toBeInTheDocument();
      const countLabel = within(newsButton).getByText("38 new today");
      expect(countLabel).toBeInTheDocument();
      expect(countLabel).toHaveClass("text-[9px]");
      expect(screen.queryByRole("link", { name: /KenyaFundFinder Home|KFF/i })).not.toBeInTheDocument();

      // Tapping Market News scrolls to top
      fireEvent.click(newsButton);
      expect(scrollToSpy).toHaveBeenCalledWith({ top: 0, behavior: "smooth" });

      scrollToSpy.mockRestore();
      headerEl.remove();
    }
  );
});
