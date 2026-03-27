import { useLiveStatus, type AssetSection } from "@/hooks/useLiveStatus";

interface SectionLiveStatusProps {
  section: AssetSection;
  fallbackDate?: Date | null;
}

const SectionLiveStatus = ({ section, fallbackDate }: SectionLiveStatusProps) => {
  const { sections, loading } = useLiveStatus();
  if (loading) return null;

  const s = sections[section];
  const displayDate = s.last_update_date
    ? new Date(s.last_update_date + "T00:00:00").toLocaleDateString("en-KE", { month: "short", day: "numeric", year: "numeric" })
    : fallbackDate
      ? fallbackDate.toLocaleDateString("en-KE", { month: "short", day: "numeric", year: "numeric" })
      : null;

  return (
    <span className="inline-flex items-center gap-2 ml-2">
      {s.is_live && (
        <span className="inline-flex items-center gap-1 rounded-full bg-accent/10 border border-accent/20 px-2 py-0.5">
          <span className="relative flex h-1.5 w-1.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent opacity-75" />
            <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-accent" />
          </span>
          <span className="text-[10px] font-semibold text-accent uppercase tracking-wider">Live</span>
        </span>
      )}
      {displayDate && (
        <span className="text-xs text-muted-foreground/70">Updated {displayDate}</span>
      )}
    </span>
  );
};

export default SectionLiveStatus;
