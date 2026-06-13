import { Link } from "react-router-dom";
import { BellPlus, BellRing, RotateCcw, X } from "lucide-react";
import Sparkline from "@/components/Sparkline";

export type AlertState = "none" | "active" | "triggered";

export interface WatchCardProps {
  title: string;
  sub: string;
  value: string;
  change: React.ReactNode;
  /** Mobile-only optional richer chart (kept for backward compatibility with OverviewPage). */
  chart?: React.ReactNode;
  sparkData?: number[];
  trend?: "up" | "down" | "flat";
  onAlert?: () => void;
  /** When alert exists and has triggered, surface a reset baseline action. */
  onReset?: () => void;
  alertState?: AlertState;
  onRemove: () => void;
  linkTo?: string;
}

/**
 * Shared Watchlist card. Mobile is a compact row; Desktop mirrors the
 * Market Overview HighlightListCard layout (title/sub + sparkline + value/change).
 */
const WatchCard = ({
  title,
  sub,
  value,
  change,
  sparkData,
  trend,
  onAlert,
  onReset,
  alertState = "none",
  onRemove,
  linkTo,
}: WatchCardProps) => {
  const AlertIcon = alertState === "triggered" ? BellRing : BellPlus;
  const alertTitle =
    alertState === "triggered" ? "Alert triggered"
    : alertState === "active" ? "Alert active"
    : "Create alert";
  const alertClass =
    alertState === "triggered" ? "text-warning hover:text-warning"
    : alertState === "active" ? "text-accent hover:text-accent"
    : "text-muted-foreground hover:text-accent";
  const mobileMain = (
    <>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <span className="text-xs font-bold text-foreground">{title}</span>
        </div>
        <p className="text-[10px] text-muted-foreground truncate">{sub}</p>
      </div>
      {sparkData && sparkData.length >= 3 && (
        <Sparkline
          data={sparkData}
          width={48}
          height={18}
          color="auto"
          trend={trend}
          className="shrink-0"
        />
      )}
      <div className="text-right shrink-0">
        <p className="text-sm font-bold tabular-nums text-foreground">{value}</p>
        <div className="mt-0.5">{change}</div>
      </div>
    </>
  );

  const desktopMain = (
    <div className="flex items-center gap-3 p-3.5">
      <div className="flex-1 min-w-0">
        <span className="font-bold text-foreground text-sm truncate block">{title}</span>
        <p className="text-[11px] text-muted-foreground truncate">{sub}</p>
      </div>
      {sparkData && sparkData.length >= 2 && (
        <div className="shrink-0">
          <Sparkline data={sparkData} width={60} height={24} color="auto" trend={trend} strokeWidth={2} />
        </div>
      )}
      <div className="text-right shrink-0">
        <p className="font-bold text-foreground text-sm tabular-nums">{value}</p>
        <div className="mt-0.5">{change}</div>
      </div>
    </div>
  );

  return (
    <div className="rounded-lg md:rounded-xl border border-border bg-card hover:border-accent/30 transition-colors group relative overflow-hidden">
      {/* Mobile action buttons */}
      <div className="flex items-center gap-1 shrink-0 absolute top-2 right-2 z-10 md:hidden">
        {onAlert && (
          <button
            type="button"
            onClick={onAlert}
            className={`${alertClass} transition-colors p-0.5`}
            title={alertTitle}
            aria-label={alertTitle}
          >
            <AlertIcon className="h-3 w-3" />
          </button>
        )}
        {onReset && alertState === "triggered" && (
          <button
            type="button"
            onClick={onReset}
            className="text-muted-foreground hover:text-accent transition-colors p-0.5"
            title="Reset alert baseline"
            aria-label="Reset alert baseline"
          >
            <RotateCcw className="h-3 w-3" />
          </button>
        )}
        <button
          type="button"
          onClick={onRemove}
          className="text-muted-foreground/40 hover:text-destructive transition-colors p-0.5"
          title="Remove from watchlist"
          aria-label="Remove from watchlist"
        >
          <X className="h-2.5 w-2.5" />
        </button>
      </div>

      {/* Mobile body */}
      {linkTo ? (
        <Link to={linkTo} className="flex items-center gap-3 px-3 py-2 md:hidden pr-14">
          {mobileMain}
        </Link>
      ) : (
        <div className="flex items-center gap-3 px-3 py-2 md:hidden pr-14">{mobileMain}</div>
      )}

      {/* Desktop action buttons (hover) */}
      <div className="hidden md:flex items-center gap-1 absolute top-1/2 -translate-y-1/2 right-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity bg-card/95 backdrop-blur-sm rounded-md px-1 py-0.5">
        {onAlert && (
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onAlert();
            }}
            className="text-muted-foreground hover:text-accent transition-colors p-1"
            title="Set alert"
          >
            <BellPlus className="h-3.5 w-3.5" />
          </button>
        )}
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onRemove();
          }}
          className="text-muted-foreground/60 hover:text-destructive transition-colors p-1"
          title="Remove from watchlist"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Desktop body — matches HighlightListCard layout */}
      {linkTo ? (
        <Link to={linkTo} className="hidden md:block">
          {desktopMain}
        </Link>
      ) : (
        <div className="hidden md:block">{desktopMain}</div>
      )}
    </div>
  );
};

export default WatchCard;
