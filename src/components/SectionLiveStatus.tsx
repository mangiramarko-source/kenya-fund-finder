import { useLiveStatus, type AssetSection } from "@/hooks/useLiveStatus";
import { toLastWeekday, isKenyanMarketOpen } from "@/lib/utils";

interface SectionLiveStatusProps {
  section: AssetSection;
  fallbackDate?: Date | null;
  hideLive?: boolean;
  hideDate?: boolean;
}

const SectionLiveStatus = ({ section, fallbackDate, hideLive, hideDate }: SectionLiveStatusProps) => {
  const { sections, loading } = useLiveStatus();
  if (loading) return null;

  // Unit trusts ("funds") should NEVER show live update status
  const isFunds = section === "funds";
  const marketOpen = !isFunds && isKenyanMarketOpen();

  const s = sections[section];
  
  // Date calculation: for overview, stocks, rates, commodities, dynamically update to current market date (rolled to last weekday if weekend)
  let rawDate: Date;
  if (!isFunds) {
    // Current market trading date: today if weekday, or most recent Friday if weekend
    rawDate = toLastWeekday(new Date());
  } else {
    const baseDate = s?.last_update_date
      ? new Date(s.last_update_date + "T00:00:00")
      : fallbackDate ?? null;
    rawDate = baseDate ? new Date(baseDate) : new Date();
  }

  const displayDate = rawDate.toLocaleDateString("en-KE", { month: "short", day: "numeric", year: "numeric" });

  return (
    <span className="inline-flex items-center gap-2">
      {!hideLive && marketOpen && (
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
          {isFunds ? `Updated monthly, last updated ${displayDate}` : `Updated ${displayDate}`}
        </span>
      )}
    </span>
  );
};

export default SectionLiveStatus;

