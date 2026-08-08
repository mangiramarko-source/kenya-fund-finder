// Phase 13C/13D + UI polish — AI Lab scoped tokens aligned with site CSS variables.

export const AI_LAB_PAGE =
  "fixed inset-0 flex flex-col min-h-0 overflow-hidden bg-background h-[var(--ai-lab-vvh,100dvh)] max-h-[var(--ai-lab-vvh,100dvh)] overscroll-none";
export const AI_LAB_PAGE_INNER =
  "flex flex-col flex-1 min-h-0 h-full w-full gap-2 md:gap-4 container pt-2 md:pt-20 pb-0 max-w-3xl overflow-hidden px-3 md:px-4";

export const AI_LAB_CARD =
  "rounded-2xl border border-border bg-card text-card-foreground shadow-sm";
export const AI_LAB_EMPTY_SHELL =
  "flex h-full min-h-0 flex-col overflow-hidden border-0 shadow-none bg-transparent";
export const AI_LAB_ACTIVE_SHELL =
  "flex h-full min-h-0 flex-col overflow-hidden border-0 shadow-none bg-transparent";
// Flattened: chat is one section on the page background — no nested card.
export const AI_LAB_CHAT_SHELL =
  "flex h-full min-h-0 flex-col overflow-hidden bg-transparent";
// Dock blends with the page; only a subtle hairline separates it from the thread.
export const AI_LAB_INPUT_DOCK =
  "relative shrink-0 px-0 pt-2 pb-[max(0.75rem,env(safe-area-inset-bottom))] bg-background border-t border-border/40 z-40";
export const AI_LAB_DOCK_INNER = "max-w-3xl mx-auto w-full space-y-2";
export const AI_LAB_DOCK_DISCLAIMER =
  "text-[11px] leading-snug text-muted-foreground text-center px-1 font-medium";
export const AI_LAB_THREAD =
  "flex-1 min-h-0 overflow-y-auto overflow-x-hidden overscroll-contain px-0 md:px-2 pt-2 pb-6 space-y-5 scroll-pb-8";
export const AI_LAB_CARD_INNER =
  "rounded-2xl border border-border bg-muted/30";
export const AI_LAB_RAIL_CARD =
  "rounded-2xl border border-border bg-card p-3 shadow-sm";

export const AI_LAB_LABEL =
  "text-[11px] uppercase tracking-[0.1em] font-bold text-foreground";
export const AI_LAB_MUTED = "text-sm text-muted-foreground text-center max-w-xl mx-auto";
export const AI_LAB_HEADLINE =
  "text-3xl md:text-4xl lg:text-5xl font-extrabold tracking-tight font-heading text-foreground leading-[1.05]";
export const AI_LAB_HERO_SUBTEXT_CLASS =
  "text-sm md:text-[15px] text-muted-foreground max-w-lg leading-relaxed font-medium";
export const AI_LAB_METRIC = "tabular-nums text-foreground";
export const AI_LAB_METRIC_LG =
  "tabular-nums text-xl md:text-2xl font-bold text-foreground";
export const AI_LAB_POSITIVE = "text-success";
export const AI_LAB_NEGATIVE = "text-destructive";

export const AI_LAB_CHIP =
  "text-xs px-3.5 py-1.5 rounded-full border border-border/80 bg-card text-foreground/80 hover:text-foreground hover:bg-muted transition-colors text-left shadow-sm font-medium shrink-0";
export const AI_LAB_USER_BUBBLE =
  "max-w-[85%] rounded-2xl bg-muted/70 text-foreground md:bg-primary md:text-primary-foreground px-4 py-3 md:py-2 text-sm shadow-none md:shadow-sm font-normal";
export const AI_LAB_ASSISTANT_TEXT =
  "text-sm md:text-[15px] text-foreground leading-relaxed whitespace-pre-wrap";

export const AI_LAB_INPUT_WRAP =
  "flex items-center gap-2 rounded-full border border-border/80 bg-card md:bg-muted/50 p-1 md:pl-4 md:pr-1.5 md:py-1.5 shadow-md md:shadow-sm focus-within:ring-2 focus-within:ring-emerald-500/20 focus-within:border-emerald-500/40 transition-all";
/** @deprecated Use AI_LAB_INPUT_WRAP — kept for imports that still reference AI_LAB_INPUT */
export const AI_LAB_INPUT = AI_LAB_INPUT_WRAP;
export const AI_LAB_INPUT_FIELD =
  "flex-1 bg-transparent border-0 outline-none text-sm md:text-base text-foreground placeholder:text-muted-foreground min-w-0 py-2 min-h-[40px] md:min-h-[44px] font-medium px-2 md:px-0";
export const AI_LAB_RUN_BTN =
  "shrink-0 rounded-full bg-emerald-600 text-white md:bg-accent md:text-accent-foreground hover:bg-emerald-700 md:hover:bg-accent/90 font-extrabold text-xs tracking-[0.1em] uppercase h-9 w-9 p-0 md:px-7 md:py-2.5 min-h-[36px] md:min-h-[44px] flex items-center justify-center gap-1.5 disabled:opacity-40 disabled:pointer-events-none transition-all active:scale-95 shadow-sm";

export const AI_LAB_RESULT_SHELL =
  "rounded-2xl border border-border/80 bg-card/80 p-3 md:p-4 space-y-3";
export const AI_LAB_SECTION =
  "rounded-2xl border border-border bg-card p-4 md:p-5 shadow-sm";
export const AI_LAB_COLLAPSIBLE =
  "rounded-2xl border border-border bg-card px-4 py-3 text-xs text-muted-foreground shadow-sm";
export const AI_LAB_METRIC_CARD =
  "rounded-2xl border border-border bg-card p-4 md:p-5 shadow-sm";
export const AI_LAB_DIVIDER = "h-px bg-border";
export const AI_LAB_COMPARE_ACTIVE = "bg-accent text-accent-foreground";
export const AI_LAB_COMPARE_INACTIVE =
  "border border-input bg-background text-foreground hover:bg-muted";
export const AI_LAB_HERO_HEADLINE = "Investing without guessing.";
export const AI_LAB_HERO_SUBTEXT =
  "Describe your plan in plain English. We'll model returns across Kenya's listed instruments — net of tax, instantly.";
export const AI_LAB_SAFETY_LINE = "Data only. Not personal financial advice.";
/** Pinned below the bottom input — short, always visible during chat. */
export const AI_LAB_DOCK_DISCLAIMER_TEXT =
  "Scenarios only — not financial advice.";
export const AI_LAB_INPUT_PLACEHOLDER = "Put 100k in an MMF for 12 months";

export const AI_LAB_SAFE_PROMPT_CHIPS = [
  "Put 100k in an MMF for 12 months",
  "What if yield drops from 11% to 9%?",
  "Put 500k in Etica MMF for 2 years",
  "Invest 1m in Safaricom shares for 5 years",
  "What is the USD/KES rate?",
  "Split 100k between MMF and SCOM at 11% yield",
] as const;
