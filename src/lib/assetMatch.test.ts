import { describe, it, expect } from "vitest";
import { normalizeName, buildNameIndex, resolveAsset } from "@/lib/assetMatch";

describe("assetMatch.normalizeName", () => {
  it("lowercases, strips punctuation, collapses whitespace", () => {
    expect(normalizeName("CIC  Money-Market   Fund!")).toBe("cic money market fund");
  });
  it("handles ampersand", () => {
    expect(normalizeName("Old Mutual & Friends")).toBe("old mutual and friends");
  });
  it("returns empty for null/undefined", () => {
    expect(normalizeName(null)).toBe("");
    expect(normalizeName(undefined)).toBe("");
  });
});

describe("assetMatch.resolveAsset", () => {
  const records = [
    { id: "f1", name: "CIC Money Market Fund", ticker: "cic-mmf" },
    { id: "f2", name: "Sanlam Money Market Fund", ticker: "sanlam-mmf" },
    { id: "s1", name: "Safaricom PLC", symbol: "SCOM" },
  ];

  it("prefers asset_id when provided", () => {
    const r = resolveAsset({ asset_id: "f2", asset_name: "Anything else" }, records);
    expect(r?.id).toBe("f2");
  });

  it("falls back to symbol/ticker", () => {
    const r = resolveAsset({ asset_name: "Renamed!", ticker: "SCOM" }, records);
    expect(r?.id).toBe("s1");
  });

  it("falls back to normalized name", () => {
    const r = resolveAsset({ asset_name: "cic  money-market fund" }, records);
    expect(r?.id).toBe("f1");
  });

  it("returns null when nothing matches (no crash)", () => {
    const r = resolveAsset({ asset_name: "Mystery Bond" }, records);
    expect(r).toBeNull();
  });

  it("buildNameIndex skips duplicates after the first", () => {
    const idx = buildNameIndex(
      [{ name: "Same Name", id: "a" }, { name: "Same Name", id: "b" }],
      "name",
    );
    expect(idx.get("same name")).toEqual({ name: "Same Name", id: "a" });
  });
});
