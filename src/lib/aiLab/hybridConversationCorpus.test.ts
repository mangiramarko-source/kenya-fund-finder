import { describe, expect, it } from "vitest";
import { routePrompt } from "./router";
import { inferCommonNaturalLanguageIntent, validateNaturalLanguageIntent } from "./naturalLanguageIntent";
import type { MarketContext } from "./marketContext";

const ctx: MarketContext = {
  fundCount: 1, avgAnnualYieldPct: 10, topAnnualYieldPct: 10, lowAnnualYieldPct: 10,
  sampleStockSymbol: "SCOM", sampleStockPrice: 38, sampleStockChangePct: 1, fetchedAt: "2026-09-08T08:00:00Z",
  assets: [
    { kind: "stock", symbol: "SCOM", name: "Safaricom", value: 38, valueLabel: "Price (KES)", changePct: 1, aliases: ["scom", "safaricom", "safcom"] },
    { kind: "stock", symbol: "KCB", name: "KCB Group", value: 55, valueLabel: "Price (KES)", changePct: 0, aliases: ["kcb", "kcb group"] },
    { kind: "fx", symbol: "USD", name: "US Dollar", value: 129, valueLabel: "KES per 1 unit", changePct: 0, aliases: ["usd", "dollar"] },
    { kind: "commodity", symbol: "GOLD", name: "Gold", value: 2500, valueLabel: "Price (USD/oz)", changePct: 0, aliases: ["gold"] },
    { kind: "commodity", symbol: "BRENT", name: "Brent crude", value: 70, valueLabel: "Price (USD/barrel)", changePct: 0, aliases: ["brent", "oil"] },
  ],
};

const GROUPS = {
  direct: ["KES 10,000 in SCOM", "100k in KCB", "Explain dividend yield", "Explain liquidity", "Explain volatility", "Compare SCOM vs KCB", "Save KES 5,000 monthly at 11% for 12 months", "SCOM drops 5%", "Split 100k between MMF and SCOM at 11% yield", "What is withholding tax", "Explain compounding", "What is NAV", "What is an ETF", "Explain capital gain", "Explain MMF yield"],
  beginner: ["I am new to investing", "how do I start investing", "where do beginners start investing", "I know nothing about shares", "beginner investing guide", "start investing as a student", "new to stocks", "how can I begin investing", "getting started with investing", "help a beginner invest", "nataka kuanza investing", "nataka kuanza kuinvest", "beginer in invsting", "new investor what now", "beginner guide to shares"],
  kenyan: ["shares za Safaricom", "nipe info kuhusu Safaricom", "safaricom shares zinafanya aje", "10k in SCOM", "100 bob in KCB", "nipe price ya Safaricom", "KCB iko aje", "safcom shares please", "dollar iko ngapi", "nipe news ya Safaricom", "shares za KCB", "Safaricom iko aje", "help me kuelewa SCOM", "KCB stock iko aje", "bei ya Safaricom"],
  followUps: ["what about KCB", "how about KCB", "and what of KCB", "and if it drops 5%", "what if it rises 10%", "how has it moved over 30 days", "how did it perform in 7 days", "what about 90 days", "and if it falls 3%", "what about Safaricom", "how about SCOM", "what of KCB shares", "what about a year", "how has it done", "what if it gains 2%"],
  advice: ["Which stock should I buy", "what is the best MMF for me", "should I buy Safaricom", "should I sell KCB", "where should I put my money", "recommend a fund", "what is the safest investment", "which option is better for me", "will SCOM rise", "will I make money", "pick a stock for me", "what should I invest in", "best allocation for me", "guaranteed return investment", "is Safaricom a good buy"],
  education: ["Explain an MMF", "What is a treasury bill", "What is a unit trust", "Explain NAV", "What is an ETF", "What is a capital gain", "What is downside risk", "Explain fund fees", "What is an expense ratio", "Explain gross vs net return", "What is dividend yield", "Explain investment risk", "What is the difference between an MMF and a stock", "Explain compounding", "What is liquidity"],
  overview: ["How is Safaricom doing", "How are KCB shares performing", "help me understand Safaricom stocks", "tell me how KCB is trading", "break down Safcom for me", "give me info on KCB shares", "what's up with SCOM", "help me learn about Safaricom", "how has KCB been doing", "tell me about Safaricom", "Safaricom performance please", "KCB share update", "Safcom details please", "how is SCOM doing", "KCB trading today"],
  news: ["latest Safaricom news", "anything new about KCB", "market news today", "what changed today", "news on Safaricom", "what is happening with KCB", "Safaricom headlines", "summarize market news", "NSE market update", "why is Safaricom moving", "KCB news please", "what happened to SCOM", "latest news about the shilling", "Kenya market news", "news about gold"],
  scenarios: ["If SCOM rises 5%", "what happens to 10k in Safaricom", "KES 20,000 to USD", "Gold falls 3%", "save 3k monthly at 10% for 24 months", "yield drops from 11% to 9% on 100k", "split 50k between MMF and SCOM", "KES 100k in SCOM", "KCB falls 5% on 10k", "USD/KES rises 2%", "Brent drops 10%", "save 5k monthly at 10% for 12 months", "how much would 100k earn at 11%", "SCOM up 2%", "KES 1m in SCOM"],
  malformed: Array.from({ length: 15 }, (_, index) => ({ intent: "overview", confidence: "high", price: index + 1 })),
} as const;

describe("hybrid conversational evaluation corpus", () => {
  it("contains 150 realistic prompts and malformed-output cases across ten families", () => {
    const all = Object.values(GROUPS).flat();
    expect(Object.keys(GROUPS)).toHaveLength(10);
    expect(all).toHaveLength(150);
  });

  it("keeps direct, beginner, advice, education, and scenario routes safe and deterministic", () => {
    expect(GROUPS.direct.filter((prompt) => routePrompt(prompt, ctx).kind === "unknown")).toEqual([]);
    for (const prompt of GROUPS.beginner) expect(routePrompt(prompt, ctx).kind).toBe("explainer");
    expect(GROUPS.advice.filter((prompt) => routePrompt(prompt, ctx).kind !== "refusal")).toEqual([]);
    for (const prompt of GROUPS.education) expect(routePrompt(prompt, ctx).kind).toBe("explainer");
    expect(GROUPS.scenarios.filter((prompt) => routePrompt(prompt, ctx).kind === "unknown")).toEqual([]);
  });

  it("recognizes common Kenyan and contextual phrasing locally before the model is needed", () => {
    const session = { lastAssetQuery: "SCOM", lastAssetKind: "stock" as const, lastAmount: 10_000 };
    expect(GROUPS.kenyan.filter((prompt) => inferCommonNaturalLanguageIntent(prompt, ctx)).length).toBeGreaterThanOrEqual(9);
    expect(GROUPS.followUps.filter((prompt) => inferCommonNaturalLanguageIntent(prompt, ctx, session)).length).toBeGreaterThanOrEqual(7);
  });

  it("rejects every model payload that attempts to add a market fact", () => {
    for (const payload of GROUPS.malformed) expect(validateNaturalLanguageIntent(payload).ok).toBe(false);
  });
});
