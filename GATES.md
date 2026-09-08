# Gates: Hybrid Conversational AI Lab

Scope: Deliver cost-aware natural-language understanding that uses Gemini for ambiguous prompts while keeping KenyaFundFinder as the sole facts/calculation engine.

- [x] G1: Direct prompts stay deterministic; vague and beginner prompts receive validated natural-language interpretation before a data lookup failure.
  CHECK: npm test -- src/lib/aiLab/aiLabPromptFlow.test.ts src/lib/aiLab/aiLabNaturalLanguage.test.ts
  EXPECT: /passed/
  EVIDENCE: Start at  12:17:13 | Duration  1.13s (transform 161ms, setup 151ms, collect 405ms, tests 161ms, environment 689ms, prepare 103ms)

- [x] G2: Beginner guidance is a maintained, safe explainer with useful follow-ups and no recommendation language.
  CHECK: npm test -- src/lib/aiLab/beginnerGuidance.test.ts src/lib/aiLab/explainers.test.ts
  EXPECT: /passed/
  EVIDENCE: Start at  12:17:15 | Duration  602ms (transform 162ms, setup 61ms, collect 320ms, tests 39ms, environment 306ms, prepare 65ms)

- [x] G3: Intent validation, advice safeguards, and deterministic fallback are retained.
  CHECK: npm test -- src/lib/aiLab/naturalLanguageIntent.test.ts src/lib/aiLab/safety.test.ts src/lib/aiLab/edgeFunctionGuardrails.test.ts
  EXPECT: /passed/
  EVIDENCE: Start at  12:17:16 | Duration  517ms (transform 77ms, setup 98ms, collect 125ms, tests 12ms, environment 500ms, prepare 100ms)

- [x] G4: AI Lab regression suite and TypeScript checks pass.
  CHECK: npm run typecheck && npm test -- src/lib/aiLab
  EXPECT: /passed/
  EVIDENCE: TypeScript completed with no errors; 34 AI Lab test files and 607 tests passed (12:16:40 run).

- [x] G5: The implementation has 150 evaluated prompt cases across direct, vague, beginner, Kenyan phrasing, follow-up, advice, and malformed-output categories.
  CHECK: npm test -- src/lib/aiLab/hybridConversationCorpus.test.ts
  EXPECT: /passed/
  EVIDENCE: Start at  12:17:20 | Duration  621ms (transform 87ms, setup 31ms, collect 122ms, tests 46ms, environment 145ms, prepare 35ms)

## Asset-aware amount scenarios

- [x] G6: Neutral amount prompts resolve all supported KenyaFundFinder asset classes without hard-coded stock names.
  CHECK: npm test -- src/lib/aiLab/assetAwareAmount.test.ts src/lib/aiLab/router.test.ts
  EXPECT: /passed/
  EVIDENCE: Start at  16:22:38 | Duration  691ms (transform 92ms, setup 143ms, collect 205ms, tests 61ms, environment 598ms, prepare 78ms)

- [x] G7: Commodity and FX amount estimates use only published catalog prices and rates, while advice requests remain refused.
  CHECK: npm test -- src/lib/aiLab/assetAwareAmount.test.ts src/lib/aiLab/fxCommodity.test.ts src/lib/aiLab/safety.test.ts
  EXPECT: /passed/
  EVIDENCE: Start at  16:22:39 | Duration  543ms (transform 141ms, setup 107ms, collect 233ms, tests 50ms, environment 459ms, prepare 99ms)

- [x] G8: Local and model-interpreted amount wording execute through the same validated scenario route.
  CHECK: npm test -- src/lib/aiLab/aiLabNaturalLanguage.test.ts src/lib/aiLab/edgeFunctionGuardrails.test.ts src/lib/aiLab/aiLabPageFlow.test.ts
  EXPECT: /passed/
  EVIDENCE: Start at  16:22:40 | Duration  726ms (transform 152ms, setup 89ms, collect 238ms, tests 122ms, environment 474ms, prepare 102ms)

- [x] G9: TypeScript, the full AI Lab suite, and diff integrity checks pass.
  CHECK: npm run typecheck && npm test -- src/lib/aiLab && git diff --check
  EXPECT: /passed/
  EVIDENCE: stderr | src/lib/aiLab/generateGeminiEducationalAnswer.test.ts > generateGeminiEducationalAnswer > falls back on invoke error | [ai-lab] gemini invoke error boom
