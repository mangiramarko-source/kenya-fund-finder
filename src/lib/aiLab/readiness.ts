// Phase 9 — public beta readiness copy and inventory (no new calculators).

export const AI_LAB_BETA_BADGE = "Admin preview · Phase 9 · public beta readiness";

export const AI_LAB_BETA_NOTE =
  "This is an admin-only preview for public beta readiness. The assistant runs deterministic scenario calculators on available KenyaFundFinder data. It does not use an LLM and does not give personal financial advice.";

export const AI_LAB_SCENARIO_INVENTORY = [
  "mmf",
  "mmf-yield-change",
  "stock-amount",
  "stock-move",
  "goal-projection",
  "compare",
  "fx-conversion",
  "fx-move",
  "commodity-move",
  "news-summary",
  "portfolio-split",
  "explainer",
] as const;

export type AiLabScenarioKind = (typeof AI_LAB_SCENARIO_INVENTORY)[number];
