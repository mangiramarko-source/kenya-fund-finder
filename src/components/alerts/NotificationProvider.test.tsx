import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, useLocation } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AppNotification } from "./NotificationProvider";

const state = vi.hoisted(() => {
  const state = {
    notificationRows: [] as AppNotification[],
    broadcastHandler: undefined as ((event: { payload: { id: string } }) => Promise<void>) | undefined,
    update: vi.fn(),
    setAuth: vi.fn(),
    channel: undefined as unknown as { on: ReturnType<typeof vi.fn>; subscribe: ReturnType<typeof vi.fn> },
  };
  state.channel = {
    on: vi.fn((_type: string, _config: unknown, handler: (event: { payload: { id: string } }) => Promise<void>) => {
      state.broadcastHandler = handler;
      return state.channel;
    }),
    subscribe: vi.fn(),
  };
  return state;
});

vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({ user: { id: "user-1", email: "test@example.com" } }),
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: (table: string) => {
      if (table === "notification_presence") return { upsert: vi.fn() };
      if (table === "notifications") {
        const query = {
          select: vi.fn(() => query),
          eq: vi.fn(() => query),
          order: vi.fn(() => query),
          limit: vi.fn(() => Promise.resolve({ data: state.notificationRows })),
          maybeSingle: vi.fn(() => Promise.resolve({ data: state.notificationRows[0] ?? null })),
          update: state.update,
          delete: vi.fn(),
        };
        return query;
      }
      return { select: vi.fn(() => ({ in: vi.fn(() => Promise.resolve({ data: [] })) })) };
    },
    auth: { getSession: vi.fn(() => Promise.resolve({ data: { session: null } })) },
    realtime: { setAuth: state.setAuth },
    channel: vi.fn(() => state.channel),
    removeChannel: vi.fn(),
  },
}));

vi.mock("./LivePriceAlertCard", () => ({
  LivePriceAlertCard: ({ notification, onDismiss }: { notification: AppNotification | null; onDismiss: () => void }) => notification ? <><div role="alertdialog">{notification.id}</div><button type="button" onClick={onDismiss}>Dismiss live alert</button></> : null,
}));

import { NotificationProvider, useNotifications } from "./NotificationProvider";

const notification: AppNotification = {
  id: "alert-1",
  user_id: "user-1",
  title: "Market alert: Safaricom PLC",
  message: "Safaricom PLC is now KES 37.05.",
  type: "price_alert",
  is_read: false,
  created_at: "2026-09-09T07:00:00.000Z",
  metadata: { condition: "above", target_price: 36.9, triggered_price: 37.05 },
};

function renderProvider() {
  return render(<MemoryRouter><NotificationProvider><div>App</div></NotificationProvider></MemoryRouter>);
}

function PortfolioNotificationOpener() {
  const { notifications, openNotification } = useNotifications();
  const location = useLocation();
  return <><button type="button" onClick={() => void openNotification(notifications[0])}>Open portfolio notification</button><output>{location.pathname}</output></>;
}

describe("NotificationProvider price-alert modals", () => {
  beforeEach(() => {
    state.notificationRows = [];
    state.broadcastHandler = undefined;
    state.update.mockReset();
    state.setAuth.mockReset();
    state.channel.on.mockClear();
    state.channel.subscribe.mockClear();
    window.sessionStorage.clear();
  });

  it("shows the newest unread price alert once after startup", async () => {
    state.notificationRows = [notification, { ...notification, id: "older-alert", created_at: "2026-09-09T06:00:00.000Z" }];
    renderProvider();

    expect(await screen.findByRole("alertdialog")).toHaveTextContent("alert-1");
    expect(JSON.parse(window.sessionStorage.getItem("kff:shown-price-alert-modal-ids") ?? "[]")).toEqual(["alert-1"]);
  });

  it("does not replay a startup alert already shown in this browser session", async () => {
    window.sessionStorage.setItem("kff:shown-price-alert-modal-ids", JSON.stringify([notification.id]));
    state.notificationRows = [notification];
    renderProvider();

    await waitFor(() => expect(state.channel.subscribe).toHaveBeenCalled());
    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
  });

  it("shows a newly broadcast price alert and keeps it unread when dismissed", async () => {
    renderProvider();
    await waitFor(() => expect(state.broadcastHandler).toBeDefined());
    state.notificationRows = [notification];

    await act(async () => { await state.broadcastHandler?.({ payload: { id: notification.id } }); });
    expect(await screen.findByRole("alertdialog")).toHaveTextContent(notification.id);
    fireEvent.click(screen.getByRole("button", { name: "Dismiss live alert" }));

    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
    expect(state.update).not.toHaveBeenCalled();
  });

  it("keeps portfolio summaries out of the price modal and opens the portfolio", async () => {
    state.notificationRows = [{ ...notification, id: "portfolio-1", title: "Portfolio up today", type: "portfolio_daily", is_read: true, metadata: { closing_value: 110000, change: 10000 } }];
    render(<MemoryRouter><NotificationProvider><PortfolioNotificationOpener /></NotificationProvider></MemoryRouter>);

    await screen.findByRole("button", { name: "Open portfolio notification" });
    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Open portfolio notification" }));
    await waitFor(() => expect(screen.getByText("/portfolio")).toBeInTheDocument());
  });
});
