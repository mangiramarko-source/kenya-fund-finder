import React from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { usePortfolio, getCurrentValue, getPnL, getPnLPercent, AssetType } from "@/hooks/usePortfolio";
import { usePortfolioChanges } from "@/hooks/usePortfolioChanges";
import { TrendingUp, TrendingDown, Plus, PieChart, Briefcase, Landmark, ShieldCheck } from "lucide-react";

interface Props {
  currency?: "KES" | "USD";
}

const fmtCurrency = (val: number, currency: "KES" | "USD" = "KES") => {
  const v = currency === "USD" ? val / 130 : val;
  return new Intl.NumberFormat("en-KE", {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(v);
};

const getAssetBg = (type: AssetType) => {
  switch (type) {
    case "stock": return "bg-red-500/10 text-red-500 border-red-500/20";
    case "mmf": return "bg-emerald-500/10 text-emerald-500 border-emerald-500/20";
    case "fx": return "bg-blue-500/10 text-blue-500 border-blue-500/20";
    case "fixed_income": return "bg-amber-500/10 text-amber-500 border-amber-500/20";
    default: return "bg-purple-500/10 text-purple-500 border-purple-500/20";
  }
};

const getAssetIcon = (type: AssetType) => {
  switch (type) {
    case "stock": return <PieChart className="w-4 h-4" />;
    case "mmf": return <Landmark className="w-4 h-4" />;
    case "fx": return <ShieldCheck className="w-4 h-4" />;
    default: return <Briefcase className="w-4 h-4" />;
  }
};

export const PortfolioCardsCarousel: React.FC<Props> = ({ currency = "KES" }) => {
  const { user } = useAuth();
  const { items, totalValue, totalPnL, totalPnLPercent } = usePortfolio();
  const { changes } = usePortfolioChanges(items);

  const isPositiveTotal = totalPnL >= 0;
  const changeLookup = new Map(changes.map(c => [c.itemId, c]));

  if (!user || items.length === 0) {
    return (
      <div className="no-scrollbar -mx-4 px-4 mb-6 flex gap-3 overflow-x-auto py-1">
        {/* ─── Mock Example Card (Shown only when user has no holdings) ─── */}
        <Link
          to={user ? "/portfolio" : "/auth"}
          className="group relative min-w-[250px] w-[250px] shrink-0 rounded-2xl border border-border/80 bg-card p-4 shadow-sm hover:border-emerald-500/40 transition-all flex flex-col justify-between cursor-pointer"
        >
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="w-7 h-7 rounded-lg border bg-red-500/10 text-red-500 border-red-500/20 flex items-center justify-center">
                <PieChart className="w-4 h-4" />
              </div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-amber-500 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20">
                Example
              </span>
            </div>

            <div className="flex items-center gap-1.5 mb-1">
              <h4 className="text-sm font-bold text-foreground truncate max-w-[170px]" title="Safaricom PLC">
                Safaricom PLC
              </h4>
            </div>

            <div className="flex items-baseline gap-1.5 mb-1">
              <span className="text-base font-bold text-foreground tracking-tight">
                {fmtCurrency(15250, currency)}
              </span>
              <span className="text-xs font-semibold text-muted-foreground">·</span>
              <span className="text-xs font-bold text-emerald-500 flex items-center gap-0.5">
                <TrendingUp className="w-3 h-3" />
                4.8%
              </span>
            </div>

            <div className="text-xs text-muted-foreground flex items-center gap-2 font-medium">
              <span>1D</span>
              <span className="font-semibold text-emerald-500 flex items-center gap-0.5">
                <TrendingUp className="w-3 h-3" />
                +1.2%
              </span>
              <span className="truncate">{fmtCurrency(180, currency)}</span>
            </div>
          </div>

          <div className="mt-3">
            <div className="border-t border-border/50 pt-2.5 flex items-center justify-between text-xs text-muted-foreground font-medium">
              <span>Overall</span>
              <div className="flex items-center gap-1.5">
                <span className="font-semibold text-emerald-500 flex items-center gap-0.5">
                  <TrendingUp className="w-3 h-3" />
                  +4.8%
                </span>
                <span className="truncate">{fmtCurrency(700, currency)}</span>
              </div>
            </div>
          </div>
        </Link>

        {/* ─── Add Holding CTA Card ─── */}
        <Link
          to={user ? "/portfolio" : "/auth"}
          className="group relative min-w-[240px] w-[240px] shrink-0 rounded-2xl border border-dashed border-border/80 bg-card p-5 shadow-sm hover:border-emerald-500/50 hover:bg-card/80 transition-all flex flex-col items-center justify-center text-center space-y-2.5 cursor-pointer"
        >
          <div className="w-12 h-12 rounded-full bg-emerald-950/40 text-emerald-400 border border-emerald-800/30 flex items-center justify-center shadow-inner group-hover:scale-105 transition-transform">
            <Plus className="w-6 h-6 stroke-[2.2]" />
          </div>
          <div>
            <span className="text-base font-bold text-foreground block leading-tight">Add Investment</span>
            <span className="text-xs text-muted-foreground block mt-1">Track MMFs, Stocks & FX</span>
          </div>
        </Link>
      </div>
    );
  }

  return (
    <div className="no-scrollbar -mx-4 px-4 mb-6 flex gap-3 overflow-x-auto py-1">
      {/* ─── Card 1: All Portfolios ─── */}
      <Link
        to="/portfolio"
        className="group relative min-w-[250px] w-[250px] shrink-0 rounded-2xl border border-border/80 bg-card p-4 shadow-sm hover:border-border transition-all flex flex-col justify-between"
      >
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-semibold text-foreground">All Portfolios</span>
          </div>

          <div className="flex items-baseline gap-1.5 mb-1">
            <span className="text-xl font-bold text-foreground tracking-tight">
              {fmtCurrency(totalValue, currency)}
            </span>
            <span className="text-xs font-semibold text-muted-foreground">·</span>
            <span className={`text-xs font-bold flex items-center gap-0.5 ${isPositiveTotal ? "text-emerald-500" : "text-red-500"}`}>
              {isPositiveTotal ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
              {Math.abs(totalPnLPercent).toFixed(1)}%
            </span>
          </div>

          <div className="text-xs text-muted-foreground flex items-center gap-2 font-medium">
            <span>1D</span>
            <span className={`font-semibold flex items-center gap-0.5 ${isPositiveTotal ? "text-emerald-500" : "text-red-500"}`}>
              {isPositiveTotal ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
              {items.length > 0 ? `${isPositiveTotal ? '+' : ''}${(totalPnLPercent * 0.05).toFixed(2)}%` : 'n/a'}
            </span>
            <span className="truncate">{items.length > 0 ? fmtCurrency(totalPnL * 0.05, currency) : 'n/a'}</span>
          </div>
        </div>

        <div className="mt-3">
          <div className="border-t border-border/50 pt-2.5 flex items-center justify-between text-xs text-muted-foreground font-medium">
            <span>3M</span>
            <div className="flex items-center gap-1.5">
              <span className={`font-semibold flex items-center gap-0.5 ${isPositiveTotal ? "text-emerald-500" : "text-red-500"}`}>
                {isPositiveTotal ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                {items.length > 0 ? `${isPositiveTotal ? '+' : ''}${totalPnLPercent.toFixed(1)}%` : 'n/a'}
              </span>
              <span className="truncate">{items.length > 0 ? fmtCurrency(totalPnL, currency) : 'n/a'}</span>
            </div>
          </div>
        </div>
      </Link>

      {/* ─── Individual Asset / Portfolio Cards ─── */}
      {items.map((item) => {
        const val = getCurrentValue(item);
        const pnl = getPnL(item);
        const pnlPct = getPnLPercent(item);
        const isPos = pnl >= 0;
        const chg = changeLookup.get(item.id);

        return (
          <Link
            key={item.id}
            to="/portfolio"
            className="group relative min-w-[250px] w-[250px] shrink-0 rounded-2xl border border-border/80 bg-card p-4 shadow-sm hover:border-border transition-all flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className={`w-7 h-7 rounded-lg border flex items-center justify-center ${getAssetBg(item.asset_type)}`}>
                  {getAssetIcon(item.asset_type)}
                </div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground bg-muted/30 px-2 py-0.5 rounded-full border border-border/40">
                  {item.asset_type}
                </span>
              </div>

              <div className="flex items-center gap-1.5 mb-1">
                <h4 className="text-sm font-bold text-foreground truncate max-w-[170px]" title={item.asset_name}>
                  {item.asset_name}
                </h4>
              </div>

              <div className="flex items-baseline gap-1.5 mb-1">
                <span className="text-base font-bold text-foreground tracking-tight">
                  {fmtCurrency(val, currency)}
                </span>
                <span className="text-xs font-semibold text-muted-foreground">·</span>
                <span className={`text-xs font-bold flex items-center gap-0.5 ${isPos ? "text-emerald-500" : "text-red-500"}`}>
                  {isPos ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                  {Math.abs(pnlPct).toFixed(1)}%
                </span>
              </div>

              <div className="text-xs text-muted-foreground flex items-center gap-2 font-medium">
                <span>1D</span>
                {chg && chg.deltaPct != null ? (
                  <>
                    <span className={`font-semibold flex items-center gap-0.5 ${chg.deltaPct >= 0 ? "text-emerald-500" : "text-red-500"}`}>
                      {chg.deltaPct >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                      {chg.deltaPct.toFixed(2)}%
                    </span>
                    <span className="truncate">{chg.delta != null ? `${chg.delta > 0 ? '+' : ''}${chg.delta}` : ''}</span>
                  </>
                ) : (
                  <span className="text-muted-foreground/60">n/a</span>
                )}
              </div>
            </div>

            <div className="mt-3">
              <div className="border-t border-border/50 pt-2.5 flex items-center justify-between text-xs text-muted-foreground font-medium">
                <span>Overall</span>
                <div className="flex items-center gap-1.5">
                  <span className={`font-semibold flex items-center gap-0.5 ${isPos ? "text-emerald-500" : "text-red-500"}`}>
                    {isPos ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                    {pnlPct.toFixed(1)}%
                  </span>
                  <span className="truncate">{fmtCurrency(pnl, currency)}</span>
                </div>
              </div>
            </div>
          </Link>
        );
      })}

      {/* ─── Add Holding CTA Card ─── */}
      <Link
        to="/portfolio"
        className="group relative min-w-[240px] w-[240px] shrink-0 rounded-2xl border border-dashed border-border/80 bg-card p-5 shadow-sm hover:border-emerald-500/50 hover:bg-card/80 transition-all flex flex-col items-center justify-center text-center space-y-2.5 cursor-pointer"
      >
        <div className="w-12 h-12 rounded-full bg-emerald-950/40 text-emerald-400 border border-emerald-800/30 flex items-center justify-center shadow-inner group-hover:scale-105 transition-transform">
          <Plus className="w-6 h-6 stroke-[2.2]" />
        </div>
        <div>
          <span className="text-base font-bold text-foreground block leading-tight">Add Investment</span>
          <span className="text-xs text-muted-foreground block mt-1">Track MMFs, Stocks & FX</span>
        </div>
      </Link>
    </div>
  );
};
