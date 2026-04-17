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
    <span className="inline-flex items-center gap-2">
      {!hideLive && s.is_live && (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-[hsl(152,30%,94%)] dark:bg-accent/15 border border-[hsl(152,30%,85%)] dark:border-accent/25 px-3 py-1">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[hsl(152,55%,40%)] dark:bg-accent opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-[hsl(152,55%,40%)] dark:bg-accent" />
          </span>
          <span className="text-xs font-semibold text-[hsl(152,40%,30%)] dark:text-accent uppercase tracking-wide">LIVE</span>
        </span>
      )}
      {!hideDate && displayDate && (
        <span className="text-xs text-muted-foreground/70">Updated {displayDate}</span>
      )}
    </span>
  );
};

export default SectionLiveStatus;
