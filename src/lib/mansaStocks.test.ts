import { beforeEach, describe, expect, it } from "vitest";
import {
  formatCanonicalStockSymbol,
  inferStockSector,
  isFixedIncomeInstrument,
  parseMansaExchangeStocksResponse,
  shouldSkipMansaExchangeRefresh,
  VALID_STOCK_SYMBOL_RE,
} from "../../supabase/functions/fetch-market-data/mansa-stocks";
import { getStockCurrencySymbol, normalizeStock, stockCache } from "./stockCache";

describe("Mansa API East African stocks parser & safeguards", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("filters out all 6 fixed-income Treasury and Corporate bonds from Mansa's USE stocks endpoint", () => {
    const usePayload = {
      stocks: [
        { ticker: "MTNU", name: "MTN Uganda Ltd", price: 270.0, change_pct: 1.12, volume: 452000, sector: null },
        { ticker: "AIRTEL_UGANDA", name: "Airtel Uganda PLC", price: 95.0, change_pct: 0, volume: 120000, sector: null },
        { ticker: "SBU", name: "Stanbic Uganda Holdings Ltd", price: 46.0, change_pct: 2.22, volume: 890000, sector: null },
        { ticker: "EBL", name: "Equity Bank Limited", price: 1250.0, change_pct: 0, volume: 0, sector: null },
        { ticker: "FXD_2_2015_15", name: "FXD 2/2015/15 Yr Treasury Bond", price: 100.0, change_pct: 0, volume: 0, market_cap: 581_000_000_000_000 },
        { ticker: "FXD_12_2013_15", name: "FXD 12/2013/15", price: 98.5, change_pct: 0, volume: 0, market_cap: 420_000_000_000_000 },
        { ticker: "FXD_07_2019_15", name: "FXD 07/2019/15", price: 101.2, change_pct: 0, volume: 0, market_cap: 310_000_000_000_000 },
        { ticker: "PLAT_FXD_01_26_3", name: "Platinum Credit Fixed Rate Note 3Yr", price: 100.0, change_pct: 0, volume: 0 },
        { ticker: "PLAT_FXD_01_26_5", name: "Platinum Credit Fixed Rate Note 5Yr", price: 100.0, change_pct: 0, volume: 0 },
        { ticker: "PLAT_FXD_01_26_8", name: "Platinum Credit Fixed Rate Note 8Yr", price: 100.0, change_pct: 0, volume: 0 },
      ],
      count: 10,
    };

    const parsed = parseMansaExchangeStocksResponse(usePayload, "USE");

    expect(parsed.diagnostics.returned).toBe(10);
    expect(parsed.diagnostics.filtered_bonds_count).toBe(6);
    expect(parsed.diagnostics.filtered_bonds).toEqual([
      "FXD_2_2015_15",
      "FXD_12_2013_15",
      "FXD_07_2019_15",
      "PLAT_FXD_01_26_3",
      "PLAT_FXD_01_26_5",
      "PLAT_FXD_01_26_8",
    ]);
    expect(parsed.quotes.size).toBe(4);
    expect(Array.from(parsed.quotes.keys())).toEqual([
      "USE-MTNU",
      "USE-AIRTEL_UGANDA",
      "USE-SBU",
      "USE-EBL",
    ]);

    const airtel = parsed.quotes.get("USE-AIRTEL_UGANDA")!;
    expect(airtel.exchange).toBe("USE");
    expect(airtel.exchangeTicker).toBe("AIRTEL_UGANDA");
    expect(airtel.currency).toBe("UGX");
    expect(airtel.countryCode).toBe("UG");
    expect(airtel.sector).toBe("Telecommunications");
    expect(VALID_STOCK_SYMBOL_RE.test(airtel.symbol)).toBe(true);
  });

  it("correctly identifies fixed-income tickers and bond names", () => {
    expect(isFixedIncomeInstrument("FXD_2_2015_15")).toBe(true);
    expect(isFixedIncomeInstrument("PLAT_FXD_01_26_3")).toBe(true);
    expect(isFixedIncomeInstrument("IFB1_2024_10")).toBe(true);
    expect(isFixedIncomeInstrument("UNKNOWN", "Uganda Government 07/2019/15 Bond")).toBe(true);
    expect(isFixedIncomeInstrument("MTNU", "MTN Uganda Limited")).toBe(false);
    expect(isFixedIncomeInstrument("AIRTEL_UGANDA", "Airtel Uganda PLC")).toBe(false);
  });

  it("disambiguates cross-listed tickers across NSE, USE, DSE, and RSE", () => {
    expect(formatCanonicalStockSymbol("NSE", "KCB")).toBe("KCB");
    expect(formatCanonicalStockSymbol("USE", "KCB")).toBe("USE-KCB");
    expect(formatCanonicalStockSymbol("DSE", "KCB")).toBe("DSE-KCB");
    expect(formatCanonicalStockSymbol("RSE", "KCB")).toBe("RSE-KCB");
    expect(formatCanonicalStockSymbol("RSE", "BOK")).toBe("RSE-BOK");
    expect(formatCanonicalStockSymbol("USE", "AIRTEL_UGANDA")).toBe("USE-AIRTEL_UGANDA");
  });

  it("infers clean sectors when Mansa returns sector: null for USE, DSE, and RSE stocks", () => {
    expect(inferStockSector("Bank of Kigali Group PLC", "BOK", null)).toBe("Banking");
    expect(inferStockSector("CRDB Bank Plc", "CRDB", null)).toBe("Banking");
    expect(inferStockSector("Equity Bank Limited", "EBL", null)).toBe("Banking");
    expect(inferStockSector("MTN Rwandacell PLC", "MTNR", null)).toBe("Telecommunications");
    expect(inferStockSector("Airtel Uganda PLC", "AIRTEL_UGANDA", null)).toBe("Telecommunications");
    expect(inferStockSector("Bralirwa Plc", "BLR", null)).toBe("Manufacturing & Allied");
    expect(inferStockSector("Cimerwa Plc", "CMR", null)).toBe("Manufacturing & Allied");
    expect(inferStockSector("Tanzania Breweries Limited", "TBL", null)).toBe("Manufacturing & Allied");
    expect(inferStockSector("Jubilee Holdings Limited", "JHL", null)).toBe("Insurance");
    expect(inferStockSector("NIC Holdings Ltd", "NIC", null)).toBe("Insurance");
    expect(inferStockSector("Umeme Limited", "UMME", null)).toBe("Energy & Petroleum");
    expect(inferStockSector("Kenya Airways Plc", "KA", null)).toBe("Commercial & Services");
    expect(inferStockSector("Dar es Salaam Stock Exchange PLC", "DSE", null)).toBe("Commercial & Services");
    expect(inferStockSector("Centum Investment Company Plc", "CENT", null)).toBe("Investment");
    expect(inferStockSector("NICO Holdings Plc", "NICO", null)).toBe("Investment");
    expect(inferStockSector("Urafiki Textile Mill Company Limited", "USL", null)).toBe("Manufacturing & Allied");
    expect(inferStockSector("Uchumi Supermarket PLC", "USL", null)).toBe("Commercial & Services");
    expect(inferStockSector("JATU Limited", "JATU", null)).toBe("Agricultural");
    expect(inferStockSector("RH Bophelo PLC", "RHB", null)).toBe("Investment");
  });

  it("enforces the 90-minute wall-clock throttle using DB updated_at even when prices are 0% unchanged", () => {
    const nowMs = Date.parse("2026-11-16T12:00:00.000Z");

    // Empty exchange (not seeded yet) -> must NOT skip
    expect(shouldSkipMansaExchangeRefresh([], "USE", nowMs, 90).skip).toBe(false);

    // Synced 45 minutes ago (even though upstream trade was 3 days ago) -> MUST skip
    const rowsRecent = [
      {
        exchange: "RSE",
        quote_source: "mansa",
        updated_at: "2026-11-16T11:15:00.000Z",
      },
    ];
    const recentCheck = shouldSkipMansaExchangeRefresh(rowsRecent, "RSE", nowMs, 90);
    expect(recentCheck.skip).toBe(true);
    expect(recentCheck.ageMinutes).toBe(45);

    // Synced 95 minutes ago -> must NOT skip
    const rowsStale = [
      {
        exchange: "RSE",
        quote_source: "mansa",
        updated_at: "2026-11-16T10:25:00.000Z",
      },
    ];
    const staleCheck = shouldSkipMansaExchangeRefresh(rowsStale, "RSE", nowMs, 90);
    expect(staleCheck.skip).toBe(false);
    expect(staleCheck.ageMinutes).toBe(95);
  });

  it("isolates stockCache by exchange so regional stocks never leak into default NSE cache", () => {
    const nseStock = normalizeStock({
      id: "nse-scom",
      symbol: "SCOM",
      exchange: "NSE",
      currency: "KES",
      name: "Safaricom PLC",
      sector: "Telecommunications",
      price: 30.5,
      previous_price: 30.0,
      day_change: 0.5,
      day_change_percent: 1.67,
      volume: 1000000,
      updated_at: "2026-11-16T10:00:00Z",
    });

    const useStock = normalizeStock({
      id: "use-mtnu",
      symbol: "USE-MTNU",
      exchange: "USE",
      exchange_ticker: "MTNU",
      currency: "UGX",
      name: "MTN Uganda Ltd",
      sector: "Telecommunications",
      price: 270,
      previous_price: 270,
      day_change: 0,
      day_change_percent: 0,
      volume: 50000,
      updated_at: "2026-11-16T10:00:00Z",
    });

    stockCache.saveStocks([nseStock], "NSE");
    stockCache.upsertStock(useStock);

    // Default loadStocks() returns strictly NSE stocks
    const defaultLoaded = stockCache.loadStocks();
    expect(defaultLoaded?.stocks.map((s) => s.symbol)).toEqual(["SCOM"]);

    // Explicitly loading USE returns USE-MTNU
    const useLoaded = stockCache.loadStocks("USE");
    expect(useLoaded?.stocks.map((s) => s.symbol)).toEqual(["USE-MTNU"]);

    // Direct lookup by symbol finds both
    expect(stockCache.findStockBySymbol("USE-MTNU")?.currency).toBe("UGX");
    expect(getStockCurrencySymbol("UGX")).toBe("USh");
    expect(getStockCurrencySymbol("TZS")).toBe("TSh");
    expect(getStockCurrencySymbol("RWF")).toBe("FRw");
    expect(getStockCurrencySymbol("KES")).toBe("KSh");
  });
});
