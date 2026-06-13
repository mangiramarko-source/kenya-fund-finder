/**
 * Safe asset name matching helpers.
 *
 * Portfolio holdings store `asset_name` and `ticker`. To match against canonical
 * fund/stock records without breaking on minor renames (case, punctuation,
 * trailing labels like "Money Market Fund"), we normalize before comparing.
 *
 * Preference order when resolving:
 *   1) asset_id  (not stored yet — placeholder for future migration)
 *   2) ticker / symbol exact match
 *   3) normalized asset_name match
 *   4) graceful null (caller treats as "not available")
 */

/** Lowercase, strip punctuation, collapse whitespace. */
export const normalizeName = (raw: string | null | undefined): string => {
  if (!raw) return "";
  return raw
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
};

/** Build a Map keyed by normalized name from a list of canonical records. */
export function buildNameIndex<T>(records: T[], nameField: keyof T): Map<string, T> {
  const m = new Map<string, T>();
  records.forEach((r) => {
    const key = normalizeName(String(r[nameField] ?? ""));
    if (key && !m.has(key)) m.set(key, r);
  });
  return m;
}

/** Resolve a holding against canonical records using the preference order. */
export function resolveAsset<T extends { id?: string; name?: string; symbol?: string; ticker?: string }>(
  holding: { asset_id?: string | null; asset_name: string; ticker?: string | null },
  records: T[],
  nameIndex?: Map<string, T>,
): T | null {
  // 1) asset_id (forward-compat — currently unused)
  if (holding.asset_id) {
    const byId = records.find((r) => r.id === holding.asset_id);
    if (byId) return byId;
  }
  // 2) ticker / symbol
  if (holding.ticker) {
    const t = holding.ticker.toUpperCase();
    const byTicker = records.find(
      (r) => (r.symbol && r.symbol.toUpperCase() === t) || (r.ticker && r.ticker.toUpperCase() === t),
    );
    if (byTicker) return byTicker;
  }
  // 3) normalized name
  const idx = nameIndex ?? buildNameIndex(records, "name" as keyof T);
  const hit = idx.get(normalizeName(holding.asset_name));
  return hit ?? null;
}
