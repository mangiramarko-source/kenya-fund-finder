// Phase 13B — simplified chat UX copy and scenario inventory.

export const AI_LAB_BETA_BADGE = "Admin preview · Phase 13B · simplified chat UX";

export const AI_LAB_BETA_NOTE =
  "AI Lab uses a simplified chat-style interface with deterministic response composition on KenyaFundFinder data. It remains admin-only and does not use an LLM.";

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
