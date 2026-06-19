// Phase 11B — AI Lab scoped visual tokens (does not change global theme).

export const AI_LAB_PAGE = "min-h-screen bg-[#F5EFE2] overflow-x-hidden";
export const AI_LAB_PAGE_INNER = "container py-6 md:py-10 max-w-6xl";

export const AI_LAB_CARD =
  "rounded-3xl border border-[#D8D0C0] bg-[#FFFDF7] shadow-sm";
export const AI_LAB_CARD_INNER = "rounded-2xl border border-[#D8D0C0] bg-[#FFFDF7]";
export const AI_LAB_RAIL_CARD =
  "rounded-2xl border border-[#D8D0C0] bg-[#FFFDF7]/90 p-3 shadow-sm";

export const AI_LAB_LABEL =
  "text-[10px] uppercase tracking-widest font-semibold text-stone-500";
export const AI_LAB_MUTED = "text-sm text-stone-600";
export const AI_LAB_HEADLINE = "text-3xl md:text-4xl lg:text-5xl font-bold text-slate-950 font-heading leading-tight";
export const AI_LAB_METRIC = "font-mono tabular-nums text-slate-950";
export const AI_LAB_METRIC_LG = "font-mono tabular-nums text-2xl md:text-3xl font-bold text-slate-950";
export const AI_LAB_POSITIVE = "text-emerald-600";
export const AI_LAB_NEGATIVE = "text-rose-600";

export const AI_LAB_CHIP =
  "text-[12px] px-3 py-2 rounded-full border border-[#D8D0C0] bg-[#FFFDF7] text-slate-800 hover:bg-[#F5EFE2] transition-colors text-left shadow-sm";
export const AI_LAB_USER_BUBBLE =
  "max-w-[85%] rounded-full bg-slate-900 text-white px-4 py-2 text-sm shadow-sm";
export const AI_LAB_ASSISTANT_CARD =
  "rounded-3xl border border-[#D8D0C0] bg-[#FFFDF7] px-4 py-3 shadow-sm";

export const AI_LAB_INPUT =
  "flex items-center gap-2 rounded-full border border-[#D8D0C0] bg-[#FFFDF7] px-3 py-2 shadow-sm focus-within:ring-2 focus-within:ring-[#EAB308]/40";
export const AI_LAB_INPUT_FIELD =
  "flex-1 bg-transparent border-0 outline-none text-sm md:text-base text-slate-950 placeholder:text-stone-400 min-w-0 py-1.5";
export const AI_LAB_RUN_BTN =
  "shrink-0 rounded-full bg-[#EAB308] hover:bg-[#CA8A04] text-slate-950 font-semibold text-sm px-4 py-2 disabled:opacity-50 disabled:pointer-events-none transition-colors";

export const AI_LAB_HERO_HEADLINE = "Model financial scenarios without guessing.";
export const AI_LAB_HERO_SUBTEXT =
  "Describe a scenario in plain English. KenyaFundFinder models possible outcomes using available data and stated assumptions.";
export const AI_LAB_SAFETY_LINE = "Data only. Not personal financial advice.";
export const AI_LAB_INPUT_PLACEHOLDER =
  "Try: Split KES 100,000 between MMF and Safaricom at 11% yield";

export const AI_LAB_SAFE_PROMPT_CHIPS = [
  "KES 10,000 in SCOM",
  "Model KES 100k in an MMF at 11%",
  "KES 100,000 to USD",
  "Gold rises 5%",
  "Split 100k between MMF and SCOM",
  "Latest news about Safaricom",
  "Explain dividend yield",
] as const;
