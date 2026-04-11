import { forwardRef } from "react";
import { Link } from "react-router-dom";
import { useLiveStatus } from "@/hooks/useLiveStatus";
import { Skeleton } from "@/components/ui/skeleton";

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
      <div className="hidden md:flex px-6 py-3 items-center gap-3">
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
          CMA-regulated unit trusts
        </p>

        {/* Desktop stats */}
        {!hideYields && !loading && (
          <div className="hidden sm:flex items-center gap-4 ml-auto">
            <div className="text-xs text-muted-foreground">
              <span className="font-medium text-foreground">{fundCount}</span> funds
            </div>
            {avgYield > 0 && (
              <div className="text-xs text-muted-foreground">
                Avg: <span className="font-medium text-foreground">{avgYield.toFixed(2)}%</span>
              </div>
            )}
          </div>
        )}

        {/* Mobile: just Live + date */}
      </div>
    </div>
  );
});

StatBar.displayName = "StatBar";

export default StatBar;
