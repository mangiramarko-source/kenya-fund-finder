// Phase 13 — safe response composer copy and scenario inventory.

export const AI_LAB_BETA_BADGE = "Admin preview · Phase 13 · safe response composer";

export const AI_LAB_BETA_NOTE =
  "AI Lab now uses deterministic response composition to explain KenyaFundFinder data and scenarios conversationally. It remains admin-only and does not use an LLM.";

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
