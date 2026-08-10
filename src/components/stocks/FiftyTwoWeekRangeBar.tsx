import React from "react";

interface FiftyTwoWeekRangeBarProps {
  currentPrice: number;
  yearLow: number | null;
  yearHigh: number | null;
  className?: string;
  showLabels?: boolean;
}

export const FiftyTwoWeekRangeBar: React.FC<FiftyTwoWeekRangeBarProps> = ({
  currentPrice,
  yearLow,
  yearHigh,
  className = "",
  showLabels = true,
}) => {
  if (yearLow == null || yearHigh == null || yearHigh <= yearLow) {
    return (
      <div className={`text-xs text-muted-foreground ${className}`}>
        52-Week Range unavailable
      </div>
    );
  }

  // Calculate percentage position of current price in 52-week range [0 - 100%]
  const percentage = Math.min(
    Math.max(((currentPrice - yearLow) / (yearHigh - yearLow)) * 100, 0),
    100
  );

  const pctFromLow = (((currentPrice - yearLow) / yearLow) * 100).toFixed(1);
  const pctFromHigh = (((yearHigh - currentPrice) / yearHigh) * 100).toFixed(1);

  return (
    <div className={`space-y-1.5 ${className}`}>
      {showLabels && (
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span className="font-medium text-foreground">52-Week Range</span>
          <span className="tabular-nums">
            <span className="text-emerald-500 font-semibold">+{pctFromLow}%</span> from low
          </span>
        </div>
      )}

      {/* Slider Track */}
      <div className="relative w-full h-2.5 bg-muted/60 rounded-full overflow-visible my-2">
        {/* Fill Gradient */}
        <div
          className="absolute top-0 left-0 h-full bg-gradient-to-r from-destructive/80 via-yellow-500/80 to-emerald-500/80 rounded-full"
          style={{ width: "100%" }}
        />

        {/* Current Price Marker Pin */}
        <div
          className="absolute top-1/2 -translate-y-1/2 w-4 h-4 bg-foreground rounded-full border-2 border-background shadow-md transition-all duration-300 transform -translate-x-1/2 hover:scale-125 cursor-pointer group"
          style={{ left: `${percentage}%` }}
        >
          {/* Tooltip on hover */}
          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 hidden group-hover:block bg-popover text-popover-foreground text-[10px] font-bold px-2 py-1 rounded shadow-lg whitespace-nowrap z-20 border border-border">
            KSh {currentPrice.toFixed(2)} ({percentage.toFixed(0)}% of range)
          </div>
        </div>
      </div>

      {/* Min and Max Labels */}
      <div className="flex items-center justify-between text-[11px] font-mono text-muted-foreground">
        <div>
          <span className="text-[10px] uppercase text-muted-foreground block font-sans">Low</span>
          <span className="font-semibold text-foreground">KSh {yearLow.toFixed(2)}</span>
        </div>
        <div className="text-center">
          <span className="text-[10px] uppercase text-muted-foreground block font-sans">Current</span>
          <span className="font-semibold text-emerald-500">KSh {currentPrice.toFixed(2)}</span>
        </div>
        <div className="text-right">
          <span className="text-[10px] uppercase text-muted-foreground block font-sans">High</span>
          <span className="font-semibold text-foreground">KSh {yearHigh.toFixed(2)}</span>
        </div>
      </div>
    </div>
  );
};

export default FiftyTwoWeekRangeBar;
