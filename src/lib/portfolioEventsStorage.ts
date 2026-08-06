/**
 * Lightweight localStorage history for guest portfolios.
 * Mirrors the shape of the `portfolio_events` table so logged-in and demo
 * users have a comparable event log. Backward compatible: missing keys
 * are treated as empty history.
 */
export type PortfolioEventType = "add" | "update" | "remove";

import { safeUUID } from "@/lib/safeUUID";

export interface PortfolioEvent {
  id: string;
  user_id: string;
  portfolio_holding_id: string | null;
  asset_id: string | null;
  asset_type: string;
  asset_name: string;
  event_type: PortfolioEventType;
  amount: number | null;
  quantity: number | null;
  event_date: string;
  note: string;
  created_at: string;
}

const KEY = "kff_demo_portfolio_events_v1";

const safeRead = (): PortfolioEvent[] => {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const safeWrite = (events: PortfolioEvent[]) => {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(KEY, JSON.stringify(events));
  } catch {
    /* quota exceeded — silently drop */
  }
};

export const portfolioEventsStorage = {
  list(): PortfolioEvent[] {
    return safeRead();
  },
  record(event: Omit<PortfolioEvent, "id" | "user_id" | "created_at" | "event_date"> & {
    event_date?: string;
  }): PortfolioEvent {
    const now = new Date().toISOString();
    const record: PortfolioEvent = {
      id: safeUUID(),
      user_id: "demo",
      portfolio_holding_id: event.portfolio_holding_id ?? null,
      asset_id: event.asset_id ?? null,
      asset_type: event.asset_type,
      asset_name: event.asset_name,
      event_type: event.event_type,
      amount: event.amount ?? null,
      quantity: event.quantity ?? null,
      event_date: event.event_date ?? now,
      note: event.note ?? "",
      created_at: now,
    };
    safeWrite([record, ...safeRead()].slice(0, 500));
    return record;
  },
  clear() {
    safeWrite([]);
  },
};
