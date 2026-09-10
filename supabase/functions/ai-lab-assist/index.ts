import { createClient } from "../_shared/supabase-client.ts";
import { corsHeaders } from "../_shared/cors-headers.ts";
import {
  semanticFrameToNaturalLanguageIntent,
  validateQuerySemanticFrame,
} from "../_shared/ai-lab-intent.ts";
import {
  QUERY_CONTRACT_VERSION,
  createParameterContinuationToken,
  continueQueryWithParameters,
  continueQueryWithSelection,
  continueQueryWithText,
  resolveQuery,
  type CanonicalFinancialEntity,
  type QuerySemanticFrameV1,
} from "../_shared/universal-query.ts";
import {
  buildStructuredComparison,
  calculateDeterministicMmfYieldChange,
} from "../_shared/server-financial-results.ts";
import type { MarketNewsBriefResult } from "../_shared/market-news-brief.ts";
import type { DailyMarketSummaryResult, DailyMarketSummarySection } from "../_shared/daily-market-summary.ts";

const AI_GATEWAY_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";
const GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models";
// The model is server-configured. Never accept a model/provider from the browser.
const DEFAULT_PARSER_MODEL = "openai/gpt-5.6-luna";
const MAX_INPUT_CHARS = 1024;
const RATE_WINDOW_SECONDS = 60;
const RATE_MAX_REQUESTS = 10;

interface ServerResult {
  kind: string;
  text: string;
  data?: Record<string, unknown>;
  freshness?: { fetchedAt: string; source: "server" };
}

interface ServerExecutionResponse {
  result?: ServerResult;
  clarification?: {
    question: string;
    choices: ResolutionCandidate[];
    continuationToken: string;
  };
  error?: "data_unavailable" | "unsupported";
}

interface ResolutionCandidate {
  id: string;
  kind: CanonicalFinancialEntity["kind"];
  subtype?: string;
  label: string;
  description: string;
  sourceKey: string;
}

function createResolverClient(url: string, key: string) {
  return createClient(url, key, { auth: { persistSession: false } });
}

type ResolverClient = ReturnType<typeof createResolverClient>;

const SYSTEM_PROMPT = `You translate casual user questions for KenyaFundFinder into one versioned JSON semantic frame only.
Understand imperfect English, typos, and common Kenyan wording such as bob, 10k, and "shares za Safaricom". Use recent context for follow-ups such as "what about KCB?".
Return exactly: {"version":1,"action":...,"confidence":...,"entityMentions":[],"requestedMetrics":[],"parameters":{},"contextReferences":[]}.
Allowed action: capabilities, overview, lookup, scenario, compare, news, explainer, refusal, clarification.
Each entity mention is {"text":string,"role":"primary"|"secondary"|"subject"} and may include expectedKinds using only stock, fund, fx, commodity, brand, news_topic, calculator, portfolio, market_topic.
Allowed parameter keys: scenarioKind, amount, currency, percentage, secondPercentage, periodDays, periodMonths. Allowed scenarioKind: asset-amount, stock-amount, stock-move, mmf-return, mmf-yield-change, fx-conversion, fx-move, commodity-move, portfolio-split, goal-projection.
Allowed contextReferences: last_entity, last_amount, last_percentage, last_currency. Include one only when the user's words actually refer to recent context.
Use explainer topic "getting-started" for safe beginner education such as "I am new to investing", "how do I start investing", "I know nothing about shares", or "nataka kuanza investing". This is general education, not investment selection.
Use refusal for requests to recommend, choose, tell the user whether to buy/sell/hold, predict, or identify the best/safest investment. A factual request for the highest published yield or largest recorded move is a lookup, not advice.
For a request such as "stocks report today", "MMF summary today", "FX rates brief", "commodities update", "market news summary", "market brief", or "daily market report", use action "overview", no entity mentions, and topic "daily-market-report:stocks", "daily-market-report:mmf", "daily-market-report:fx", "daily-market-report:commodities", "daily-market-report:news", or "daily-market-report:all". This asks for a factual server-data brief, not advice.
Use asset-amount for a neutral amount paired with a catalog asset, such as "put 100k in ABSA", "buy dollars with 50k", or "invest 50k in gold". This is an illustration, not a recommendation.
Use mmf-yield-change for explicit old/new yield comparisons such as "yield drops from 11% to 9%" or "Fund A at 11% versus Fund B at 9%". Put the old yield in percentage and the new yield in secondPercentage. Do not require a catalogue entity for a hypothetical yield comparison.
For "compare KCB", keep action compare with one primary entity mention; do not invent the second item. For a bare brand such as "KCB", do not decide whether it is a stock or fund.
Never answer the question. Never create canonical IDs. Never supply prices, yields, returns, volume, market cap, summaries, URLs, or facts. Extract numeric assumptions only when explicitly present in the user prompt or supplied context. Output JSON only.`;

function json(status: number, body: unknown, extra: Record<string, string> = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, ...extra, "Content-Type": "application/json" },
  });
}

function clientIp(req: Request): string {
  return req.headers.get("cf-connecting-ip") || req.headers.get("x-real-ip") ||
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
}

async function hashIp(ip: string, salt: string): Promise<string> {
  const bytes = new TextEncoder().encode(`${ip}:${salt}`);
  const hash = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(hash)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function checkRateLimit(req: Request): Promise<Response | null> {
  const url = Deno.env.get("SUPABASE_URL");
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !key) return json(503, { ok: false, reason: "rate_limit_unavailable" });
  try {
    const client = createClient(url, key, { auth: { persistSession: false } });
    const { data, error } = await client.rpc("check_rate_limit", {
      p_ip_hash: await hashIp(clientIp(req), key),
      p_window_seconds: RATE_WINDOW_SECONDS,
      p_max_requests: RATE_MAX_REQUESTS,
    });
    if (error || data !== true) {
      return json(data === false ? 429 : 503, {
        ok: false,
        reason: data === false ? "rate_limited" : "rate_limit_unavailable",
      }, data === false ? { "Retry-After": String(RATE_WINDOW_SECONDS) } : {});
    }
    return null;
  } catch {
    return json(503, { ok: false, reason: "rate_limit_unavailable" });
  }
}

function cleanText(value: unknown, max: number): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim().slice(0, max) : undefined;
}

function cleanBody(body: Record<string, unknown>) {
  const rawContext = body.context && typeof body.context === "object"
    ? body.context as Record<string, unknown>
    : {};
  return {
    context: {
      lastEntity: cleanText(rawContext.lastEntity, 100),
      lastIntent: cleanText(rawContext.lastIntent, 40),
      lastAmount: typeof rawContext.lastAmount === "number" ? rawContext.lastAmount : undefined,
      lastPercentage: typeof rawContext.lastPercentage === "number" ? rawContext.lastPercentage : undefined,
      lastFromYieldPct: typeof rawContext.lastFromYieldPct === "number" ? rawContext.lastFromYieldPct : undefined,
      lastToYieldPct: typeof rawContext.lastToYieldPct === "number" ? rawContext.lastToYieldPct : undefined,
      lastCurrency: cleanText(rawContext.lastCurrency, 10),
      continuationToken: cleanText(rawContext.continuationToken, 12_000),
      selectionId: cleanText(rawContext.selectionId, 120),
    },
  };
}

function parseModelJson(raw: string): unknown {
  const cleaned = raw.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
  try { return JSON.parse(cleaned); } catch { return null; }
}

function parseAmountToken(prompt: string): number | undefined {
  const normalized = prompt.replace(/,/g, "");
  const currencyAmount = normalized.match(/\b(?:kes|ksh|kshs)\s*(\d+(?:\.\d+)?)\s*([km])?\b/i);
  const shorthandAmount = normalized.match(/\b(\d+(?:\.\d+)?)\s*([km])\b/i);
  const plainAmount = [...normalized.matchAll(/\b(\d+(?:\.\d+)?)\b(?!\s*%)/gi)]
    .map((match) => ({ match, value: Number(match[1]) }))
    .filter(({ value }) => Number.isFinite(value) && value >= 1)
    .sort((a, b) => b.value - a.value)[0]?.match;
  const match = currencyAmount ?? shorthandAmount ?? plainAmount;
  if (!match) return undefined;
  const base = Number(match[1]);
  if (!Number.isFinite(base) || base < 1) return undefined;
  return base * (match[2]?.toLowerCase() === "k" ? 1_000 : match[2]?.toLowerCase() === "m" ? 1_000_000 : 1);
}

function parseYieldPair(prompt: string): [number, number] | null {
  const fromTo = prompt.match(/\bfrom\s+(-?\d+(?:\.\d+)?)\s*%?\s+(?:to|down to|up to)\s+(-?\d+(?:\.\d+)?)\s*%/i);
  if (fromTo) return [Number(fromTo[1]), Number(fromTo[2])];
  const versus = prompt.match(/\b(?:at\s+)?(-?\d+(?:\.\d+)?)\s*%\s+(?:versus|vs\.?|compared (?:with|to))[^\d-]*(-?\d+(?:\.\d+)?)\s*%/i);
  if (versus) return [Number(versus[1]), Number(versus[2])];
  const yields = [...prompt.matchAll(/(-?\d+(?:\.\d+)?)\s*%/g)].map((match) => Number(match[1]));
  return yields.length >= 2 && /\b(?:yield|mmf|money market|earn|income|fund)\b/i.test(prompt)
    ? [yields[0], yields[1]]
    : null;
}

function applyDeterministicYieldFrame(
  prompt: string,
  frame: QuerySemanticFrameV1,
  context: ReturnType<typeof cleanBody>["context"],
): QuerySemanticFrameV1 {
  const pair = parseYieldPair(prompt);
  const contextualFollowUp = /\b(?:how much (?:less|more)|difference|change)\b.*\b(?:earn|income|yield)\b/i.test(prompt)
    && context.lastFromYieldPct != null && context.lastToYieldPct != null;
  if (!pair && !contextualFollowUp && frame.parameters.scenarioKind !== "mmf-yield-change") return frame;
  const explicitlyReferencesPriorAmount = frame.contextReferences.includes("last_amount")
    && /\b(?:same|that|previous|earlier)\s+(?:amount|principal|investment)\b/i.test(prompt);
  return {
    ...frame,
    action: "scenario",
    entityMentions: [],
    parameters: {
      ...frame.parameters,
      scenarioKind: "mmf-yield-change",
      amount: parseAmountToken(prompt) ?? (explicitlyReferencesPriorAmount ? context.lastAmount : undefined),
      percentage: pair?.[0] ?? frame.parameters.percentage ?? context.lastFromYieldPct,
      secondPercentage: pair?.[1] ?? frame.parameters.secondPercentage ?? context.lastToYieldPct,
      periodMonths: frame.parameters.periodMonths ?? 12,
    },
    contextReferences: contextualFollowUp
      ? [...new Set([...frame.contextReferences, "last_percentage" as const])]
      : frame.contextReferences,
  };
}

function applyDeterministicComparisonFrame(
  prompt: string,
  frame: QuerySemanticFrameV1,
): QuerySemanticFrameV1 {
  const explicit = prompt.match(/^\s*compare\s+(.+?)\s*[?.!]*$/i);
  if (!explicit || parseYieldPair(prompt)) return frame;
  const mentions = explicit[1]
    .split(/\s*,\s*(?:and\s+)?|\s+(?:and|vs\.?|versus|with)\s+/i)
    .map((value) => value.trim())
    .filter(Boolean)
    .slice(0, 4);
  if (mentions.length < 2) return frame;
  return {
    ...frame,
    action: "compare",
    entityMentions: mentions.map((text, index) => ({
      text,
      role: index === 0 ? "primary" : "secondary",
    })),
    parameters: {},
  };
}

function fallbackSemanticFrame(prompt: string, context: ReturnType<typeof cleanBody>["context"]): QuerySemanticFrameV1 | null {
  const text = prompt.trim();
  const lower = text.toLowerCase();
  if (!text) return null;
  if (/\b(?:should i|best|safest|recommend|what should i buy|tell me what to choose)\b/i.test(text)) {
    return { version: QUERY_CONTRACT_VERSION, action: "refusal", confidence: "high", entityMentions: [], requestedMetrics: [], parameters: {}, contextReferences: [] };
  }
  const reportTopic = dailyMarketReportTopic(text);
  if (reportTopic) {
    return dailyMarketReportFrame(reportTopic);
  }
  const amount = parseAmountToken(text);
  const yieldPair = parseYieldPair(text);
  if (yieldPair) {
    return {
      version: QUERY_CONTRACT_VERSION,
      action: "scenario",
      confidence: "high",
      entityMentions: [],
      requestedMetrics: ["annual income", "monthly income", "yield change"],
      parameters: {
        amount,
        percentage: yieldPair[0],
        secondPercentage: yieldPair[1],
        periodMonths: 12,
        scenarioKind: "mmf-yield-change",
      },
      contextReferences: [],
    };
  }
  if (/\b(?:how much (?:less|more)|difference|change)\b.*\b(?:earn|income|yield)\b/i.test(text)
    && context.lastFromYieldPct != null && context.lastToYieldPct != null) {
    return {
      version: QUERY_CONTRACT_VERSION,
      action: "scenario",
      confidence: "high",
      entityMentions: [],
      requestedMetrics: ["annual income", "monthly income", "yield change"],
      parameters: {
        amount: amount ?? context.lastAmount,
        percentage: context.lastFromYieldPct,
        secondPercentage: context.lastToYieldPct,
        periodMonths: 12,
        scenarioKind: "mmf-yield-change",
      },
      contextReferences: ["last_percentage"],
    };
  }
  const fundTypeMatch = text.match(/\b(mmf|money market(?: fund)?|fixed income(?: fund)?|balanced fund|equity fund|bond fund|special(?:ised|ized)? fund|shariah fund)\b/i);
  const detectedCurrency = text.match(/\b(usd|eur|gbp|chf|cad|aud|jpy|cny)\b/i)?.[1]?.toUpperCase();
  const currency = fundTypeMatch ? undefined : detectedCurrency;
  const commodity = text.match(/\b(gold|silver|brent|crude|oil|coffee|tea)\b/i)?.[1];
  const stock = fundTypeMatch ? undefined : text.match(/\b(scom|eqty|kcb|scbk|eabl|kengen|ncba|co-op|safaricom|kcb group|equity group)\b/i)?.[1];
  const fundLead = fundTypeMatch
    ? text.slice(0, fundTypeMatch.index).replace(/\b(?:put|invest|place|allocate|model|show|calculate|if|i|have|kes|ksh|kshs|sh|bob|in|into|with|an?|the)\b/gi, " ").replace(/\d[\d,.]*\s*[km]?/gi, " ").replace(/\s+/g, " ").trim()
    : "";
  const fund = fundTypeMatch ? `${fundLead ? `${fundLead} ` : ""}${fundTypeMatch[1]}`.trim() : undefined;
  const movement = text.match(/\b(?:rises?|increases?|gains?|up|falls?|drops?|decreases?|down)\s+(\d+(?:\.\d+)?)\s*%/i);
  if (amount != null && context.continuationToken && !fund && !detectedCurrency && !commodity && !stock) {
    return {
      version: QUERY_CONTRACT_VERSION,
      action: "scenario",
      confidence: "high",
      entityMentions: [],
      requestedMetrics: [],
      parameters: { amount, currency: context.lastCurrency ?? "KES" },
      contextReferences: ["last_entity"],
    };
  }
  const contextualEntity = commodity || currency || stock || (context.lastEntity && movement ? context.lastEntity : undefined);
  const compare = text.match(/^\s*compare\s+(.+?)\s+(?:vs\.?|versus|with|and|&)\s+(.+?)\s*[?.!]*$/i);
  if (compare) return {
    version: QUERY_CONTRACT_VERSION, action: "compare", confidence: "high",
    entityMentions: [{ text: compare[1], role: "primary" }, { text: compare[2], role: "secondary" }],
    requestedMetrics: [], parameters: {}, contextReferences: [],
  };
  const bareCompare = text.match(/^\s*compare\s+(.+?)\s*[?.!]*$/i);
  if (bareCompare) return {
    version: QUERY_CONTRACT_VERSION, action: "compare", confidence: "high",
    entityMentions: [{ text: bareCompare[1], role: "primary" }], requestedMetrics: [], parameters: {}, contextReferences: [],
  };
  if (movement && contextualEntity) {
    const magnitude = Number(movement[1]);
    const downward = /fall|drop|decreas|down/i.test(movement[0]);
    const expectedKinds = currency ? ["fx"] : commodity ? ["commodity"] : stock ? ["stock"] : undefined;
    return {
      version: QUERY_CONTRACT_VERSION, action: "scenario", confidence: "high",
      entityMentions: [{ text: contextualEntity, role: "primary", expectedKinds: expectedKinds as CanonicalFinancialEntity["kind"][] | undefined }],
      requestedMetrics: [], parameters: {
        percentage: downward ? -magnitude : magnitude,
        scenarioKind: currency ? "fx-move" : commodity ? "commodity-move" : "stock-move",
        amount: context.lastAmount,
      }, contextReferences: context.lastEntity && !commodity && !currency && !stock ? ["last_entity"] : [],
    };
  }
  if (amount != null && (currency || commodity || stock || fund)) {
    const entity = currency || commodity || stock || fund!;
    const expectedKinds = currency ? ["fx"] : commodity ? ["commodity"] : stock ? ["stock"] : ["fund"];
    return {
      version: QUERY_CONTRACT_VERSION, action: "scenario", confidence: "high",
      entityMentions: [{ text: entity, role: "primary", expectedKinds: expectedKinds as CanonicalFinancialEntity["kind"][] }],
      requestedMetrics: [], parameters: {
        amount, currency: detectedCurrency ?? "KES",
        scenarioKind: currency ? "fx-conversion" : "asset-amount",
      }, contextReferences: [],
    };
  }
  if (commodity || currency || stock || fund || context.lastEntity) {
    const entity = commodity || currency || stock || fund || context.lastEntity!;
    const expectedKinds = currency ? ["fx"] : commodity ? ["commodity"] : stock ? ["stock"] : fund ? ["fund"] : undefined;
    return {
      version: QUERY_CONTRACT_VERSION,
      action: /\b(?:price|rate|yield|value|how much|details?|information|iko aje|bei)\b/i.test(lower) ? "lookup" : "scenario",
      confidence: "medium",
      entityMentions: [{ text: entity, role: "primary", expectedKinds: expectedKinds as CanonicalFinancialEntity["kind"][] | undefined }],
      requestedMetrics: [], parameters: { amount, currency: currency ?? context.lastCurrency },
      contextReferences: context.lastEntity && !commodity && !currency && !stock && !fund ? ["last_entity"] : [],
    };
  }
  return null;
}

type DailyMarketReportTopic = "stocks" | "mmf" | "fx" | "commodities" | "news" | "all";

function dailyMarketReportTopic(prompt: string): DailyMarketReportTopic | null {
  const lower = prompt.toLowerCase();
  const asksForBrief = /\b(?:report|summary|brief|recap|update|overview)\b/.test(lower);
  const asksForToday = /\b(?:today|daily|for the day)\b/.test(lower);
  if (!asksForBrief && !asksForToday) return null;
  if (/\b(?:market\s+brief|market\s+news|news\s+report|news\s+summary|headlines?)\b/.test(lower)) return "news";
  const topics = [
    [/\b(?:stock|stocks|shares?|nse)\b/, "stocks"],
    [/\b(?:mmf|mmfs|money market|money-market)\b/, "mmf"],
    [/\b(?:fx|forex|exchange rates?|currenc(?:y|ies)|usd\s*\/\s*kes)\b/, "fx"],
    [/\b(?:commodit(?:y|ies)|gold|silver|brent|crude|oil|coffee|tea)\b/, "commodities"],
  ] as const;
  const matches = topics.filter(([pattern]) => pattern.test(lower)).map(([, topic]) => topic);
  if (matches.length === 1) return matches[0];
  return /\b(?:market|markets|all)\b/.test(lower) || matches.length > 1 ? "all" : null;
}

function dailyMarketReportFrame(topic: DailyMarketReportTopic): QuerySemanticFrameV1 {
  return {
    version: QUERY_CONTRACT_VERSION,
    action: "overview",
    confidence: "high",
    entityMentions: [],
    requestedMetrics: ["latest available market snapshot"],
    parameters: {},
    contextReferences: [],
    topic: `daily-market-report:${topic}`,
  };
}

function applyDeterministicDailyReportFrame(prompt: string, frame: QuerySemanticFrameV1): QuerySemanticFrameV1 {
  const topic = dailyMarketReportTopic(prompt);
  return topic ? dailyMarketReportFrame(topic) : frame;
}

async function requestParserModel(prompt: string, safeInput: ReturnType<typeof cleanBody>): Promise<unknown> {
  const model = Deno.env.get("AI_LAB_PARSER_MODEL") || DEFAULT_PARSER_MODEL;
  const system = SYSTEM_PROMPT;
  const user = JSON.stringify({ prompt, ...safeInput });
  const gatewayKey = Deno.env.get("LOVABLE_API_KEY");
  if (gatewayKey) {
    const response = await fetch(AI_GATEWAY_URL, {
      method: "POST",
      headers: { Authorization: `Bearer ${gatewayKey}`, "Content-Type": "application/json" },
      signal: AbortSignal.timeout(12_000),
      body: JSON.stringify({
        model,
        messages: [{ role: "system", content: system }, { role: "user", content: user }],
        temperature: 0,
        max_tokens: 240,
        response_format: { type: "json_object" },
        reasoning_effort: "low",
      }),
    });
    if (response.ok) {
      const payload = await response.json();
      const content = payload?.choices?.[0]?.message?.content;
      if (typeof content === "string") return parseModelJson(content);
    }
  }

  // Temporary rollout fallback. It is only used when the configured gateway
  // cannot produce a frame; it never overrides a valid gateway frame.
  if (Deno.env.get("AI_LAB_PARSER_FALLBACK_GEMINI") !== "false") {
    const key = Deno.env.get("GEMINI_API_KEY");
    if (key) {
      const modelName = Deno.env.get("AI_LAB_GEMINI_FALLBACK_MODEL") || "gemini-3.7-flash";
      const response = await fetch(`${GEMINI_API_URL}/${modelName}:generateContent`, {
        method: "POST",
        headers: { "x-goog-api-key": key, "Content-Type": "application/json" },
        signal: AbortSignal.timeout(12_000),
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: system }] },
          contents: [{ role: "user", parts: [{ text: user }] }],
          generationConfig: { temperature: 0, maxOutputTokens: 240, responseMimeType: "application/json" },
        }),
      });
      if (response.ok) {
        const payload = await response.json();
        const content = Array.isArray(payload?.candidates?.[0]?.content?.parts)
          ? payload.candidates[0].content.parts.map((part: { text?: unknown }) => part.text ?? "").join("")
          : "";
        return parseModelJson(content);
      }
    }
  }
  return null;
}

/** Normalize only model formatting variants; strict schema validation still owns acceptance. */
function normalizeModelFrame(value: unknown): unknown {
  if (!value || typeof value !== "object" || Array.isArray(value)) return value;
  const row = value as Record<string, unknown>;
  // Confidence does not authorize any action and is not used to create market
  // facts. Treat an absent or non-standard model label as low confidence so a
  // harmless formatting difference cannot discard an otherwise safe intent.
  const confidence = typeof row.confidence === "string" ? row.confidence.toLowerCase() : "";
  const normalized = confidence.includes("high") ? "high"
    : confidence.includes("medium") ? "medium"
    : confidence.includes("low") ? "low"
    : "low";
  return {
    ...row,
    version: row.version ?? QUERY_CONTRACT_VERSION,
    confidence: normalized,
    entityMentions: Array.isArray(row.entityMentions) ? row.entityMentions : [],
    requestedMetrics: Array.isArray(row.requestedMetrics) ? row.requestedMetrics : [],
    parameters: row.parameters && typeof row.parameters === "object" && !Array.isArray(row.parameters) ? row.parameters : {},
    contextReferences: Array.isArray(row.contextReferences) ? row.contextReferences : [],
  };
}

function parseNumber(value: unknown): number | null {
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : null;
}

function formatKes(value: number): string {
  return new Intl.NumberFormat("en-KE", { style: "currency", currency: "KES", maximumFractionDigits: 0 }).format(value);
}

function formatNumber(value: number, digits = 2): string {
  return value.toLocaleString("en-KE", { maximumFractionDigits: digits });
}

function formatObservedAt(value: string | null): string {
  if (!value) return "Unavailable";
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return "Unavailable";
  return `${date.toLocaleString("en-KE", {
    timeZone: "Africa/Nairobi",
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  })} EAT`;
}

function serverFreshness(): { fetchedAt: string; source: "server" } {
  return { fetchedAt: new Date().toISOString(), source: "server" };
}

function standardDisclaimer(): string {
  return "Data only. Not personal financial advice.";
}

function latestObservedAt(rows: Array<{ updated_at?: unknown }>): string | null {
  const timestamps = rows
    .map((row) => typeof row.updated_at === "string" ? Date.parse(row.updated_at) : NaN)
    .filter((value) => Number.isFinite(value));
  return timestamps.length ? new Date(Math.max(...timestamps)).toISOString() : null;
}

function signedPercent(value: number | null): string {
  return value == null ? "change unavailable" : `${value >= 0 ? "+" : ""}${formatNumber(value, 2)}%`;
}

function trendForChange(value: number | null): "positive" | "negative" | "neutral" {
  return value == null || value === 0 ? "neutral" : value > 0 ? "positive" : "negative";
}

async function buildMarketNewsBrief(client: ResolverClient): Promise<MarketNewsBriefResult> {
  const [overviewResult, newsResult] = await Promise.all([
    client
      .from("market_overviews")
      .select("market_date,narrative,deterministic_summary,generated_at,source_as_of")
      .eq("status", "ready")
      .order("market_date", { ascending: false })
      .limit(1)
      .maybeSingle(),
    client
      .from("news_articles")
      .select("id,title,summary,source,category,date_published,source_published_at")
      .eq("status", "published")
      .not("quality_checked_at", "is", null)
      .order("source_published_at", { ascending: false, nullsFirst: false })
      .limit(10),
  ]);

  const overview = overviewResult.data;
  const articles = (newsResult.data ?? []).map((row: Record<string, unknown>) => {
    const id = cleanText(row.id, 100);
    if (!id) return null;
    return {
      id,
      category: cleanText(row.category, 80) ?? "Market news",
      source: cleanText(row.source, 120) ?? "KenyaFundFinder",
      publishedAt: cleanText(row.source_published_at, 40) ?? cleanText(row.date_published, 40) ?? null,
      title: cleanText(row.title, 500) ?? "Market update",
      summary: cleanText(row.summary, 1_000) ?? "Stored article summary is unavailable.",
      articlePath: `/news/${encodeURIComponent(id)}`,
    };
  }).filter((article): article is NonNullable<typeof article> => article != null);

  const marketContext = cleanText(overview?.narrative, 2_000) ?? cleanText(overview?.deterministic_summary, 2_000) ?? null;
  return {
    kind: "market-news-brief",
    title: "Kenya Market Brief",
    reportDate: cleanText(overview?.market_date, 40) ?? null,
    overview: marketContext,
    overviewUnavailable: marketContext == null,
    articles,
    disclaimer: standardDisclaimer(),
  };
}

async function buildDailyMarketReport(
  client: ResolverClient,
  topic: DailyMarketReportTopic,
): Promise<ServerResult> {
  if (topic === "news") {
    const newsBrief = await buildMarketNewsBrief(client);
    return {
      kind: "market-news-brief",
      text: "Here is the latest available Market News Brief.",
      data: { routerResult: newsBrief },
      freshness: serverFreshness(),
    };
  }

  const wants = (kind: DailyMarketReportTopic) => topic === "all" || topic === kind;
  const [stocksResult, fundsResult, ratesResult, commoditiesResult] = await Promise.all([
    wants("stocks") ? client.from("stocks").select("symbol,name,price,day_change_percent,updated_at").eq("is_active", true).limit(100) : Promise.resolve({ data: [] }),
    wants("mmf") ? client.from("funds").select("name,annual_yield,fund_type,updated_at").eq("is_published", true).eq("fund_type", "money_market").limit(100) : Promise.resolve({ data: [] }),
    wants("fx") ? client.from("exchange_rates").select("currency_code,currency_name,rate,previous_rate,updated_at").eq("is_active", true).limit(40) : Promise.resolve({ data: [] }),
    wants("commodities") ? client.from("commodities").select("symbol,name,price,previous_price,unit,updated_at").eq("is_active", true).limit(40) : Promise.resolve({ data: [] }),
  ]);

  const summarySections: DailyMarketSummarySection[] = [];
  const sourceMetadata: Array<{ source: string; observedAt: string | null; records: number }> = [];
  const newsBrief = wants("news") ? await buildMarketNewsBrief(client) : null;

  if (wants("stocks")) {
    const rows = (stocksResult.data ?? []).map((row: Record<string, unknown>) => ({
      symbol: cleanText(row.symbol, 30), name: cleanText(row.name, 100), price: parseNumber(row.price), change: parseNumber(row.day_change_percent), updated_at: row.updated_at,
    })).filter((row) => row.symbol && row.price != null);
    const movers = rows.filter((row) => row.change != null).sort((a, b) => Math.abs(b.change!) - Math.abs(a.change!)).slice(0, 3);
    summarySections.push({
      kind: "stocks",
      title: "Stocks summary",
      summary: rows.length ? "Latest available NSE stock snapshot." : "No active stock snapshot is currently available.",
      metrics: [{ label: "Priced stocks", value: String(rows.length), detail: "Latest available NSE snapshot" }],
      highlights: movers.length ? movers.map((row) => `${row.symbol} ${signedPercent(row.change)} · KES ${formatNumber(row.price!)}`) : rows.length ? ["Day-change data is unavailable for the current snapshot."] : [],
      unavailable: rows.length === 0,
    });
    sourceMetadata.push({ source: "stocks", observedAt: latestObservedAt(rows), records: rows.length });
  }

  if (wants("mmf")) {
    const rows = (fundsResult.data ?? []).map((row: Record<string, unknown>) => ({ name: cleanText(row.name, 120), yield: parseNumber(row.annual_yield), updated_at: row.updated_at }))
      .filter((row) => row.name && row.yield != null && row.yield! > 0 && row.yield! < 100)
      .sort((a, b) => b.yield! - a.yield!);
    const average = rows.length ? rows.reduce((sum, row) => sum + row.yield!, 0) / rows.length : null;
    summarySections.push({
      kind: "mmf",
      title: "MMF summary",
      summary: rows.length ? "Published annual-yield snapshot. Yields are published figures and can change." : "No published MMF-yield snapshot is currently available.",
      metrics: rows.length ? [
        { label: "Published MMFs", value: String(rows.length) },
        { label: "Average yield", value: `${formatNumber(average!, 2)}%` },
        { label: "Stored range", value: `${formatNumber(rows[rows.length - 1].yield!, 2)}%–${formatNumber(rows[0].yield!, 2)}%` },
      ] : [],
      highlights: rows.slice(0, 3).map((row) => `${row.name} · ${formatNumber(row.yield!, 2)}%`),
      unavailable: rows.length === 0,
    });
    sourceMetadata.push({ source: "funds", observedAt: latestObservedAt(rows), records: rows.length });
  }

  if (wants("fx")) {
    const preferredOrder = ["USD", "EUR", "GBP", "ZAR"];
    const preferredRank = new Map(
      preferredOrder.map((code, index) => [code, index]),
    );
    const rows = (ratesResult.data ?? []).map((row: Record<string, unknown>) => {
      const rate = parseNumber(row.rate);
      const previous = parseNumber(row.previous_rate);
      return { code: cleanText(row.currency_code, 20), rate, previous, updated_at: row.updated_at };
    }).filter((row) => row.code && row.rate != null && row.rate! > 0)
      .sort((a, b) =>
        (preferredRank.get(a.code!) ?? preferredOrder.length) -
          (preferredRank.get(b.code!) ?? preferredOrder.length) ||
        a.code!.localeCompare(b.code!),
      );
    const metrics = rows.slice(0, 4).map((row) => {
      const change = row.previous && row.previous !== 0 ? ((row.rate! - row.previous) / row.previous) * 100 : null;
      return { label: `${row.code}/KES`, value: formatNumber(row.rate!, 4), detail: signedPercent(change), trend: trendForChange(change) };
    });
    summarySections.push({
      kind: "fx",
      title: "FX rate summary",
      summary: metrics.length ? "Rates are KES per 1 unit. Movement is versus the stored previous rate where available." : "No active FX-rate snapshot is currently available.",
      metrics,
      highlights: [],
      unavailable: metrics.length === 0,
    });
    sourceMetadata.push({ source: "exchange_rates", observedAt: latestObservedAt(rows), records: rows.length });
  }

  if (wants("commodities")) {
    const rows = (commoditiesResult.data ?? []).map((row: Record<string, unknown>) => {
      const price = parseNumber(row.price);
      const previous = parseNumber(row.previous_price);
      return { symbol: cleanText(row.symbol, 30), name: cleanText(row.name, 100), price, previous, unit: cleanText(row.unit, 50), updated_at: row.updated_at };
    }).filter((row) => row.symbol && row.price != null && row.price! > 0).slice(0, 4);
    const metrics = rows.map((row) => {
      const change = row.previous && row.previous !== 0 ? ((row.price! - row.previous) / row.previous) * 100 : null;
      return { label: row.symbol!, value: `${formatNumber(row.price!, 4)}${row.unit ? ` ${row.unit}` : ""}`, detail: signedPercent(change), trend: trendForChange(change) };
    });
    summarySections.push({
      kind: "commodities",
      title: "Commodities summary",
      summary: metrics.length ? "Latest available commodity quotes. Movement is versus the stored previous price where available." : "No active commodity snapshot is currently available.",
      metrics,
      highlights: [],
      unavailable: metrics.length === 0,
    });
    sourceMetadata.push({ source: "commodities", observedAt: latestObservedAt(rows), records: rows.length });
  }

  if (newsBrief) {
    sourceMetadata.push({ source: "news_articles", observedAt: newsBrief.reportDate, records: newsBrief.articles.length });
  }

  const title = topic === "all" ? "Daily market summary" : topic === "mmf" ? "MMF summary" : topic === "fx" ? "FX rate summary" : topic === "stocks" ? "Stocks summary" : "Commodities summary";
  const routerResult: DailyMarketSummaryResult = {
    kind: "daily-market-summary",
    title,
    sections: summarySections,
    ...(newsBrief ? { newsBrief } : {}),
    disclaimer: standardDisclaimer(),
  };

  return {
    kind: "daily-market-report",
    text: `${title}. Structured server summary shown below.`,
    data: { topic, sourceMetadata, routerResult },
    freshness: serverFreshness(),
  };
}

async function fetchEntityQuote(client: ResolverClient, entity: CanonicalFinancialEntity): Promise<{
  value: number;
  label: string;
  quoteCurrency: string;
  updatedAt: string | null;
  name: string;
  symbol: string;
  fundType?: string;
  yieldUnit?: string;
  minimumInvestment?: number | null;
  managementFee?: number | null;
  withdrawalTime?: string | null;
} | null> {
  const sourceId = entity.sourceId;
  const sourceKey = entity.sourceKey;
  if (entity.kind === "stock") {
    let query = client.from("stocks").select("id,symbol,name,price,updated_at").eq("is_active", true);
    query = sourceId ? query.eq("id", sourceId) : query.eq("symbol", sourceKey);
    const { data } = await query.maybeSingle();
    const value = parseNumber(data?.price);
    if (!data || value == null || value <= 0) return null;
    return { value, label: "Price (KES)", quoteCurrency: "KES", updatedAt: data.updated_at ?? null, name: String(data.name ?? sourceKey).trim(), symbol: String(data.symbol ?? sourceKey).trim() };
  }
  if (entity.kind === "fund") {
    let query = client.from("funds").select("id,slug,name,annual_yield,fund_type,yield_unit,minimum_investment,management_fee,withdrawal_time,updated_at").eq("is_published", true);
    query = sourceId ? query.eq("id", sourceId) : query.eq("slug", sourceKey);
    const { data } = await query.maybeSingle();
    const value = parseNumber(data?.annual_yield);
    if (!data || value == null || value <= 0) return null;
    const yieldUnit = data.yield_unit ?? "%";
    return {
      value,
      label: yieldUnit === "%" ? "Annual yield (%)" : `Published unit value (${yieldUnit})`,
      quoteCurrency: yieldUnit === "%" ? "PCT" : String(yieldUnit),
      updatedAt: data.updated_at ?? null,
      name: String(data.name ?? sourceKey).trim(),
      symbol: String(data.slug ?? sourceKey).trim(),
      fundType: data.fund_type ?? entity.subtype ?? "money_market",
      yieldUnit,
      minimumInvestment: parseNumber(data.minimum_investment),
      managementFee: parseNumber(data.management_fee),
      withdrawalTime: data.withdrawal_time ?? null,
    };
  }
  if (entity.kind === "fx") {
    let query = client.from("exchange_rates").select("id,currency_code,currency_name,rate,updated_at").eq("is_active", true);
    query = sourceId ? query.eq("id", sourceId) : query.eq("currency_code", sourceKey);
    const { data } = await query.maybeSingle();
    const value = parseNumber(data?.rate);
    if (!data || value == null || value <= 0) return null;
    return { value, label: "KES per 1 unit", quoteCurrency: "KES", updatedAt: data.updated_at ?? null, name: String(data.currency_name ?? sourceKey).trim(), symbol: String(data.currency_code ?? sourceKey).trim() };
  }
  if (entity.kind === "commodity") {
    let query = client.from("commodities").select("id,symbol,name,price,unit,updated_at").eq("is_active", true);
    query = sourceId ? query.eq("id", sourceId) : query.eq("symbol", sourceKey);
    const { data } = await query.maybeSingle();
    const value = parseNumber(data?.price);
    if (!data || value == null || value <= 0) return null;
    const label = data.unit ? `Price (${data.unit})` : "Published price";
    const quoteCurrency = /\bkes\b|ksh/i.test(String(data.unit ?? "")) ? "KES" : "USD";
    return { value, label, quoteCurrency, updatedAt: data.updated_at ?? null, name: String(data.name ?? sourceKey).trim(), symbol: String(data.symbol ?? sourceKey).trim() };
  }
  return null;
}

function missingAmountQuestion(entity: CanonicalFinancialEntity): string {
  return `How much KES would you like to model for ${entity.displayLabel}?`;
}

function refusalText(): string {
  return "I can explain the available data and show neutral scenarios, but I cannot recommend what you should buy, sell, hold, or choose.";
}

async function executeServerFrame(
  client: ResolverClient,
  frame: QuerySemanticFrameV1,
  entities: CanonicalFinancialEntity[],
): Promise<ServerExecutionResponse> {
  if (frame.action === "refusal") return { result: { kind: "refusal", text: refusalText(), freshness: serverFreshness() } };
  if (frame.action === "overview" && frame.topic?.startsWith("daily-market-report:")) {
    const topic = frame.topic.slice("daily-market-report:".length) as DailyMarketReportTopic;
    if (["stocks", "mmf", "fx", "commodities", "news", "all"].includes(topic)) {
      return { result: await buildDailyMarketReport(client, topic) };
    }
  }
  if (frame.action === "capabilities" || frame.action === "explainer") {
    return { result: { kind: "explanation", text: "Ask about a stock, fund, FX rate, commodity, comparison, news item, or a neutral amount scenario.", freshness: serverFreshness() } };
  }
  if (frame.action === "compare") {
    if (entities.length < 2) return { error: "unsupported" };
    const comparedEntities = entities.slice(0, 4);
    const quotes = await Promise.all(comparedEntities.map((entity) => fetchEntityQuote(client, entity)));
    const assets = comparedEntities.map((entity, index) => {
      const quote = quotes[index];
      if (!quote) {
        return {
          kind: entity.kind as "stock" | "fund" | "commodity" | "fx",
          id: entity.sourceId,
          name: entity.displayLabel,
          symbol: entity.shortLabel ?? entity.sourceKey,
          value: 0,
          valueLabel: "Value unavailable",
          changePct: null,
          aliases: [],
          updatedAt: null,
          dataUnavailable: true,
        };
      }
      return {
        kind: entity.kind as "stock" | "fund" | "commodity" | "fx",
        id: entity.sourceId,
        name: quote.name,
        symbol: quote.symbol,
        value: quote.value,
        valueLabel: quote.label,
        changePct: null,
        aliases: [],
        updatedAt: quote.updatedAt,
        extras: [
          { label: "Source timestamp", value: formatObservedAt(quote.updatedAt) },
          ...(entity.kind === "fund" ? [{ label: "Fund type", value: String(quote.fundType ?? entity.subtype ?? "fund").replace(/_/g, " ") }] : []),
          ...(entity.manager ? [{ label: "Manager", value: entity.manager }] : []),
        ],
      };
    });
    const routerResult = buildStructuredComparison(assets);
    const availableText = assets.map((asset) => asset.dataUnavailable
      ? `${asset.name}: value unavailable`
      : `${asset.name}: ${formatNumber(asset.value)} ${asset.valueLabel}`).join(". ");
    return {
      result: {
        kind: "compare",
        text: `Here is a server-data comparison of ${comparedEntities.map((entity) => entity.displayLabel).join(", ")}. ${availableText}. Values with different units are shown side by side and are not treated as directly equivalent.`,
        data: {
          entities: comparedEntities,
          quotes,
          routerResult,
          sourceMetadata: comparedEntities.map((entity, index) => ({
            canonicalId: entity.id,
            sourceKey: entity.sourceKey,
            observedAt: quotes[index]?.updatedAt ?? null,
          })),
        },
        freshness: serverFreshness(),
      },
    };
  }
  if (frame.action === "scenario" && frame.parameters.scenarioKind === "mmf-yield-change") {
    const fromYieldPct = frame.parameters.percentage;
    const toYieldPct = frame.parameters.secondPercentage;
    if (fromYieldPct == null || toYieldPct == null) {
      return {
        clarification: {
          question: "What old and new annual yields should I compare? For example, 11% to 9%.",
          choices: [],
          continuationToken: createParameterContinuationToken(frame, entities.map((entity) => entity.id)),
        },
      };
    }
    if (frame.parameters.amount == null) {
      return {
        clarification: {
          question: `What KES investment amount should I use to compare ${fromYieldPct}% with ${toYieldPct}%?`,
          choices: [],
          continuationToken: createParameterContinuationToken(frame, entities.map((entity) => entity.id)),
        },
      };
    }
    const routerResult = calculateDeterministicMmfYieldChange(
      frame.parameters.amount,
      fromYieldPct,
      toYieldPct,
      frame.parameters.periodMonths ?? 12,
    );
    const direction = routerResult.deltaYearly < 0 ? "a decrease" : routerResult.deltaYearly > 0 ? "an increase" : "no change";
    return {
      result: {
        kind: "mmf-yield-change",
        text: `${formatKes(routerResult.inputs.amount)} at ${fromYieldPct}% gives an illustrative annual gross income of ${formatKes(routerResult.fromGrossYearly)}; at ${toYieldPct}% it is ${formatKes(routerResult.toGrossYearly)}. That is ${direction} of ${formatKes(Math.abs(routerResult.deltaYearly))} per year, or about ${formatKes(Math.abs(routerResult.deltaMonthly))} per month.`,
        data: { routerResult },
        freshness: serverFreshness(),
      },
    };
  }
  const entity = entities[0];
  if (!entity) return { error: "unsupported" };
  const quote = await fetchEntityQuote(client, entity);
  if (!quote) return { error: "data_unavailable" };
  const amount = frame.parameters.amount;
  const scenarioKind = frame.parameters.scenarioKind;
  if (frame.action === "lookup" || frame.action === "overview") {
    const fields = entity.kind === "fund"
      ? [
          { label: quote.yieldUnit === "%" ? "Annual yield" : "Published unit value", value: `${formatNumber(quote.value, 2)}${quote.yieldUnit === "%" ? "%" : ` ${quote.yieldUnit}`}` },
          { label: "Fund type", value: String(quote.fundType ?? entity.subtype ?? "fund").replace(/_/g, " ") },
          ...(entity.manager ? [{ label: "Manager", value: entity.manager }] : []),
          ...(quote.minimumInvestment != null ? [{ label: "Minimum investment", value: formatKes(quote.minimumInvestment) }] : []),
          ...(quote.managementFee != null ? [{ label: "Management fee", value: `${formatNumber(quote.managementFee, 2)}%` }] : []),
          ...(quote.withdrawalTime ? [{ label: "Withdrawal time", value: quote.withdrawalTime }] : []),
        ]
      : [{ label: quote.label, value: formatNumber(quote.value, 4) }];
    const routerResult = {
      kind: "website-lookup",
      summary: `Latest available KenyaFundFinder data for ${quote.name}.`,
      entityType: entity.kind,
      entityName: quote.name,
      entitySymbol: quote.symbol,
      fields,
      sourceNote: "Pulled from KenyaFundFinder server data.",
      pagePath: entity.kind === "fund" ? `/compare/${quote.symbol}` : undefined,
      disclaimer: standardDisclaimer(),
    };
    return {
      result: {
        kind: "lookup",
        text: `${quote.name} (${quote.symbol}) is currently shown at ${formatNumber(quote.value)} ${quote.label}. This is the latest available KenyaFundFinder snapshot.`,
        data: { entity, quote, routerResult },
        freshness: serverFreshness(),
      },
    };
  }
  if (frame.action !== "scenario") return { error: "unsupported" };
  const movementPct = frame.parameters.percentage;
  if (movementPct != null && ["stock-move", "fx-move", "commodity-move"].includes(String(scenarioKind))) {
    const estimated = Math.round(quote.value * (1 + movementPct / 100) * 10000) / 10000;
    const change = Math.round((estimated - quote.value) * 10000) / 10000;
    const direction = movementPct > 0 ? "rises" : movementPct < 0 ? "falls" : "does not move";
    const movementText = `${quote.name} ${direction} by ${Math.abs(movementPct)}%: the quoted value moves from ${formatNumber(quote.value, 4)} to ${formatNumber(estimated, 4)} ${quote.label}. This is illustrative only and does not predict future prices.`;
    const routerResult = entity.kind === "commodity"
      ? {
          kind: "commodity-move",
          summary: "This scenario shows how the commodity value changes under the movement assumption. It does not predict future commodity prices.",
          inputs: { symbol: quote.symbol, name: quote.name, currentValue: quote.value, valueLabel: quote.label, movementPct },
          estimatedValueAfterMove: estimated,
          estimatedChange: change,
          assumptions: ["Uses the latest available KenyaFundFinder commodity data.", "Movement is applied to the published value shown.", "Does not predict future commodity prices."],
          importantNotes: ["Value change is illustrative only — actual commodity prices can differ."],
          disclaimer: standardDisclaimer(),
        }
      : entity.kind === "fx"
        ? {
            kind: "fx-move",
            summary: "This scenario shows how the quoted exchange rate changes under the movement assumption. It does not predict future exchange rates.",
            inputs: { pair: `${quote.symbol}/KES`, baseCurrency: quote.symbol, quoteCurrency: "KES", currentRate: quote.value, movementPct },
            estimatedRateAfterMove: estimated,
            assumptions: ["Uses the latest available KenyaFundFinder FX data.", "Movement is applied to the quoted rate shown.", "Does not predict future exchange rates."],
            importantNotes: ["Rate change is illustrative only — actual market rates can differ."],
            disclaimer: standardDisclaimer(),
          }
        : {
            kind: "stock-move",
            summary: "This scenario shows how a hypothetical price movement would affect an illustrative position. It does not predict future prices.",
            inputs: { amount: amount ?? 100_000, priceChangePct: movementPct },
            newValue: Math.round((amount ?? 100_000) * (1 + movementPct / 100) * 100) / 100,
            delta: Math.round((amount ?? 100_000) * movementPct / 100 * 100) / 100,
            direction: movementPct > 0 ? "up" : movementPct < 0 ? "down" : "flat",
            assumptions: ["Assumes a single price movement applied to the full position.", "Excludes brokerage fees, taxes and currency effects.", "Past or hypothetical movements do not predict future prices."],
            disclaimer: standardDisclaimer(),
          };
    return {
      result: {
        kind: String(routerResult.kind),
        text: movementText,
        data: { entity, quote, movementPct, routerResult },
        freshness: serverFreshness(),
      },
    };
  }
  if (amount == null) {
    return {
      clarification: {
        question: missingAmountQuestion(entity),
        choices: [],
        continuationToken: createParameterContinuationToken(frame, entities.map((item) => item.id)),
      },
    };
  }
  if (scenarioKind === "fx-conversion" || entity.kind === "fx") {
    const converted = Math.round((amount / quote.value) * 100) / 100;
    return {
      result: {
        kind: "fx-conversion",
        text: `${formatKes(amount)} is approximately ${formatNumber(converted)} ${quote.symbol} at ${formatNumber(quote.value, 4)} KES per 1 ${quote.symbol}. This is an illustrative mid-rate conversion, not a trading recommendation.`,
        data: {
          entity, quote, amount, convertedAmount: converted, fromCurrency: "KES", toCurrency: quote.symbol,
          routerResult: {
            kind: "fx-conversion", summary: "This scenario estimates a currency conversion using the latest available rate shown in KenyaFundFinder. Actual conversion amounts can differ.",
            inputs: { amount, fromCurrency: "KES", toCurrency: quote.symbol, rate: quote.value, rateLabel: quote.label }, convertedAmount: converted,
            assumptions: ["Uses latest available KenyaFundFinder FX data.", "This is an estimated conversion, not a live quote.", "Actual conversion can differ because of spreads, fees, timing, and provider rates."],
            importantNotes: ["Mid-rate estimate only — bank, forex bureau, and mobile money rates may differ."], disclaimer: standardDisclaimer(),
          },
        },
        freshness: serverFreshness(),
      },
    };
  }
  if (entity.kind === "commodity") {
    let fxRate: number | null = null;
    if (quote.quoteCurrency !== "KES") {
      const fxEntity = entities.find((candidate) => candidate.kind === "fx" && candidate.sourceKey.toUpperCase() === quote.quoteCurrency);
      const fx = fxEntity ? await fetchEntityQuote(client, fxEntity) : null;
      fxRate = fx?.value ?? null;
      if (fxRate == null) {
        const { data } = await client.from("exchange_rates").select("rate").eq("currency_code", quote.quoteCurrency).eq("is_active", true).maybeSingle();
        fxRate = parseNumber(data?.rate);
      }
    }
    const quoteAmount = quote.quoteCurrency === "KES" ? amount : Math.round((amount / (fxRate ?? 1)) * 100) / 100;
    const units = Math.round((quoteAmount / quote.value) * 10000) / 10000;
    return {
      result: {
        kind: "commodity-amount",
        text: `${formatKes(amount)} is approximately ${formatNumber(quoteAmount)} ${quote.quoteCurrency}, or an estimated ${formatNumber(units, 4)} quoted units of ${quote.name}. Quote: ${formatNumber(quote.value)} ${quote.label}${fxRate == null ? "" : `; FX: ${formatNumber(fxRate, 4)} KES per ${quote.quoteCurrency}`}. This is an illustrative exposure, not a prediction.`,
        data: {
          entity, quote, amountKes: amount, quoteAmount, estimatedUnits: units, fxRate,
          routerResult: {
            kind: "commodity-amount", summary: `This is an estimated ${quote.name} exposure using the latest available KenyaFundFinder prices and exchange rates. It does not predict future commodity prices.`,
            inputs: { amountKes: amount, symbol: quote.symbol, name: quote.name, currentValue: quote.value, valueLabel: quote.label, quoteCurrency: quote.quoteCurrency, fxRate }, quoteAmount, estimatedUnits: units,
            assumptions: ["Uses the latest available KenyaFundFinder commodity price.", quote.quoteCurrency === "KES" ? "The commodity price is already quoted in Kenyan shillings." : `Converts KES to ${quote.quoteCurrency} using the latest available KenyaFundFinder FX rate.`, "Excludes product premiums, spreads, storage, taxes, fees, and provider costs."],
            importantNotes: ["Commodity units are an estimate based on the published quote unit.", "Actual commodity products and provider prices can differ materially from the quoted benchmark."], disclaimer: standardDisclaimer(),
          },
        },
        freshness: serverFreshness(),
      },
    };
  }
  if (entity.kind === "fund") {
    if (quote.yieldUnit !== "%") {
      const routerResult = {
        kind: "website-lookup",
        summary: `${quote.name} is published as a ${quote.yieldUnit} unit-value fund, not a percentage-yield MMF calculation.`,
        entityType: "fund",
        entityName: quote.name,
        entitySymbol: quote.symbol,
        fields: [
          { label: "Published unit value", value: `${formatNumber(quote.value, 2)} ${quote.yieldUnit}` },
          { label: "Fund type", value: String(quote.fundType ?? entity.subtype ?? "fund").replace(/_/g, " ") },
          ...(entity.manager ? [{ label: "Manager", value: entity.manager }] : []),
        ],
        sourceNote: "Pulled from KenyaFundFinder server data. A return projection requires an explicit percentage assumption.",
        pagePath: `/compare/${quote.symbol}`,
        disclaimer: standardDisclaimer(),
      };
      return {
        result: {
          kind: "lookup",
          text: `${quote.name} uses a published ${quote.yieldUnit} unit value. I will not treat ${formatNumber(quote.value, 2)} ${quote.yieldUnit} as an annual percentage yield. Provide an explicit percentage assumption if you want an illustrative return calculation.`,
          data: { entity, quote, amount, routerResult },
          freshness: serverFreshness(),
        },
      };
    }
    const months = frame.parameters.periodMonths ?? 12;
    const gross = amount * (quote.value / 100) * (months / 12);
    return {
      result: {
        kind: "mmf",
        text: `${formatKes(amount)} at the published ${formatNumber(quote.value, 2)}% annual yield would be an illustrative gross estimate of ${formatKes(gross)} over ${months} months. Actual returns, fees, taxes, and future yields can differ.`,
        data: {
          entity, quote, amount, annualYieldPct: quote.value, months, projectedGross: gross,
          routerResult: {
            kind: "mmf", summary: "This projection estimates gross income from the amount and yield assumptions shown. It does not predict future returns.",
            inputs: {
              amount,
              annualYieldPct: quote.value,
              months,
              productName: quote.name,
              fundType: String(quote.fundType ?? entity.subtype ?? "money_market"),
              yieldUnit: quote.yieldUnit,
            },
            grossYearly: amount * quote.value / 100,
            monthlyEquivalent: amount * quote.value / 100 / 12,
            dailyEquivalent: Math.round(amount * quote.value / 100 / 365 * 100) / 100,
            projectedGross: amount + gross,
            assumptions: [
              `Selected product: ${quote.name}.`,
              `Fund category: ${String(quote.fundType ?? entity.subtype ?? "money_market").replace(/_/g, " ")}.`,
              "Simple annualized estimate applied pro-rata over the period.",
              "Excludes fees, taxes, and compounding differences.",
              "Yields can change.",
            ],
            disclaimer: standardDisclaimer(),
          },
        },
        freshness: serverFreshness(),
      },
    };
  }
  if (entity.kind === "stock") {
    const shares = Math.round((amount / quote.value) * 10000) / 10000;
    const projectionMonths = frame.parameters.periodMonths;
    const rows = [-10, -5, 0, 5, 10].map((movementPct) => {
      const estimatedPrice = Math.round(quote.value * (1 + movementPct / 100) * 100) / 100;
      const estimatedValue = Math.round(amount * (1 + movementPct / 100) * 100) / 100;
      return {
        movementPct,
        estimatedPrice,
        estimatedValue,
        estimatedGainLoss: Math.round((estimatedValue - amount) * 100) / 100,
      };
    });
    const projection = projectionMonths != null && projectionMonths > 0
      ? {
          months: projectionMonths,
          scenarios: [-5, 0, 5, 10].map((annualPriceChangePct) => {
            const projectedValue = Math.round(amount * Math.pow(1 + annualPriceChangePct / 100, projectionMonths / 12));
            return {
              annualPriceChangePct,
              projectedValue,
              projectedGainLoss: projectedValue - amount,
            };
          }),
        }
      : undefined;
    return {
      result: {
        kind: "stock-amount",
        text: `${formatKes(amount)} at the latest ${formatNumber(quote.value, 2)} KES share price represents approximately ${formatNumber(shares, 4)} shares of ${quote.symbol}, before fees, taxes, spreads, and settlement considerations.`,
        data: {
          entity, quote, amount, estimatedShares: shares,
          routerResult: {
            kind: "stock-amount", summary: "This is an illustrative stock exposure using the latest available KenyaFundFinder price.",
            inputs: { amount, symbol: quote.symbol, name: quote.name, latestPrice: quote.value },
            approximateShares: shares,
            rows,
            projection,
            assumptions: ["Uses the latest available KenyaFundFinder price.", "Fees, taxes, spreads, commissions, and dividends are not included.", "Share prices can rise or fall.", "This is a scenario, not a prediction."],
            importantNotes: ["Approximate shares are illustrative only — fractional lots, board lots, fees, taxes, spreads, liquidity, settlement rules, and price movement are not fully modeled.", "This assistant cannot place orders or execute trades."],
            disclaimer: standardDisclaimer(),
          },
        },
        freshness: serverFreshness(),
      },
    };
  }
  return { error: "unsupported" };
}

function fallbackCatalogEntity(kind: CanonicalFinancialEntity["kind"], row: Record<string, unknown>): CanonicalFinancialEntity | null {
  const id = cleanText(row.id, 80);
  if (!id) return null;
  const label = cleanText(kind === "fx" ? row.currency_name : row.name, 160)
    ?? cleanText(kind === "fx" ? row.currency_code : row.symbol, 80);
  const sourceKey = cleanText(kind === "fund" ? row.slug : kind === "fx" ? row.currency_code : row.symbol, 120);
  if (!label || !sourceKey) return null;
  const manager = kind === "fund" ? cleanText(row.manager, 160) : undefined;
  return {
    id: `${kind}:${id}`,
    kind,
    subtype: kind === "fund" ? cleanText(row.fund_type, 60) ?? "money_market" : undefined,
    displayLabel: label,
    shortLabel: kind === "fund" ? undefined : sourceKey,
    sourceKey,
    sourceId: id,
    manager,
    market: kind === "stock" ? "NSE" : kind === "fx" ? "KES" : kind === "fund" ? cleanText(row.yield_unit, 10) ?? "%" : undefined,
    aliases: [label, sourceKey, manager ?? ""].filter(Boolean),
  };
}

async function loadCanonicalCatalog(client: ResolverClient): Promise<CanonicalFinancialEntity[]> {
  const [{ data, error }, fundUnits] = await Promise.all([
    client
    .from("financial_entity_catalog")
    .select("id,kind,subtype,display_label,short_label,source_id,source_key,manager,market,aliases")
    .limit(5000),
    client.from("funds").select("id,yield_unit").eq("is_published", true).limit(5000),
  ]);
  if (!error && Array.isArray(data)) {
    const unitByFundId = new Map((fundUnits.data ?? []).map((row: Record<string, unknown>) => [String(row.id), cleanText(row.yield_unit, 10) ?? "%"]));
    return data.map((row: Record<string, unknown>) => ({
      id: String(row.id),
      kind: row.kind as CanonicalFinancialEntity["kind"],
      subtype: cleanText(row.subtype, 60),
      displayLabel: String(row.display_label),
      shortLabel: cleanText(row.short_label, 120),
      sourceKey: String(row.source_key),
      sourceId: cleanText(row.source_id, 80),
      manager: cleanText(row.manager, 160),
      market: row.kind === "fund"
        ? unitByFundId.get(String(row.source_id))
        : cleanText(row.market, 40),
      aliases: Array.isArray(row.aliases) ? row.aliases.filter((v): v is string => typeof v === "string") : [],
    }));
  }

  // Deployment-safe fallback while the migration and function roll out. This
  // is still server-owned catalog truth; the browser never supplies entities.
  const [funds, stocks, rates, commodities] = await Promise.all([
    client.from("funds").select("id,slug,name,manager,fund_type,yield_unit").eq("is_published", true).limit(5000),
    client.from("stocks").select("id,symbol,name").eq("is_active", true).limit(5000),
    client.from("exchange_rates").select("id,currency_code,currency_name").eq("is_active", true).limit(5000),
    client.from("commodities").select("id,symbol,name").eq("is_active", true).limit(5000),
  ]);
  return [
    ...(funds.data ?? []).map((row: Record<string, unknown>) => fallbackCatalogEntity("fund", row)),
    ...(stocks.data ?? []).map((row: Record<string, unknown>) => fallbackCatalogEntity("stock", row)),
    ...(rates.data ?? []).map((row: Record<string, unknown>) => fallbackCatalogEntity("fx", row)),
    ...(commodities.data ?? []).map((row: Record<string, unknown>) => fallbackCatalogEntity("commodity", row)),
  ].filter((entity): entity is CanonicalFinancialEntity => entity != null);
}

function redactQueryPattern(value: unknown): string | null {
  const text = cleanText(value, 1024);
  if (!text) return null;
  return text
    .toLowerCase()
    .replace(/https?:\/\/\S+/g, "[url]")
    .replace(/[\w.+-]+@[\w.-]+\.[a-z]{2,}/gi, "[email]")
    .replace(/\+?\d[\d\s()-]{7,}\d/g, "[number]")
    .replace(/\b(?:kes|ksh|kshs|sh)?\s*\d[\d,.]*(?:\s*[km])?\b/gi, "[amount]")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 320);
}

function telemetryFrame(value: unknown): Record<string, unknown> {
  const validated = validateQuerySemanticFrame(value);
  if (!validated.ok) return {};
  const frame = validated.frame;
  return {
    version: frame.version,
    action: frame.action,
    confidence: frame.confidence,
    entityMentionCount: frame.entityMentions.length,
    expectedKinds: frame.entityMentions.map((mention) => mention.expectedKinds ?? []),
    requestedMetrics: frame.requestedMetrics,
    parameterKeys: Object.keys(frame.parameters),
    contextReferences: frame.contextReferences,
  };
}

async function recordTelemetry(
  client: ResolverClient,
  body: Record<string, unknown>,
  ipHash: string,
): Promise<Response> {
  const raw = body.telemetry && typeof body.telemetry === "object" ? body.telemetry as Record<string, unknown> : {};
  const queryPattern = redactQueryPattern(raw.query);
  const outcomes = new Set(["resolved", "ambiguous", "not_found", "clarification_selected", "shadow_disagreement", "wrong_resolution"]);
  const outcome = typeof raw.outcome === "string" && outcomes.has(raw.outcome) ? raw.outcome : null;
  if (!queryPattern || !outcome) return json(400, { ok: false, reason: "invalid_telemetry" });
  const candidateIds = Array.isArray(raw.candidateIds)
    ? raw.candidateIds.filter((v): v is string => typeof v === "string").slice(0, 8).map((v) => v.slice(0, 120))
    : [];
  const selectedEntityId = cleanText(raw.selectedEntityId, 120);
  const shadowResult = raw.shadowResult && typeof raw.shadowResult === "object" && JSON.stringify(raw.shadowResult).length <= 2000
    ? raw.shadowResult
    : undefined;
  const { error } = await client.from("query_resolution_events").insert({
    contract_version: QUERY_CONTRACT_VERSION,
    resolver_version: "universal-v1",
    anonymous_hash: ipHash,
    query_pattern: queryPattern,
    semantic_frame: telemetryFrame(raw.frame),
    outcome,
    candidate_ids: candidateIds,
    selected_entity_id: selectedEntityId,
    shadow_result: shadowResult,
  });
  return error
    ? json(200, { ok: false, reason: "telemetry_unavailable" })
    : json(200, { ok: true });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json(405, { ok: false, reason: "method_not_allowed" });

  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return json(400, { ok: false, reason: "invalid_json" }); }
  const prompt = cleanText(body.prompt, MAX_INPUT_CHARS);
  const limited = await checkRateLimit(req);
  if (limited) return limited;

  const url = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !serviceKey) return json(503, { ok: false, reason: "gateway_unavailable" });
  const client = createResolverClient(url, serviceKey);
  if (body.mode === "telemetry") {
    return recordTelemetry(client, body, await hashIp(clientIp(req), serviceKey));
  }
  if (!prompt) return json(400, { ok: false, reason: "prompt_required" });

  const safeInput = cleanBody(body);
  try {
    const catalog = await loadCanonicalCatalog(client);
    const parsed = normalizeModelFrame(await requestParserModel(prompt, safeInput));
    let validated = validateQuerySemanticFrame(parsed);
    if (!validated.ok) {
      const fallback = fallbackSemanticFrame(prompt, safeInput.context);
      validated = validateQuerySemanticFrame(fallback);
    }
    if (!validated.ok) return json(200, { ok: false, reason: `invalid_frame:${validated.reason}` });
    const dailyReportFrame = applyDeterministicDailyReportFrame(prompt, validated.frame);
    const comparisonFrame = applyDeterministicComparisonFrame(prompt, dailyReportFrame);
    validated = validateQuerySemanticFrame(applyDeterministicYieldFrame(prompt, comparisonFrame, safeInput.context));
    if (!validated.ok) return json(200, { ok: false, reason: `invalid_frame:${validated.reason}` });

    const context = safeInput.context;
    let resolution = resolveQuery(validated.frame, catalog);
    if (context.continuationToken) {
      const continued = context.selectionId
        ? continueQueryWithSelection(context.continuationToken, context.selectionId, catalog)
        : continueQueryWithParameters(context.continuationToken, validated.frame, catalog)
          ?? continueQueryWithText(context.continuationToken, prompt, catalog);
      if (continued) resolution = continued;
    }
    const intent = resolution.status === "resolved"
      ? semanticFrameToNaturalLanguageIntent(validated.frame, resolution.entities)
      : semanticFrameToNaturalLanguageIntent(validated.frame);
    if (resolution.status === "ambiguous") {
      return json(200, {
        ok: true,
        frame: validated.frame,
        resolution,
        intent,
        clarification: {
          question: resolution.question,
          choices: resolution.candidates,
          continuationToken: resolution.continuationToken,
        },
      });
    }
    if (resolution.status === "not_found") return json(200, { ok: true, frame: validated.frame, resolution, intent });
    if (!resolution.ready) {
      const known = resolution.entities[0]?.displayLabel;
      const question = resolution.frame.action === "compare"
        ? `What would you like to compare${known ? ` ${known}` : " it"} with?`
        : "Which product do you mean?";
      return json(200, {
        ok: true,
        frame: validated.frame,
        resolution,
        intent,
        clarification: {
          question,
          choices: [],
          continuationToken: resolution.continuationToken ?? "",
        },
      });
    }
    const execution = await executeServerFrame(client, resolution.frame, resolution.entities);
    if (execution.clarification && !execution.clarification.continuationToken) {
      execution.clarification.continuationToken = resolution.continuationToken ?? "";
    }
    return json(200, { ok: true, frame: validated.frame, resolution, intent, ...execution });
  } catch {
    return json(200, { ok: false, reason: "gateway_unavailable" });
  }
});
