import { forwardRef } from "react";
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
  hideYields?: boolean;
}

const StatBar = forwardRef<HTMLDivElement, StatBarProps>(({ isLive, lastUpdate, fundCount, bestYield, avgYield, loading, hideYields }, ref) => {
  const stats = hideYields
    ? [{ label: "Items", value: String(fundCount) }]
    : [
        { label: "Funds", value: String(fundCount) },
        { label: "Top Yield", value: bestYield ? formatYield(bestYield, "%") : "—", accent: true },
        { label: "Avg Yield", value: avgYield ? `${avgYield.toFixed(2)}%` : "—" },
      ];

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
        <div className="hidden sm:flex items-center justify-between gap-4 py-4">
          <div className="flex items-center gap-3">
            {isLive && (
              <div className="flex items-center gap-1.5 rounded-full bg-accent/10 border border-accent/20 px-2.5 py-1">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-accent" />
                </span>
                <span className="text-[11px] font-semibold text-accent uppercase tracking-wider">Live</span>
              </div>
            )}
            <p className="text-xs text-muted-foreground">
              {lastUpdate
                ? `Updated ${lastUpdate.toLocaleDateString("en-KE", { month: "short", day: "numeric", year: "numeric" })}`
                : "CMA-regulated unit trusts"}
            </p>
          </div>

          <div className="flex items-center gap-1.5 ml-1">
              <Button asChild variant="outline" size="sm" className="rounded-lg text-xs h-8">
                <Link to="/calculator">
                  <Calculator className="mr-1.5 h-3.5 w-3.5" /> Calculator
                </Link>
              </Button>
              <Button asChild variant="outline" size="sm" className="rounded-lg text-xs h-8">
                <Link to="/learn">Learn</Link>
              </Button>
            </div>
        </div>
      </div>
    </div>
  );
});

StatBar.displayName = "StatBar";

export default StatBar;
