import { TrendingUp, TrendingDown, Minus } from "lucide-react";

interface YieldChangeProps {
  current: number;
  previous: number | undefined;
  suffix?: string;
  className?: string;
}

const YieldChange = ({ current, previous, suffix = "%", className = "" }: YieldChangeProps) => {
  if (previous === undefined) return null;

  const diff = current - previous;
  if (Math.abs(diff) < 0.0001) {
    return (
      <span className={`inline-flex items-center gap-0.5 text-muted-foreground ${className}`}>
        <Minus className="h-3 w-3" />
        <span>0{suffix}</span>
      </span>
    );
  }

  const isUp = diff > 0;
  return (
    <span className={`inline-flex items-center gap-0.5 ${isUp ? "text-emerald-600 dark:text-emerald-400" : "text-red-500 dark:text-red-400"} ${className}`}>
      {isUp ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
      <span>{isUp ? "+" : ""}{diff.toFixed(2)}{suffix}</span>
    </span>
  );
};

export default YieldChange;
