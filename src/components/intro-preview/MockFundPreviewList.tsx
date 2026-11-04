import React from "react";
import { Link } from "react-router-dom";
import { TrendingUp, ArrowUpRight, ShieldCheck, Star } from "lucide-react";
import { Badge } from "@/components/ui/badge";

const SAMPLE_FUNDS = [
  {
    id: "etica",
    name: "Etica Wealth Money Market Fund",
    manager: "Etica Capital Ltd",
    yield: 16.45,
    currency: "KES",
    dailyRate: 15.24,
    minInvestment: "KES 100",
    fee: "2.0%",
    status: "CMA Regulated",
    highlight: "Highest Yield",
  },
  {
    id: "lofty",
    name: "Lofty-Corban Money Market Fund",
    manager: "Lofty-Corban Investments",
    yield: 15.82,
    currency: "KES",
    dailyRate: 14.68,
    minInvestment: "KES 1,000",
    fee: "2.0%",
    status: "CMA Regulated",
    highlight: "Fast M-Pesa",
  },
  {
    id: "sanlam-usd",
    name: "Sanlam Dollar Money Market Fund",
    manager: "Sanlam Investments East Africa",
    yield: 6.85,
    currency: "USD",
    dailyRate: 6.62,
    minInvestment: "USD 100",
    fee: "1.5%",
    status: "CMA Regulated",
    highlight: "Top USD Yield",
  },
];

export default function MockFundPreviewList() {
  return (
    <div className="space-y-3 pt-2">
      <div className="flex items-center justify-between px-1">
        <h3 className="text-sm font-bold text-foreground">Top Ranked Funds Today (Sample Preview)</h3>
        <span className="text-xs text-muted-foreground">3 of 40 CMA Funds</span>
      </div>

      <div className="space-y-2.5">
        {SAMPLE_FUNDS.map((fund) => (
          <div
            key={fund.id}
            className="rounded-xl border border-border bg-card p-3.5 shadow-sm hover:border-emerald-500/40 transition-colors"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <Badge variant="outline" className="text-[10px] font-semibold py-0 px-1.5 border-emerald-500/30 text-emerald-400 bg-emerald-500/10">
                    {fund.currency}
                  </Badge>
                  <span className="text-[10px] text-muted-foreground">{fund.manager}</span>
                </div>
                <h4 className="text-sm font-semibold text-foreground mt-0.5 truncate">{fund.name}</h4>
              </div>

              <div className="text-right shrink-0">
                <div className="text-base font-black text-emerald-400 flex items-center justify-end gap-0.5">
                  <TrendingUp className="h-3.5 w-3.5 text-emerald-400" />
                  {fund.yield}%
                </div>
                <span className="text-[10px] text-muted-foreground">Effective p.a.</span>
              </div>
            </div>

            <div className="mt-2.5 pt-2 border-t border-border/60 flex items-center justify-between text-[11px] text-muted-foreground">
              <span>Min: <strong className="text-foreground">{fund.minInvestment}</strong></span>
              <span>Fee: <strong className="text-foreground">{fund.fee}</strong></span>
              <span className="text-emerald-400 flex items-center gap-0.5">
                <ShieldCheck className="h-3 w-3" /> CMA Approved
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
