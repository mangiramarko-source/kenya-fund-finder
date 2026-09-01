import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";

type WorkspaceTab = "watchlist" | "alerts";

const WatchlistAlertsTabs = ({ active, className, onSelect }: { active: WorkspaceTab; className?: string; onSelect?: (tab: WorkspaceTab) => void }) => (
  <nav aria-label="Watchlist and alerts" className={cn("inline-flex shrink-0 gap-2", className)}>
    {onSelect ? <button
      type="button"
      onClick={() => onSelect("watchlist")}
      aria-current={active === "watchlist" ? "page" : undefined}
      className={cn(
        "inline-flex h-10 items-center justify-center rounded-full border px-3.5 text-[13px] font-bold transition-colors",
        active === "watchlist" ? "border-foreground bg-foreground text-background" : "border-border bg-card text-muted-foreground hover:border-muted-foreground/50 hover:text-foreground",
      )}
    >
      Watchlist
    </button> : <Link to="/watchlist"
      aria-current={active === "watchlist" ? "page" : undefined}
      className={cn("inline-flex h-10 items-center justify-center rounded-full border px-3.5 text-[13px] font-bold transition-colors", active === "watchlist" ? "border-foreground bg-foreground text-background" : "border-border bg-card text-muted-foreground hover:border-muted-foreground/50 hover:text-foreground")}
    >Watchlist</Link>}
    {onSelect ? <button
      type="button"
      onClick={() => onSelect("alerts")}
      aria-current={active === "alerts" ? "page" : undefined}
      className={cn(
        "inline-flex h-10 items-center justify-center rounded-full border px-3.5 text-[13px] font-bold transition-colors",
        active === "alerts" ? "border-foreground bg-foreground text-background" : "border-border bg-card text-muted-foreground hover:border-muted-foreground/50 hover:text-foreground",
      )}
    >
      Alerts
    </button> : <Link to="/alerts"
      aria-current={active === "alerts" ? "page" : undefined}
      className={cn("inline-flex h-10 items-center justify-center rounded-full border px-3.5 text-[13px] font-bold transition-colors", active === "alerts" ? "border-foreground bg-foreground text-background" : "border-border bg-card text-muted-foreground hover:border-muted-foreground/50 hover:text-foreground")}
    >Alerts</Link>}
  </nav>
);

export default WatchlistAlertsTabs;
