// Brand-safety guard for KenyaFundFinder social posts.
// Strips / flags risky phrases that imply financial advice or guarantees.

export const FORBIDDEN_PHRASES = [
  "best investment",
  "guaranteed returns",
  "guaranteed return",
  "risk-free",
  "risk free",
  "you should invest",
  "you must invest",
  "this fund will make you rich",
  "get rich",
  "put your money here",
  "no risk",
  "100% safe",
  "sure profit",
  "can't lose",
];

export const SAFER_REPLACEMENTS: Record<string, string> = {
  "best investment": "an option to compare",
  "guaranteed returns": "current published yield",
  "guaranteed return": "current published yield",
  "risk-free": "low-risk (always review the fact sheet)",
  "risk free": "low-risk (always review the fact sheet)",
  "you should invest": "you may want to compare options",
  "you must invest": "you may want to compare options",
  "put your money here": "see where your money can grow",
  "no risk": "lower-risk",
  "100% safe": "lower-risk",
  "sure profit": "current published yield",
  "can't lose": "compare and review",
};

export const DISCLAIMER_LONG =
  "Information is for educational purposes only. Confirm details with the fund provider before investing.";
export const DISCLAIMER_SHORT = "Educational only. Confirm with provider.";

export function sanitizeCaption(input: string): { clean: string; flagged: string[] } {
  let out = input;
  const flagged: string[] = [];
  for (const phrase of FORBIDDEN_PHRASES) {
    const re = new RegExp(phrase.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "ig");
    if (re.test(out)) {
      flagged.push(phrase);
      out = out.replace(re, SAFER_REPLACEMENTS[phrase] ?? "");
    }
  }
  return { clean: out.replace(/\s{2,}/g, " ").trim(), flagged };
}

export function appendDisclaimer(caption: string, platform: "instagram" | "facebook" | "x"): string {
  const disc = platform === "x" ? DISCLAIMER_SHORT : DISCLAIMER_LONG;
  if (caption.toLowerCase().includes("educational")) return caption;
  return `${caption}\n\n${disc}`;
}
