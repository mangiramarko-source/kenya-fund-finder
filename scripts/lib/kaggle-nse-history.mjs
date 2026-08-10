const MONTHS = {
  jan: 0,
  feb: 1,
  mar: 2,
  apr: 3,
  may: 4,
  jun: 5,
  jul: 6,
  aug: 7,
  sep: 8,
  oct: 9,
  nov: 10,
  dec: 11,
};

export function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = "";
  let quoted = false;

  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];
    if (character === '"') {
      if (quoted && text[index + 1] === '"') {
        field += '"';
        index += 1;
      } else {
        quoted = !quoted;
      }
    } else if (character === "," && !quoted) {
      row.push(field);
      field = "";
    } else if ((character === "\n" || character === "\r") && !quoted) {
      if (character === "\r" && text[index + 1] === "\n") index += 1;
      row.push(field);
      if (row.some((value) => value.length > 0)) rows.push(row);
      row = [];
      field = "";
    } else {
      field += character;
    }
  }

  if (field.length || row.length) {
    row.push(field);
    rows.push(row);
  }
  return rows;
}

export function parseNseDate(value) {
  const normalized = value.trim();
  let match = normalized.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (match) return toIsoDate(Number(match[3]), Number(match[1]) - 1, Number(match[2]));

  match = normalized.match(/^(\d{1,2})-([A-Za-z]{3})-(\d{2}|\d{4})$/);
  if (!match) return null;
  const month = MONTHS[match[2].toLowerCase()];
  if (month === undefined) return null;
  const shortYear = Number(match[3]);
  const year = match[3].length === 2 ? 2000 + shortYear : shortYear;
  return toIsoDate(year, month, Number(match[1]));
}

function toIsoDate(year, month, day) {
  const date = new Date(Date.UTC(year, month, day));
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month || date.getUTCDate() !== day) return null;
  return date.toISOString().slice(0, 10);
}

export function normalizeNseSymbol(value) {
  return value.trim().toUpperCase().replace(/\s+/g, "");
}

export function normalizeKaggleNseCsv(text, { startDate, endDate }) {
  const parsed = parseCsv(text.replace(/^\uFEFF/, ""));
  if (parsed.length < 2) return { rows: [], rejected: 0 };

  const headers = parsed[0].map((header) => header.trim().toLowerCase());
  const dateIndex = headers.indexOf("date");
  const codeIndex = headers.indexOf("code");
  const priceIndex = headers.indexOf("day price");
  if (dateIndex < 0 || codeIndex < 0 || priceIndex < 0) {
    throw new Error("CSV must contain Date, Code, and Day Price columns");
  }

  const unique = new Map();
  let rejected = 0;
  for (const values of parsed.slice(1)) {
    const snapshotDate = parseNseDate(values[dateIndex] || "");
    const symbol = normalizeNseSymbol(values[codeIndex] || "");
    const price = Number((values[priceIndex] || "").replace(/,/g, ""));
    if (!snapshotDate || !symbol || symbol.startsWith("^") || !Number.isFinite(price) || price <= 0) {
      rejected += 1;
      continue;
    }
    if (snapshotDate < startDate || snapshotDate > endDate) continue;
    unique.set(`${symbol}|${snapshotDate}`, { symbol, snapshot_date: snapshotDate, price });
  }

  return {
    rows: [...unique.values()].sort((left, right) =>
      left.symbol.localeCompare(right.symbol) || left.snapshot_date.localeCompare(right.snapshot_date)),
    rejected,
  };
}
