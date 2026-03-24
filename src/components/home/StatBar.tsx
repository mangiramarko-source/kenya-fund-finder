import { forwardRef } from "react";
import { Link } from "react-router-dom";
import { Calculator, BookOpen, Activity } from "lucide-react";
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
  hideYields?: boolean;
}

const StatBar = forwardRef<HTMLDivElement, StatBarProps>(({ isLive, lastUpdate, fundCount, bestYield, avgYield, loading, hideYields }, ref) => {
  return (
    <div ref={ref} className="border-b border-border bg-card">
      <div className="container">

        {/* ── Mobile: just Live + date ── */}
        <div className="sm:hidden py-2.5 flex items-center gap-2">
          {isLive && (
            <div className="flex items-center gap-1.5 rounded-full bg-accent/10 border border-accent/20 px-2 py-0.5">
              <span className="relative flex h-1.5 w-1.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent opacity-75" />
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-accent" />
              </span>
              <span className="text-[10px] font-semibold text-accent uppercase tracking-wider">Live</span>
            </div>
          )}
          <p className="text-[11px] text-muted-foreground">
            {lastUpdate
              ? `Updated ${lastUpdate.toLocaleDateString("en-KE", { month: "short", day: "numeric", year: "numeric" })}`
              : "CMA-regulated unit trusts"}
          </p>
        </div>

        {/* ── Desktop / Tablet ── */}
        <div className="hidden sm:flex items-center justify-between gap-4 py-3">
          <div className="flex items-center gap-4">
            {/* Live indicator */}
            {isLive && (
              <div className="flex items-center gap-1.5">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-accent" />
                </span>
                <span className="text-[10px] font-bold text-accent uppercase tracking-widest">Live</span>
              </div>
            )}

            {/* Divider */}
            {isLive && <div className="h-4 w-px bg-border" />}

            {/* Date */}
            <p className="text-[11px] text-muted-foreground">
              {lastUpdate
                ? `Updated ${lastUpdate.toLocaleDateString("en-KE", { weekday: "short", month: "short", day: "numeric", year: "numeric" })}`
                : "CMA-regulated unit trusts"}
            </p>

            {/* Quick stats */}
            {!hideYields && !loading && (
              <>
                <div className="h-4 w-px bg-border" />
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1.5">
                    <Activity className="h-3 w-3 text-accent" />
                    <span className="text-[11px] text-muted-foreground">Top:</span>
                    <span className="text-[11px] font-bold text-accent tabular-nums">{bestYield ? formatYield(bestYield, "%") : "—"}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[11px] text-muted-foreground">Avg:</span>
                    <span className="text-[11px] font-semibold text-foreground tabular-nums">{avgYield ? `${avgYield.toFixed(2)}%` : "—"}</span>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-1.5">
            <Button asChild variant="ghost" size="sm" className="rounded-lg text-[11px] h-7 px-3 text-muted-foreground hover:text-foreground">
              <Link to="/calculator">
                <Calculator className="mr-1 h-3 w-3" /> Calculator
              </Link>
            </Button>
            <Button asChild variant="ghost" size="sm" className="rounded-lg text-[11px] h-7 px-3 text-muted-foreground hover:text-foreground">
              <Link to="/learn">
                <BookOpen className="mr-1 h-3 w-3" /> Learn
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
});

StatBar.displayName = "StatBar";

export default StatBar;
