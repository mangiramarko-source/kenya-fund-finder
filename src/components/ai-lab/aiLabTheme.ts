// Phase 13C — AI Lab scoped tokens aligned with site CSS variables (no global theme edits).

export const AI_LAB_PAGE = "min-h-screen overflow-x-hidden";
export const AI_LAB_PAGE_INNER = "container py-6 md:py-10 max-w-6xl";

export const AI_LAB_CARD =
  "rounded-xl border border-border bg-card text-card-foreground shadow-sm";
export const AI_LAB_CARD_INNER =
  "rounded-xl border border-border bg-muted/30";
export const AI_LAB_RAIL_CARD =
  "rounded-xl border border-border bg-card p-3 shadow-sm";

export const AI_LAB_LABEL =
  "text-[10px] uppercase tracking-widest font-semibold text-muted-foreground";
export const AI_LAB_MUTED = "text-sm text-muted-foreground text-center max-w-xl mx-auto";
export const AI_LAB_HEADLINE =
  "text-xl md:text-2xl font-bold tracking-tight font-heading text-foreground leading-tight text-center";
export const AI_LAB_METRIC = "tabular-nums text-foreground";
export const AI_LAB_METRIC_LG =
  "tabular-nums text-xl md:text-2xl font-semibold text-foreground";
export const AI_LAB_POSITIVE = "text-success";
export const AI_LAB_NEGATIVE = "text-destructive";

export const AI_LAB_CHIP =
  "text-[12px] px-3 py-2 rounded-lg border border-input bg-background text-foreground hover:bg-muted transition-colors text-left shadow-sm";
export const AI_LAB_USER_BUBBLE =
  "max-w-[85%] rounded-2xl bg-primary text-primary-foreground px-4 py-2 text-sm shadow-sm";
export const AI_LAB_ASSISTANT_TEXT =
  "text-base text-foreground leading-relaxed whitespace-pre-wrap";

export const AI_LAB_INPUT_WRAP =
  "flex items-center gap-2 rounded-xl border border-input bg-background px-3 py-2 shadow-sm focus-within:ring-2 focus-within:ring-accent/40";
/** @deprecated Use AI_LAB_INPUT_WRAP — kept for imports that still reference AI_LAB_INPUT */
export const AI_LAB_INPUT = AI_LAB_INPUT_WRAP;
export const AI_LAB_INPUT_FIELD =
  "flex-1 bg-transparent border-0 outline-none text-sm md:text-base text-foreground placeholder:text-muted-foreground min-w-0 py-2 min-h-[44px]";
export const AI_LAB_RUN_BTN =
  "shrink-0 rounded-lg bg-accent text-accent-foreground hover:bg-accent/90 font-semibold text-sm px-4 py-2 min-h-[44px] disabled:opacity-50 disabled:pointer-events-none transition-colors";

export const AI_LAB_SECTION = "rounded-xl border border-border bg-muted/40 p-4";
export const AI_LAB_COLLAPSIBLE =
  "rounded-xl border border-border bg-muted/30 px-3 py-2 text-xs text-muted-foreground";
export const AI_LAB_METRIC_CARD =
  "rounded-xl border border-border bg-card p-4 shadow-sm";
export const AI_LAB_DIVIDER = "h-px bg-border";
export const AI_LAB_COMPARE_ACTIVE = "bg-accent text-accent-foreground";
export const AI_LAB_COMPARE_INACTIVE =
  "border border-input bg-background text-foreground hover:bg-muted";

export const AI_LAB_HERO_HEADLINE = "Ask about KenyaFundFinder data";
export const AI_LAB_HERO_SUBTEXT =
  "Model scenarios, look up available data, and explain financial terms. Data only. Not personal financial advice.";
export const AI_LAB_SAFETY_LINE = "Data only. Not personal financial advice.";
export const AI_LAB_INPUT_PLACEHOLDER = "Ask a scenario or data question…";

export const AI_LAB_SAFE_PROMPT_CHIPS = [
  "What can I ask?",
  "What is SCOM's current price?",
  "Show Etica MMF yield",
  "What is the USD/KES rate?",
  "KES 10,000 in SCOM",
  "Split 100k between MMF and SCOM at 11% yield",
] as const;
