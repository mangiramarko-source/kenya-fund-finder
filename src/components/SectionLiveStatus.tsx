import { useLiveStatus, type AssetSection } from "@/hooks/useLiveStatus";
import { isKenyanMarketOpen, isGlobalMarketOpen } from "@/lib/utils";

interface SectionLiveStatusProps {
  section: AssetSection;
  fallbackDate?: Date | null;
  hideLive?: boolean;
  hideDate?: boolean;
}

const SectionLiveStatus = ({ section, fallbackDate, hideLive, hideDate }: SectionLiveStatusProps) => {
  const { sections, loading } = useLiveStatus();
  if (loading) return null;

  const isFunds = section === "funds";
  const isStocks = section === "stocks";
  const isGlobal = section === "rates" || section === "commodities";
  
  let marketOpen = false;
  if (!isFunds) {
    marketOpen = isGlobal ? isGlobalMarketOpen() : isKenyanMarketOpen();
  }

  const s = sections[section];
  
  // For funds (monthly), prioritize the manual override timestamp from the DB
  // For global markets (hourly), prioritize the actual data timestamp
  let baseDate: Date | null = null;
  
  if (isFunds) {
    baseDate = s?.last_update_date
      ? new Date(s.last_update_date + "T00:00:00")
      : fallbackDate ? new Date(fallbackDate) : null;
  } else {
    baseDate = fallbackDate 
      ? new Date(fallbackDate)
      : s?.last_update_date
        ? new Date(s.last_update_date + "T00:00:00")
        : null;
  }
    
  const rawDate = baseDate ? new Date(baseDate) : new Date();

  // Live status logic
  const showLiveDot = !hideLive && !isFunds && marketOpen;

  const displayDate = rawDate.toLocaleDateString("en-KE", { month: "short", day: "numeric", year: "numeric" });

  let textStatus = "";
  
  if (isFunds) {
    textStatus = `Updated monthly, last updated ${displayDate}`;
  } else if (!marketOpen) {
    if (isGlobal) {
      textStatus = `Global Markets Closed (Opens Mon-Fri, 24 Hours) • Last updated ${displayDate}`;
    } else {
      textStatus = `NSE Closed (Opens Mon-Fri, 9:00 AM EAT) • Last updated ${displayDate}`;
    }
  } else {
    // Market is open
    textStatus = `Updated ${displayDate}`;
  }

  return (
    <span className="inline-flex items-center gap-2">
      {showLiveDot && (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-[hsl(152,30%,94%)] dark:bg-accent/15 border border-[hsl(152,30%,85%)] dark:border-accent/25 px-3 py-1">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[hsl(152,55%,40%)] dark:bg-accent opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-[hsl(152,55%,40%)] dark:bg-accent" />
          </span>
          <span className="text-xs font-semibold text-[hsl(152,40%,30%)] dark:text-accent uppercase tracking-wide">LIVE</span>
        </span>
      )}
      {!hideDate && displayDate && (
        <span className="text-xs text-muted-foreground/70">
          {textStatus}
        </span>
      )}
    </span>
  );
};

export default SectionLiveStatus;

