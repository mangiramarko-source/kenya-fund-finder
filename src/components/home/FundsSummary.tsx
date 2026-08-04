import React, { useMemo } from 'react';
import { FundFromDB, YieldSnapshot } from '../../types';
import { TrendingUp, TrendingDown, Minus, Activity, Target } from 'lucide-react';

interface FundsSummaryProps {
  funds: FundFromDB[];
  snapshots: Record<string, YieldSnapshot>;
  categoryName: string;
}

export function FundsSummary({ funds, snapshots, categoryName }: FundsSummaryProps) {
  const safeFunds = funds || [];
  
  const { gainers, losers, unchanged, total, avgYield, topYielders, topMovers } = useMemo(() => {
    let g = 0, l = 0, u = 0, sumYield = 0;
    const yielders: Array<{ name: string; manager: string; yield: number }> = [];
    const movers: Array<{ name: string; manager: string; change: number; isUp: boolean }> = [];
    
    for (const f of safeFunds) {
      const currentYield = f.annual_yield;
      sumYield += currentYield;
      yielders.push({ name: f.name, manager: f.manager, yield: currentYield });

      const prev = snapshots[f.id]?.annual_yield;
      if (prev != null) {
        const diff = currentYield - prev;
        if (diff > 0) {
          g++;
          movers.push({ name: f.name, manager: f.manager, change: diff, isUp: true });
        } else if (diff < 0) {
          l++;
          movers.push({ name: f.name, manager: f.manager, change: diff, isUp: false });
        } else {
          u++;
        }
      } else {
        u++;
      }
    }
    
    yielders.sort((a, b) => b.yield - a.yield);
    movers.sort((a, b) => Math.abs(b.change) - Math.abs(a.change));
    
    return {
      gainers: g,
      losers: l,
      unchanged: u,
      total: safeFunds.length,
      avgYield: safeFunds.length > 0 ? sumYield / safeFunds.length : 0,
      topYielders: yielders.slice(0, 4),
      topMovers: movers.slice(0, 4)
    };
  }, [safeFunds, snapshots]);

  if (total === 0) return null;

  const maxYieldFund = topYielders.length > 0 ? topYielders[0] : null;

  return (
    <div className="mb-8 w-full overflow-hidden relative mt-2">
      <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-background to-transparent z-10 pointer-events-none hidden md:block" />
      
      <div className="flex overflow-x-auto snap-x snap-mandatory gap-4 pb-4 pt-1 -mx-4 px-4 md:mx-0 md:px-0 hide-scrollbar" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
        
        {/* Category Overview */}
        <div className="shrink-0 w-[300px] md:w-[350px] snap-start bg-card border border-border/50 rounded-xl p-5 shadow-sm flex flex-col justify-between hover:border-border transition-colors">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-[15px] font-semibold text-foreground tracking-tight">Category Overview</h3>
              <span className="text-[11px] font-medium text-muted-foreground bg-muted/30 px-2 py-0.5 rounded-full flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-[#10b981] animate-pulse"></span>
                ACTIVE
              </span>
            </div>
            <p className="text-[13px] text-muted-foreground leading-relaxed mb-4">
              The average annual yield for <strong className="text-foreground font-medium">{categoryName}</strong> is 
              <span className="font-semibold text-foreground ml-1">{avgYield.toFixed(2)}%</span>. 
              {maxYieldFund && (
                <> Currently, <strong className="text-foreground font-medium">{maxYieldFund.name}</strong> leads with a yield of <span className="text-[#10b981] font-semibold">{maxYieldFund.yield.toFixed(2)}%</span>.</>
              )}
            </p>
          </div>
          <div>
            <div className="pt-3 border-t border-border/40 flex items-center justify-between text-[10px] text-muted-foreground uppercase tracking-wider font-medium">
              <span>{new Date().toLocaleDateString("en-US", { month: "short", day: "2-digit", year: "numeric" })}</span>
              <span>{total} Funds Tracked</span>
            </div>
          </div>
        </div>

        {/* Top Yielders */}
        <div className="shrink-0 w-[300px] md:w-[350px] snap-start bg-card border border-border/50 rounded-xl p-5 shadow-sm flex flex-col justify-between hover:border-border transition-colors">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-[15px] font-semibold text-foreground tracking-tight">Top Yielders</h3>
            <span className="text-[11px] font-medium text-muted-foreground bg-muted/30 px-2 py-0.5 rounded-full flex items-center gap-1">
               <Target className="w-3 h-3" /> YIELD
            </span>
          </div>
          <div className="space-y-3 mt-1">
            {topYielders.length > 0 ? topYielders.map((fund, idx) => (
              <div key={idx} className="flex items-center justify-between group cursor-pointer">
                <div className="flex items-center gap-2 truncate pr-4">
                  <span className="text-[13px] font-semibold text-foreground truncate">{fund.name}</span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-[12px] tabular-nums font-medium w-[45px] text-right text-[#10b981]">
                    {fund.yield.toFixed(2)}%
                  </span>
                </div>
              </div>
            )) : (
              <div className="text-[13px] text-muted-foreground text-center py-4">No data available</div>
            )}
          </div>
        </div>

        {/* Top Movers */}
        <div className="shrink-0 w-[300px] md:w-[350px] snap-start bg-card border border-border/50 rounded-xl p-5 shadow-sm flex flex-col justify-between hover:border-border transition-colors">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-[15px] font-semibold text-foreground tracking-tight">Recent Movers</h3>
            <span className="text-[11px] font-medium text-muted-foreground bg-muted/30 px-2 py-0.5 rounded-full flex items-center gap-1">
              <Activity className="w-3 h-3" /> 24H
            </span>
          </div>
          <div className="space-y-3 mt-1">
            {topMovers.length > 0 ? topMovers.map((mover, idx) => (
              <div key={idx} className="flex items-center justify-between group cursor-pointer">
                <div className="flex items-center gap-2 truncate pr-4">
                  <span className="text-[13px] font-semibold text-foreground truncate">{mover.name}</span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className={`text-[12px] tabular-nums font-medium w-[45px] text-right ${mover.isUp ? 'text-[#10b981]' : 'text-[#ef4444]'}`}>
                    {mover.isUp ? '+' : ''}{mover.change.toFixed(2)}%
                  </span>
                </div>
              </div>
            )) : (
              <div className="text-[13px] text-muted-foreground text-center py-4">No significant movers today</div>
            )}
          </div>
        </div>

        {/* Market Breadth */}
        <div className="shrink-0 w-[300px] md:w-[350px] snap-start bg-card border border-border/50 rounded-xl p-5 shadow-sm flex flex-col justify-between hover:border-border transition-colors">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-[15px] font-semibold text-foreground tracking-tight">Yield Breadth</h3>
              <span className="text-[11px] font-medium text-muted-foreground bg-muted/30 px-2 py-0.5 rounded-full">TODAY</span>
            </div>
            
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-1.5">
                <TrendingUp className="w-4 h-4 text-[#10b981]" />
                <span className="text-xl font-bold text-foreground tabular-nums">{gainers}</span>
                <span className="text-[11px] text-muted-foreground uppercase tracking-wider ml-1">Up</span>
              </div>
              <div className="flex items-center gap-1.5">
                <TrendingDown className="w-4 h-4 text-[#ef4444]" />
                <span className="text-xl font-bold text-foreground tabular-nums">{losers}</span>
                <span className="text-[11px] text-muted-foreground uppercase tracking-wider ml-1">Down</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Minus className="w-4 h-4 text-muted-foreground" />
                <span className="text-xl font-bold text-foreground tabular-nums">{unchanged}</span>
                <span className="text-[11px] text-muted-foreground uppercase tracking-wider ml-1">Flat</span>
              </div>
            </div>

            <div className="h-2.5 w-full rounded-full overflow-hidden flex gap-[2px] mt-4 bg-muted/30">
              {total > 0 && gainers > 0 && (
                <div 
                  className="h-full bg-[#10b981] transition-all duration-500" 
                  style={{ width: `${(gainers / total) * 100}%` }}
                />
              )}
              {total > 0 && unchanged > 0 && (
                <div 
                  className="h-full bg-muted-foreground/30 transition-all duration-500" 
                  style={{ width: `${(unchanged / total) * 100}%` }}
                />
              )}
              {total > 0 && losers > 0 && (
                <div 
                  className="h-full bg-[#ef4444] transition-all duration-500" 
                  style={{ width: `${(losers / total) * 100}%` }}
                />
              )}
            </div>
          </div>
          <div>
            <div className="pt-4 mt-4 border-t border-border/40 flex items-center justify-between text-[11px]">
              <span className="text-muted-foreground">Market Sentiment</span>
              <span className={`font-medium ${gainers > losers ? 'text-[#10b981]' : losers > gainers ? 'text-[#ef4444]' : 'text-foreground'}`}>
                {gainers > losers ? 'Bullish' : losers > gainers ? 'Bearish' : 'Neutral'}
              </span>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
