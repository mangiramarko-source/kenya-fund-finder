// Phase 11A — conversational chat skeleton copy and scenario inventory.

export const AI_LAB_BETA_BADGE = "Admin preview · Phase 11A · conversational chat skeleton";

export const AI_LAB_BETA_NOTE =
  "This is an admin-only preview with a conversational chat skeleton. Default access remains admin-only. The assistant runs deterministic scenario calculators on available KenyaFundFinder data. It does not use an LLM and does not give personal financial advice.";

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
