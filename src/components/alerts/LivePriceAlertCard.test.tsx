import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";
import { LivePriceAlertCard } from "./LivePriceAlertCard";
import NotificationBell, { NotificationRow } from "./NotificationBell";
import type { AppNotification } from "./NotificationProvider";

vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({ user: { id: "user-1", email: "test@example.com" } }),
}));

vi.mock("./NotificationProvider", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./NotificationProvider")>();
  return {
    ...actual,
    useNotifications: () => ({ notifications: [], unreadCount: 0, markAllRead: vi.fn(), deleteNotification: vi.fn(), openNotification: vi.fn() }),
  };
});

const notification: AppNotification = {
  id: "alert-1",
  user_id: "user-1",
  title: "Price alert: Safaricom PLC",
  message: "Safaricom PLC is now KES 37.05.",
  type: "price_alert",
  is_read: false,
  created_at: "2026-08-28T07:01:18.000Z",
  metadata: { stock_id: "stock-1", condition: "above", target_price: 36.9, triggered_price: 37.05, observed_at: "2026-08-28T07:00:13.000Z" },
  assetName: "Safaricom PLC",
  assetSymbol: "SCOM",
};

describe("LivePriceAlertCard", () => {
  it("dismisses without opening the alert and supports Escape", () => {
    const onDismiss = vi.fn();
    const onView = vi.fn();
    render(<LivePriceAlertCard notification={notification} onDismiss={onDismiss} onView={onView} />);

    expect(screen.getByRole("alertdialog", { name: /Safaricom PLC/ })).toBeInTheDocument();
    expect(screen.getByText("KES 37.05")).toBeInTheDocument();
    fireEvent.keyDown(window, { key: "Escape" });
    expect(onDismiss).toHaveBeenCalledOnce();
    expect(onView).not.toHaveBeenCalled();
  });

  it("opens the specific alert only when View alert is chosen", () => {
    const onDismiss = vi.fn();
    const onView = vi.fn();
    render(<LivePriceAlertCard notification={notification} onDismiss={onDismiss} onView={onView} />);

    fireEvent.click(screen.getByRole("button", { name: "View alert" }));
    expect(onView).toHaveBeenCalledWith(notification);
    expect(onDismiss).not.toHaveBeenCalled();
  });
});

describe("NotificationRow", () => {
  it("presents target and price details, then opens the selected notification", () => {
    const onOpen = vi.fn();
    render(<NotificationRow notification={notification} onOpen={onOpen} onDelete={vi.fn()} />);

    expect(screen.getByText("Above KES 36.90")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Open alert: Safaricom PLC/ }));
    expect(onOpen).toHaveBeenCalledOnce();
  });

  it("keeps long market-alert text inside the available card width", () => {
    const onOpen = vi.fn();
    const longNotification = {
      ...notification,
      title: "Market alert: AUD/KES · Australian Dollar exchange-rate movement notification",
      assetName: "Market alert: AUD/KES · Australian Dollar exchange-rate movement notification",
      assetSymbol: "AUD/KES",
    };
    render(<NotificationRow notification={longNotification} onOpen={onOpen} onDelete={vi.fn()} />);

    const title = screen.getByText(longNotification.assetName);
    expect(title).toHaveClass("truncate");
    expect(screen.getByText("Above KES 36.90")).toHaveClass("truncate");
    expect(title.closest(".group")).toHaveClass("w-full", "max-w-full", "overflow-hidden", "min-w-0");
    fireEvent.click(screen.getByRole("button", { name: /Open alert: Market alert: AUD\/KES/ }));
    expect(onOpen).toHaveBeenCalledOnce();
  });

  it("renders the resolved asset visual and falls back to an FX flag", () => {
    const { rerender } = render(<NotificationRow notification={{ ...notification, assetVisualUrl: "/images/stocks/safaricom.png" }} onOpen={vi.fn()} onDelete={vi.fn()} />);
    expect(screen.getByRole("img", { name: "Safaricom PLC logo" })).toHaveAttribute("src", "/images/stocks/safaricom.png");

    rerender(<NotificationRow notification={{ ...notification, assetType: "currency", assetSymbol: "AUD", assetName: "AUD/KES · Australian Dollar" }} onOpen={vi.fn()} onDelete={vi.fn()} />);
    expect(screen.getByRole("img", { name: "AUD flag" })).toHaveAttribute("src", expect.stringContaining("/au.png"));
  });
});

describe("Desktop notification drawer", () => {
  it("opens a dedicated right-side notification drawer and closes from its own header", () => {
    render(<MemoryRouter><NotificationBell /></MemoryRouter>);

    fireEvent.click(screen.getByRole("button", { name: /open notifications/i }));
    expect(screen.getByRole("dialog", { name: "Notifications" })).toBeInTheDocument();
    expect(screen.getByText("No notifications yet")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Close notifications" }));
    expect(screen.queryByRole("dialog", { name: "Notifications" })).not.toBeInTheDocument();
  });
});
