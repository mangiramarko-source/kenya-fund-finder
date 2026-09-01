// Signed-in conversational layer for AI Lab. It never receives a profile,
// portfolio, or saved holdings: only a short, browser-local chat excerpt.
import { createClient } from "npm:@supabase/supabase-js@2.95.0";
import { corsHeaders } from "npm:@supabase/supabase-js@2.95.0/cors";
import { getSupabasePublishableKey, getSupabaseSecretKey } from "../_shared/supabase-keys.ts";

const GEMINI_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent";
const MAX_TEXT = 900;
const MAX_HISTORY = 12;
const MAX_OUTPUT = 1_800;

type HistoryMessage = { role: "user" | "assistant"; text: string };
type RequestBody = { prompt?: unknown; history?: unknown };
type Classifier = { kind?: "kff_rewrite" | "answer" | "web"; prompt?: string; text?: string };

const WEB_SIGNALS = /\b(latest|today|current events?|recent|news|search|look up|lookup|source|sources|what happened|why (?:is|are|did).+(?:move|fall|rise|drop))\b/i;
const SENSITIVE_PATTERNS: RegExp[] = [
  /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i,
  /\b(?:\+?254|0)\d{9}\b/,
  /\b(?:id|passport|account|card|mpesa|m-pesa)\s*(?:number|no\.?|#)?\s*[:#-]?\s*[a-z0-9-]{5,}\b/i,
  /\b\d{13,19}\b/,
];
const UNSAFE_PATTERNS: RegExp[] = [
  /\b(should i|recommend|best|top|safest|buy|sell|pick|choose)\b/i,
  /\bguarantee(?:d|s)?\b/i,
];

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), { headers: { ...corsHeaders, "Content-Type": "application/json" }, status });
}

function cleanHistory(value: unknown): HistoryMessage[] {
  if (!Array.isArray(value)) return [];
  return value.slice(-MAX_HISTORY).flatMap((item): HistoryMessage[] => {
    if (!item || typeof item !== "object") return [];
    const role = (item as { role?: unknown }).role;
    const text = (item as { text?: unknown }).text;
    if ((role !== "user" && role !== "assistant") || typeof text !== "string") return [];
    return [{ role, text: text.trim().slice(0, MAX_TEXT) }];
  });
}

function hasSensitiveText(values: string[]) {
  return values.some((value) => SENSITIVE_PATTERNS.some((pattern) => pattern.test(value)));
}

function parseJson(text: string): Classifier | null {
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) return null;
  try {
    const parsed = JSON.parse(match[0]) as Classifier;
    if (!parsed || !["kff_rewrite", "answer", "web"].includes(parsed.kind ?? "")) return null;
    return parsed;
  } catch { return null; }
}

function textFromGemini(data: any): string {
  return data?.candidates?.[0]?.content?.parts?.map((part: any) => part?.text ?? "").join("").trim() ?? "";
}

function sourceList(data: any): Array<{ title: string; url: string }> {
  const chunks = data?.candidates?.[0]?.groundingMetadata?.groundingChunks;
  if (!Array.isArray(chunks)) return [];
  const seen = new Set<string>();
  return chunks.flatMap((chunk: any) => {
    const url = chunk?.web?.uri;
    if (typeof url !== "string" || !/^https:\/\//i.test(url) || seen.has(url)) return [];
    seen.add(url);
    return [{ title: typeof chunk?.web?.title === "string" ? chunk.web.title.slice(0, 160) : new URL(url).hostname, url }];
  }).slice(0, 6);
}

async function callGemini(args: { apiKey: string; system: string; prompt: string; search?: boolean }) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20_000);
  try {
    const response = await fetch(`${GEMINI_URL}?key=${encodeURIComponent(args.apiKey)}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: controller.signal,
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: args.system }] },
        contents: [{ role: "user", parts: [{ text: args.prompt }] }],
        ...(args.search ? { tools: [{ google_search: {} }] } : {}),
        generationConfig: { temperature: 0.2, maxOutputTokens: args.search ? 700 : 350 },
      }),
    });
    if (!response.ok) throw new Error(`Gemini ${response.status}`);
    return await response.json();
  } finally { clearTimeout(timeout); }
}

async function reserve(admin: ReturnType<typeof createClient>, userId: string, isWeb: boolean) {
  const { data, error } = await admin.rpc("reserve_ai_lab_request", { p_user_id: userId, p_is_web: isWeb });
  if (error || data !== "allowed") return typeof data === "string" ? data : "chat_rate_limited";
  return "allowed";
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (request.method !== "POST") return json(405, { kind: "unavailable", reason: "method_not_allowed" });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const apiKey = Deno.env.get("GEMINI_API_KEY");
    if (!supabaseUrl || !apiKey) return json(503, { kind: "unavailable", reason: "ai_not_configured" });
    const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
    if (!token) return json(401, { kind: "blocked", reason: "sign_in_required" });
    const auth = createClient(supabaseUrl, getSupabasePublishableKey(), { auth: { persistSession: false } });
    const { data: authData, error: authError } = await auth.auth.getUser(token);
    if (authError || !authData.user) return json(401, { kind: "blocked", reason: "sign_in_required" });

    const body = await request.json() as RequestBody;
    const prompt = typeof body.prompt === "string" ? body.prompt.trim().slice(0, MAX_TEXT) : "";
    const history = cleanHistory(body.history);
    if (!prompt) return json(400, { kind: "blocked", reason: "empty_prompt" });
    if (hasSensitiveText([prompt, ...history.map((message) => message.text)])) {
      return json(200, { kind: "blocked", reason: "sensitive_data" });
    }
    if (UNSAFE_PATTERNS.some((pattern) => pattern.test(prompt))) {
      return json(200, { kind: "blocked", reason: "financial_advice" });
    }

    const admin = createClient(supabaseUrl, getSupabaseSecretKey(), { auth: { persistSession: false } });
    const conversation = [...history, { role: "user" as const, text: prompt }]
      .map((message) => `${message.role.toUpperCase()}: ${message.text}`).join("\n");
    const obviousWeb = WEB_SIGNALS.test(prompt);
    if (obviousWeb) {
      const quota = await reserve(admin, authData.user.id, true);
      if (quota !== "allowed") return json(200, { kind: "unavailable", reason: quota });
      const searched = await callGemini({ apiKey, search: true, prompt: conversation, system:
        "You are KenyaFundFinder's finance research assistant. Answer only Kenyan investing, markets, savings, and financial-literacy questions. Give neutral factual context, never recommendations, rankings, buy/sell guidance, or price predictions. Use short markdown. Do not claim facts not supported by the supplied Google Search grounding." });
      const text = textFromGemini(searched).slice(0, MAX_OUTPUT);
      const sources = sourceList(searched);
      if (!text || !sources.length || UNSAFE_PATTERNS.some((pattern) => pattern.test(text))) {
        return json(200, { kind: "unavailable", reason: "web_sources_unavailable" });
      }
      return json(200, { kind: "web_answer", text, sources });
    }

    const quota = await reserve(admin, authData.user.id, false);
    if (quota !== "allowed") return json(200, { kind: "unavailable", reason: quota });
    const classified = await callGemini({ apiKey, prompt: conversation, system:
      "You help KenyaFundFinder understand conversational finance questions. Never give investment advice, recommendations, rankings, or predictions. Return ONLY JSON. If the latest user message is a follow-up that can be expressed as a KenyaFundFinder calculator/data request, return {\"kind\":\"kff_rewrite\",\"prompt\":\"a complete standalone request\"}. If it needs current external research, return {\"kind\":\"web\"}. Otherwise return {\"kind\":\"answer\",\"text\":\"a concise educational answer\"}. Do not include prices, yields, specific investment recommendations, URLs, or sources in answer text." });
    const result = parseJson(textFromGemini(classified));
    if (!result) return json(200, { kind: "unavailable", reason: "invalid_model_response" });
    if (result.kind === "kff_rewrite" && typeof result.prompt === "string" && result.prompt.trim()) {
      return json(200, { kind: "kff_rewrite", prompt: result.prompt.trim().slice(0, MAX_TEXT) });
    }
    if (result.kind === "web") {
      const webQuota = await reserve(admin, authData.user.id, true);
      if (webQuota !== "allowed") return json(200, { kind: "unavailable", reason: webQuota });
      const searched = await callGemini({ apiKey, search: true, prompt: conversation, system:
        "You are KenyaFundFinder's finance research assistant. Answer only factual Kenyan investing, markets, savings, and financial-literacy questions. Do not recommend, rank, predict, buy, or sell. Use short markdown and rely only on Google Search grounding." });
      const text = textFromGemini(searched).slice(0, MAX_OUTPUT);
      const sources = sourceList(searched);
      if (!text || !sources.length || UNSAFE_PATTERNS.some((pattern) => pattern.test(text))) return json(200, { kind: "unavailable", reason: "web_sources_unavailable" });
      return json(200, { kind: "web_answer", text, sources });
    }
    const text = typeof result.text === "string" ? result.text.trim().slice(0, MAX_OUTPUT) : "";
    if (!text || UNSAFE_PATTERNS.some((pattern) => pattern.test(text))) return json(200, { kind: "unavailable", reason: "unsafe_or_empty_answer" });
    return json(200, { kind: "answer", text });
  } catch (error) {
    console.error("[ai-lab-chat] request failed", error instanceof Error ? error.message : "unknown");
    return json(200, { kind: "unavailable", reason: "provider_unavailable" });
  }
});
