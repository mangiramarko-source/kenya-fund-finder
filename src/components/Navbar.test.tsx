import { afterEach, describe, it, expect, vi } from "vitest";
import React from "react";
import { render, screen, fireEvent, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import Navbar from "./Navbar";
import DesktopTopBar from "./DesktopTopBar";

const notificationState = vi.hoisted(() => ({ unreadCount: 0 }));

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
  useAuth: () => ({ user: { id: "user-1", email: "test@example.com" }, isAdmin: false, signOut: vi.fn() }),
}));

vi.mock("@/lib/analytics", () => ({ trackEvent: vi.fn(), trackPageView: vi.fn() }));

vi.mock("@/components/alerts/NotificationProvider", () => ({
  useNotifications: () => ({ notifications: [], unreadCount: notificationState.unreadCount, markAllRead: vi.fn(), deleteNotification: vi.fn(), openNotification: vi.fn() }),
}));

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

    const accountSheet = screen.getByRole("dialog", { name: /account and settings/i });
    expect(accountSheet).toBeInTheDocument();
    expect(within(accountSheet).getByText("Account & Settings")).toBeInTheDocument();
    expect(within(accountSheet).getByText("Dark Appearance")).toBeInTheDocument();
    expect(within(accountSheet).getByText("Price Alerts")).toBeInTheDocument();
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
    expect(screen.getByText("MMF")).toBeInTheDocument();
    expect(screen.getByText("T-Bills")).toBeInTheDocument();
    expect(screen.getByText("FX Rates")).toBeInTheDocument();
    expect(screen.getByText("Commodities")).toBeInTheDocument();
    expect(screen.getByText("Portfolio")).toBeInTheDocument();
    expect(screen.getByText("Calculator")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /open account menu/i }));
    const drawer = screen.getByRole("dialog", { name: "User" });
    expect(drawer).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Close account menu" })).toBeInTheDocument();
    expect(screen.getAllByText("My Alerts").length).toBeGreaterThan(0);
    fireEvent.click(screen.getByRole("button", { name: "Close account menu" }));
    expect(screen.queryByRole("dialog", { name: "User" })).not.toBeInTheDocument();
  });
});
