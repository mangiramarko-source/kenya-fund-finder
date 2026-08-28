import { describe, it, expect, vi } from "vitest";
import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import Navbar from "./Navbar";
import DesktopTopBar from "./DesktopTopBar";

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
  useNotifications: () => ({ notifications: [], unreadCount: 0, markAllRead: vi.fn(), deleteNotification: vi.fn(), openNotification: vi.fn() }),
}));

describe("Mobile & Desktop Navigation Verification", () => {
  it("keeps mobile notifications in the navigation sidebar", () => {
    render(
      <MemoryRouter>
        <Navbar />
      </MemoryRouter>
    );

    expect(screen.queryByRole("button", { name: /sign in for notifications/i })).not.toBeInTheDocument();

    // Open mobile sidebar drawer
    const menuButtons = screen.getAllByRole("button", { name: /Open menu/i });
    expect(menuButtons.length).toBeGreaterThanOrEqual(1);
    fireEvent.click(menuButtons[0]);

    expect(screen.getByRole("button", { name: /notifications/i })).toBeInTheDocument();

    // Market News should NOT be present anywhere in the mobile navigation drawer
    expect(screen.queryByText("Market News")).not.toBeInTheDocument();

    // Verify other DISCOVER items are rendered cleanly
    expect(screen.getByText("AI Lab")).toBeInTheDocument();
    expect(screen.getByText("Learn & Academy")).toBeInTheDocument();
    expect(screen.getByText("Calculators")).toBeInTheDocument();
    expect(screen.getByText("Alerts")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /notifications/i }));
    expect(screen.getByText("Notifications")).toBeInTheDocument();
    expect(screen.getByText("No notifications yet")).toBeInTheDocument();

    expect(screen.queryByRole("button", { name: /back to menu/i })).not.toBeInTheDocument();
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
