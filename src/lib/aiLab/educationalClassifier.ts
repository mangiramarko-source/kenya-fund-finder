// Classifies a prompt as an educational / explainer question that a
// deterministic scenario would not answer well. Used ONLY to decide whether
// to invoke the Gemini educational helper. Deterministic scenario, refusal,
// comparison, portfolio-split, news, and website-lookup prompts are handled
// upstream and never reach this classifier.

import { parseCompareSides } from "./nameMatch";

const EDUCATIONAL_PATTERNS: RegExp[] = [
  /\bwhat\s+(is|are|does|do)\b/i,
  /\bwhat'?s\b/i,
  /\bexplain\b/i,
  /\bdefine\b/i,
  /\bdefinition of\b/i,
  /\bmeaning of\b/i,
  /\bhow\s+(does|do|is|are)\b.*\bwork\b/i,
  /\bdifference between\b/i,
  /\bvs\.?\b(?!\s*\d)/i,
  /\bwhy (does|do|is|are)\b/i,
  /\bhow does compounding\b/i,
  /\btell me about\b/i,
];

// Signals that the prompt is a scenario / numeric / lookup question that a
// deterministic handler should own. Belt-and-braces guard even though the
// router already routed non-scenarios to unknown before we get called.
const SCENARIO_BLOCKERS: RegExp[] = [
  /\bkes\b|\bksh\b|\bshilling/i,
  /\d+\s*%/,
  /\bhow much\b/i,
  /\bcompare\b/i,
  /\bnews\b|\bheadline\b|\blatest\b/i,
  /\bshould i\b/i,
  /\bwhich (is|one) (is )?(better|best|safer|higher)\b/i,
  /\brecommend/i,
];

export function classifyEducational(prompt: string): boolean {
  if (!prompt || prompt.trim().length < 3) return false;
  if (SCENARIO_BLOCKERS.some((re) => re.test(prompt))) return false;
  // Any prompt that looks like an asset comparison ("X vs Y",
  // "difference between X and Y", "how does X compare to Y") belongs to the
  // deterministic compare route — never rewrite it via Gemini.
  if (parseCompareSides(prompt)) return false;
  return EDUCATIONAL_PATTERNS.some((re) => re.test(prompt));
}

