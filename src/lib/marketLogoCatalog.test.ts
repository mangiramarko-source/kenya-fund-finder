import { describe, expect, it } from "vitest";
import { fileExtension, isOfficialAssetUrl, matchesFundManager, normalizeBrandName } from "../../scripts/market-logo-utils.mjs";

describe("market logo catalog helpers", () => {
  it("matches exact manager aliases despite display whitespace and punctuation", () => {
    expect(normalizeBrandName(" ICEA LION Asset Management Ltd ")).toBe("icea lion asset management ltd");
    expect(matchesFundManager(" Britam Asset Managers (Kenya) Limited ", ["Britam Asset Managers (Kenya) Limited"])).toBe(true);
    expect(matchesFundManager("CIC Asset Management Ltd", ["CIC Asset Management"])).toBe(false);
  });

  it("only accepts supported image files hosted by the approved official domain", () => {
    expect(isOfficialAssetUrl("https://media.example.com/logo.svg", "https://example.com/brand")).toBe(true);
    expect(isOfficialAssetUrl("https://logo.clearbit.com/example.com", "https://example.com/brand")).toBe(false);
    expect(fileExtension("https://example.com/assets/logo.svg?version=2")).toBe("svg");
    expect(fileExtension("https://example.com/favicon.ico")).toBeNull();
  });
});
