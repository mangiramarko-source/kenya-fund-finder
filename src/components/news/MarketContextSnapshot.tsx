import { Link } from "react-router-dom";
import { ArrowDownRight, ArrowUpRight, ExternalLink } from "lucide-react";
import type { MarketContextSnapshotProps, Tone } from "@/lib/marketContext";
export type { MarketSnapshotAsset, MarketContextSnapshotProps } from "@/lib/marketContext";

const metricTextClass = (tone: Tone = "neutral") => {
  if (tone === "positive") return "text-emerald-500";
  if (tone === "negative") return "text-rose-500";
  return "text-foreground";
};

export function MarketContextSnapshot({ title = "Market context", description, href, metrics }: MarketContextSnapshotProps) {
  const visibleMetrics = metrics.filter((metric) => metric.value && metric.value !== "NaN");

  if (visibleMetrics.length === 0) return null;

  const content = (
    <>
      {visibleMetrics.map((metric) => {
        const isDirectional = metric.tone === "positive" || metric.tone === "negative";
        const DirectionIcon = metric.tone === "negative" ? ArrowDownRight : ArrowUpRight;
        return (
          <div key={metric.label} className="space-y-1">
            <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
              {metric.label}
            </p>
            <p className={`flex items-center gap-1 text-[14px] font-bold tabular-nums ${metricTextClass(metric.tone)}`}>
              {isDirectional && <DirectionIcon className="h-3.5 w-3.5" />}
              {metric.value}
            </p>
          </div>
        );
      })}
    </>
  );

  return (
    <section className="space-y-3 border-b border-border pb-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="text-xs font-bold uppercase tracking-[0.14em] text-foreground/90">
            {title}
          </h3>
          {description && (
            <p className="mt-1 text-[12px] leading-relaxed text-muted-foreground">
              {description}
            </p>
          )}
        </div>
        {href && <ExternalLink className="h-4 w-4 shrink-0 text-muted-foreground" />}
      </div>

      {href ? (
        <Link
          to={href}
          onClick={(event) => event.stopPropagation()}
          className="grid gap-2 rounded-xl border border-border bg-muted/25 p-3 transition-colors hover:bg-muted/40 sm:grid-cols-3"
        >
          {content}
        </Link>
      ) : (
        <div className="grid gap-2 rounded-xl border border-border bg-muted/25 p-3 sm:grid-cols-3">
          {content}
        </div>
      )}
    </section>
  );
}
