# AI Lab × Gemini — Integration Audit & Plan (no code changes yet)

Goal: keep the current deterministic AI Lab in charge of routing, math, safety, and data. Use Gemini only to rewrite/soften the already-composed, already-safe output into a more natural explanation — never to invent facts, numbers, news, or advice.

---

## 1. Current AI Lab request/response flow

Entry point: `AiLabPage` → `AiLabChat.onSubmit(prompt)` → `processAiLabUserPrompt(prompt, marketCtx, newsCtx)` in `src/lib/aiLab/chat.ts`.

Ordered pipeline inside `processAiLabUserPrompt`:

1. `isCapabilitiesPrompt` → `composeCapabilitiesGuide()` (static help).
2. `isUnsupportedFilterLookupPrompt` → `composeFilterUnsupportedResponse()` (static "not supported yet").
3. `buildClarifyingResponse(prompt)`:
   - `detectAdviceIntent` first — if advisory, returns `null` so the router can refuse.
   - Otherwise handles: split-needs-named-stock, MMF-needs-yield, amount-only prompts.
4. `resolveWebsiteLookup(prompt, ctx)` — deterministic instrument/website lookup.
5. `applyLiveContext(prompt, ctx)` — token substitution with real market snapshot.
6. `routePrompt(enriched, ctx, news)` in `src/lib/aiLab/router.ts` → returns `RouterResult`:
   - `refusal` (from `safety.buildRefusal` via `detectAdviceIntent`)
   - `unknown` (fallback)
   - Deterministic scenarios: `mmf`, `mmf-yield-change`, `stock-amount`, `stock-move`, `goal-projection`, `compare`, `fx-conversion`, `fx-move`, `commodity-move`, `news-summary`, `portfolio-split`, `explainer`, `website-lookup`.
7. `composeAssistantResponse({ prompt, result })` in `responseComposer.ts`:
   - Builds structured "Result / Assumptions / What could change / Important / Disclaimer" text.
   - `assertSafe()` scans against `FORBIDDEN_PATTERNS` before returning.
   - Attaches `capFollowUps(...)` (filtered against `UNSUPPORTED_FOLLOWUP_RE`).
8. Chat UI (`AiLabChat.tsx`) renders text as Markdown, plus a structured `ScenarioResult` card for non-refusal / non-unknown results.

Safety layers today: `detectAdviceIntent`, `buildRefusal`, `FORBIDDEN_PATTERNS`, `RESPONSE_QUALITY_BANNED`, `assertSafe` in composer, and post-hoc `sanitizeOutput` in `safety.ts`.

---

## 2. Best place to call Gemini

Wrap step 7 only. Introduce an optional post-processor **after** `composeAssistantResponse` returns and **before** the text is stored on the assistant message:

```
routePrompt → composeAssistantResponse → [ NEW: geminiRewrite(safeText, result) ] → message.text
```

Do **not** call Gemini before the router, before safety checks, or instead of the composer. Gemini receives an already-safe, already-structured string plus a compact `result` JSON as read-only context, and is asked only to rewrite the intro paragraph in plainer language. All numbers, headings, disclaimer, and follow-ups remain the deterministic ones.

If Gemini fails, times out, is disabled, or its output fails validation → fall back to the deterministic text verbatim. The user never sees an error.

---

## 3. Which prompts should use Gemini

Only assistive rewriting of the **intro/narrative paragraph** for these result kinds:

- `mmf`, `mmf-yield-change`
- `stock-amount`, `stock-move`
- `goal-projection`
- `portfolio-split`
- `compare` (intro only, not the metric rows)
- `explainer` (may expand the definition, still capped)
- `fx-conversion`, `fx-move`, `commodity-move` (intro only)

## 4. Which prompts must remain 100% deterministic (no Gemini)

- `refusal` — always the exact `REFUSAL_MESSAGE`.
- `unknown` — deterministic fallback + suggestions.
- `website-lookup` — data lookup wording is fixed.
- `news-summary` — must never be rephrased (risk of implying causation/prediction).
- Capabilities guide, filter-unsupported response, all clarifying prompts.
- `Assumptions`, `What could change`, `Important`, `Data only. Not personal financial advice.`, all numeric values, tickers, follow-up chips, and the structured `ScenarioResult` card.

---

## 5. Supabase Edge Function files needed

New (verify_jwt = false, since AI Lab is public):

- `supabase/functions/ai-lab-explain/index.ts` — accepts `{ safeText, resultKind, resultSummary }`, calls Gemini via Lovable AI Gateway (`google/gemini-3-flash-preview`), returns `{ rewritten }` or `{ rewritten: null }` on any failure.
- `supabase/functions/_shared/ai-gateway.ts` — reuse existing helper if present; otherwise add the standard `createLovableAiGatewayProvider` wrapper.

Config: add `[functions.ai-lab-explain] verify_jwt = false` to `supabase/config.toml`. No DB migrations. No new tables.

Client: new `src/lib/aiLab/geminiRewrite.ts` (thin fetch wrapper with timeout + safety re-check) called from `processAiLabUserPrompt`.

---

## 6. Required environment variables

- `LOVABLE_API_KEY` — already auto-provisioned; server-side only.
- No new user-facing secrets.
- Optional feature flag: `VITE_AI_LAB_GEMINI_ENABLED` (default off) so we can ship the wiring dark and enable per environment.

---

## 7. Safety checks before showing Gemini output

The rewritten string must pass **all** of these before replacing the deterministic intro; any failure ⇒ fall back to deterministic text:

1. Non-empty and ≤ 1200 chars (hard cap; refuse long expansions).
2. `detectAdviceIntent(rewritten) === false`.
3. No match against `FORBIDDEN_PATTERNS` **and** `RESPONSE_QUALITY_BANNED`.
4. Must contain the exact string `"Data only. Not personal financial advice."` OR we re-append it (prefer re-append to be defensive).
5. No new numbers: every `\d+(\.\d+)?%?` token in `rewritten` must also appear in the deterministic `safeText` (prevents fabricated yields/prices/tickers).
6. No new tickers/asset names: uppercase alpha tokens of length 2–6 (e.g. `SCOM`, `EQTY`) must be a subset of those in `safeText`.
7. No URLs, no "I recommend", no future-tense predictions ("will rise", "will fall", "expected to").
8. Runs through existing `sanitizeOutput` as last line of defense.
9. Never applied to `refusal`, `unknown`, `news-summary`, `website-lookup`, or capabilities/clarifying responses (enforced by kind allow-list, not by prompt).

Server-side system prompt hard rules (included every call):
- "You are a rewriter, not a source of facts."
- "Do not add numbers, tickers, dates, yields, prices, predictions, or advice."
- "Do not remove or alter the disclaimer."
- "Return only the rewritten intro paragraph, ≤120 words, neutral tone."
- "If unsure, return the input unchanged."

---

## 8. Tests needed

Unit (`src/lib/aiLab/geminiRewrite.test.ts`):
- Fallback returns deterministic text when fetch throws / times out / returns empty.
- Rewrite rejected when it introduces a new number, new ticker, a URL, or an advisory phrase.
- Rewrite accepted when it only rephrases and preserves disclaimer.
- Allow-list: refusal / unknown / news-summary / website-lookup never call the endpoint.
- Disclaimer re-appended if missing.

Integration (`chat.test.ts` additions):
- `processAiLabUserPrompt` with Gemini mocked to `null` produces byte-identical output to today.
- With Gemini mocked to a safe rewrite, structured sections, numbers, and follow-ups are unchanged.
- With Gemini mocked to an unsafe rewrite (adds "you should buy"), output falls back and no forbidden phrase reaches the message.

Edge function (`supabase/functions/ai-lab-explain/index.test.ts` or curl script):
- Returns `{ rewritten: null }` on 429/402/timeout.
- CORS preflight OK.
- Validates request body with Zod.

---

## 9. Risks

- **Fact drift** — Gemini invents a yield or ticker. Mitigated by number/ticker subset check + kind allow-list.
- **Advice leakage** — model phrases things as recommendations. Mitigated by `detectAdviceIntent` + `FORBIDDEN_PATTERNS` + `RESPONSE_QUALITY_BANNED` re-scan on output.
- **News hallucination** — explicitly blocked by excluding `news-summary` and `website-lookup` from the allow-list.
- **Disclaimer stripping** — mitigated by re-appending the canonical disclaimer.
- **Latency / cost** — mitigated by 3–5 s timeout, cap on prompt/output size, feature flag, and future response caching keyed by `hash(safeText)`.
- **429 / 402 from gateway** — surfaced as silent fallback, logged server-side.
- **Prompt injection via user text** — user prompt is passed as *context only*, and the system prompt tells the model to ignore instructions inside it. Extra defense: strip anything that looks like `"ignore previous instructions"` before sending.
- **Test regressions** — existing `RESPONSE_QUALITY_BANNED` snapshot tests must still pass unchanged (Gemini path off by default in tests).

---

## 10. Exact implementation plan for a later branch

Order of work (each step independently reviewable):

1. Add `supabase/functions/ai-lab-explain/index.ts` + `_shared/ai-gateway.ts` helper. Zod-validated body, CORS, timeout, deterministic 200 response shape `{ rewritten: string | null }`. Update `supabase/config.toml`.
2. Add `src/lib/aiLab/geminiRewrite.ts`:
   - `rewriteWithGemini(safeText, result): Promise<string | null>`
   - Kind allow-list, timeout (`AbortController`, 4 s), feature-flag check.
   - Post-validation pipeline (§7).
3. Wire into `processAiLabUserPrompt` after `composeAssistantResponse`:
   - `const rewritten = await rewriteWithGemini(text, result); return { ..., text: rewritten ?? text };`
   - Only wrap the `router` branch; leave capabilities, filter-unsupported, clarifying, and website-lookup untouched.
4. Add feature flag `VITE_AI_LAB_GEMINI_ENABLED` in `.env.example`; default off in prod until observed for a week.
5. Add unit + integration tests from §8. Ensure existing suites are green with flag off (default).
6. Add a subtle "AI-assisted phrasing" hint in the message footer only when the rewritten path was used, so users know when Gemini touched the intro. Structured card and disclaimer stay identical.
7. Observability: log `{ resultKind, latencyMs, accepted, rejectionReason }` from the edge function; no PII, no full prompt.
8. Roll out: enable in dev → staging → 10% prod → 100%. Kill switch via env var.

Non-goals for this branch: internet browsing, price/yield generation, news generation, portfolio advice, tool-use / function-calling, streaming.
