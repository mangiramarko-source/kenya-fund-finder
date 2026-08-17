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
  /** Mobile-only footer content, used for section status continuity. */
  mobileFooter?: React.ReactNode;
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
  mobileFooter,
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
  const footerLabel =
    alertState === "triggered" ? "Alert triggered"
    : alertState === "active" ? "Alert active"
    : "Saved item";
  const mobileMain = (
    <div className="flex min-w-0 flex-col gap-4">
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <span className="text-[16px] font-semibold leading-tight text-foreground truncate">{title}</span>
          </div>
          <p className="mt-1 truncate text-[13px] leading-tight text-muted-foreground">{sub}</p>
        </div>
        {sparkData && sparkData.length >= 3 && (
          <div className="flex shrink-0 items-center self-center">
            <Sparkline
              data={sparkData}
              width={74}
              height={28}
              color="auto"
              trend={trend}
              className="shrink-0"
            />
          </div>
        )}
        <div className="shrink-0 text-right">
          <p className="text-[16px] font-semibold tabular-nums leading-tight text-foreground">{value}</p>
          <div className="mt-1.5 flex justify-end">{change}</div>
        </div>
      </div>
      <div className="h-px w-full bg-border/80" />
      {mobileFooter ? (
        <div className="min-w-0 text-[11px] text-muted-foreground">{mobileFooter}</div>
      ) : (
        <p className="truncate text-[12px] font-medium text-muted-foreground">{footerLabel}</p>
      )}
    </div>
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
    <div className="group relative overflow-hidden rounded-[28px] border border-border bg-card transition-colors hover:border-accent/30 md:rounded-xl">
      {/* Mobile remove action */}
      <div className="absolute bottom-3 right-3 z-10 flex shrink-0 items-center md:hidden">
        <button
          type="button"
          onClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
            onRemove();
          }}
          className="rounded-full bg-muted/70 p-1.5 text-muted-foreground transition-colors hover:text-destructive"
          title="Remove from watchlist"
          aria-label="Remove from watchlist"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Mobile body */}
      {linkTo ? (
        <Link to={linkTo} className="block px-5 py-4 pr-12 md:hidden">
          {mobileMain}
        </Link>
      ) : (
        <div className="block px-5 py-4 pr-12 md:hidden">{mobileMain}</div>
      )}

      {/* Desktop action buttons (hover) */}
      <div className="hidden md:flex items-center gap-1 absolute top-1/2 -translate-y-1/2 right-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity bg-card/95 backdrop-blur-sm rounded-md px-1 py-0.5">
        {onAlert && (
          <button
            type="button"
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); onAlert(); }}
            className={`${alertClass} transition-colors p-1`}
            title={alertTitle}
            aria-label={alertTitle}
          >
            <AlertIcon className="h-3.5 w-3.5" />
          </button>
        )}
        {onReset && alertState === "triggered" && (
          <button
            type="button"
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); onReset(); }}
            className="text-muted-foreground hover:text-accent transition-colors p-1"
            title="Reset alert baseline"
            aria-label="Reset alert baseline"
          >
            <RotateCcw className="h-3.5 w-3.5" />
          </button>
        )}
        <button
          type="button"
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); onRemove(); }}
          className="text-muted-foreground/60 hover:text-destructive transition-colors p-1"
          title="Remove from watchlist"
          aria-label="Remove from watchlist"
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
