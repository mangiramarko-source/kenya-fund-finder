// Phase 13C/13D — AI Lab scoped tokens aligned with site CSS variables (no global theme edits).

export const AI_LAB_PAGE = "min-h-screen overflow-x-hidden bg-muted/30";
export const AI_LAB_PAGE_INNER = "container py-8 md:py-12 max-w-6xl";

export const AI_LAB_CARD =
  "rounded-2xl border border-border bg-card text-card-foreground shadow-sm";
export const AI_LAB_EMPTY_SHELL =
  "flex flex-col min-h-[480px] lg:min-h-[560px] border-0 shadow-none bg-transparent overflow-hidden";
export const AI_LAB_ACTIVE_SHELL =
  "flex flex-col min-h-[480px] max-h-[calc(100dvh-11rem)] lg:max-h-[calc(100dvh-9rem)] overflow-hidden border-0 shadow-none bg-transparent";
export const AI_LAB_INPUT_DOCK =
  "shrink-0 px-3 md:px-4 pt-3 pb-3 md:pb-4 bg-gradient-to-t from-background via-background/95 to-background/0 backdrop-blur-sm z-10";
export const AI_LAB_CARD_INNER =
  "rounded-2xl border border-border bg-muted/30";
export const AI_LAB_RAIL_CARD =
  "rounded-2xl border border-border bg-card p-3 shadow-sm";

export const AI_LAB_LABEL =
  "text-[11px] uppercase tracking-[0.1em] font-bold text-foreground";
export const AI_LAB_MUTED = "text-sm text-muted-foreground text-center max-w-xl mx-auto";
export const AI_LAB_HEADLINE =
  "text-4xl md:text-5xl lg:text-[3.25rem] font-extrabold tracking-tight font-heading text-foreground leading-[1.05]";
export const AI_LAB_HERO_SUBTEXT_CLASS =
  "text-sm md:text-[15px] text-muted-foreground max-w-lg leading-relaxed font-medium";
export const AI_LAB_METRIC = "tabular-nums text-foreground";
export const AI_LAB_METRIC_LG =
  "tabular-nums text-xl md:text-2xl font-bold text-foreground";
export const AI_LAB_POSITIVE = "text-success";
export const AI_LAB_NEGATIVE = "text-destructive";

export const AI_LAB_CHIP =
  "text-xs px-3 py-1.5 rounded-full border border-border bg-card text-muted-foreground hover:text-foreground hover:bg-muted transition-colors text-left shadow-sm font-medium";
export const AI_LAB_USER_BUBBLE =
  "max-w-[85%] rounded-2xl bg-primary text-primary-foreground px-4 py-2 text-sm shadow-sm";
export const AI_LAB_ASSISTANT_TEXT =
  "text-sm md:text-[15px] text-foreground/90 leading-relaxed whitespace-pre-wrap italic";

export const AI_LAB_INPUT_WRAP =
  "flex items-center gap-2 rounded-full border border-border bg-card pl-4 pr-1.5 py-1.5 shadow-lg focus-within:ring-4 focus-within:ring-accent/15 focus-within:border-accent/40 transition-all";
/** @deprecated Use AI_LAB_INPUT_WRAP — kept for imports that still reference AI_LAB_INPUT */
export const AI_LAB_INPUT = AI_LAB_INPUT_WRAP;
export const AI_LAB_INPUT_FIELD =
  "flex-1 bg-transparent border-0 outline-none text-base text-foreground placeholder:text-muted-foreground/60 min-w-0 py-2 min-h-[44px] font-medium";
export const AI_LAB_RUN_BTN =
  "shrink-0 rounded-full bg-accent text-accent-foreground hover:bg-accent/90 font-extrabold text-xs tracking-[0.1em] uppercase px-6 md:px-7 py-2.5 min-h-[44px] flex items-center gap-1.5 disabled:opacity-40 disabled:pointer-events-none transition-all active:scale-95 shadow-sm";

export const AI_LAB_SECTION = "rounded-2xl border border-border bg-card p-5 shadow-sm";
export const AI_LAB_COLLAPSIBLE =
  "rounded-2xl border border-border bg-card px-4 py-3 text-xs text-muted-foreground shadow-sm";
export const AI_LAB_METRIC_CARD =
  "rounded-2xl border border-border bg-card p-5 shadow-sm";
export const AI_LAB_DIVIDER = "h-px bg-border";
export const AI_LAB_COMPARE_ACTIVE = "bg-accent text-accent-foreground";
export const AI_LAB_COMPARE_INACTIVE =
  "border border-input bg-background text-foreground hover:bg-muted";

export const AI_LAB_HERO_HEADLINE = "Investing without guessing.";
export const AI_LAB_HERO_SUBTEXT =
  "Describe your plan in plain English. We'll model returns across Kenya's listed instruments — net of tax, instantly.";
export const AI_LAB_SAFETY_LINE = "Data only. Not personal financial advice.";
export const AI_LAB_INPUT_PLACEHOLDER = "Try: Put 100k in Etica MMF for 2 years";

export const AI_LAB_SAFE_PROMPT_CHIPS = [
  "Put 500k in Etica MMF for 2 years",
  "Invest 1m in Safaricom shares for 5 years",
  "What is the USD/KES rate?",
  "KES 10,000 in SCOM",
  "Split 100k between MMF and SCOM at 11% yield",
  "What can I ask?",
] as const;
