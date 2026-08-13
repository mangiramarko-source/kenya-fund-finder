import type { FundFromDB, YieldSnapshot } from "@/lib/api";

/**
 * Local last-known-good cache for fund data so the UI can render
 * something useful when the network is unavailable.
 *
 * Cache TTL: 6 hours. If the saved data is older than this, it is
 * treated as stale and the caller will fall back to a live fetch.
 * The key is versioned so old unlimited-TTL entries are auto-ignored.
 */
const FUNDS_KEY = "kff:cache:funds:v2";
const SNAPSHOTS_KEY = "kff:cache:snapshots:v2";

/** 6 hours in milliseconds */
const MAX_AGE_MS = 6 * 60 * 60 * 1000;

interface CacheEnvelope<T> {
  savedAt: number;
  data: T;
}

function read<T>(key: string): CacheEnvelope<T> | null {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const envelope = JSON.parse(raw) as CacheEnvelope<T>;
    // Discard if stale — force a live fetch after TTL expires
    if (Date.now() - envelope.savedAt > MAX_AGE_MS) {
      localStorage.removeItem(key);
      return null;
    }
    return envelope;
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
