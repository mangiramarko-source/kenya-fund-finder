# Gates: AI Lab duration scenarios

Scope: Interpret a stated holding period for neutral amount scenarios across stocks, funds, FX, and commodities without inventing future market facts.

- [x] D1: Deterministic and model-interpreted amount prompts preserve `for N months` for stocks, funds, FX, and commodities.
  CHECK: npm test -- --run src/lib/aiLab/assetAwareAmount.test.ts src/lib/aiLab/aiLabNaturalLanguage.test.ts
  EXPECT: /passed/
  EVIDENCE: 4 focused files / 52 tests passed; direct stock, fund, FX, commodity, and interpreter duration cases are covered.

- [x] D2: Stock duration produces clearly labelled illustrative annual-change outcomes; funds use their published yield for the requested period; FX and commodities show a current-value holding snapshot without claiming a future rate or price.
  CHECK: npm test -- --run src/lib/aiLab/assetAwareAmount.test.ts src/lib/aiLab/scenarios.test.ts
  EXPECT: /passed/
  EVIDENCE: assetAwareAmount tests assert 2-month stock projection, 12-month MMF period, FX holdingMonths, and commodity holdingMonths; result copy explicitly says FX/commodity duration is not a forecast.

- [x] D3: The Edge interpreter deterministically extracts month/year wording and renders the supported duration result shape.
  CHECK: npm run check:edge && npm test -- --run src/lib/aiLab/edgeFunctionGuardrails.test.ts
  EXPECT: /passed/
  EVIDENCE: npm run check:edge passed; edge guardrails assert parsePeriodMonths, deterministic duration application, and no-forecast copy.

- [x] D4: Type safety and the full AI Lab suite remain green.
  CHECK: npm run typecheck && npm run check:edge && git diff --check
  EXPECT: /passed/
  EVIDENCE: All 45 AI Lab test files ran in three bounded batches: 12 files / 167 tests, 16 files / 267 tests, and 17 files / 336 tests (770 total), all passed. Typecheck, Edge checks, and diff check passed.
