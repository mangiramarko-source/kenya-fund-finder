// AI Lab educational-only explainer.
// Called ONLY when the deterministic router returns unknown OR the prompt is
// classified as educational. Never used to rewrite scenario/comparison/MMF/stock
// output. See .lovable/plan.md.

import { createClient } from "../_shared/supabase-client.ts";
import { corsHeaders } from "../_shared/cors-headers.ts";

const AI_GATEWAY_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";
const AI_MODEL = "google/gemini-3-flash-preview";

const MAX_INPUT_CHARS = 1024;
const MAX_OUTPUT_CHARS = 600;
const RATE_WINDOW_SECONDS = 60;
const RATE_MAX_REQUESTS = 5;

const SYSTEM_PROMPT = [
  "You are an educator for a Kenyan personal-finance website called KenyaFundFinder.",
  "You ONLY answer general financial-literacy / explainer questions in plain English.",
  "You NEVER give investment advice, recommendations, or predictions.",
  "You NEVER quote prices, yields, percentages, tickers, currencies, or specific fund/stock names.",
  "You NEVER reference current events, news, dates, URLs, or sources.",
  "You NEVER use phrases like 'you should', 'I recommend', 'best', 'top', 'safest', 'guaranteed'.",
  "You do NOT browse the internet.",
  "Keep the answer under 4 short paragraphs and under 500 characters total.",
  "If the question is not a general educational question, reply exactly: NOT_EDUCATIONAL.",
].join(" ");

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function jsonWithHeaders(status: number, body: unknown, headers: Record<string, string>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, ...headers, "Content-Type": "application/json" },
  });
}

function clientIp(req: Request): string {
  const forwarded = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return (
    req.headers.get("cf-connecting-ip") ||
    req.headers.get("x-real-ip") ||
    forwarded ||
    "unknown"
  );
}

async function hashIp(ip: string, salt: string): Promise<string> {
  const data = new TextEncoder().encode(`${ip}:${salt}`);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

async function checkRateLimit(req: Request): Promise<Response | null> {
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceKey) {
    console.error("[ai-lab-explain] rate limit unavailable");
    return json(503, { ok: false, reason: "rate_limit_unavailable" });
  }

  try {
    const supabase = createClient(supabaseUrl, serviceKey, {
      auth: { persistSession: false },
    });
    const ipHash = await hashIp(clientIp(req), serviceKey);
    const { data: allowed, error } = await supabase.rpc("check_rate_limit", {
      p_ip_hash: ipHash,
      p_window_seconds: RATE_WINDOW_SECONDS,
      p_max_requests: RATE_MAX_REQUESTS,
    });

    if (error || allowed !== true) {
      if (error) console.error("[ai-lab-explain] rate limit check failed");
      if (allowed === false) {
        return jsonWithHeaders(
          429,
          { ok: false, reason: "rate_limited" },
          { "Retry-After": String(RATE_WINDOW_SECONDS) },
        );
      }
      return json(503, { ok: false, reason: "rate_limit_unavailable" });
    }

    return null;
  } catch {
    console.error("[ai-lab-explain] rate limit exception");
    return json(503, { ok: false, reason: "rate_limit_unavailable" });
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json(405, { error: "Method not allowed" });

  let body: { prompt?: unknown } = {};
  try {
    body = await req.json();
  } catch {
    return json(400, { error: "Invalid JSON body" });
  }

  const rawPrompt = typeof body.prompt === "string" ? body.prompt.trim() : "";
  if (!rawPrompt) return json(400, { error: "prompt is required" });
  if (rawPrompt.length > MAX_INPUT_CHARS) {
    return json(400, { error: "prompt too long" });
  }

  const rateLimitResponse = await checkRateLimit(req);
  if (rateLimitResponse) return rateLimitResponse;

  const lovableKey = Deno.env.get("LOVABLE_API_KEY");
  if (!lovableKey) return json(500, { error: "AI gateway not configured" });

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 15_000);
    const res = await fetch(AI_GATEWAY_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${lovableKey}`,
        "Content-Type": "application/json",
      },
      signal: controller.signal,
      body: JSON.stringify({
        model: AI_MODEL,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: rawPrompt },
        ],
      }),
    });
    clearTimeout(timer);

    if (res.status === 429) {
      return jsonWithHeaders(
        429,
        { ok: false, reason: "rate_limited" },
        { "Retry-After": "60" },
      );
    }
    if (res.status === 402) return json(200, { ok: false, reason: "gateway_unavailable" });
    if (!res.ok) {
      console.error("[ai-lab-explain] gateway error", res.status);
      return json(200, { ok: false, reason: "gateway_unavailable" });
    }

    const data = await res.json();
    const text: string = data?.choices?.[0]?.message?.content ?? "";
    const trimmed = text.trim();
    if (!trimmed || trimmed === "NOT_EDUCATIONAL") {
      return json(200, { ok: false, reason: "not_educational" });
    }
    const output = trimmed.slice(0, MAX_OUTPUT_CHARS);
    return json(200, { ok: true, text: output });
  } catch {
    console.error("[ai-lab-explain] gateway failure");
    return json(200, { ok: false, reason: "gateway_unavailable" });
  }
});
