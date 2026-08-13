import { useLiveStatus, type AssetSection } from "@/hooks/useLiveStatus";
import { getNairobiMarketDate, isKenyanMarketOpen, isGlobalMarketOpen, formatMarketDate } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";

interface SectionLiveStatusProps {
  section: AssetSection;
  fallbackDate?: Date | null;
  hideLive?: boolean;
  hideDate?: boolean;
  isLoading?: boolean;
  className?: string;
}

const SectionLiveStatus = ({ section, fallbackDate, hideLive, hideDate, isLoading, className }: SectionLiveStatusProps) => {
  const { sections, loading } = useLiveStatus();
  const isFunds = section === "funds";
  if ((isFunds && loading) || isLoading) return <Skeleton className="h-6 w-48 rounded-md" />;

  const isGlobal = section === "rates" || section === "commodities";
  const s = sections[section];

  const rawDate = isFunds
    ? s?.last_update_date
      ? new Date(`${s.last_update_date}T12:00:00+03:00`)
      : fallbackDate
        ? new Date(fallbackDate)
        : null
    : fallbackDate
      ? new Date(fallbackDate)
      : getNairobiMarketDate();

  const marketOpen = isFunds ? s?.is_live === true : isGlobal ? isGlobalMarketOpen() : isKenyanMarketOpen();

  const showLiveDot = !hideLive && marketOpen;
  const displayDate = rawDate ? formatMarketDate(rawDate, "en-KE", { month: "short", day: "numeric", year: "numeric" }) : null;
  const updateText = isFunds
    ? displayDate ? `Updated ${displayDate} · Updated monthly` : "Updated monthly"
    : displayDate ? `Updated ${displayDate}` : "Updated automatically";
  const closedText = isGlobal
    ? "Global Markets Closed (24/5)"
    : section === "stocks"
      ? "Market Closed"
      : "Closed (Mon-Fri, 9 AM-5 PM EAT)";

  return (
    <span className={`inline-flex items-center gap-3 ${className || ""}`}>
      {!hideDate && (
        <span className="text-[12px] font-medium uppercase tracking-wider text-emerald-500 dark:text-emerald-400">
          {updateText}
        </span>
      )}
      {showLiveDot && (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-[hsl(152,30%,94%)] dark:bg-emerald-950/60 border border-[hsl(152,30%,85%)] dark:border-emerald-800/50 px-3 py-1">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[hsl(152,55%,40%)] dark:bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-[hsl(152,55%,40%)] dark:bg-emerald-400" />
          </span>
          <span className="text-xs font-semibold text-[hsl(152,40%,30%)] dark:text-emerald-400 uppercase tracking-wide">LIVE</span>
        </span>
      )}
      {!isFunds && !marketOpen && (
        <span className="text-[12px] font-medium uppercase tracking-wider text-muted-foreground">
          {closedText}
        </span>
      )}
    </span>
  );
};

export default SectionLiveStatus;
