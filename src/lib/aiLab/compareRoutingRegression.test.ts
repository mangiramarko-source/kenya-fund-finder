// Regression: "compare safaricom and kcb" and its variants must NOT fall
// through to the generic unknown fallback. Covers:
//  - parseCompareSides
//  - routePrompt returning kind: "compare" for known assets
//  - composeAssistantResponse preserving router-supplied unknown messages
//    (ambiguous / not-found) instead of the generic "I'm not sure I caught that"
//  - websiteLookup guard rejecting compare-shaped prompts (no `compare` prefix)
//  - safety refusal still wins for advisory framing
//  - Gemini educational classifier NOT triggering on comparison prompts

import { describe, it, expect } from "vitest";
import { routePrompt, UNKNOWN_FALLBACK_MSG } from "./router";
import { composeAssistantResponse } from "./responseComposer";
import { parseCompareSides, resolveAssetMatch } from "./nameMatch";
import { isWebsiteLookupPrompt } from "./websiteLookup";
import { classifyEducational } from "./educationalClassifier";
import type { ComparableAsset, MarketContext } from "./marketContext";

const stock = (
  symbol: string,
  name: string,
  price: number,
  aliases: string[] = [],
): ComparableAsset => ({
  kind: "stock",
  symbol,
  name,
  value: price,
  valueLabel: "Price (KES)",
  changePct: 0.5,
  aliases: [symbol.toLowerCase(), name.toLowerCase(), ...aliases],
});

const fund = (name: string, yieldPct: number, aliases: string[] = []): ComparableAsset => ({
  kind: "fund",
  symbol: name,
  name,
  value: yieldPct,
  valueLabel: "Annual yield (%)",
  changePct: null,
  aliases,
});

// Mirrors the shape of live marketContext.assets: multiple stocks plus a
// few brand-shared funds so "britam" / "cic" hit ambiguity.
const ctx: MarketContext = {
  fundCount: 0,
  avgAnnualYieldPct: null,
  topAnnualYieldPct: null,
  lowAnnualYieldPct: null,
  sampleStockSymbol: null,
  sampleStockPrice: null,
  sampleStockChangePct: null,
  assets: [
    stock("SCOM", "Safaricom PLC", 18.5, ["safaricom"]),
    stock("KCB", "KCB Group", 42.0),
    stock("EQTY", "Equity Group Holdings", 44.1, ["equity"]),
    stock("ABSA", "Absa Bank Kenya", 15.2, ["absa"]),
    stock("COOP", "Co-operative Bank of Kenya", 13.4, ["coop", "co op"]),
    stock("NCBA", "NCBA Group", 55.0, ["ncba"]),
    fund("Britam Money Market Fund", 11.2, ["britam", "mmf"]),
    fund("Britam Balanced Fund", 8.4, ["britam"]),
    fund("CIC Money Market Fund", 12.1, ["cic", "mmf"]),
    fund("CIC Balanced Fund", 9.0, ["cic"]),
  ],
  fetchedAt: new Date().toISOString(),
};

describe("parseCompareSides — variants that must resolve", () => {
  it.each([
    ["compare safaricom and kcb", "safaricom", "kcb"],
    ["safaricom vs kcb", "safaricom", "kcb"],
    ["compare scom and kcb", "scom", "kcb"],
    ["difference between safaricom and kcb", "safaricom", "kcb"],
    ["how does safaricom compare to kcb", "safaricom", "kcb"],
    ["compare kcb and equity", "kcb", "equity"],
    ["compare britam and cic", "britam", "cic"],
  ])("parses %s", (prompt, left, right) => {
    const sides = parseCompareSides(prompt);
    expect(sides).not.toBeNull();
    expect(sides!.left.toLowerCase()).toBe(left);
    expect(sides!.right.toLowerCase()).toBe(right);
  });
});

describe("resolveAssetMatch — key aliases", () => {
  it("safaricom -> SCOM", () => {
    expect(resolveAssetMatch("safaricom", ctx.assets).asset?.symbol).toBe("SCOM");
  });
  it("kcb -> KCB", () => {
    expect(resolveAssetMatch("kcb", ctx.assets).asset?.symbol).toBe("KCB");
  });
  it("equity -> EQTY", () => {
    expect(resolveAssetMatch("equity", ctx.assets).asset?.symbol).toBe("EQTY");
  });
});

describe("routePrompt — compare regression", () => {
  const compareOrClarification = (prompt: string) => {
    const r = routePrompt(prompt, ctx);
    expect(r.kind).not.toBe("refusal");
    // Must NOT be the generic unknown fallback message.
    if (r.kind === "unknown") {
      expect(r.message).not.toBe(UNKNOWN_FALLBACK_MSG);
    }
    return r;
  };

  it("compare safaricom and kcb -> compare", () => {
    const r = compareOrClarification("compare safaricom and kcb");
    expect(r.kind).toBe("compare");
  });

  it("safaricom vs kcb -> compare", () => {
    const r = compareOrClarification("safaricom vs kcb");
    expect(r.kind).toBe("compare");
  });

  it("compare scom and kcb -> compare", () => {
    const r = compareOrClarification("compare scom and kcb");
    expect(r.kind).toBe("compare");
  });

  it("compare britam and cic -> ambiguous clarification (not generic unknown)", () => {
    const r = routePrompt("compare britam and cic", ctx);
    // Either the router picked a canonical single match or (more likely) it
    // returned an ambiguous clarification — but never the generic fallback.
    if (r.kind === "unknown") {
      expect(r.message).not.toBe(UNKNOWN_FALLBACK_MSG);
      expect(r.message.toLowerCase()).toMatch(/(britam|cic|several matches)/);
    } else {
      expect(r.kind).toBe("compare");
    }
  });
});

describe("composeAssistantResponse — preserves router unknown messages", () => {
  it("shows the compare not-found message, not the generic fallback", () => {
    const r = routePrompt("compare foobar and bazbar", ctx);
    expect(r.kind).toBe("unknown");
    const { text } = composeAssistantResponse({ prompt: "compare foobar and bazbar", result: r });
    expect(text).not.toMatch(/I'm not sure I caught that/);
    expect(text.toLowerCase()).toMatch(/couldn.t find|foobar|bazbar/);
  });
});

describe("safety refusal still wins", () => {
  it('"should I buy safaricom or kcb" refuses', () => {
    const r = routePrompt("should I buy safaricom or kcb", ctx);
    expect(r.kind).toBe("refusal");
  });
  it('"which is better safaricom or kcb" refuses', () => {
    const r = routePrompt("which is better safaricom or kcb", ctx);
    expect(r.kind).toBe("refusal");
  });
});

describe("website lookup does not swallow compare prompts", () => {
  it.each([
    "compare safaricom and kcb",
    "safaricom vs kcb",
    "difference between safaricom and kcb",
    "how does safaricom compare to kcb",
  ])("rejects %s", (prompt) => {
    expect(isWebsiteLookupPrompt(prompt)).toBe(false);
  });
});

describe("gemini educational classifier does not fire on compare prompts", () => {
  it.each([
    "compare safaricom and kcb",
    "safaricom vs kcb",
    "difference between safaricom and kcb",
    "how does safaricom compare to kcb",
    "compare britam and cic",
  ])("skips %s", (prompt) => {
    expect(classifyEducational(prompt)).toBe(false);
  });
});
