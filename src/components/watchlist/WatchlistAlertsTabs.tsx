import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";

const WatchlistAlertsTabs = ({ active, className }: { active: "watchlist" | "alerts"; className?: string }) => (
  <nav aria-label="Watchlist and alerts" className={cn("inline-flex shrink-0 gap-2", className)}>
    <Link
      to="/watchlist"
      aria-current={active === "watchlist" ? "page" : undefined}
      className={cn(
        "inline-flex h-10 items-center justify-center rounded-full border px-3.5 text-[13px] font-bold transition-colors",
        active === "watchlist" ? "border-foreground bg-foreground text-background" : "border-border bg-card text-muted-foreground hover:border-muted-foreground/50 hover:text-foreground",
      )}
    >
      Watchlist
    </Link>
    <Link
      to="/alerts"
      aria-current={active === "alerts" ? "page" : undefined}
      className={cn(
        "inline-flex h-10 items-center justify-center rounded-full border px-3.5 text-[13px] font-bold transition-colors",
        active === "alerts" ? "border-foreground bg-foreground text-background" : "border-border bg-card text-muted-foreground hover:border-muted-foreground/50 hover:text-foreground",
      )}
    >
      Alerts
    </Link>
  </nav>
);

export default WatchlistAlertsTabs;
