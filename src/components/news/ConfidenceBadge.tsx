import { ShieldCheck, ShieldAlert, ShieldQuestion } from "lucide-react";
import type { NewsAiAnalysis } from "@/lib/api";

interface ConfidenceBadgeProps {
  analysis?: NewsAiAnalysis | null;
}

const deriveConfidence = (analysis?: NewsAiAnalysis | null) => {
  const confirmedCount = analysis?.confirmed_facts?.filter(Boolean).length || 0;
  const inferredCount = analysis?.inferred_implications?.filter(Boolean).length || 0;
  const notConfirmedCount = analysis?.not_confirmed?.filter(Boolean).length || 0;
  const rawLabel = analysis?.confidence_label?.trim();

  if (rawLabel) return rawLabel;
  if (confirmedCount >= 2 && notConfirmedCount <= 1) return "High confidence";
  if (confirmedCount >= 1) return "Medium confidence";
  if (inferredCount > 0 || notConfirmedCount > 0) return "Needs review";
  return null;
};

export function ConfidenceBadge({ analysis }: ConfidenceBadgeProps) {
  const label = deriveConfidence(analysis);
  if (!label) return null;

  const normalized = label.toLowerCase();
  const isHigh = normalized.includes("high") || normalized.includes("source-grounded");
  const isReview = normalized.includes("review") || normalized.includes("low") || normalized.includes("thin");
  const Icon = isHigh ? ShieldCheck : isReview ? ShieldAlert : ShieldQuestion;
  const confirmedCount = analysis?.confirmed_facts?.filter(Boolean).length || 0;
  const notConfirmedCount = analysis?.not_confirmed?.filter(Boolean).length || 0;
  const toneClass = isHigh
    ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-500"
    : isReview
      ? "border-amber-400/35 bg-amber-400/10 text-amber-500"
      : "border-cyan-400/30 bg-cyan-400/10 text-cyan-500";

  return (
    <section className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-4">
      <div className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.12em] ${toneClass}`}>
        <Icon className="h-3.5 w-3.5" />
        {label}
      </div>
      <p className="text-[12px] leading-relaxed text-muted-foreground">
        {confirmedCount} source fact{confirmedCount === 1 ? "" : "s"} checked
        {notConfirmedCount > 0 ? ` · ${notConfirmedCount} unproven impact${notConfirmedCount === 1 ? "" : "s"} flagged` : ""}
      </p>
    </section>
  );
}
