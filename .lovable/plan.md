
# AI Lab — Gemini Integration Plan (Phase 1, Revised)

## Goal

Make AI Lab smarter at answering natural-language **educational** and **unknown** questions by routing only those prompts to Gemini. All existing deterministic scenarios remain byte-for-byte unchanged. Zero new risk on numeric/advisory surfaces.

## Scope

### Gemini WILL handle (Phase 1)
- Prompts the router classifies as `unknown` (no scenario match).
- Educational / explainer prompts (e.g. "what is a money market fund?", "how does compounding work?", "difference between NAV and yield").
- General natural-language financial-literacy questions with no numeric answer expected.

### Gemini will NOT handle (Phase 1)
- Stock amount scenarios
- MMF yield scenarios
- Multi-asset comparisons
- Portfolio split
- Refusals (advisory intent) — always deterministic refusal
- Website lookup
- News summary / latest news fallback
- Capabilities & clarifying prompts
- Any prompt that produces numbers, tickers, or recommendations

No scenario rewriting, no post-processing of deterministic output, no internet or news browsing.

## Architecture

```text
User prompt
   │
   ▼
router.ts ──► deterministic match? ──► YES ──► existing pipeline (UNCHANGED)
                                       │
                                       NO
                                       │
                                       ▼
                        classifyEducational(prompt)
                                       │
                          ┌────────────┴────────────┐
                        educational              still unknown
                          │                          │
                          ▼                          ▼
              generateGeminiEducationalAnswer   same helper (flag on)
                          │
                          ▼
                 ai-lab-explain edge fn (Lovable AI Gateway)
                          │
                          ▼
                 validateGeminiOutput (safety)
                          │
              ┌───────────┴───────────┐
            pass                    fail / error / flag off
              │                       │
              ▼                       ▼
      render markdown         deterministic unknown/explainer fallback
```

## Implementation Steps

### 1. Edge function `supabase/functions/ai-lab-explain/index.ts`
- Calls Lovable AI Gateway with `google/gemini-3-flash-preview`.
- System prompt: educator only. Forbid advice, price predictions, buy/sell/hold, specific tickers/funds by name, and any numeric claims. No browsing, no citations to live sources.
- Hard caps: input ≤ 1KB, output ≤ 600 chars.
- Handles 429/402 with clean error JSON.
- CORS + input validation (zod).
- `verify_jwt = true` in `supabase/config.toml`.

### 2. Feature flag
- `VITE_AI_LAB_GEMINI_ENABLED` — default `false`.
- Also a runtime kill-switch check so we can disable without redeploy.

### 3. Frontend helper `src/lib/aiLab/generateGeminiEducationalAnswer.ts`
- Single entry point invoked from `chat.ts` only on the unknown/educational branch.
- Calls `supabase.functions.invoke('ai-lab-explain', ...)`.
- Runs `validateGeminiOutput` before returning.
- Returns `{ ok: true, markdown }` or `{ ok: false }`.

### 4. Router integration `src/lib/aiLab/router.ts` + `chat.ts`
- No changes to any existing scenario branch.
- Add `classifyEducational(prompt)` — lightweight keyword/heuristic classifier ("what is", "explain", "how does", "difference between", "meaning of", etc.).
- Only the `unknown` and `educational` branches call the Gemini helper (when flag on). Everything else exits through its current deterministic path.

### 5. Safety validation `src/lib/aiLab/safety.ts` (extend)
`validateGeminiOutput(text)` rejects if any of:
- Length > 600 chars.
- Contains numbers formatted as prices/yields (`\d+(\.\d+)?%`, `KES`, `USD` followed by digits).
- Contains ticker-like tokens (`[A-Z]{3,5}` uppercase runs) not in an allow-list of common English words.
- Matches advisory phrases (`should buy`, `recommend`, `will rise`, `guaranteed`, `best investment`, etc.) — reuses existing advisory regex list.
- Contains URLs or "according to" style citations.
- Empty / whitespace only.
Failure ⇒ silent fallback.

### 6. Fallback behavior
- On flag off, invoke error, network error, or validation failure: render the **existing deterministic unknown/explainer response** unchanged. User never sees an error toast for this path.

### 7. No internet / no news
- System prompt explicitly forbids referencing current events, prices, or news.
- Edge function does not fetch external URLs.
- News/website scenarios continue to route through their existing deterministic handlers.

### 8. No scenario rewriting
- `responseComposer.ts`, `scenarios.ts`, `nameMatch.ts`, `history.ts`, `marketContext.ts` — untouched.
- No Gemini call sites inside any deterministic composer.

### 9. Tests (new)
- `classifyEducational` unit tests: positive (explainers) and negative (scenarios, refusals, news, comparisons).
- `validateGeminiOutput` unit tests: rejects numbers, tickers, advisory phrases, URLs, overlong text; accepts clean educational prose.
- `generateGeminiEducationalAnswer` tests with mocked invoke: success path renders markdown; failure path returns `ok:false`; flag-off short-circuits without invoking.
- Integration test: chat pipeline with flag on routes educational prompt through Gemini; scenario prompt does not call the helper.

### 10. Existing tests unchanged
- All 27 existing deterministic scenario/safety/disclaimer tests remain as-is and must continue to pass.

## Rollout
1. Merge with flag off → verify deterministic behavior fully preserved in prod.
2. Enable flag for admin users only via runtime check.
3. Monitor edge-function logs + validation-failure rate for 1 week.
4. Enable for all users if failure rate < 5% and no advisory leakage observed.

## Out of Scope (future phases)
- Gemini-assisted narrative around scenario/comparison output.
- Multi-turn conversational memory.
- Personalized education based on user portfolio.
