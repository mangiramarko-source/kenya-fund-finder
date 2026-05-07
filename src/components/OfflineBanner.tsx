import { WifiOff } from "lucide-react";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";

/**
 * Slim banner shown above the main content when the browser reports offline.
 * Styled with semantic tokens to match the dark Bloomberg aesthetic.
 */
const OfflineBanner = () => {
  const online = useOnlineStatus();
  if (online) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="sticky top-0 z-40 w-full border-b border-warning/40 bg-warning/10 backdrop-blur"
    >
      <div className="mx-auto flex max-w-screen-2xl items-center gap-2 px-4 py-2 text-xs md:text-sm">
        <WifiOff className="h-3.5 w-3.5 text-warning" />
        <span className="font-medium text-foreground">You're offline.</span>
        <span className="text-muted-foreground">
          Showing last cached market data — values may be out of date.
        </span>
      </div>
    </div>
  );
};

export default OfflineBanner;
