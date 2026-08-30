import { cn } from "@/lib/utils";

interface MarketPageLoaderProps {
  message: string;
  className?: string;
}

const MarketPageLoader = ({ message, className }: MarketPageLoaderProps) => (
  <div
    className={cn("flex flex-col items-center justify-center py-32 space-y-4", className)}
    role="status"
    aria-live="polite"
    aria-busy="true"
  >
    <div
      className="h-8 w-8 rounded-full border-4 border-emerald-500 border-t-transparent animate-spin"
      aria-hidden="true"
    />
    <p className="text-muted-foreground font-semibold">{message}</p>
  </div>
);

export default MarketPageLoader;
