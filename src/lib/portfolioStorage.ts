import type { NewPortfolioItem, PortfolioItem } from "@/hooks/usePortfolio";

const KEY = "kff_demo_portfolio_v1";

const safeRead = (): PortfolioItem[] => {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as PortfolioItem[]) : [];
  } catch {
    return [];
  }
};

const safeWrite = (items: PortfolioItem[]) => {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(KEY, JSON.stringify(items));
    // notify any in-page listeners (different hooks, same tab)
    window.dispatchEvent(new Event("kff:portfolio:changed"));
  } catch {
    /* quota / private mode — silently ignore */
  }
};

export const portfolioStorage = {
  list(): PortfolioItem[] {
    return safeRead();
  },
  add(item: NewPortfolioItem): PortfolioItem {
    const now = new Date().toISOString();
    const record: PortfolioItem = {
      id: (crypto.randomUUID?.() ?? `local-${Date.now()}-${Math.random().toString(36).slice(2)}`),
      user_id: "demo",
      asset_type: item.asset_type,
      asset_name: item.asset_name,
      ticker: item.ticker ?? null,
      asset_id: item.asset_id ?? null,
      units: item.units,
      buy_price: item.buy_price,
      current_price: item.current_price,
      current_yield: item.current_yield ?? 0,
      buy_date: item.buy_date ?? now,
      notes: item.notes ?? "",
      created_at: now,
      updated_at: now,
    };
    const next = [record, ...safeRead()];
    safeWrite(next);
    return record;
  },
  addMany(items: NewPortfolioItem[]): PortfolioItem[] {
    const now = new Date().toISOString();
    const records: PortfolioItem[] = items.map((item) => ({
      id: (crypto.randomUUID?.() ?? `local-${Date.now()}-${Math.random().toString(36).slice(2)}`),
      user_id: "demo",
      asset_type: item.asset_type,
      asset_name: item.asset_name,
      ticker: item.ticker ?? null,
      asset_id: item.asset_id ?? null,
      units: item.units,
      buy_price: item.buy_price,
      current_price: item.current_price,
      current_yield: item.current_yield ?? 0,
      buy_date: item.buy_date ?? now,
      notes: item.notes ?? "",
      created_at: now,
      updated_at: now,
    }));
    const next = [...records, ...safeRead()];
    safeWrite(next);
    return records;
  },
  update(id: string, patch: Partial<PortfolioItem>): PortfolioItem | null {
    const items = safeRead();
    const idx = items.findIndex((i) => i.id === id);
    if (idx === -1) return null;
    const updated: PortfolioItem = {
      ...items[idx],
      ...patch,
      id: items[idx].id,
      user_id: items[idx].user_id,
      created_at: items[idx].created_at,
      updated_at: new Date().toISOString(),
    };
    items[idx] = updated;
    safeWrite(items);
    return updated;
  },
  remove(id: string) {
    safeWrite(safeRead().filter((i) => i.id !== id));
  },
  clear() {
    safeWrite([]);
  },
  count(): number {
    return safeRead().length;
  },
};
