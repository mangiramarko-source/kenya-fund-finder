import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { LivePriceAlertCard } from "./LivePriceAlertCard";
import { NotificationRow } from "./NotificationBell";
import type { AppNotification } from "./NotificationProvider";

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
    fireEvent.click(screen.getByRole("button", { name: /View alert/ }));
    expect(onOpen).toHaveBeenCalledOnce();
  });
});
