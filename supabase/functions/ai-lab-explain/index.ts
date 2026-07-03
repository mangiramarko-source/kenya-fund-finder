// AI Lab educational-only explainer.
// Called ONLY when the deterministic router returns unknown OR the prompt is
// classified as educational. Never used to rewrite scenario/comparison/MMF/stock
// output. See .lovable/plan.md.

import { createClient } from "npm:@supabase/supabase-js@2.49.1";
import { corsHeaders } from "npm:@supabase/supabase-js@2.95.0/cors";

const AI_GATEWAY_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";
const AI_MODEL = "google/gemini-3-flash-preview";

const MAX_INPUT_CHARS = 1024;
const MAX_OUTPUT_CHARS = 600;

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

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json(405, { error: "Method not allowed" });

  // Auth: verify_jwt=true is set in config.toml, but validate defensively too.
  const authHeader = req.headers.get("Authorization") || "";
  const token = authHeader.replace("Bearer ", "");
  if (!token) return json(401, { error: "Unauthorized" });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: claims, error: claimsErr } = await supabase.auth.getClaims(token);
    if (claimsErr || !claims?.claims?.sub) return json(401, { error: "Unauthorized" });
  } catch {
    return json(401, { error: "Unauthorized" });
  }

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

    if (res.status === 429) return json(429, { error: "Rate limited" });
    if (res.status === 402) return json(402, { error: "AI credits exhausted" });
    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      console.error("[ai-lab-explain] gateway error", res.status, detail.slice(0, 200));
      return json(502, { error: "AI gateway error" });
    }

    const data = await res.json();
    const text: string = data?.choices?.[0]?.message?.content ?? "";
    const trimmed = text.trim();
    if (!trimmed || trimmed === "NOT_EDUCATIONAL") {
      return json(200, { ok: false, reason: "not_educational" });
    }
    const output = trimmed.slice(0, MAX_OUTPUT_CHARS);
    return json(200, { ok: true, text: output });
  } catch (err) {
    console.error("[ai-lab-explain] error", err);
    return json(502, { error: "AI gateway failure" });
  }
});
