import React from "react";
import { isKenyanMarketOpen } from "@/lib/utils";

interface NseMarketStatusCardProps {
  n20?: { value: number; changePct: number };
  nasi?: { value: number; changePct: number };
  n25?: { value: number; changePct: number };
}

export const NseMarketStatusCard: React.FC<NseMarketStatusCardProps> = ({
  n20 = { value: 1742.5, changePct: 0.62 },
  nasi = { value: 104.8, changePct: 0.41 },
  n25 = { value: 2850.1, changePct: 1.15 },
}) => {
  const isOpen = isKenyanMarketOpen();

  return (
    <div className="rounded-2xl border border-border/70 bg-card p-4 shadow-sm space-y-3.5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className={`h-2.5 w-2.5 rounded-full ${isOpen ? "bg-emerald-500 animate-pulse" : "bg-muted-foreground/50"}`} />
          <h3 className="text-sm font-bold text-foreground">NSE Market Status</h3>
        </div>
        <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold border ${
          isOpen
            ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-500"
            : "border-border bg-muted/50 text-muted-foreground"
        }`}>
          {isOpen ? "Open" : "Closed"}
        </span>
      </div>

      <div className="space-y-2.5 pt-1 text-xs">
        <div className="flex items-center justify-between">
          <span className="font-medium text-muted-foreground">NSE 20 Share</span>
          <div className="flex items-center gap-1.5 font-semibold">
            <span className="text-foreground">{n20.value.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
            <span className={n20.changePct >= 0 ? "text-emerald-500" : "text-red-500"}>
              {n20.changePct >= 0 ? "+" : ""}{n20.changePct.toFixed(2)}%
            </span>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <span className="font-medium text-muted-foreground">NASI (All Share)</span>
          <div className="flex items-center gap-1.5 font-semibold">
            <span className="text-foreground">{nasi.value.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
            <span className={nasi.changePct >= 0 ? "text-emerald-500" : "text-red-500"}>
              {nasi.changePct >= 0 ? "+" : ""}{nasi.changePct.toFixed(2)}%
            </span>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <span className="font-medium text-muted-foreground">NSE 25 Index</span>
          <div className="flex items-center gap-1.5 font-semibold">
            <span className="text-foreground">{n25.value.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
            <span className={n25.changePct >= 0 ? "text-emerald-500" : "text-red-500"}>
              {n25.changePct >= 0 ? "+" : ""}{n25.changePct.toFixed(2)}%
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
