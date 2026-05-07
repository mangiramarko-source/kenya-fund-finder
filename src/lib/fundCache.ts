import type { FundFromDB, YieldSnapshot } from "@/lib/api";

/**
 * Local last-known-good cache for fund data so the UI can render
 * something useful when the network is unavailable.
 */
const FUNDS_KEY = "kff:cache:funds:v1";
const SNAPSHOTS_KEY = "kff:cache:snapshots:v1";

interface CacheEnvelope<T> {
  savedAt: number;
  data: T;
}

function read<T>(key: string): CacheEnvelope<T> | null {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw) as CacheEnvelope<T>;
  } catch {
    return null;
  }
}

function write<T>(key: string, data: T) {
  try {
    localStorage.setItem(key, JSON.stringify({ savedAt: Date.now(), data }));
  } catch {
    /* quota or private mode — ignore */
  }
}

export const fundCache = {
  saveFunds(funds: FundFromDB[]) {
    write(FUNDS_KEY, funds);
  },
  saveSnapshots(snapshots: Record<string, YieldSnapshot>) {
    write(SNAPSHOTS_KEY, snapshots);
  },
  loadFunds(): { funds: FundFromDB[]; savedAt: number } | null {
    const c = read<FundFromDB[]>(FUNDS_KEY);
    return c ? { funds: c.data, savedAt: c.savedAt } : null;
  },
  loadSnapshots(): { snapshots: Record<string, YieldSnapshot>; savedAt: number } | null {
    const c = read<Record<string, YieldSnapshot>>(SNAPSHOTS_KEY);
    return c ? { snapshots: c.data, savedAt: c.savedAt } : null;
  },
};
