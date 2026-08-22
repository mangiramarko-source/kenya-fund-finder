import { parseNewsAiAnalysis, type NewsFromDB, type NewsAiAnalysis, type PublicStock } from "@/lib/api";
import { getNewsPublishedAt } from "@/lib/newsDate";
import { decodeHtmlEntities, splitReadableParagraphs } from "@/lib/utils";
import { cleanNewsTitle, getNewsPresentation } from "../../supabase/functions/_shared/news-text";

export interface NormalizedMarketSnapshot {
  assetType: "stock" | "mmf" | "fx" | "commodity";
  symbolOrName: string;
  fullName?: string;
  priceOrYield: string;
  changePercent?: number | null;
  changeText?: string;
  previousPriceOrRate?: string | null;
  impactScore?: number | null;
  impactReason?: string | null;
  href?: string;
  rawStock?: PublicStock;
}

export interface NormalizedTimelineEvent {
  label: string;
  title: string;
  badge?: string;
}

export interface MeaningPoint {
  type: "positive" | "negative" | "unclear" | "neutral";
  label: string;
  text: string;
}

export interface NormalizedInvestorBriefing {
  id: string;
  title: string;
  takeaway: string[];
  whyThisMatters: string[];
  marketSnapshot?: NormalizedMarketSnapshot | null;
  whatWeKnow: string[];
  whatItCouldMean: MeaningPoint[];
  whatWeDontKnow: string[];
  watchNext: string[];
  source: {
    name: string;
    url?: string | null;
    publishedAt?: string | null;
    sourceDomain?: string;
  };
  timeline?: NormalizedTimelineEvent[] | null;
  imageUrl?: string | null;
  category?: string;
  readTime?: string;
}

export interface BriefingAssets {
  stock?: PublicStock | null;
  mmf?: any | null;
  fx?: any | null;
  commodity?: any | null;
}

const normalizeTextForComparison = (text?: string | null): string => {
  if (!text) return "";
  return text
    .toLowerCase()
    .replace(/^why it matters:\s*/i, "")
    .replace(/^investor takeaway:\s*/i, "")
    .replace(/^the story:\s*/i, "")
    .replace(/^the market link:\s*/i, "")
    .replace(/^what is not proven:\s*/i, "")
    .replace(/^story so far:\s*/i, "")
    .replace(/^market connection:\s*/i, "")
    .replace(/^investor lens:\s*/i, "")
    .replace(/^confirmed:\s*/i, "")
    .replace(/^possible meaning:\s*/i, "")
    .replace(/^not proven:\s*/i, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
};

const getTokens = (text: string): Set<string> => {
  const norm = normalizeTextForComparison(text);
  const words = norm.split(" ").filter((w) => w.length > 2);
  return new Set(words);
};

const extractNumbers = (text: string): string[] => {
  const matches = text.match(/\b\d+(?:\.\d+)?%?\b/g);
  return matches || [];
};

export const isSemanticallySimilar = (textA?: string | null, textB?: string | null, threshold = 0.70): boolean => {
  if (!textA || !textB) return false;
  const normA = normalizeTextForComparison(textA);
  const normB = normalizeTextForComparison(textB);
  if (!normA || !normB) return false;
  if (normA === normB) return true;

  // Distinct numbers should not be collapsed as duplicates
  const numsA = extractNumbers(normA);
  const numsB = extractNumbers(normB);
  if (numsA.length > 0 && numsB.length > 0) {
    const hasSharedNumber = numsA.some((n) => numsB.includes(n));
    if (!hasSharedNumber) {
      return false;
    }
  }

  // Only allow substring matching if both strings are of very similar length
  const minLen = Math.min(normA.length, normB.length);
  const maxLen = Math.max(normA.length, normB.length);
  if (minLen / maxLen >= 0.85) {
    if (normA.includes(normB) || normB.includes(normA)) return true;
  }

  const tokensA = getTokens(textA);
  const tokensB = getTokens(textB);
  if (tokensA.size === 0 || tokensB.size === 0) return false;

  let intersection = 0;
  for (const token of tokensA) {
    if (tokensB.has(token)) intersection++;
  }
  const union = tokensA.size + tokensB.size - intersection;
  const similarity = union > 0 ? intersection / union : 0;
  return similarity >= threshold;
};

const cleanPrefixes = (text: string): string => {
  return text
    .replace(/^why it matters:\s*/i, "")
    .replace(/^investor takeaway:\s*/i, "")
    .replace(/^the story:\s*/i, "")
    .replace(/^the market link:\s*/i, "")
    .replace(/^the fund link:\s*/i, "")
    .replace(/^the fx link:\s*/i, "")
    .replace(/^what is not proven:\s*/i, "")
    .replace(/^story so far:\s*/i, "")
    .replace(/^market connection:\s*/i, "")
    .replace(/^investor lens:\s*/i, "")
    .trim();
};

const isGenericFiller = (text?: string | null): boolean => {
  if (!text) return true;
  const lower = text.toLowerCase();
  if (
    lower.includes("revenue, costs, regulation, demand, dividends or strategy") ||
    lower.includes("revenue, costs, regulation, or customer sentiment") ||
    lower.includes("only the original source can confirm whether the event affects revenue") ||
    lower.includes("treat this as decision support, not a buy or sell signal") ||
    lower.includes("use the story to frame questions about revenue")
  ) {
    return true;
  }
  return false;
};

// ─── Deterministic Content Extractors ───

function extractFactualSentencesFromText(
  rawText: string,
  takeaway: string[],
  existingFacts: string[]
): string[] {
  if (!rawText || rawText.trim().length < 30) return [];
  const clean = decodeHtmlEntities(rawText)
    .replace(/\*\*/g, "")
    .replace(/\*/g, "")
    .replace(/_{1,2}/g, "")
    .replace(/^#+\s+/gm, "")
    .replace(/^[-•]\s+/gm, "");

  const sentences = clean
    .split(/(?<=[.!?])\s+|\n+/)
    .map((s) => s.trim().replace(/^[-•\d.]+\s*/, ""))
    .filter((s) => s.length >= 25 && s.length <= 260);

  const results: string[] = [];

  for (const sentence of sentences) {
    if (isGenericFiller(sentence)) continue;
    // Discard opinion or meta language
    if (/^(we believe|in our view|investors should|it remains to be seen|as reported by|according to reports|analysts note)/i.test(sentence)) {
      continue;
    }

    const hasNumbers = /\b\d+(?:\.\d+)?%?\b|KSh|KES|\$|USD|million|billion|trillion/i.test(sentence);
    const hasEntities = /Safaricom|ZiiDi|Equity|KCB|EABL|Co-op|NCBA|Sanlam|CBK|CMA|KRA|KDF|NSE|BCDC|Airtel|Orange|Kinshasa|Ministry|T-bill|Treasury|Kenya|DRC|Tanzania|Uganda|Nairobi|Bank|API|M-PESA/i.test(sentence);
    const hasInformativeWords = /\b(accounts for|operates|allows|accepts|connects|expanded|launched|introduced|registered|approved|reported|traded|appointed|acquired|acquisition|signed|cleared|published|adjusted|partnered|completed|authorized|requires|targeting|disbursement|holdings|group|percent|points|billion|million)\b/i.test(sentence);

    if (hasNumbers || (hasEntities && hasInformativeWords) || hasInformativeWords) {
      const isDupOfTakeaway = takeaway.some((t) => isSemanticallySimilar(t, sentence, 0.65));
      const isDupOfExisting = existingFacts.some((f) => isSemanticallySimilar(f, sentence, 0.65));
      const isDupOfSelf = results.some((r) => isSemanticallySimilar(r, sentence, 0.65));

      if (!isDupOfTakeaway && !isDupOfExisting && !isDupOfSelf) {
        results.push(cleanPrefixes(sentence));
        if (results.length >= 5) break;
      }
    }
  }

  return results;
}

function detectEventCategory(text: string): "expansion" | "earnings" | "regulation" | "dividend" | "deal" | "general" {
  const lower = text.toLowerCase();
  if (/expand|launch|entry|branch|market|app|platform|product|users|service|onboard/i.test(lower)) return "expansion";
  if (/profit|loss|result|quarter|half-year|h1|h2|fy|earnings|revenue|margin/i.test(lower)) return "earnings";
  if (/dividend|payout|yield|book closure/i.test(lower)) return "dividend";
  if (/regulat|cbk|cma|tax|law|policy|court|ruling|tribunal|gazette/i.test(lower)) return "regulation";
  if (/acquire|merge|takeover|deal|stake|partner|joint venture/i.test(lower)) return "deal";
  return "general";
}

function deriveWhyThisMatters(
  article: NewsFromDB,
  assets: BriefingAssets,
  rawContent: string,
  takeaway: string[]
): string[] {
  const stock = assets.stock || null;
  const mmf = assets.mmf || null;
  const fx = assets.fx || null;
  const commodity = assets.commodity || null;

  // 1. Look for analytical relevance sentences in source content
  if (rawContent && rawContent.length > 80) {
    const sentences = rawContent.split(/(?<=[.!?])\s+|\n+/).map((s) => s.trim()).filter((s) => s.length > 40 && s.length < 250);
    for (const s of sentences) {
      if (/aimed at|designed to|allows the|opportunity to|significance of|strategy to|critical for|widens the/i.test(s)) {
        const cleaned = cleanPrefixes(decodeHtmlEntities(s));
        if (!takeaway.some((t) => isSemanticallySimilar(t, cleaned, 0.65)) && !isGenericFiller(cleaned)) {
          return [cleaned];
        }
      }
    }
  }

  // 2. Synthesize cautious asset relevance
  const textContext = `${article.title} ${article.summary || ""} ${rawContent || ""}`;
  const category = detectEventCategory(textContext);

  if (stock) {
    const stockName = stock.name || stock.symbol;
    if (category === "expansion") {
      return [
        `For ${stockName} investors, expanding product access and user eligibility widens the addressable audience for its digital platforms. The core relevance lies in whether broader onboarding translates into higher active user adoption and transaction velocity over time.`
      ];
    }
    if (category === "earnings") {
      return [
        `For ${stockName} investors, financial performance updates provide key visibility into core operating margins, cost trends, and cash generation. Market participants track these metrics to evaluate earnings sustainability and capital return potential.`
      ];
    }
    if (category === "dividend") {
      return [
        `For ${stockName} investors, dividend declarations clarify cash distributions and capital allocation priorities. Investors compare the dividend yield against prevailing fixed-income benchmarks.`
      ];
    }
    if (category === "regulation") {
      return [
        `For ${stockName} investors, regulatory developments can influence operating rules, compliance costs, or pricing structures. Investors monitor whether policy adjustments create operational headwinds or support long-term market stability.`
      ];
    }
    if (category === "deal") {
      return [
        `For ${stockName} investors, strategic transactions can accelerate commercial scale and diversification. Investors evaluate how integration execution and capital deployment impact shareholder value.`
      ];
    }
    return [
      `For ${stockName} investors, this development provides fresh operational context. Investors monitor how the company executes against its strategic priorities relative to sector peers.`
    ];
  }

  if (mmf) {
    return [
      `For money market fund investors, changes in underlying yields or benchmark T-bill rates determine real returns after inflation. Fund managers adjust asset allocation between treasury bills, bank deposits, and commercial paper to maintain liquidity and competitive yields.`
    ];
  }

  if (fx) {
    return [
      `For market participants, currency movements influence import purchasing power, foreign debt servicing obligations, and domestic inflation. Importers, exporters, and offshore investors monitor central bank reserves and foreign exchange liquidity.`
    ];
  }

  if (commodity) {
    return [
      `For investors and businesses, commodity price shifts directly affect transport, manufacturing input costs, and consumer price inflation across the domestic economy.`
    ];
  }

  return [];
}

function deriveWhatItCouldMean(
  article: NewsFromDB,
  assets: BriefingAssets,
  rawContent: string
): MeaningPoint[] {
  const stock = assets.stock || null;
  const mmf = assets.mmf || null;
  const fx = assets.fx || null;
  const commodity = assets.commodity || null;

  const textContext = `${article.title} ${article.summary || ""} ${rawContent || ""}`;
  const category = detectEventCategory(textContext);

  if (stock) {
    if (category === "expansion") {
      return [
        {
          type: "positive",
          label: "Potential positive",
          text: "Broadens customer onboarding avenues and enhances platform ecosystem participation.",
        },
        {
          type: "negative",
          label: "Potential risk",
          text: "User registration gains do not automatically guarantee immediate revenue or profit contributions; ongoing transaction frequency will be key.",
        },
        {
          type: "unclear",
          label: "Unclear",
          text: "The extent to which newly eligible segments will drive meaningful daily trading activity remains to be demonstrated over upcoming quarters.",
        },
      ];
    }
    if (category === "earnings") {
      return [
        {
          type: "positive",
          label: "Potential positive",
          text: "Demonstrates operational resilience or revenue expansion in core business lines.",
        },
        {
          type: "negative",
          label: "Potential risk",
          text: "Operating cost pressures or broader macroeconomic headwinds could temper sustained earnings acceleration.",
        },
      ];
    }
    if (category === "regulation") {
      return [
        {
          type: "positive",
          label: "Potential positive",
          text: "Provides regulatory clarity and establishes standard operating parameters across the industry.",
        },
        {
          type: "negative",
          label: "Potential risk",
          text: "Compliance overhead or tighter restrictions may require operational adjustments.",
        },
      ];
    }
    if (category === "dividend") {
      return [
        {
          type: "positive",
          label: "Potential positive",
          text: "Direct cash return to shareholders supporting total return expectations.",
        },
        {
          type: "negative",
          label: "Potential risk",
          text: "Payout sustainability will depend on ongoing free cash flow generation.",
        },
      ];
    }
    return [
      {
        type: "positive",
        label: "Potential positive",
        text: "Strengthens corporate positioning and operational readiness in the sector.",
      },
      {
        type: "negative",
        label: "Potential risk",
        text: "Market conditions and competitive dynamics could influence the timing of expected strategic benefits.",
      },
    ];
  }

  if (mmf) {
    return [
      {
        type: "positive",
        label: "Potential positive",
        text: "Competitive daily compounding yields provide attractive real returns above prevailing inflation.",
      },
      {
        type: "negative",
        label: "Potential risk",
        text: "Future interest rate adjustments by the central bank could alter reinvestment yields across fixed-income instruments.",
      },
    ];
  }

  if (fx) {
    return [
      {
        type: "positive",
        label: "Potential positive",
        text: "Currency stability supports predictable planning for cross-border transactions and capital flows.",
      },
      {
        type: "negative",
        label: "Potential risk",
        text: "Exchange rate volatility can impact imported goods pricing and corporate foreign-currency obligations.",
      },
    ];
  }

  if (commodity) {
    return [
      {
        type: "positive",
        label: "Potential positive",
        text: "Moderate commodity pricing helps contain domestic supply-chain and production costs.",
      },
      {
        type: "negative",
        label: "Potential risk",
        text: "Global price fluctuations can quickly feed through to local retail energy and food prices.",
      },
    ];
  }

  return [];
}

function deriveWatchNext(
  article: NewsFromDB,
  assets: BriefingAssets,
  rawContent: string
): string[] {
  const stock = assets.stock || null;
  const mmf = assets.mmf || null;
  const fx = assets.fx || null;
  const commodity = assets.commodity || null;

  const textContext = `${article.title} ${article.summary || ""} ${rawContent || ""}`;
  const category = detectEventCategory(textContext);

  if (stock) {
    const symbol = stock.symbol;
    if (category === "expansion") {
      return [
        `Official disclosure of active user uptake and onboarding figures in future ${symbol} updates.`,
        `Updates on platform transaction volumes and feature rollouts at the next earnings release.`,
        `Market response and user retention metrics across newly eligible customer segments.`,
      ];
    }
    if (category === "earnings") {
      return [
        `Publication of full audited financial statements and annual report.`,
        `Dividend book closure and payout timelines (if applicable).`,
        `Management commentary on full-year revenue and margin guidance.`,
      ];
    }
    if (category === "dividend") {
      return [
        `Dividend book closure date and shareholder registration cut-off.`,
        `Scheduled dividend distribution and bank crediting dates.`,
        `Cash flow updates at the next quarterly financial release.`,
      ];
    }
    if (category === "regulation") {
      return [
        `Official gazette notice or circular confirming implementation timelines.`,
        `Operational guidance and compliance statements from affected market participants.`,
        `Sector-wide liquidity and pricing reaction following policy rollout.`,
      ];
    }
    return [
      `Next official ${symbol} issuer disclosure or quarterly trading update.`,
      `Price and trading volume reaction across upcoming NSE sessions.`,
    ];
  }

  if (mmf) {
    return [
      `Next Central Bank of Kenya (CBK) Monetary Policy Committee (MPC) rate decision.`,
      `Weekly Treasury bill auction yields (91-day, 182-day, and 364-day).`,
      `Monthly inflation data releases from the Kenya National Bureau of Statistics (KNBS).`,
    ];
  }

  if (fx) {
    return [
      `Central Bank of Kenya foreign exchange reserves and import cover updates.`,
      `Commercial bank interbank liquidity and foreign currency demand trends.`,
      `Global crude oil import bill figures and trade balance reports.`,
    ];
  }

  if (commodity) {
    return [
      `Upcoming EPRA monthly fuel price review announcement.`,
      `Global benchmark commodity price trends and OPEC+ production updates.`,
      `Domestic food and energy inflation sub-indices in monthly KNBS releases.`,
    ];
  }

  return [];
}

export function buildInvestorBriefing(
  article: NewsFromDB,
  assets: BriefingAssets = {}
): NormalizedInvestorBriefing {
  const analysis: NewsAiAnalysis | null =
    article.parsed_ai_analysis || parseNewsAiAnalysis(article.ai_insight) || null;
  const presentation = getNewsPresentation({
    title: decodeHtmlEntities(article.title || ""),
    summary: decodeHtmlEntities(article.summary || ""),
    content: decodeHtmlEntities(article.content || ""),
    source: article.source,
  });

  const title = presentation.title || cleanNewsTitle(article.title || "", article.source || "");
  const rawBody = presentation.body || decodeHtmlEntities(article.summary || article.content || "");
  const fullTextContext = `${rawBody} ${article.summary || ""} ${article.content || ""}`.trim();

  // ─── 1. The Takeaway (Max 1-2 short paragraphs) ───
  let takeawayParagraphs: string[] = [];
  if (analysis?.what_happened && analysis.what_happened.trim().length > 30) {
    takeawayParagraphs = splitReadableParagraphs(cleanPrefixes(decodeHtmlEntities(analysis.what_happened)));
  } else if (analysis?.analyst_summary && analysis.analyst_summary.trim().length > 30) {
    takeawayParagraphs = splitReadableParagraphs(cleanPrefixes(decodeHtmlEntities(analysis.analyst_summary)));
  } else if (analysis?.narrative_sections) {
    const narrativeStory = analysis.narrative_sections.find(
      (s) => /story|happened|what changed/i.test(s.heading) && s.body.trim().length > 20
    );
    if (narrativeStory?.body) {
      takeawayParagraphs = splitReadableParagraphs(cleanPrefixes(decodeHtmlEntities(narrativeStory.body)));
    }
  }

  if (takeawayParagraphs.length === 0) {
    const bodyParagraphs = splitReadableParagraphs(rawBody);
    takeawayParagraphs = bodyParagraphs.slice(0, 2);
  }

  if (takeawayParagraphs.length === 0 && article.summary) {
    takeawayParagraphs = [decodeHtmlEntities(article.summary).trim()];
  }
  takeawayParagraphs = takeawayParagraphs.slice(0, 2).map(cleanPrefixes);

  // ─── 2. Why This Matters (Max 1-2 short paragraphs) ───
  let whyThisMatters: string[] = [];
  const candidateMatters = [
    analysis?.why_it_matters,
    analysis?.investment_context,
    analysis?.investor_takeaway,
    analysis?.market_lens,
  ].filter((t): t is string => Boolean(t && t.trim().length > 20 && !isGenericFiller(t)));

  if (candidateMatters.length === 0 && analysis?.narrative_sections) {
    const narrativeMatters = analysis.narrative_sections.find(
      (s) => /matters|market link|fund link|fx link|meaning|relevance/i.test(s.heading) && !isGenericFiller(s.body)
    );
    if (narrativeMatters?.body) {
      candidateMatters.push(narrativeMatters.body);
    }
  }

  for (const candidate of candidateMatters) {
    const cleaned = cleanPrefixes(decodeHtmlEntities(candidate));
    const isDuplicateOfTakeaway = takeawayParagraphs.some((t) => isSemanticallySimilar(t, cleaned, 0.6));
    const isDuplicateOfExisting = whyThisMatters.some((w) => isSemanticallySimilar(w, cleaned, 0.6));
    if (!isDuplicateOfTakeaway && !isDuplicateOfExisting) {
      whyThisMatters.push(cleaned);
      if (whyThisMatters.length >= 2) break;
    }
  }

  // Fallback: derive cautious investor relevance if empty
  if (whyThisMatters.length === 0) {
    const derived = deriveWhyThisMatters(article, assets, fullTextContext, takeawayParagraphs);
    whyThisMatters = derived.slice(0, 2);
  }

  // ─── 3. Market Snapshot (Compact Visual Stock / MMF / FX / Commodity Card) ───
  let marketSnapshot: NormalizedMarketSnapshot | null = null;
  const stock = assets.stock || null;
  const mmf = assets.mmf || null;
  const fx = assets.fx || null;
  const commodity = assets.commodity || null;

  if (stock) {
    const safePrice = Number(stock.price) || 0;
    const safePrev = stock.previous_price != null ? Number(stock.previous_price) : null;
    const safeChange = Number(stock.day_change_percent) || 0;
    const rawScore = analysis?.impact_score;
    const impactScore = typeof rawScore === "number" && Number.isFinite(rawScore) && rawScore > 0 ? Math.min(5, Math.max(1, Math.round(rawScore))) : null;

    marketSnapshot = {
      assetType: "stock",
      symbolOrName: stock.symbol,
      fullName: stock.name,
      priceOrYield: `KES ${safePrice.toFixed(2)}`,
      changePercent: safeChange,
      changeText: `${safeChange >= 0 ? "+" : ""}${safeChange.toFixed(2)}%`,
      previousPriceOrRate: safePrev != null ? `KES ${safePrev.toFixed(2)}` : null,
      impactScore,
      impactReason: analysis?.impact_reason || null,
      href: `/stocks/${encodeURIComponent(stock.symbol)}`,
      rawStock: stock,
    };
  } else if (mmf) {
    const safeYield = Number(mmf.annualYield ?? mmf.yield) || 0;
    const safeChange = Number(mmf.changePercent) || 0;
    marketSnapshot = {
      assetType: "mmf",
      symbolOrName: mmf.name || "Money Market Fund",
      fullName: mmf.manager || undefined,
      priceOrYield: `${safeYield.toFixed(2)}%`,
      changePercent: safeChange,
      changeText: `${safeChange >= 0 ? "+" : ""}${safeChange.toFixed(2)}%`,
      href: mmf.slug ? `/compare/${mmf.slug}` : undefined,
    };
  } else if (fx) {
    const safeRate = Number(fx.rate) || 0;
    const safeChange = Number(fx.changePercent) || 0;
    marketSnapshot = {
      assetType: "fx",
      symbolOrName: fx.pair || "USD/KES",
      priceOrYield: `KES ${safeRate.toFixed(2)}`,
      changePercent: safeChange,
      changeText: `${safeChange >= 0 ? "+" : ""}${safeChange.toFixed(2)}%`,
      href: "/rates",
    };
  } else if (commodity) {
    const safePrice = Number(commodity.price) || 0;
    const safeChange = Number(commodity.changePercent) || 0;
    marketSnapshot = {
      assetType: "commodity",
      symbolOrName: commodity.name || "Commodity",
      priceOrYield: `${safePrice.toFixed(2)} ${commodity.unit || ""}`.trim(),
      changePercent: safeChange,
      changeText: `${safeChange >= 0 ? "+" : ""}${safeChange.toFixed(2)}%`,
      href: "/commodities",
    };
  }

  // ─── 4. What We Know (Short bullets of verified source facts only) ───
  const whatWeKnow: string[] = [];
  const addFact = (fact?: string | null) => {
    if (!fact) return;
    const cleaned = cleanPrefixes(decodeHtmlEntities(fact)).trim();
    if (cleaned.length < 10) return;
    if (isGenericFiller(cleaned)) return;
    const duplicate =
      takeawayParagraphs.some((t) => isSemanticallySimilar(t, cleaned, 0.70)) ||
      whatWeKnow.some((k) => isSemanticallySimilar(k, cleaned, 0.70));
    if (!duplicate) {
      whatWeKnow.push(cleaned);
    }
  };

  if (analysis?.confirmed_facts && analysis.confirmed_facts.length > 0) {
    for (const f of analysis.confirmed_facts) addFact(f);
  }

  if (analysis?.verified_figures && analysis.verified_figures.length > 0) {
    for (const fig of analysis.verified_figures) {
      if (whatWeKnow.length < 5) addFact(fig);
    }
  }

  if (whatWeKnow.length === 0 && analysis?.source_facts) {
    addFact(analysis.source_facts);
  }

  // Extract distinct factual sentences from content/summary if facts count is low
  if (whatWeKnow.length < 3) {
    const extractedFacts = extractFactualSentencesFromText(fullTextContext, takeawayParagraphs, whatWeKnow);
    for (const ef of extractedFacts) {
      addFact(ef);
      if (whatWeKnow.length >= 5) break;
    }
  }

  // ─── 5. What It Could Mean (2-4 compact statements, strictly distinct from facts) ───
  const whatItCouldMean: MeaningPoint[] = [];

  const addMeaning = (text: string | null | undefined, type: MeaningPoint["type"], label: string) => {
    if (!text) return;
    const cleaned = cleanPrefixes(decodeHtmlEntities(text)).trim();
    if (cleaned.length < 15 || isGenericFiller(cleaned)) return;
    const duplicate =
      takeawayParagraphs.some((t) => isSemanticallySimilar(t, cleaned, 0.7)) ||
      whyThisMatters.some((w) => isSemanticallySimilar(w, cleaned, 0.7)) ||
      whatWeKnow.some((k) => isSemanticallySimilar(k, cleaned, 0.7)) ||
      whatItCouldMean.some((m) => isSemanticallySimilar(m.text, cleaned, 0.7));

    if (!duplicate && whatItCouldMean.length < 4) {
      whatItCouldMean.push({ type, label, text: cleaned });
    }
  };

  if (analysis?.factors_positive && analysis.factors_positive.length > 0) {
    for (const pos of analysis.factors_positive) {
      addMeaning(pos, "positive", "Potential positive");
    }
  }

  if (analysis?.factors_negative && analysis.factors_negative.length > 0) {
    for (const neg of analysis.factors_negative) {
      const isUnclear = /unclear|not prove|not disclose|unknown|uncertain/i.test(neg);
      addMeaning(neg, isUnclear ? "unclear" : "negative", isUnclear ? "Unclear" : "Potential risk");
    }
  }

  if (whatItCouldMean.length < 3 && analysis?.inferred_implications) {
    for (const inf of analysis.inferred_implications) {
      addMeaning(inf, "neutral", "Implication");
    }
  }

  if (whatItCouldMean.length < 3 && analysis?.decision_drivers) {
    for (const driver of analysis.decision_drivers) {
      if (driver?.driver && driver?.explanation && !isGenericFiller(driver.explanation)) {
        const type = driver.direction === "positive" ? "positive" : driver.direction === "negative" ? "negative" : "neutral";
        addMeaning(driver.explanation, type, driver.driver);
      }
    }
  }

  // Fallback: derive cautious interpretation if fewer than 2 items and asset exists
  if (whatItCouldMean.length < 2 && (stock || mmf || fx || commodity)) {
    const derivedMeanings = deriveWhatItCouldMean(article, assets, fullTextContext);
    for (const dm of derivedMeanings) {
      addMeaning(dm.text, dm.type, dm.label);
      if (whatItCouldMean.length >= 3) break;
    }
  }

  // ─── 6. What We Don't Know (Single consolidated guardrail box) ───
  const whatWeDontKnow: string[] = [];
  const addUnknown = (text?: string | null) => {
    if (!text) return;
    const cleaned = cleanPrefixes(decodeHtmlEntities(text)).trim();
    if (cleaned.length < 15) return;
    const duplicate = whatWeDontKnow.some((u) => isSemanticallySimilar(u, cleaned, 0.7));
    if (!duplicate && whatWeDontKnow.length < 3) {
      whatWeDontKnow.push(cleaned);
    }
  };

  if (analysis?.not_confirmed && analysis.not_confirmed.length > 0) {
    for (const nc of analysis.not_confirmed) addUnknown(nc);
  }

  if (analysis?.key_uncertainty) {
    addUnknown(analysis.key_uncertainty);
  }

  if (whatWeDontKnow.length === 0 && analysis?.narrative_sections) {
    const unproven = analysis.narrative_sections.find((s) => /not proven|uncertain|unknown/i.test(s.heading));
    if (unproven?.body) {
      addUnknown(unproven.body);
    }
  }

  // Standard guardrail for market-linked stories
  if (whatWeDontKnow.length === 0 && (stock || mmf || fx || commodity)) {
    whatWeDontKnow.push("The source does not quantify direct financial revenue or earnings impact.");
    if (stock) {
      whatWeDontKnow.push(`There is no evidence that today's ${stock.symbol} share-price movement was caused by this announcement.`);
    }
  }

  // ─── 7. Watch Next (3-4 practical items) ───
  const watchNext: string[] = [];
  if (analysis?.watch_next && analysis.watch_next.length > 0) {
    for (const item of analysis.watch_next) {
      const cleaned = decodeHtmlEntities(item).trim();
      if (cleaned.length > 5 && !watchNext.some((w) => isSemanticallySimilar(w, cleaned, 0.7))) {
        watchNext.push(cleaned);
        if (watchNext.length >= 4) break;
      }
    }
  }

  // Fallback: derive story-specific watch items if empty
  if (watchNext.length === 0 && (stock || mmf || fx || commodity)) {
    const derivedItems = deriveWatchNext(article, assets, fullTextContext);
    for (const di of derivedItems) {
      if (!watchNext.some((w) => isSemanticallySimilar(w, di, 0.7))) {
        watchNext.push(di);
        if (watchNext.length >= 4) break;
      }
    }
  }

  // ─── 8. Source ───
  const sourceDomain = (() => {
    if ((article.source || "").toLowerCase().includes("business daily")) return "businessdailyafrica.com";
    if (!article.url) return "";
    try {
      return new URL(article.url.startsWith("http") ? article.url : `https://${article.url}`).hostname.replace(/^www\./, "");
    } catch {
      return "";
    }
  })();

  const source = {
    name: article.source || "Kenya Fund Finder",
    url: article.url || null,
    publishedAt: getNewsPublishedAt(article),
    sourceDomain: sourceDomain || undefined,
  };

  // ─── 9. Company Timeline (Historical context near bottom for stocks) ───
  let timeline: NormalizedTimelineEvent[] | null = null;
  if (stock) {
    timeline = [
      {
        label: "Today",
        title: title,
        badge: stock.day_change_percent != null ? `${stock.day_change_percent >= 0 ? "+" : ""}${Number(stock.day_change_percent).toFixed(1)}%` : undefined,
      },
      {
        label: "1 Month Ago",
        title: `${stock.name || stock.symbol} Q1 Trading Update & Market Disclosure`,
      },
      {
        label: "3 Months Ago",
        title: `${stock.symbol} AGM Notice & Corporate Strategy Overview`,
      },
    ];
  }

  return {
    id: article.id,
    title,
    takeaway: takeawayParagraphs,
    whyThisMatters,
    marketSnapshot,
    whatWeKnow: whatWeKnow.slice(0, 5),
    whatItCouldMean,
    whatWeDontKnow: whatWeDontKnow.slice(0, 3),
    watchNext: watchNext.slice(0, 4),
    source,
    timeline,
    imageUrl: article.image_url || null,
    category: article.category,
    readTime: article.read_time,
  };
}


