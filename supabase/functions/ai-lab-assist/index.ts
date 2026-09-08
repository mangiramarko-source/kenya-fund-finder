import { createClient } from "../_shared/supabase-client.ts";
import { corsHeaders } from "../_shared/cors-headers.ts";
import { validateNaturalLanguageIntent } from "../_shared/ai-lab-intent.ts";

const GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models";
// Intent classification is short, constrained work. The app owns all facts;
// Gemini Flash only returns a compact, validated intent.
const AI_MODEL = "gemini-3.7-flash";
const MAX_INPUT_CHARS = 1024;
const RATE_WINDOW_SECONDS = 60;
const RATE_MAX_REQUESTS = 10;

const SYSTEM_PROMPT = `You translate casual user questions for KenyaFundFinder into JSON intent only.
Understand imperfect English, typos, and common Kenyan wording such as bob, 10k, and "shares za Safaricom". Use recent context for follow-ups such as "what about KCB?".
Allowed intent: capabilities, overview, lookup, scenario, compare, news, explainer, refusal, clarification.
Allowed assetKind: stock, fund, fx, commodity, market.
Allowed scenarioKind: asset-amount, stock-amount, stock-move, mmf-return, mmf-yield-change, fx-conversion, fx-move, commodity-move, portfolio-split, goal-projection.
Use explainer topic "getting-started" for safe beginner education such as "I am new to investing", "how do I start investing", "I know nothing about shares", or "nataka kuanza investing". This is general education, not investment selection.
Return one JSON object with intent, confidence, and only relevant optional fields: assetKind, entity, secondEntity, topic, scenarioKind, amount, currency, percentage, secondPercentage, periodDays, periodMonths, clarification.
Use refusal for requests to recommend, choose, tell the user whether to buy/sell/hold, predict, or identify the best/safest investment. A factual request for the highest published yield or largest recorded move is a lookup, not advice.
Use asset-amount for a neutral amount paired with a catalog asset, such as "put 100k in ABSA", "buy dollars with 50k", or "invest 50k in gold". This is an illustration, not a recommendation.
Never answer the question. Never supply prices, yields, returns, volume, market cap, summaries, URLs, or facts. Extract numeric assumptions only when explicitly present in the user prompt or supplied context. If essential information is missing, use clarification and ask one short question. Output JSON only.`;

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
  const catalog = Array.isArray(body.catalog) ? body.catalog.slice(0, 200).map((raw) => {
    const row = raw && typeof raw === "object" ? raw as Record<string, unknown> : {};
    return {
      kind: cleanText(row.kind, 20),
      symbol: cleanText(row.symbol, 60),
      name: cleanText(row.name, 100),
      aliases: Array.isArray(row.aliases)
        ? row.aliases.slice(0, 8).map((v) => cleanText(v, 60)).filter(Boolean)
        : [],
    };
  }) : [];
  const rawContext = body.context && typeof body.context === "object"
    ? body.context as Record<string, unknown>
    : {};
  return {
    context: {
      lastEntity: cleanText(rawContext.lastEntity, 100),
      lastIntent: cleanText(rawContext.lastIntent, 40),
      lastAmount: typeof rawContext.lastAmount === "number" ? rawContext.lastAmount : undefined,
      lastPercentage: typeof rawContext.lastPercentage === "number" ? rawContext.lastPercentage : undefined,
      lastCurrency: cleanText(rawContext.lastCurrency, 10),
    },
    catalog,
  };
}

function parseModelJson(raw: string): unknown {
  const cleaned = raw.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
  try { return JSON.parse(cleaned); } catch { return null; }
}

/** Normalize only model formatting variants; strict schema validation still owns acceptance. */
function normalizeModelIntent(value: unknown): unknown {
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
  return { ...row, confidence: normalized };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json(405, { ok: false, reason: "method_not_allowed" });

  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return json(400, { ok: false, reason: "invalid_json" }); }
  const prompt = cleanText(body.prompt, MAX_INPUT_CHARS);
  if (!prompt) return json(400, { ok: false, reason: "prompt_required" });
  const limited = await checkRateLimit(req);
  if (limited) return limited;

  const key = Deno.env.get("GEMINI_API_KEY");
  if (!key) return json(200, { ok: false, reason: "gateway_unavailable" });
  const safeInput = cleanBody(body);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 12_000);
  try {
    const response = await fetch(`${GEMINI_API_URL}/${AI_MODEL}:generateContent`, {
      method: "POST",
      headers: { "x-goog-api-key": key, "Content-Type": "application/json" },
      signal: controller.signal,
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
        contents: [{ role: "user", parts: [{ text: JSON.stringify({ prompt, ...safeInput }) }] }],
        generationConfig: {
          temperature: 0,
          maxOutputTokens: 240,
          responseMimeType: "application/json",
        },
      }),
    });
    if (response.status === 429) return json(429, { ok: false, reason: "rate_limited" }, { "Retry-After": "60" });
    if (!response.ok) {
      return json(200, {
        ok: false,
        reason: response.status === 404 ? "model_unavailable" : "gateway_unavailable",
      });
    }
    const payload = await response.json();
    const modelText = Array.isArray(payload?.candidates?.[0]?.content?.parts)
      ? payload.candidates[0].content.parts.map((part: { text?: unknown }) => part.text ?? "").join("")
      : "";
    const parsed = normalizeModelIntent(parseModelJson(modelText));
    const validated = validateNaturalLanguageIntent(parsed);
    return validated.ok
      ? json(200, { ok: true, intent: validated.intent })
      : json(200, { ok: false, reason: `invalid_intent:${validated.reason}` });
  } catch {
    return json(200, { ok: false, reason: "gateway_unavailable" });
  } finally {
    clearTimeout(timer);
  }
});
