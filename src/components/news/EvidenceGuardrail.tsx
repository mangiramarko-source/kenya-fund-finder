interface EvidenceGuardrailProps {
  confirmed?: string[];
  inferred?: string[];
  notConfirmed?: string[];
}

const EvidenceSection = ({
  title,
  eyebrow,
  description,
  items,
  tone,
}: {
  title: string;
  eyebrow: string;
  description: string;
  items: string[];
  tone: "confirmed" | "inferred" | "missing";
}) => {
  const accentClass =
    tone === "confirmed"
      ? "text-emerald-500"
      : tone === "inferred"
        ? "text-amber-500"
        : "text-muted-foreground";

  const bulletClass =
    tone === "confirmed"
      ? "bg-emerald-500"
      : tone === "inferred"
        ? "bg-amber-400"
        : "bg-muted-foreground";

  return (
    <div className="space-y-3 border-t border-border pt-4 first:border-t-0 first:pt-0">
      <div className="space-y-1">
        <span className={`text-[10px] font-bold uppercase tracking-[0.16em] ${accentClass}`}>
          {eyebrow}
        </span>
        <h4 className="text-[15px] font-semibold text-foreground">
          {title}
        </h4>
        <p className="text-[13px] leading-relaxed text-muted-foreground">
          {description}
        </p>
      </div>
      <ul className="space-y-2.5">
        {items.map((item, index) => (
          <li key={`${title}-${index}`} className="flex gap-2.5 text-[14px] leading-relaxed text-foreground/90">
            <span className={`mt-2 h-1.5 w-1.5 shrink-0 rounded-full ${bulletClass}`} />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
};

export function EvidenceGuardrail({ confirmed, inferred, notConfirmed }: EvidenceGuardrailProps) {
  const confirmedItems = confirmed?.filter(Boolean) || [];
  const inferredItems = inferred?.filter(Boolean) || [];
  const notConfirmedItems = notConfirmed?.filter(Boolean) || [];

  if (!confirmedItems.length && !inferredItems.length && !notConfirmedItems.length) {
    return null;
  }

  return (
    <section className="space-y-4 border-b border-border pb-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-xs font-bold uppercase tracking-[0.14em] text-foreground/90">
          Facts vs Interpretation
        </h3>
        <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
          No invented impact
        </span>
      </div>
      <div className="space-y-4">
        {confirmedItems.length > 0 && (
          <EvidenceSection
            eyebrow="Confirmed"
            title="What the article actually says"
            description="These are the source-backed facts the summary is allowed to use."
            items={confirmedItems}
            tone="confirmed"
          />
        )}
        {inferredItems.length > 0 && (
          <EvidenceSection
            eyebrow="Possible meaning"
            title="How it could relate to markets"
            description="These are cautious implications based on the article and linked market data."
            items={inferredItems}
            tone="inferred"
          />
        )}
        {notConfirmedItems.length > 0 && (
          <EvidenceSection
            eyebrow="Not proven"
            title="What the story does not confirm"
            description="These guardrails stop the summary from treating assumptions as facts."
            items={notConfirmedItems}
            tone="missing"
          />
        )}
      </div>
    </section>
  );
}
