// Phase 13C/13D + UI polish — AI Lab scoped tokens aligned with site CSS variables.

export const AI_LAB_PAGE =
  "fixed inset-0 flex flex-col min-h-0 overflow-hidden bg-muted/30 h-[var(--ai-lab-vvh,100dvh)] max-h-[var(--ai-lab-vvh,100dvh)] overscroll-none";
export const AI_LAB_PAGE_INNER =
  "flex flex-col flex-1 min-h-0 h-full w-full gap-3 md:gap-4 container pt-[max(0.75rem,env(safe-area-inset-top))] pb-3 md:py-5 max-w-6xl overflow-hidden";

export const AI_LAB_CARD =
  "rounded-2xl border border-border bg-card text-card-foreground shadow-sm";
export const AI_LAB_EMPTY_SHELL =
  "flex h-full min-h-0 flex-col overflow-hidden border-0 shadow-none bg-transparent";
export const AI_LAB_ACTIVE_SHELL =
  "flex h-full min-h-0 flex-col overflow-hidden border-0 shadow-none bg-transparent";
export const AI_LAB_CHAT_SHELL =
  "flex h-full min-h-0 flex-col overflow-hidden";
export const AI_LAB_INPUT_DOCK =
  "relative shrink-0 px-3 md:px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] bg-background border-t border-border/70 shadow-[0_-16px_40px_hsl(var(--background))] z-40 md:border-t-0 md:shadow-none";
export const AI_LAB_DOCK_INNER = "max-w-3xl mx-auto w-full space-y-2";
export const AI_LAB_DOCK_DISCLAIMER =
  "text-[10px] leading-snug text-muted-foreground/90 text-center px-1";
export const AI_LAB_THREAD =
  "flex-1 min-h-0 overflow-y-auto overflow-x-hidden overscroll-contain px-4 md:px-6 pt-4 pb-4 space-y-5 scroll-pb-36 md:scroll-pb-8";
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
  "text-xs px-3 py-1.5 rounded-full border border-border bg-card text-muted-foreground hover:text-foreground hover:bg-muted transition-colors text-left shadow-sm font-medium";
export const AI_LAB_USER_BUBBLE =
  "max-w-[85%] rounded-2xl bg-primary text-primary-foreground px-4 py-2 text-sm shadow-sm";
export const AI_LAB_ASSISTANT_TEXT =
  "text-sm md:text-[15px] text-foreground leading-relaxed whitespace-pre-wrap";

export const AI_LAB_INPUT_WRAP =
  "flex items-center gap-2 rounded-full border border-border bg-background pl-4 pr-1.5 py-1.5 shadow-md shadow-black/5 focus-within:ring-4 focus-within:ring-accent/15 focus-within:border-accent/30 transition-all";
/** @deprecated Use AI_LAB_INPUT_WRAP — kept for imports that still reference AI_LAB_INPUT */
export const AI_LAB_INPUT = AI_LAB_INPUT_WRAP;
export const AI_LAB_INPUT_FIELD =
  "flex-1 bg-transparent border-0 outline-none text-base text-foreground placeholder:text-muted-foreground/60 min-w-0 py-2 min-h-[44px] font-medium";
export const AI_LAB_RUN_BTN =
  "shrink-0 rounded-full bg-accent text-accent-foreground hover:bg-accent/90 font-extrabold text-xs tracking-[0.1em] uppercase px-6 md:px-7 py-2.5 min-h-[44px] flex items-center gap-1.5 disabled:opacity-40 disabled:pointer-events-none transition-all active:scale-95 shadow-sm";

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
  "Not financial advice. Data scenarios only — does not predict returns or recommend products.";
export const AI_LAB_INPUT_PLACEHOLDER = "Try: Put 100k in Etica MMF for 2 years";

export const AI_LAB_SAFE_PROMPT_CHIPS = [
  "Put 500k in Etica MMF for 2 years",
  "Invest 1m in Safaricom shares for 5 years",
  "What is the USD/KES rate?",
  "KES 10,000 in SCOM",
  "Split 100k between MMF and SCOM at 11% yield",
  "What can I ask?",
] as const;
