import { useLiveStatus, type AssetSection } from "@/hooks/useLiveStatus";
import { isKenyanMarketOpen, isGlobalMarketOpen, toLastWeekday, formatMarketDate } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";

interface SectionLiveStatusProps {
  section: AssetSection;
  fallbackDate?: Date | null;
  hideLive?: boolean;
  hideDate?: boolean;
  isLoading?: boolean;
}

const SectionLiveStatus = ({ section, fallbackDate, hideLive, hideDate, isLoading }: SectionLiveStatusProps) => {
  const { sections, loading } = useLiveStatus();
  if (loading || isLoading) return <Skeleton className="h-6 w-48 rounded-md" />;

  const isFunds = section === "funds";
  const s = sections[section];

  // Base date for the data
  const baseDate = fallbackDate 
    ? new Date(fallbackDate)
    : s?.last_update_date
      ? new Date(s.last_update_date + "T00:00:00")
      : null;
      
  const rawDate = baseDate ? new Date(baseDate) : null;
  
  // All other assets (Stocks, FX, Commodities) follow Kenyan Market Hours
  const marketOpen = isKenyanMarketOpen();

  // Live status logic
  const showLiveDot = !hideLive && marketOpen;
  const displayDate = rawDate ? formatMarketDate(rawDate, "en-KE", { month: "short", day: "numeric", year: "numeric" }) : null;

  let textStatus = "";
  if (!marketOpen) {
    textStatus = displayDate ? `Markets Closed (Opens Mon-Fri) • Updated ${displayDate}` : `Markets Closed (Opens Mon-Fri)`;
  } else {
    textStatus = displayDate ? `Updated ${displayDate}` : `Markets Open`;
  }

  return (
    <span className="inline-flex items-center gap-3">
      {!hideDate && displayDate && (
        <span className="text-[12px] font-medium text-muted-foreground uppercase tracking-wider">
          {textStatus}
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
    </span>
  );
};

export default SectionLiveStatus;

