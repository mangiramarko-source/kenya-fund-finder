# Gates: AI Lab Duration Projections

Scope: Duration scenarios explain end-period estimates in simple language for stocks, FX, and commodities.

- [x] G1: Unit tests cover balanced duration projection rows for stock, FX, commodity, and missing-stock clarification.
  CHECK: npm test -- src/lib/aiLab/assetAwareAmount.test.ts src/lib/aiLab/stockAmount.test.ts src/lib/aiLab/router.test.ts src/lib/aiLab/edgeFunctionGuardrails.test.ts
  EXPECT: /Test Files\s+4 passed/
  EVIDENCE: Start at  12:26:30 | Duration  1.60s (transform 271ms, setup 450ms, collect 608ms, tests 169ms, environment 2.19s, prepare 337ms)

- [x] G2: Edge Function source produces balanced projection rows and simple no-forecast language for stock, FX, and commodity amount scenarios.
  CHECK: npm test -- src/lib/aiLab/edgeFunctionGuardrails.test.ts
  EXPECT: /Test Files\s+1 passed/
  EVIDENCE: Start at  12:26:32 | Duration  584ms (transform 32ms, setup 46ms, collect 15ms, tests 4ms, environment 238ms, prepare 65ms)

- [x] G3: Type checking passes after shared scenario shape changes.
  CHECK: npm run typecheck
  EXPECT: /tsc --noEmit/
  EVIDENCE: > kenya-fund-finder@0.0.0 typecheck | > tsc --noEmit

- [x] G4: Edge Function static check passes.
  CHECK: npm run check:edge
  EXPECT: /Check supabase\/functions\/verify-turnstile\/index.ts/
  EVIDENCE: Check supabase/functions/update-live-status/index.ts | Check supabase/functions/verify-turnstile/index.ts

- [x] G5: Duration answer copy uses simple explanation and avoids prediction wording.
  EVIDENCE: UI copy at src/components/ai-lab/ScenarioResult.tsx:552 says "How to read this" and explains +15%/-15% plainly; Edge Function text at supabase/functions/ai-lab-assist/index.ts:1055, 1088, and 1184 says the duration examples are not forecasts.
