import { beforeEach, describe, expect, it, vi } from "vitest";
import { processAiLabUserPrompt, type AiLabSessionContext } from "./chat";
import { inferCommonNaturalLanguageIntent, type NaturalLanguageIntent } from "./naturalLanguageIntent";
import type { MarketContext } from "./marketContext";

vi.mock("@/lib/gateway", () => ({ fetchPublicData: vi.fn() }));
import { fetchPublicData } from "@/lib/gateway";

const ctx: MarketContext = {
  fundCount: 2,
  avgAnnualYieldPct: 10.5,
  topAnnualYieldPct: 11,
  lowAnnualYieldPct: 10,
  sampleStockSymbol: "SCOM",
  sampleStockPrice: 38,
  sampleStockChangePct: 1.5,
  fetchedAt: "2026-09-08T08:00:00Z",
  assets: [
    { kind: "stock", id: "s1", symbol: "SCOM", name: "Safaricom", value: 38, valueLabel: "Price (KES)", changePct: 1.5, aliases: ["scom", "safaricom", "safcom"] },
    { kind: "stock", id: "s2", symbol: "KCB", name: "KCB Group", value: 55, valueLabel: "Price (KES)", changePct: -0.5, aliases: ["kcb", "kcb group"] },
    { kind: "fund", id: "f1", symbol: "Etica Money Market Fund", name: "Etica Money Market Fund", value: 11, valueLabel: "Annual yield (%)", changePct: null, aliases: ["etica", "etica mmf"] },
    { kind: "fx", id: "x1", symbol: "USD", name: "US Dollar", value: 129, valueLabel: "KES per 1 unit", changePct: 0.1, aliases: ["usd", "dollar"] },
    { kind: "commodity", id: "c1", symbol: "GOLD", name: "Gold", value: 2500, valueLabel: "Price (USD/oz)", changePct: 0.3, aliases: ["gold"] },
  ],
};

beforeEach(() => {
  vi.mocked(fetchPublicData).mockImplementation(async (resource, options) => {
    if (resource === "stocks") {
      const symbol = options?.filters?.symbol ?? "SCOM";
      return {
        resource, count: 1, limit: 1, offset: 0,
        data: [{
          symbol,
          name: symbol === "KCB" ? "KCB Group" : "Safaricom",
          price: symbol === "KCB" ? 55 : 38,
          day_change_percent: symbol === "KCB" ? -0.5 : 1.5,
          company_summary: symbol === "KCB" ? "A regional banking group." : "A Kenyan technology and communications company.",
          updated_at: "2026-09-08T08:00:00Z",
        }],
      } as never;
    }
    if (resource === "funds") {
      return {
        resource, count: 2, limit: 200, offset: 0,
        data: [
          { slug: "etica-mmf", name: "Etica Money Market Fund", manager: "Etica", annual_yield: 11, fund_type: "money_market" },
          { slug: "cic-mmf", name: "CIC Money Market Fund", manager: "CIC", annual_yield: 10, fund_type: "money_market" },
        ],
      } as never;
    }
    return { resource, count: 0, limit: 50, offset: 0, data: [] } as never;
  });
});

describe("natural-language AI Lab flow", () => {
  it("answers the reported Safaricom wording with grounded data", async () => {
    const out = await processAiLabUserPrompt("help me understand safaricom stocks", ctx, null, { naturalLanguage: true });
    expect(out.result?.kind).toBe("website-lookup");
    expect(out.text).toContain("Safaricom (SCOM)");
    expect(out.text).toMatch(/KES|Ksh/);
    expect(out.text).toContain("technology and communications");
  });

  it("understands a Kenyan mixed-language stock phrase", async () => {
    const out = await processAiLabUserPrompt("nipe info kuhusu shares za Safaricom", ctx, null, { naturalLanguage: true });
    expect(out.result?.kind).toBe("website-lookup");
    expect(out.text).toContain("SCOM");
  });

  it("uses prior asset type for a short contextual follow-up", async () => {
    const session: AiLabSessionContext = { lastAssetQuery: "SCOM", lastAssetKind: "stock", lastScenarioKind: "website-lookup" };
    const out = await processAiLabUserPrompt("what about KCB?", ctx, null, { sessionContext: session, naturalLanguage: true });
    expect(out.result?.kind).toBe("website-lookup");
    if (out.result?.kind === "website-lookup") expect(out.result.entitySymbol).toBe("KCB");
  });

  it("uses the prior entity and amount for a movement follow-up", async () => {
    const session: AiLabSessionContext = {
      lastAssetQuery: "SCOM",
      lastAssetKind: "stock",
      lastScenarioKind: "stock-amount",
      lastAmount: 10_000,
    };
    const out = await processAiLabUserPrompt("and if it drops 5%?", ctx, null, { sessionContext: session, naturalLanguage: true });
    expect(out.result?.kind).toBe("stock-move");
    if (out.result?.kind === "stock-move") {
      expect(out.result.inputs.amount).toBe(10_000);
      expect(out.result.inputs.priceChangePct).toBe(-5);
    }
  });

  it("executes structured intents without accepting model market facts", async () => {
    const interpreter = async () => ({
      ok: true,
      intent: { intent: "overview", confidence: "high", assetKind: "stock", entity: "SCOM" } as NaturalLanguageIntent,
    });
    const out = await processAiLabUserPrompt("can u unpack safcom for me", ctx, null, { naturalLanguage: true, interpreter });
    expect(out.result?.kind).toBe("website-lookup");
    expect(out.text).toContain("38");
  });

  it("keeps indirect advice requests behind the refusal boundary", async () => {
    const interpreter = async () => ({ ok: true, intent: { intent: "refusal", confidence: "high" } as NaturalLanguageIntent });
    const out = await processAiLabUserPrompt("would grabbing Safaricom now be smart", ctx, null, { naturalLanguage: true, interpreter });
    expect(out.result?.kind).toBe("refusal");
  });

  it("falls back gracefully when interpretation is unavailable", async () => {
    const out = await processAiLabUserPrompt("totally unclear words here", ctx, null, {
      naturalLanguage: true,
      interpreter: async () => ({ ok: false, reason: "rate_limited" }),
    });
    expect(out.route).toBe("clarifying");
    expect(out.result).toBeUndefined();
    expect(out.text).toContain("Which company, fund, currency, amount, or topic");
    expect(out.text).not.toMatch(/rate.?limit|technical|gemini/i);
  });

  it("keeps a direct structured prompt local without calling the interpreter", async () => {
    const interpreter = vi.fn(async () => ({ ok: true, intent: { intent: "refusal", confidence: "high" } as NaturalLanguageIntent }));
    const out = await processAiLabUserPrompt("KES 10,000 in SCOM", ctx, null, { naturalLanguage: true, interpreter });
    expect(out.result?.kind).toBe("stock-amount");
    expect(interpreter).not.toHaveBeenCalled();
  });

  it("executes a validated model intent through the same asset-aware amount route", async () => {
    const interpreter = vi.fn(async () => ({
      ok: true,
      intent: {
        intent: "scenario",
        confidence: "high",
        assetKind: "stock",
        entity: "SCOM",
        scenarioKind: "asset-amount",
        amount: 10_000,
      } as NaturalLanguageIntent,
    }));
    const out = await processAiLabUserPrompt("KES 10k for Safcom", ctx, null, {
      naturalLanguage: true,
      interpreter,
    });
    expect(interpreter).toHaveBeenCalledOnce();
    expect(out.result?.kind).toBe("stock-amount");
    if (out.result?.kind === "stock-amount") expect(out.result.inputs.symbol).toBe("SCOM");
  });

  it("handles plain performance wording locally before lookup", async () => {
    const interpreter = vi.fn(async () => ({
      ok: true,
      intent: { intent: "overview", confidence: "high", assetKind: "stock", entity: "SCOM" } as NaturalLanguageIntent,
    }));
    const out = await processAiLabUserPrompt("Safaricom performance please", ctx, null, { naturalLanguage: true, interpreter });
    expect(interpreter).not.toHaveBeenCalled();
    expect(out.result?.kind).toBe("website-lookup");
    expect(out.text).toContain("Safaricom");
  });

  it("uses the interpreter for wording outside the local conversational vocabulary", async () => {
    const interpreter = vi.fn(async () => ({
      ok: true,
      intent: { intent: "overview", confidence: "high", assetKind: "stock", entity: "SCOM" } as NaturalLanguageIntent,
    }));
    const out = await processAiLabUserPrompt("How is Safcom looking these days?", ctx, null, { naturalLanguage: true, interpreter });
    expect(interpreter).toHaveBeenCalledOnce();
    expect(out.result?.kind).toBe("website-lookup");
  });

  it("allows factual published-yield ordering but not best-fund advice", async () => {
    const factual = await processAiLabUserPrompt("Which MMF has the highest published yield?", ctx);
    expect(factual.result?.kind).toBe("website-lookup");
    if (factual.result?.kind === "website-lookup") expect(factual.result.lookupMode).toBe("mmf-yield-ranking");
    const advice = await processAiLabUserPrompt("Which is the best MMF for me?", ctx);
    expect(advice.result?.kind ?? advice.route).not.toBe("website-lookup");
  });

  it("maintains a 100-question casual-language evaluation corpus", () => {
    const assets = ["Safaricom", "SCOM", "Safcom", "KCB", "KCB Group"];
    const phrasings = [
      "help me understand {asset} stock",
      "how is {asset} doing",
      "how are {asset} shares performing",
      "tell me how {asset} is trading",
      "break down {asset} for me",
      "give me info on {asset} shares",
      "what's up with {asset} stock",
      "shares za {asset} please",
      "help me learn about {asset}",
      "how has {asset} been doing",
      "tell me the price of {asset}",
      "what is {asset} worth",
      "show {asset} share details",
      "information on {asset} stock",
      "current value for {asset}",
      "help me understand {asset} shares please",
      "how is the {asset} share performing",
      "give me information about {asset}",
      "break down the {asset} stock",
      "tell me how the {asset} shares are doing",
    ];
    const corpus = assets.flatMap((asset) => phrasings.map((template) => template.replace("{asset}", asset)));
    expect(corpus).toHaveLength(100);
    const recognized = corpus.filter((prompt) => inferCommonNaturalLanguageIntent(prompt, ctx) != null);
    expect(recognized.length / corpus.length).toBeGreaterThanOrEqual(0.9);
  });

  it("keeps a separate 100-question corpus spanning every supported topic", () => {
    const topicSeeds: Record<string, string[]> = {
      stocks: ["Safaricom", "KCB", "Equity", "KenGen", "EABL", "NCBA", "Coop", "Absa", "Britam", "BAT"].map((x) => `how is ${x} stock doing`),
      funds: ["Etica", "CIC", "Britam", "Sanlam", "Zimele", "Madison", "Jubilee", "ICEA", "Old Mutual", "KCB"].map((x) => `help me understand ${x} money market fund`),
      fx: ["USD", "EUR", "GBP", "dollar", "euro", "pound", "USD KES", "EUR KES", "GBP KES", "foreign exchange"].map((x) => `what is happening with ${x} rate`),
      commodities: ["gold", "oil", "Brent", "silver", "coffee", "tea", "copper", "wheat", "sugar", "cocoa"].map((x) => `show me how ${x} is doing`),
      news: ["Safaricom", "KCB", "Equity", "KenGen", "EABL", "the NSE", "MMFs", "the shilling", "gold", "oil"].map((x) => `anything new about ${x}`),
      education: ["dividend", "yield", "P E ratio", "market cap", "liquidity", "volatility", "compounding", "unit trust", "exchange rate", "withholding tax"].map((x) => `explain ${x} simply`),
      comparisons: ["Safaricom and KCB", "KCB and Equity", "Etica and CIC", "USD and EUR", "gold and oil", "MMF and stock", "Britam and Sanlam", "KenGen and KPLC", "EABL and BAT", "USD and gold"].map((x) => `put ${x} side by side`),
      scenarios: ["10k in Safaricom", "100 bob in SCOM", "50k in an MMF", "20k to dollars", "gold down five percent", "SCOM up ten percent", "save 5k monthly", "split 100k", "yield falls two percent", "one million in KCB"],
      advice: ["buy Safaricom", "sell KCB", "best MMF", "safest stock", "pick a fund", "where to put 10k", "guaranteed return", "top investment", "choose for me", "will SCOM rise"].map((x) => `tell me if I should ${x}`),
      followups: ["what about KCB", "and Equity", "how about dollars", "and if it drops 5%", "same for 100k", "what about 30 days", "show me a year", "any news on it", "compare it with KCB", "explain that simply"],
    };
    const corpus = Object.entries(topicSeeds).flatMap(([topic, prompts]) => prompts.map((prompt) => ({ topic, prompt })));
    expect(corpus).toHaveLength(100);
    expect(new Set(corpus.map((item) => item.topic)).size).toBe(10);
    expect(corpus.every((item) => item.prompt.length >= 8)).toBe(true);
  });
});
