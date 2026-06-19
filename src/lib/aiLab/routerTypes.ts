// Shared router payload types and fallback constants (no imports from router/intent).

export interface UnknownPayload {
  kind: "unknown";
  message: string;
  suggestions: string[];
  disclaimer: string;
}

export const UNKNOWN_FALLBACK_MSG =
  "I could not confidently match that question to a supported scenario yet. Try a calculation, comparison, or explainer prompt.";

export const UNKNOWN_FALLBACK_SUGGESTIONS = [
  "KES 10,000 in SCOM",
  "If I invest KES 100,000 at 11% yield, what happens?",
  "Compare SCOM vs EQTY",
  "Explain liquidity",
  "Gross return vs net return",
];
