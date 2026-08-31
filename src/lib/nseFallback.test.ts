import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fetchNseSector, NSE_MARKET_STATS_AJAX, parseNseQuoteRows, parseNseSnapshotDate, summarizeNseFallback } from "../../supabase/functions/fetch-market-data/nse-fallback";

// Representative structure; no live provider request is made by these tests.
const html = `<h4>Statistics as of 31-Aug-2026</h4><table>
  <tr><th>Company</th><th>ISIN</th><th>Volume</th><th>Price</th><th>Change</th></tr>
  <tr><td><a>Nairobi Securities Exchange</a></td><td>KE3000009674</td><td>1,371,575</td><td>27.55</td><td>+5.76%</td></tr>
  <tr><td>Other company</td><td>TEST</td><td>100</td><td>279.25</td><td>-0.27%</td></tr>
</table>`;

// jsdom lacks AbortSignal.timeout; the Edge runtime supplies it natively.
beforeEach(() => vi.stubGlobal("AbortSignal", {
  timeout: vi.fn(() => new AbortController().signal),
}));
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("official NSE fallback diagnostics", () => {
  it("keeps the official endpoint and form request construction", async () => {
    const request = vi.fn<typeof fetch>().mockResolvedValue(new Response(html));
    const result = await fetchNseSector("investse", request);
    expect(request).toHaveBeenCalledOnce();
    expect(request).toHaveBeenCalledWith(NSE_MARKET_STATS_AJAX, expect.objectContaining({
      method: "POST", body: "action=display_prices&sector=investse", signal: expect.objectContaining({ aborted: false }),
      headers: expect.objectContaining({ "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8" }),
    }));
    expect(AbortSignal.timeout).toHaveBeenCalledWith(12000);
    expect(result).toEqual({ sector: "investse", html, errorCode: null });
    expect(parseNseSnapshotDate(html)).toBe("2026-08-31");
    expect(parseNseQuoteRows(html)).toEqual([
      { company: "Nairobi Securities Exchange", volume: 1371575, price: 27.55, changePct: 5.76 },
      { company: "Other company", volume: 100, price: 279.25, changePct: -0.27 },
    ]);
  });

  it.each(["invalid HTTP header parsed", "Missing expected CR after header value"])("classifies malformed headers and avoids futile retries: %s", async (message) => {
    const request = vi.fn<typeof fetch>().mockRejectedValue(new Error(message));
    const result = await fetchNseSector("investse", request);
    expect(request).toHaveBeenCalledOnce();
    expect(result.errorCode).toBe("INVALID_RESPONSE_HEADERS");
    expect(summarizeNseFallback([result], 0)).toEqual({
      status: "fallback_unavailable", sectors_requested: 1, sectors_failed: 1, quotes: 0,
      failures: [{ sector: "investse", code: "INVALID_RESPONSE_HEADERS" }],
    });
  });

  it("retains bounded retries for transient failures", async () => {
    vi.useFakeTimers();
    const request = vi.fn<typeof fetch>().mockResolvedValueOnce(new Response("unavailable", { status: 503 })).mockResolvedValueOnce(new Response(html));
    const pending = fetchNseSector("investse", request);
    await vi.runAllTimersAsync();
    expect((await pending).errorCode).toBeNull();
    expect(request).toHaveBeenCalledTimes(2);
  });

  it.each([
    ["request timed out", "TIMEOUT"], ["aborted", "TIMEOUT"], ["network failure", "REQUEST_FAILED"],
  ])("reports request failure %s safely", async (message, code) => {
    const request = vi.fn<typeof fetch>().mockRejectedValue(new Error(message));
    expect((await fetchNseSector("investse", request, 1)).errorCode).toBe(code);
  });

  it("reports unsuccessful HTTP responses and empty response bodies", async () => {
    const request = vi.fn<typeof fetch>().mockResolvedValueOnce(new Response("denied", { status: 403 })).mockResolvedValueOnce(new Response("  "));
    expect((await fetchNseSector("investse", request, 1)).errorCode).toBe("HTTP_403");
    expect((await fetchNseSector("investse", request, 1)).errorCode).toBe("EMPTY_RESPONSE");
    expect(parseNseQuoteRows("<html>challenge page</html>")).toEqual([]);
    expect(parseNseSnapshotDate("<html>challenge page</html>")).toBeNull();
  });

  it("distinguishes partial fallback failure from complete availability", () => {
    expect(summarizeNseFallback([{ sector: "investse", html, errorCode: null }, { sector: "banking", html: "", errorCode: "NO_QUOTE_ROWS" }], 1).status).toBe("partial_failure");
    expect(summarizeNseFallback([{ sector: "investse", html, errorCode: null }], 1).status).toBe("available");
    expect(summarizeNseFallback([], 0).status).toBe("fallback_unavailable");
  });
});
