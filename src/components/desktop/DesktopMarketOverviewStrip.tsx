import type { ReactNode } from "react";

export interface DesktopMarketMetric {
  label: string;
  value: string;
  change?: number | null;
}

export interface DesktopWatchItem {
  id: string;
  symbol: string;
  name: string;
  value: string;
  change?: number | null;
}

interface DesktopMarketOverviewStripProps {
  title: string;
  status: ReactNode;
  metrics: DesktopMarketMetric[];
  watchlist: DesktopWatchItem[];
  watchlistLabel?: string;
  demo?: boolean;
  footer?: string;
  onWatchItemClick?: (item: DesktopWatchItem) => void;
}

const changeClass = (change: number) => change > 0 ? "text-emerald-500" : change < 0 ? "text-destructive" : "text-muted-foreground";

export default function DesktopMarketOverviewStrip({
  title,
  status,
  metrics,
  watchlist,
  watchlistLabel = "Watchlist",
  demo = false,
  footer,
  onWatchItemClick,
}: DesktopMarketOverviewStripProps) {
  return (
    <section className="hidden md:block rounded-[24px] border border-border bg-card p-6 shadow-sm">
      <div className="grid grid-cols-[1.05fr_1fr] gap-8">
        <div>
          <div className="mb-5 flex items-center justify-between gap-4">
            <h2 className="text-base font-bold">{title}</h2>
            {status}
          </div>
          <div className="grid grid-cols-2 gap-x-7 gap-y-5 xl:grid-cols-4">
            {metrics.map((metric) => (
              <div key={metric.label} className="min-w-0">
                <p className="truncate text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">{metric.label}</p>
                <p className="mt-1 truncate text-lg font-black tabular-nums">{metric.value}</p>
                {metric.change != null && (
                  <p className={`mt-1 text-xs font-bold tabular-nums ${changeClass(metric.change)}`}>
                    {metric.change > 0 ? "+" : ""}{metric.change.toFixed(2)}%
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>

        <div>
          <div className="mb-4 flex items-center gap-2">
            <h2 className="text-base font-bold">{watchlistLabel}</h2>
            {demo && <span className="rounded-full border border-border px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-muted-foreground">Demo</span>}
          </div>
          {watchlist.length > 0 ? (
            <div className="grid grid-cols-2 gap-2.5">
              {watchlist.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onWatchItemClick?.(item)}
                  className="rounded-2xl border border-border bg-background/35 px-4 py-3 text-left transition-colors hover:bg-muted/30"
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className="truncate text-xs font-black">{item.symbol}</span>
                    <span className="shrink-0 text-xs font-black tabular-nums">{item.value}</span>
                  </div>
                  <div className="mt-1 flex items-center justify-between gap-3">
                    <span className="truncate text-[11px] text-muted-foreground">{item.name}</span>
                    {item.change != null && <span className={`shrink-0 text-[10px] font-bold tabular-nums ${changeClass(item.change)}`}>{item.change > 0 ? "+" : ""}{item.change.toFixed(2)}%</span>}
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <div className="flex h-[106px] items-center justify-center rounded-2xl border border-dashed border-border text-xs text-muted-foreground">Save items to build your watchlist.</div>
          )}
        </div>
      </div>
      {footer && <p className="mt-5 border-t border-border pt-4 text-[10px] text-muted-foreground">{footer}</p>}
    </section>
  );
}
