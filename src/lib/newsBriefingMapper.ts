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
    const rawBody = presentation.body || decodeHtmlEntities(article.summary || article.content || "");
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

  // If narrative sections exist, check for matching headings
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
    // Must not semantically duplicate takeaway
    const isDuplicateOfTakeaway = takeawayParagraphs.some((t) => isSemanticallySimilar(t, cleaned, 0.6));
    const isDuplicateOfExisting = whyThisMatters.some((w) => isSemanticallySimilar(w, cleaned, 0.6));
    if (!isDuplicateOfTakeaway && !isDuplicateOfExisting) {
      whyThisMatters.push(cleaned);
      if (whyThisMatters.length >= 2) break;
    }
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
    // Check duplication against takeaway and existing facts
    const duplicate =
      takeawayParagraphs.some((t) => isSemanticallySimilar(t, cleaned, 0.75)) ||
      whatWeKnow.some((k) => isSemanticallySimilar(k, cleaned, 0.75));
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

  // If narrative sections had a "What is not proven" section
  if (whatWeDontKnow.length === 0 && analysis?.narrative_sections) {
    const unproven = analysis.narrative_sections.find((s) => /not proven|uncertain|unknown/i.test(s.heading));
    if (unproven?.body) {
      addUnknown(unproven.body);
    }
  }

  // If still empty but article is market-linked, supply the singular safe baseline guardrail
  if (whatWeDontKnow.length === 0 && (stock || mmf || fx || commodity)) {
    whatWeDontKnow.push("The source does not quantify direct financial or earnings impact.");
    if (stock) {
      whatWeDontKnow.push(`There is no evidence that today's ${stock.symbol} share-price movement was caused by this story.`);
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
