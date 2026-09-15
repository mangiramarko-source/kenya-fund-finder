# Gates: Universal Financial Query Understanding

Scope: Deliver a catalog-grounded, ambiguity-safe resolver with resumable AI Lab clarifications, anonymous review telemetry, database schema, and regression coverage.

- [x] G1: The versioned semantic-frame and canonical-catalog interfaces resolve explicit entities, return typed ambiguity, and never silently choose deliberately ambiguous brands.
  CHECK: npm test -- --run src/lib/aiLab/universalQueryResolver.test.ts
  EXPECT: /passed/
  EVIDENCE: Start at  20:52:59 | Duration  751ms (transform 33ms, setup 70ms, collect 25ms, tests 11ms, environment 278ms, prepare 52ms)

- [x] G2: AI Lab asks one precise clarification, exposes stable selectable candidate IDs, and resumes the preserved original request after a selection.
  CHECK: npm test -- --run src/lib/aiLab/queryClarificationFlow.test.ts src/components/ai-lab/AiLabChat.test.tsx
  EXPECT: /passed/
  EVIDENCE: Start at  20:53:00 | Duration  742ms (transform 156ms, setup 58ms, collect 460ms, tests 80ms, environment 300ms, prepare 64ms)

- [x] G3: The Supabase migration creates protected canonical catalog, alias, relation, and review-event tables with explicit grants/RLS policies and seeded non-market concepts.
  CHECK: node scripts/verify-universal-query-schema.mjs
  EXPECT: universal query schema verified
  EVIDENCE: universal query schema verified

- [x] G4: AI intent classification uses the versioned semantic frame without accepting market facts or client-supplied catalog truth.
  CHECK: npm test -- --run src/lib/aiLab/naturalLanguageIntent.test.ts src/lib/aiLab/aiLabNaturalLanguage.test.ts
  EXPECT: /passed/
  EVIDENCE: Start at  20:53:01 | Duration  714ms (transform 159ms, setup 59ms, collect 255ms, tests 139ms, environment 297ms, prepare 65ms)

- [x] G5: Anonymous resolution telemetry is redacted, bounded, non-blocking, and records ambiguity, not-found, clarification selection, and shadow disagreement outcomes.
  CHECK: npm test -- --run src/lib/aiLab/queryResolutionTelemetry.test.ts
  EXPECT: /passed/
  EVIDENCE: Start at  20:53:02 | Duration  422ms (transform 33ms, setup 26ms, collect 27ms, tests 2ms, environment 133ms, prepare 32ms)

- [x] G6: Existing AI Lab behavior, type safety, Edge Function checks, lint budget, and production build remain green.
  CHECK: npm run typecheck && npm run check:edge && npm run lint:budget && npm run build:ci
  EXPECT: /Production launch-surface verification passed/
  EVIDENCE: - Use build.rollupOptions.output.manualChunks to improve chunking: https://rollupjs.org/configuration-options/#output-manualchunks | - Adjust chunk size limit for this warning via build.chunkSizeWarni

# Gates: Structured comparisons and MMF yield changes

Scope: Complete server-authoritative structured comparisons and deterministic MMF yield-change calculations without database changes.

- [x] C1: Server comparisons return the existing renderable comparison schema with values, provenance timestamps, missing-data handling, and date mismatch warnings.
  CHECK: npm test -- --run src/lib/aiLab/serverFinancialResults.test.ts src/lib/aiLab/compare.test.ts
  EXPECT: /passed/
  EVIDENCE: Start at  11:56:38 | Duration  1.17s (transform 268ms, setup 299ms, collect 278ms, tests 77ms, environment 947ms, prepare 170ms)

- [x] C2: MMF yield changes deterministically expose old/new annual and monthly earnings, differences, percentage-point change, and relative yield change for decrease, increase, same, and decimal yields.
  CHECK: npm test -- --run src/lib/aiLab/serverFinancialResults.test.ts src/lib/aiLab/scenarios.test.ts
  EXPECT: /passed/
  EVIDENCE: Start at  11:56:40 | Duration  779ms (transform 113ms, setup 116ms, collect 153ms, tests 45ms, environment 645ms, prepare 132ms)

- [x] C3: Missing amount and follow-up amount requests preserve both yield assumptions and resume through the server contract; malformed values are rejected or clarified.
  CHECK: npm test -- --run src/lib/aiLab/serverFinancialResults.test.ts src/lib/aiLab/chat.test.ts src/lib/aiLab/naturalLanguageIntent.test.ts
  EXPECT: /passed/
  EVIDENCE: Start at  11:56:41 | Duration  1.22s (transform 494ms, setup 201ms, collect 790ms, tests 101ms, environment 1.21s, prepare 258ms)

- [x] C4: Edge/type checks and focused AI regression tests pass.
  CHECK: npm run check:edge && npm run typecheck && npm test -- --run src/lib/aiLab/serverFinancialResults.test.ts src/lib/aiLab/compare.test.ts src/lib/aiLab/scenarios.test.ts src/lib/aiLab/chat.test.ts
  EXPECT: /passed/
  EVIDENCE: Check supabase/functions/update-live-status/index.ts | Check supabase/functions/verify-turnstile/index.ts

- [ ] C5: Both features are verified in the real AI Lab browser against the deployed Edge Function.
  EVIDENCE: pending

# Gates: AI Lab natural-language resilience

Scope: Make AI Lab return a safe, useful educational or clarifying response for every non-empty prompt even when the server parser or provider cannot interpret it.

- [x] A1: General KenyaFundFinder learning, unfamiliar prompts, and provider/parser failures resolve to successful helpful responses rather than the misleading server-unavailable message.
  CHECK: npm test -- --run src/lib/aiLab/aiLabNaturalLanguage.test.ts src/lib/aiLab/chat.test.ts src/lib/aiLab/aiLabPromptFlow.test.ts
  EXPECT: /passed/
  EVIDENCE: 5 focused files / 69 tests passed, including parser-unavailable platform learning, unfamiliar wording, and advice-refusal coverage.

- [x] A2: The Edge Function treats parser/model failure as a valid fallback intent and retains refusal, data, scenario, comparison, and clarification safety boundaries.
  CHECK: npm run check:edge && npm test -- --run src/lib/aiLab/edgeFunctionGuardrails.test.ts src/lib/aiLab/naturalLanguageIntent.test.ts
  EXPECT: /passed/
  EVIDENCE: npm run check:edge and the Edge/natural-language guardrail tests passed; production API returned a capabilities guide for the reported prompt and a refusal for personal buy/sell advice.

- [x] A3: Type checking and the full relevant AI Lab regression suite pass.
  CHECK: npm run typecheck && npm test -- --run src/lib/aiLab
  EXPECT: /passed/
  EVIDENCE: npm run typecheck passed; npm test -- --run src/lib/aiLab passed (43 files, 759 tests); npm run build:ci passed. The repository-wide lint budget remains blocked only by pre-existing unrelated count overruns.

- [x] A4: The deployed function and production client flow are verified against the reported prompt and regressions, or a concrete externally blocked reason is recorded.
  EVIDENCE: Deployed ai-lab-assist v18 and ai-lab-explain v23; production browser at kenyafundfinder.com/ai-lab rendered the KenyaFundFinder guide for “I want you to help me learn about KenyaFundFinder” with no outage message. Production API also verified a normal SCOM scenario and a safe personal-advice refusal.

# Gates: Beginner AI Lab learning path

Scope: Make beginner-learning questions reliably return a friendly educational roadmap with safe glossary prompts and internal KenyaFundFinder navigation.

- [x] B1: Beginner-learning wording resolves locally to the maintained getting-started lesson before a server capabilities response can override it.
  CHECK: npm test -- --run src/lib/aiLab/beginnerGuidance.test.ts src/lib/aiLab/aiLabNaturalLanguage.test.ts
  EXPECT: /passed/
  EVIDENCE: The exact reported wording and 26 established beginner variants pass in src/lib/aiLab/beginnerGuidance.test.ts; the server interpreter spy was not called for the exact wording.

- [x] B2: Beginner responses expose exactly the safe glossary follow-ups and safe internal navigation actions for Learn, Stocks, and MMFs.
  CHECK: npm test -- --run src/lib/aiLab/beginnerGuidance.test.ts src/components/ai-lab/AiLabChat.test.tsx
  EXPECT: /passed/
  EVIDENCE: Focused tests passed; the production browser rendered “What is a stock?”, “What is an MMF?”, “Explain risk”, “Explain dividend”, and links to /learn, /stocks, and /funds.

- [x] B3: The chat renders accessible internal links while personal investment recommendations remain refused.
  CHECK: npm test -- --run src/lib/aiLab/beginnerGuidance.test.ts src/components/ai-lab/AiLabChat.test.tsx
  EXPECT: /passed/
  EVIDENCE: AiLabChat test confirms the labelled navigation and each href; beginner advice-seeking tests remain refused.

- [x] B4: Type checking, relevant AI Lab regressions, and a real browser prompt check pass.
  CHECK: npm run typecheck && npm test -- --run src/lib/aiLab/beginnerGuidance.test.ts src/lib/aiLab/aiLabNaturalLanguage.test.ts src/components/ai-lab/AiLabChat.test.tsx
  EXPECT: /passed/
  EVIDENCE: 3 focused files / 50 tests passed; npm run typecheck passed; Vercel production deployment dpl_sxbcxUq4vNmkhHRWHkgVve5s167f built successfully; the live browser exact-prompt check passed.
