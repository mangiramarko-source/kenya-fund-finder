import { Link } from "react-router-dom";
import { Calculator } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { formatYield } from "@/components/YieldChange";

interface StatBarProps {
  isLive: boolean;
  lastUpdate: Date | null;
  fundCount: number;
  bestYield: number;
  avgYield: number;
  loading: boolean;
}

const StatBar = ({ isLive, lastUpdate, fundCount, bestYield, avgYield, loading }: StatBarProps) => {
  const stats = [
    { label: "Funds", value: String(fundCount) },
    { label: "Top Yield", value: bestYield ? formatYield(bestYield, "%") : "—", accent: true },
    { label: "Avg Yield", value: avgYield ? `${avgYield.toFixed(2)}%` : "—" },
  ];

  return (
    <div className="border-b border-border bg-card">
      <div className="container max-w-7xl py-3 sm:py-4">
        {/* Mobile: single compact row */}
        <div className="flex items-center justify-between gap-2 sm:hidden">
          <div className="flex items-center gap-2 min-w-0">
            {isLive && (
              <div className="flex items-center gap-1 shrink-0">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-accent"></span>
                </span>
                <span className="text-[10px] font-semibold text-accent uppercase tracking-wider">Live</span>
              </div>
            )}
            <p className="text-[10px] text-muted-foreground truncate">
              {lastUpdate ? `${lastUpdate.toLocaleDateString("en-KE", { month: "short", day: "numeric" })}` : "CMA-regulated"}
            </p>
          </div>

          {/* Inline stats as a compact row */}
          {loading ? (
            <div className="flex items-center gap-2">
              <Skeleton className="h-6 w-12 rounded" />
              <Skeleton className="h-6 w-16 rounded" />
              <Skeleton className="h-6 w-16 rounded" />
            </div>
          ) : (
            <div className="flex items-center divide-x divide-border">
              {stats.map(({ label, value, accent }) => (
                <div key={label} className="flex items-center gap-1 px-2 first:pl-0 last:pr-0">
                  <span className="text-[9px] text-muted-foreground uppercase tracking-wider font-medium">{label}</span>
                  <span className={`text-xs font-bold tabular-nums whitespace-nowrap ${accent ? "text-accent" : "text-foreground"}`}>{value}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Desktop/tablet: full layout */}
        <div className="hidden sm:flex flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            {isLive && (
              <div className="flex items-center gap-1.5 rounded-full bg-accent/10 border border-accent/20 px-2.5 py-1">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-accent"></span>
                </span>
                <span className="text-[11px] font-semibold text-accent uppercase tracking-wider">Live</span>
              </div>
            )}
            <p className="text-xs text-muted-foreground">
              {lastUpdate ? `Updated ${lastUpdate.toLocaleDateString("en-KE", { month: "short", day: "numeric", year: "numeric" })}` : "CMA-regulated unit trusts"}
            </p>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            {loading ? (
              <>
                <Skeleton className="h-8 w-20 rounded-lg" />
                <Skeleton className="h-8 w-24 rounded-lg" />
                <Skeleton className="h-8 w-24 rounded-lg" />
              </>
            ) : (
              stats.map(({ label, value, accent }) => (
                <div key={label} className="flex items-center gap-2 rounded-lg border border-border bg-muted/50 px-3 py-1.5">
                  <span className="text-[11px] text-muted-foreground uppercase tracking-wider font-medium">{label}</span>
                  <span className={`text-sm font-bold tabular-nums ${accent ? "text-accent" : "text-foreground"}`}>{value}</span>
                </div>
              ))
            )}

            <div className="flex items-center gap-1.5 ml-1">
              <Button asChild variant="outline" size="sm" className="rounded-lg text-xs h-8">
                <Link to="/calculator"><Calculator className="mr-1.5 h-3.5 w-3.5" /> Calculator</Link>
              </Button>
              <Button asChild variant="outline" size="sm" className="rounded-lg text-xs h-8">
                <Link to="/learn">Learn</Link>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StatBar;
