import { useLiveStatus, type AssetSection } from "@/hooks/useLiveStatus";

interface SectionLiveStatusProps {
  section: AssetSection;
  fallbackDate?: Date | null;
  hideLive?: boolean;
  hideDate?: boolean;
}

const SectionLiveStatus = ({ section, fallbackDate, hideLive, hideDate }: SectionLiveStatusProps) => {
  const { sections, loading } = useLiveStatus();
  if (loading) return null;

  const s = sections[section];
  if (!s) return null;
  const displayDate = s.last_update_date
    ? new Date(s.last_update_date + "T00:00:00").toLocaleDateString("en-KE", { month: "short", day: "numeric", year: "numeric" })
    : fallbackDate
      ? fallbackDate.toLocaleDateString("en-KE", { month: "short", day: "numeric", year: "numeric" })
      : null;

  return (
    <span className="inline-flex items-center gap-2 md:gap-3">
      {!hideLive && s.is_live && (
        <span className="inline-flex items-center gap-1.5 md:gap-2 rounded-full bg-[hsl(152,30%,94%)] dark:bg-accent/15 border border-[hsl(152,30%,85%)] dark:border-accent/25 px-3 py-1 md:px-4 md:py-1.5">
          <span className="relative flex h-2 w-2 md:h-2.5 md:w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[hsl(152,55%,40%)] dark:bg-accent opacity-75 md:hidden" />
            <span className="relative inline-flex rounded-full h-2 w-2 md:h-2.5 md:w-2.5 bg-[hsl(152,55%,40%)] dark:bg-accent" />
          </span>
          <span className="text-xs md:text-sm font-semibold text-[hsl(152,40%,30%)] dark:text-accent uppercase tracking-wide">LIVE</span>
        </span>
      )}
      {!hideDate && displayDate && (
        <span className="text-xs md:text-sm text-muted-foreground/70">Updated {displayDate}</span>
      )}
    </span>
  );
};

export default SectionLiveStatus;
