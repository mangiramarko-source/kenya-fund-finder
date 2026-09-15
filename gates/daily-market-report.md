# Gates: daily AI market reports

Scope: Server-authoritative daily briefs for stocks, MMFs, FX rates, and commodities.

- [x] G1: Daily market reports resolve without requiring a product entity.
  CHECK: npm test -- src/lib/aiLab/universalQueryResolver.test.ts
  EXPECT: 14 passed
  EVIDENCE: Start at  20:19:19 | Duration  1.00s (transform 67ms, setup 103ms, collect 49ms, tests 22ms, environment 476ms, prepare 108ms)

- [x] G2: The changed Edge Function and shared resolver type-check.
  CHECK: npm run check:edge
  EXPECT: Check supabase/functions/ai-lab-assist/index.ts
  EVIDENCE: Check supabase/functions/update-live-status/index.ts | Check supabase/functions/verify-turnstile/index.ts

- [x] G3: The change contains no whitespace errors.
  CHECK: git diff --check
  EXPECT:
  EVIDENCE: (no output)
