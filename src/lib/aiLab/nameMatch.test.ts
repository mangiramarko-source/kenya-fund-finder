import { describe, it, expect } from "vitest";
import type { ComparableAsset } from "./marketContext";
import {
  normalizeInstrumentQuery,
  parseCompareSides,
  resolveAssetMatch,
} from "./nameMatch";

const mkStock = (symbol: string, name: string, aliases: string[] = []): ComparableAsset => ({
  kind: "stock",
  symbol,
  name,
  value: 10,
  valueLabel: "Price (KES)",
  changePct: 0,
  aliases: [symbol.toLowerCase(), name.toLowerCase(), ...aliases],
});

const mkFund = (name: string, aliases: string[] = []): ComparableAsset => ({
  kind: "fund",
  symbol: name,
  name,
  value: 11,
  valueLabel: "Annual yield (%)",
  changePct: null,
  aliases,
});

const stocks: ComparableAsset[] = [
  mkStock("SCOM", "Safaricom", ["safaricom"]),
  mkStock("KCB", "KCB Group", ["kcb"]),
  mkStock("EQTY", "Equity Group", ["equity"]),
  mkStock("NCBA", "NCBA Group", ["ncba"]),
];

const assets: ComparableAsset[] = [
  ...stocks,
  mkFund("Britam Money Market Fund", ["britam", "mmf"]),
  mkFund("Britam Balanced Fund", ["britam"]),
  mkFund("CIC Money Market Fund", ["cic", "mmf"]),
];

describe("normalizeInstrumentQuery", () => {
  it("strips noise words and punctuation", () => {
    expect(normalizeInstrumentQuery("Safaricom stock!")).toBe("scom");
    expect(normalizeInstrumentQuery("Britam MMF")).toBe("britam");
    expect(normalizeInstrumentQuery("  KCB Group plc  ")).toBe("kcb");
  });
});

describe("resolveAssetMatch fuzzy lookup", () => {
  it("matches safaricom variants", () => {
    expect(resolveAssetMatch("safaricom", stocks).asset?.symbol).toBe("SCOM");
    expect(resolveAssetMatch("safaricom stock", stocks).asset?.symbol).toBe("SCOM");
    expect(resolveAssetMatch("scom", stocks).asset?.symbol).toBe("SCOM");
    expect(resolveAssetMatch("saf", stocks).asset?.symbol).toBe("SCOM");
  });

  it("matches bank tickers and names", () => {
    expect(resolveAssetMatch("kcb", stocks).asset?.symbol).toBe("KCB");
    expect(resolveAssetMatch("equity", stocks).asset?.symbol).toBe("EQTY");
    expect(resolveAssetMatch("ncba", stocks).asset?.symbol).toBe("NCBA");
  });

  it("flags ambiguous britam fund matches", () => {
    const result = resolveAssetMatch("britam", assets.filter((a) => a.kind === "fund"));
    expect(result.status).toBe("ambiguous");
    expect(result.candidates.length).toBeGreaterThan(1);
  });

  it("resolves cic mmf when mmf context is present", () => {
    const result = resolveAssetMatch("cic mmf", assets);
    expect(result.status).toBe("match");
    expect(result.asset?.name).toContain("CIC");
  });
});

describe("parseCompareSides", () => {
  it("parses compare and vs patterns", () => {
    expect(parseCompareSides("compare safaricom and kcb")).toEqual({
      left: "safaricom",
      right: "kcb",
    });
    expect(parseCompareSides("safaricom vs kcb")).toEqual({
      left: "safaricom",
      right: "kcb",
    });
    expect(parseCompareSides("compare scom with kcb")).toEqual({
      left: "scom",
      right: "kcb",
    });
    expect(parseCompareSides("difference between kcb and equity")).toEqual({
      left: "kcb",
      right: "equity",
    });
  });
});
