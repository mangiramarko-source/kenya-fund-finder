import React from "react";
import { Link } from "react-router-dom";
import { ArrowRight, BarChart3 } from "lucide-react";
import { isKenyanMarketOpen } from "@/lib/utils";

interface NseMarketStatusCardProps {
  n20?: { value: number; changePct: number };
  nasi?: { value: number; changePct: number };
  n25?: { value: number; changePct: number };
  compact?: boolean;
}

export const NseMarketStatusCard: React.FC<NseMarketStatusCardProps> = ({
  n20 = { value: 1742.5, changePct: 0.62 },
  nasi = { value: 104.8, changePct: 0.41 },
  n25 = { value: 2850.1, changePct: 1.15 },
  compact = false,
}) => {
  const isOpen = isKenyanMarketOpen();

  const indices = [
    { name: "NSE 20 Share", data: n20 },
    { name: "NASI (All Share)", data: nasi },
    { name: "NSE 25 Index", data: n25 },
  ];

  return (
    <div className="rounded-2xl border border-border/70 bg-card p-4 shadow-sm space-y-3.5">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border/50 pb-2.5">
        <div className="flex items-center gap-2">
          <BarChart3 className="w-4 h-4 text-emerald-500" />
          <h3 className="text-sm font-bold text-foreground">NSE Market Status</h3>
        </div>
        <div className="flex items-center gap-1.5">
          <span
            className={`h-2 w-2 rounded-full ${
              isOpen ? "bg-emerald-500 animate-pulse" : "bg-muted-foreground/60"
            }`}
          />
          <span
            className={`rounded-full px-2 py-0.5 text-[10px] font-bold border ${
              isOpen
                ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                : "border-border bg-muted/60 text-muted-foreground"
            }`}
          >
            {isOpen ? "Open (9:00 - 15:00)" : "Closed"}
          </span>
        </div>
      </div>

      {/* Indices List */}
      <div className={`${compact ? "grid grid-cols-3 gap-3" : "space-y-1.5"} pt-0.5 text-xs`}>
        {indices.map(({ name, data }) => {
          const isPos = data.changePct >= 0;
          return (
            <Link
              key={name}
              to="/stocks"
              className="flex items-center justify-between p-2 rounded-xl border border-border/50 bg-slate-50/50 dark:bg-card hover:border-emerald-500/40 hover:bg-muted/30 transition-all group"
            >
              <div>
                <div className="font-bold text-foreground group-hover:text-emerald-500 transition-colors">
                  {name}
                </div>
                <div className="text-[10px] text-muted-foreground">Benchmark Index</div>
              </div>

              <div className="text-right shrink-0">
                <div className="font-bold text-foreground tabular-nums">
                  {data.value.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </div>
                <div
                  className={`text-[10px] font-bold inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded-md ${
                    isPos
                      ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                      : "bg-red-500/10 text-red-600 dark:text-red-400"
                  }`}
                >
                  {isPos ? "+" : ""}
                  {data.changePct.toFixed(2)}%
                </div>
              </div>
            </Link>
          );
        })}
      </div>

      {/* Bottom Link */}
      <div className="pt-1 text-center">
        <Link
          to="/stocks"
          className="text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:underline inline-flex items-center gap-1 transition-colors"
        >
          <span>View All Market Indices</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>
    </div>
  );
};
