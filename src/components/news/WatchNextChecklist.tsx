interface WatchNextChecklistProps {
  items?: string[];
  impactScore?: number;
  impactReason?: string;
}

export function WatchNextChecklist({ items, impactScore, impactReason }: WatchNextChecklistProps) {
  const watchItems = items?.filter(Boolean) || [];
  const hasImpactScore = typeof impactScore === "number" && Number.isFinite(impactScore);

  if (!watchItems.length && !hasImpactScore && !impactReason) {
    return null;
  }

  const boundedScore = hasImpactScore ? Math.min(5, Math.max(0, Math.round(impactScore))) : null;

  return (
    <section className="space-y-4 border-b border-border pb-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-xs font-bold uppercase tracking-[0.14em] text-foreground/90">
          Watch Next
        </h3>
        {boundedScore !== null && (
          <span className="rounded-full bg-emerald-500/10 px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.12em] text-emerald-600 dark:text-emerald-400">
            Impact {boundedScore}/5
          </span>
        )}
      </div>

      {impactReason && (
        <p className="text-[14px] leading-relaxed text-foreground/85">
          {impactReason}
        </p>
      )}

      {watchItems.length > 0 && (
        <ul className="space-y-2">
          {watchItems.map((item, index) => (
            <li key={`watch-next-${index}`} className="flex gap-2 text-[14px] leading-relaxed text-foreground/85">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500" />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
