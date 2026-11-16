import { beforeEach, describe, expect, it } from "vitest";
import {
  buildStocksRouteUrl,
  EAST_AFRICAN_MARKETS,
  getEastAfricanMarketMeta,
  parseStockExchangeCode,
  resolveSelectedStockExchange,
  writeStoredStockExchange,
} from "./stockExchangeSelection";
import { getCountryFlagUrl, getCurrencyFlagUrl } from "./currencyBranding";
import { getStockLogoUrl, resolveTickerSymbol } from "./stockBranding";

describe("East African stock exchange selection & branding", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("defines Kenya (NSE), Uganda (USE), Tanzania (DSE), and Rwanda (RSE)", () => {
    expect(EAST_AFRICAN_MARKETS.map((m) => m.exchange)).toEqual(["NSE", "USE", "DSE", "RSE"]);
    expect(EAST_AFRICAN_MARKETS.map((m) => m.currency)).toEqual(["KES", "UGX", "TZS", "RWF"]);
    expect(EAST_AFRICAN_MARKETS.map((m) => m.countryCode)).toEqual(["KE", "UG", "TZ", "RW"]);
  });

  it("parses exchange codes and country aliases accurately", () => {
    expect(parseStockExchangeCode("use")).toBe("USE");
    expect(parseStockExchangeCode("UG")).toBe("USE");
    expect(parseStockExchangeCode("Uganda")).toBe("USE");
    expect(parseStockExchangeCode("tz")).toBe("DSE");
    expect(parseStockExchangeCode("rwanda")).toBe("RSE");
    expect(parseStockExchangeCode("ke")).toBe("NSE");
    expect(parseStockExchangeCode("unknown")).toBeNull();
  });

  it("resolves URL query params with localStorage fallback and clean NSE URLs", () => {
    expect(resolveSelectedStockExchange("")).toBe("NSE");

    writeStoredStockExchange("DSE");
    expect(resolveSelectedStockExchange("")).toBe("DSE");

    expect(resolveSelectedStockExchange("?exchange=USE")).toBe("USE");
    expect(resolveSelectedStockExchange("?country=RW")).toBe("RSE");

    expect(buildStocksRouteUrl("NSE")).toBe("/stocks");
    expect(buildStocksRouteUrl("USE")).toBe("/stocks?exchange=USE");
    expect(buildStocksRouteUrl("RSE", "?country=UG")).toBe("/stocks?exchange=RSE");
    expect(getEastAfricanMarketMeta("USE").currency).toBe("UGX");
  });

  it("provides flag URLs for KE, UG, TZ, and RW", () => {
    expect(getCountryFlagUrl("KE")).toBe("https://flagcdn.com/w80/ke.png");
    expect(getCountryFlagUrl("UG")).toBe("https://flagcdn.com/w80/ug.png");
    expect(getCountryFlagUrl("TZ")).toBe("https://flagcdn.com/w80/tz.png");
    expect(getCountryFlagUrl("RW")).toBe("https://flagcdn.com/w80/rw.png");
    expect(getCurrencyFlagUrl("RWF")).toBe("https://flagcdn.com/w80/rw.png");
  });

  it("maps cross-listed East African tickers to existing company logos", () => {
    expect(resolveTickerSymbol("USE-KCB")).toBe("KCB");
    expect(resolveTickerSymbol("USE-EBL", "Equity Bank Limited")).toBe("EQTY");
    expect(resolveTickerSymbol("RSE-BOK", "Bank of Kigali Group PLC")).toBe("BKG");
    expect(resolveTickerSymbol("DSE-JHL", "Jubilee Holdings Limited")).toBe("JUB");
    expect(resolveTickerSymbol("USE-KA", "Kenya Airways")).toBe("KQ");
    expect(getStockLogoUrl("USE-EABL")).toBeTruthy();
  });
});
