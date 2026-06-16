## AI Scenario Assistant — Phase 1 (Admin-Only, Desktop)

A new `/ai-lab` page that lets admins ask financial *scenario* questions and get structured, deterministic answers from local calculators. No real LLM call yet; no advice wording allowed. Frontend-only — no DB, no edge function.

### 1. Routing & access

- Add lazy route `/ai-lab` in `src/App.tsx` pointing to a new `AiLabPage`.
- Guard inside the page with the existing `useAuth()` hook (same pattern as `AdminPage.tsx`):
  - `loading` → spinner
  - no `user` → `<Navigate to="/admin/login" />`
  - not `isAdmin` → "Access Denied" panel
- Desktop-only entry point: add an "AI Lab" link in `DesktopSidebar.tsx` / `DesktopTopBar.tsx` rendered **only when `isAdmin === true`**. No mobile nav entry in Phase 1 (page itself will still render but is gated).

### 2. New files

```
src/pages/AiLabPage.tsx                       # page shell, hero, layout, disclaimer
src/components/ai-lab/PromptCard.tsx          # input + suggested chips
src/components/ai-lab/ScenarioResult.tsx      # structured result cards
src/components/ai-lab/CapabilitiesCard.tsx    # "can / can't do" info card
src/lib/aiLab/scenarios.ts                    # pure calculators
src/lib/aiLab/safety.ts                       # forbidden/allowed wording + refusal
src/lib/aiLab/router.ts                       # parse prompt → scenario type + params
src/lib/aiLab/scenarios.test.ts               # vitest unit tests
src/lib/aiLab/safety.test.ts                  # vitest unit tests
src/lib/aiLab/router.test.ts                  # vitest unit tests
```

### 3. Deterministic scenario logic (`src/lib/aiLab/scenarios.ts`)

Pure functions, no rounding surprises, KES formatted at the UI layer:

- `calculateMmfScenario(amount, annualYieldPct, months)` → `{ grossYearly, monthlyEquivalent, projectedGross, assumptions[] }`
  - `grossYearly = amount * annualYieldPct/100`
  - `projectedGross = amount + grossYearly * (months/12)` (simple, non-compounding; assumption stated)
- `calculateStockMoveScenario(amount, priceChangePct)` → `{ newValue, delta, direction, assumptions[] }`
- `calculateMonthlyContributionScenario(startAmount, monthly, annualYieldPct, months)` → simple monthly accrual on rolling balance, returns `{ totalContributions, projectedGross, grossEarnings, assumptions[] }`

Each result object also carries a fixed `disclaimer: "Data only. Not personal financial advice."`.

### 4. Safety layer (`src/lib/aiLab/safety.ts`)

- `FORBIDDEN_PATTERNS` regex list: `should buy|should sell|i recommend|best fund|top fund|safest fund|guaranteed return|risk-?free|put your money`.
- `ADVICE_INTENT_PATTERNS`: `which (fund|stock).*(should|buy)|should i (buy|sell)|where should i put|what is the best`.
- `detectAdviceIntent(prompt)` → boolean.
- `sanitizeOutput(text)` → throws in dev / strips & logs in prod if any forbidden phrase slips through. Used as a final guard before render.
- `REFUSAL_MESSAGE` and `SAFE_ALTERNATIVES` constants returned when intent is advisory.

### 5. Prompt router (`src/lib/aiLab/router.ts`)

Lightweight regex/keyword router (no LLM):

1. Run `detectAdviceIntent` → if true, return `{ kind: "refusal" }`.
2. Match intents:
   - MMF yield scenario: detect amount (`KES? \d[\d,]*`) + yield (`\d+(\.\d+)?\s*%`) + optional months.
   - Stock move: detect amount + `up|rises|gains|down|falls|drops` + percent.
   - Monthly contribution: detect "monthly" + amount + yield.
   - Explainer: keywords like "explain", "what is", "yield", "mmf" → return a static neutral explainer card from a small dictionary.
   - Compare: "compare ... vs ..." → run two sub-scenarios.
3. Fallback → return `{ kind: "unknown" }` with safe suggestions.

### 6. UI

`AiLabPage` (desktop-first, reuses tokens from `index.css`, mirrors density of existing admin/portfolio pages):

```text
┌──────────────────────────────────────────────────────────┐
│ Hero: "AI Scenario Assistant"  + subtitle                │
│ Main disclaimer banner (DisclaimerBlock variant)         │
├────────────────────────────────────┬─────────────────────┤
│ PromptCard                         │ CapabilitiesCard    │
│   - textarea + Run button          │   ✓ can do          │
│   - suggested prompt chips (5)     │   ✗ can't do        │
│                                    │                     │
│ ScenarioResult                     │ (sticky on desktop) │
│   - Summary card                   │                     │
│   - Assumptions card               │                     │
│   - Calculations table             │                     │
│   - Important notes                │                     │
│   - Disclaimer footer              │                     │
└────────────────────────────────────┴─────────────────────┘
```

- Chips clicking fills the textarea and auto-runs.
- Refusal path renders a dedicated refusal card with the safe-alternative chips.
- All numeric output uses `Intl.NumberFormat("en-KE", { style: "currency", currency: "KES" })`.
- No streaming/loading states needed (sync compute). Small fade-in.

### 7. Tests (`vitest`, follows existing `src/lib/*.test.ts` style)

`scenarios.test.ts`:
- MMF: `calculateMmfScenario(100000, 11, 12)` → `grossYearly === 11000`, `monthlyEquivalent ≈ 916.666…`, `projectedGross === 111000`.
- Stock: `calculateStockMoveScenario(100000, 5).newValue === 105000`; `(100000, -10).newValue === 90000`.
- Monthly contribution: smoke test on shape + monotonic growth.

`safety.test.ts`:
- `detectAdviceIntent("Which fund should I buy?")` → true.
- `detectAdviceIntent("Should I sell Safaricom?")` → true.
- `sanitizeOutput` rejects each forbidden phrase from the spec.
- Refusal message contains "can't tell you what to buy".

`router.test.ts`:
- Advisory prompts route to `refusal`.
- "If I invest KES 100,000 at 11% yield" routes to MMF scenario with parsed params.
- Every non-refusal result includes `"Data only. Not personal financial advice."`.

### 8. Out of scope (Phase 1)

- No real AI/LLM call, no edge function, no secret, no DB tables.
- No mobile nav entry, no public access, no payments.
- No trading, broker, or recommendation features.

### 9. Risks

- Regex-based intent detection can miss creative advisory phrasing → mitigated by output `sanitizeOutput` guard + neutral-only response templates.
- Admin-only gate relies on existing `user_roles`/`isAdmin` — same trust boundary as `/admin`.

### 10. Acceptance

- Visiting `/ai-lab` as non-admin shows Access Denied; as admin shows the tool.
- Suggested chips produce structured cards with correct numbers from spec.
- Advisory prompts always hit the refusal card.
- `bunx vitest run src/lib/aiLab` passes; typecheck + build clean.
