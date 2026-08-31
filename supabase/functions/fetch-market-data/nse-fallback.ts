export const NSE_MARKET_STATS_AJAX = "https://www.nse.co.ke/dataservices/wp-admin/admin-ajax.php";
const NSE_MARKET_STATS_PAGE = "https://www.nse.co.ke/dataservices/market-statistics/";

const MONTH_NUMBERS: Record<string, string> = {
  jan: "01", feb: "02", mar: "03", apr: "04", may: "05", jun: "06",
  jul: "07", aug: "08", sep: "09", oct: "10", nov: "11", dec: "12",
};

// These parsers retain the official-source behavior; RapidAPI's parsing is separate.
function parseNumber(value: string | number | null | undefined) {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  const cleaned = String(value ?? "").replace(/,/g, "").replace(/[^\d.-]/g, "").trim();
  return cleaned ? Number.parseFloat(cleaned) || 0 : 0;
}

function parseInteger(value: string | number | null | undefined) {
  if (typeof value === "number") return Number.isFinite(value) ? Math.trunc(value) : 0;
  const cleaned = String(value ?? "").replace(/,/g, "").replace(/[^\d-]/g, "").trim();
  return cleaned ? Number.parseInt(cleaned, 10) || 0 : 0;
}

export function parseNseSnapshotDate(html: string) {
  const match = html.match(/Statistics as of\s+(\d{2})-([A-Za-z]{3})-(\d{4})/i);
  if (!match) return null;
  const [, day, monthName, year] = match;
  const month = MONTH_NUMBERS[monthName.toLowerCase()];
  return month ? `${year}-${month}-${day}` : null;
}

export function parseNseQuoteRows(html: string) {
  const rows: Array<{ company: string; price: number; changePct: number; volume: number }> = [];
  const trRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
  let trMatch;
  while ((trMatch = trRegex.exec(html)) !== null) {
    const tdRegex = /<td[^>]*>([\s\S]*?)<\/td>/gi;
    const cells: string[] = [];
    let tdMatch;
    while ((tdMatch = tdRegex.exec(trMatch[1])) !== null) {
      cells.push(tdMatch[1].replace(/<[^>]+>/g, "").trim());
    }
    if (cells.length >= 5) {
      const company = cells[0];
      const volume = parseInteger(cells[2]);
      const price = parseNumber(cells[3]);
      const changePct = parseNumber(cells[4]);
      if (company && price > 0) rows.push({ company, volume, price, changePct });
    }
  }
  return rows;
}

export type NseSectorResult = {
  sector: string;
  html: string;
  errorCode: string | null;
};

export function nseErrorCode(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  if (/invalid HTTP header parsed|Missing expected CR after header value/i.test(message)) return "INVALID_RESPONSE_HEADERS";
  if (/timeout|timed out|aborted/i.test(message)) return "TIMEOUT";
  return "REQUEST_FAILED";
}

// Deliberately retain strict TLS/HTTP parsing. NSE currently emits bare LF in
// its CSP response header; retries do not repair that upstream defect.
export async function fetchNseSector(
  sector: string,
  request: typeof fetch = fetch,
  attempts = 2,
): Promise<NseSectorResult> {
  let errorCode = "REQUEST_FAILED";
  for (let attempt = 0; attempt < attempts; attempt++) {
    try {
      const response = await request(NSE_MARKET_STATS_AJAX, {
        method: "POST",
        headers: {
          "User-Agent": "Mozilla/5.0",
          "Accept": "application/json",
          "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
          "Referer": NSE_MARKET_STATS_PAGE,
        },
        body: new URLSearchParams({ action: "display_prices", sector }).toString(),
        signal: AbortSignal.timeout(12_000),
      });
      if (response.ok) {
        const html = await response.text();
        return { sector, html, errorCode: html.trim() ? null : "EMPTY_RESPONSE" };
      }
      errorCode = `HTTP_${response.status}`;
      await response.body?.cancel();
    } catch (error) {
      errorCode = nseErrorCode(error);
      if (errorCode === "INVALID_RESPONSE_HEADERS") break;
    }
    if (attempt + 1 < attempts) await new Promise((resolve) => setTimeout(resolve, 300));
  }
  return { sector, html: "", errorCode };
}

export function summarizeNseFallback(responses: NseSectorResult[], quoteCount: number) {
  const failed = responses.filter((response) => response.errorCode);
  return {
    status: quoteCount === 0 ? "fallback_unavailable" : failed.length ? "partial_failure" : "available",
    sectors_requested: responses.length,
    sectors_failed: failed.length,
    quotes: quoteCount,
    failures: failed.map(({ sector, errorCode }) => ({ sector, code: errorCode })),
  };
}
