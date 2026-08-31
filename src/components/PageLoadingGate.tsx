import { type ReactNode, useRef } from "react";
import { cn } from "@/lib/utils";
import { useMinimumLoadingDuration } from "@/hooks/useMinimumLoadingDuration";
import MarketPageLoader from "@/components/MarketPageLoader";

interface PageLoadingGateProps {
  /** Becomes true only after every resource needed by the initially visible page has settled. */
  isReady: boolean;
  message: string;
  children: ReactNode;
  /** Reset the initial-loading cycle when a route parameter changes. */
  resetKey?: string | number | null;
  minimumDuration?: number;
  loaderClassName?: string;
  contentClassName?: string;
}

/**
 * Keeps incomplete route content out of view until its initial data is ready,
 * then reveals it once with the standard market-page fade-in.
 */
const PageLoadingGate = ({
  isReady,
  message,
  children,
  resetKey,
  minimumDuration = 1500,
  loaderClassName,
  contentClassName,
}: PageLoadingGateProps) => {
  const previousResetKey = useRef(resetKey);
  const routeChanged = previousResetKey.current !== resetKey;
  previousResetKey.current = resetKey;
  const showLoading = useMinimumLoadingDuration(!isReady || routeChanged, minimumDuration);

  if (showLoading) {
    return <MarketPageLoader message={message} className={loaderClassName} />;
  }

  return <div className={cn("animate-in fade-in-50 duration-500", contentClassName)}>{children}</div>;
};

export default PageLoadingGate;
