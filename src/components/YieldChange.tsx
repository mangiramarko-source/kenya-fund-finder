import { TrendingUp, TrendingDown, Minus } from "lucide-react";

interface YieldChangeProps {
  current: number;
  previous: number | undefined;
  suffix?: string;
  unit?: string;
  className?: string;
}

/** Format a yield value with its unit: "12.5%" or "KES 12.50" */
export const formatYield = (value: number, unit: string = "%") => {
  if (unit === "%") return `${value}%`;
  return `${unit} ${value.toFixed(2)}`;
};

/** Return just the suffix for labels: "%" or " (KES)" */
export const yieldUnitLabel = (unit: string = "%") => {
  if (unit === "%") return "%";
  return ` (${unit})`;
};

const YieldChange = ({ current, previous, suffix, unit = "%", className = "" }: YieldChangeProps) => {
  const effectiveSuffix = suffix ?? (unit === "%" ? "%" : ` ${unit}`);
  if (previous === undefined) return null;

  const diff = current - previous;
  if (Math.abs(diff) < 0.0001) {
    return (
      <span className={`inline-flex items-center gap-0.5 text-muted-foreground ${className}`}>
        <Minus className="h-3 w-3" />
        <span>0{effectiveSuffix}</span>
      </span>
    );
  }

  const isUp = diff > 0;
  return (
    <span className={`inline-flex items-center gap-0.5 ${isUp ? "text-emerald-600 dark:text-emerald-400" : "text-red-500 dark:text-red-400"} ${className}`}>
      {isUp ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
      <span>{isUp ? "+" : ""}{diff.toFixed(2)}{effectiveSuffix}</span>
    </span>
  );
};

export default YieldChange;
