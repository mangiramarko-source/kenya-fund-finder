export function normalizeIceRows(payload, { startDate, endDate }) {
  const dateOnly = (date) => date.toISOString().slice(0, 10);
  const rawRows = Array.isArray(payload)
    ? payload
    : payload?.data || payload?.prices || payload?.results || payload?.items || [];

  const unique = new Map();
  for (const row of rawRows) {
    const rawDate = row.date || row.priceDate || row.tradeDate || row.snapshot_date || row.timestamp;
    const rawPrice = row.close ?? row.closePrice ?? row.officialClose ?? row.price;
    const parsedDate = rawDate ? new Date(rawDate) : null;
    const price = Number(rawPrice);
    if (!parsedDate || Number.isNaN(parsedDate.getTime()) || !Number.isFinite(price) || price <= 0) continue;
    const snapshotDate = dateOnly(parsedDate);
    if (snapshotDate < dateOnly(startDate) || snapshotDate > dateOnly(endDate)) continue;
    unique.set(snapshotDate, { snapshot_date: snapshotDate, price });
  }

  return [...unique.values()].sort((left, right) => left.snapshot_date.localeCompare(right.snapshot_date));
}
