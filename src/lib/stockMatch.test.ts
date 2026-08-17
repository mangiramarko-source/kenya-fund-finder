import { describe, expect, it } from "vitest";
import { matchStockDeterministically } from "../../supabase/functions/_shared/stock-match";

const stocks = [
  { id: "scom", symbol: "SCOM", name: "Safaricom PLC" },
  { id: "ncba", symbol: "NCBA", name: "NCBA Group PLC" },
  { id: "eabl", symbol: "EABL", name: "East African Breweries PLC" },
];

describe("matchStockDeterministically", () => {
  it("matches a company name after removing legal suffixes", () => {
    expect(matchStockDeterministically("Safaricom introduces new customer prefixes", stocks)?.id).toBe("scom");
  });

  it("matches an exact NSE symbol", () => {
    expect(matchStockDeterministically("New NCBA control bid advances", stocks)?.id).toBe("ncba");
  });

  it("does not match partial words", () => {
    expect(matchStockDeterministically("Telecom companies expand across Africa", stocks)).toBeNull();
  });

  it("does not reduce multi-word brands to a generic word", () => {
    const standard = [{ id: "sgl", symbol: "SGL", name: "Standard Group PLC" }];
    expect(matchStockDeterministically("Gas flowed at a standard rate in Angola", standard)).toBeNull();
  });

  it("rejects equally strong ambiguous matches", () => {
    const duplicates = [
      { id: "one", symbol: "AAA", name: "Example One PLC" },
      { id: "two", symbol: "AAA", name: "Example Two PLC" },
    ];
    expect(matchStockDeterministically("AAA publishes results", duplicates)).toBeNull();
  });

  it("does not match an ambiguous ticker used as an ordinary word", () => {
    const port = [{ id: "port", symbol: "PORT", name: "East African Portland Cement PLC" }];
    expect(matchStockDeterministically("Mombasa port handles record cargo volumes", port)).toBeNull();
  });

  it("accepts an explicitly tagged ambiguous ticker", () => {
    const port = [{ id: "port", symbol: "PORT", name: "East African Portland Cement PLC" }];
    expect(matchStockDeterministically("NSE:PORT releases its annual results", port)?.id).toBe("port");
  });

  it("does not match Safaricom from generic telecom context", () => {
    expect(matchStockDeterministically("Kenya leads Africa in mobile internet usage", stocks)).toBeNull();
  });
});
