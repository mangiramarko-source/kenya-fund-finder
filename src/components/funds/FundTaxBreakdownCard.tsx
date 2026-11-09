import React from "react";
import { Shield } from "lucide-react";
import type { FundFromDB } from "@/lib/api";

interface FundTaxBreakdownCardProps {
  fund: FundFromDB;
  isNav: boolean;
  className?: string;
}

export const FundTaxBreakdownCard: React.FC<FundTaxBreakdownCardProps> = ({
  fund,
  isNav,
  className = "",
}) => {
  const yieldNum = Number(fund.annual_yield) || 0;
  const whtTaxRate = 0.15;
  const taxDeduction = yieldNum * whtTaxRate;
  const netReturn = yieldNum * (1 - whtTaxRate);

  if (isNav) {
    return (
      <div className={`rounded-xl border border-border bg-card p-4 space-y-3 ${className}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield className="h-4 w-4 text-primary" />
            <span className="text-xs font-bold text-foreground">Unit Trust Valuation & Tax Framework</span>
          </div>
          <span className="text-[10px] font-semibold text-primary bg-primary/10 px-2 py-0.5 rounded-full">
            Capital Growth / NAV
          </span>
        </div>
        <div className="grid grid-cols-2 gap-2 text-center pt-1">
          <div className="bg-muted/30 rounded-lg p-2.5">
            <p className="text-[10px] text-muted-foreground font-medium">Published NAV Price</p>
            <p className="text-sm sm:text-base font-bold text-foreground tabular-nums">
              KES {yieldNum.toFixed(2)}
            </p>
            <span className="text-[9px] text-muted-foreground">per unit share</span>
          </div>
          <div className="bg-muted/30 rounded-lg p-2.5">
            <p className="text-[10px] text-muted-foreground font-medium">Fund Category</p>
            <p className="text-sm sm:text-base font-bold text-foreground capitalize">
              {fund.fund_type?.replace(/_/g, " ") || "Unit Trust"}
            </p>
            <span className="text-[9px] text-muted-foreground">asset growth & income</span>
          </div>
        </div>
        <p className="text-[11px] text-muted-foreground leading-relaxed pt-1">
          Unlike Money Market Funds which distribute daily interest, balanced and equity funds track the Net Asset Value (NAV) of underlying equities, bonds, and cash assets. Daily interest withholding tax does not apply to unit prices; investment gains are realized through capital appreciation upon unit redemption or periodic dividend payouts.
        </p>
      </div>
    );
  }

  return (
    <div className={`rounded-xl border border-border bg-card p-4 space-y-3 ${className}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Shield className="h-4 w-4 text-emerald-500" />
          <span className="text-xs font-bold text-foreground">Tax & Estimated Return Breakdown</span>
        </div>
        <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full">
          15% KRA Withholding Tax
        </span>
      </div>
      <div className="grid grid-cols-3 gap-2 text-center pt-1">
        <div className="bg-muted/30 rounded-lg p-2.5">
          <p className="text-[10px] text-muted-foreground font-medium">Published Gross</p>
          <p className="text-sm sm:text-base font-bold text-foreground tabular-nums">
            {yieldNum.toFixed(2)}%
          </p>
          <span className="text-[9px] text-muted-foreground">p.a. EAR</span>
        </div>
        <div className="bg-muted/30 rounded-lg p-2.5">
          <p className="text-[10px] text-muted-foreground font-medium">Withholding Tax</p>
          <p className="text-sm sm:text-base font-bold text-red-500 tabular-nums">
            -{taxDeduction.toFixed(2)}%
          </p>
          <span className="text-[9px] text-muted-foreground">15% at source</span>
        </div>
        <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-2.5">
          <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold">Estimated Net Return</p>
          <p className="text-sm sm:text-base font-black text-emerald-600 dark:text-emerald-400 tabular-nums">
            ~{netReturn.toFixed(2)}%
          </p>
          <span className="text-[9px] text-emerald-600/80 dark:text-emerald-400/80">after tax p.a.</span>
        </div>
      </div>
      <p className="text-[11px] text-muted-foreground leading-relaxed pt-1">
        Under Section 35(3)(b) and the Third Schedule (Head B, Paragraph 5) of Kenya's Income Tax Act (Cap. 470), a 15% final withholding tax is deducted at source on qualifying interest earned by resident individuals from registered collective investment schemes (unit trusts). Net return illustrates simple annual yield after tax.
      </p>
    </div>
  );
};

export default FundTaxBreakdownCard;
