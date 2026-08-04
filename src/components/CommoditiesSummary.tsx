import React, { useMemo } from 'react';
import { Commodity } from '../types';
import { TrendingUp, TrendingDown, Minus, Activity, Factory } from 'lucide-react';

interface CommoditiesSummaryProps {
  commodities: Commodity[];
}

export function CommoditiesSummary({ commodities }: CommoditiesSummaryProps) {
  const safeComms = commodities || [];
  
  const { gainers, losers, unchanged, total, avgChange, topMovers } = useMemo(() => {
    let g = 0, l = 0, u = 0, sumChange = 0;
    const movers: Array<{ symbol: string; name: string; changePct: number; isUp: boolean }> = [];
    
    for (const c of safeComms) {
      const prev = (c as any).previous_price ?? (c as any).price;
      const current = (c as any).price;
      if (current > prev) {
        g++;
        sumChange += ((current - prev) / prev) * 100;
        movers.push({ symbol: (c as any).symbol, name: (c as any).name, changePct: ((current - prev) / prev) * 100, isUp: true });
      } else if (current < prev) {
        l++;
        sumChange += ((current - prev) / prev) * 100;
        movers.push({ symbol: (c as any).symbol, name: (c as any).name, changePct: ((current - prev) / prev) * 100, isUp: false });
      } else {
        u++;
      }
    }
    
    movers.sort((a, b) => Math.abs(b.changePct) - Math.abs(a.changePct));
    
    return {
      gainers: g,
      losers: l,
      unchanged: u,
      total: safeComms.length,
      avgChange: safeComms.length > 0 ? sumChange / safeComms.length : 0,
      topMovers: movers.slice(0, 4)
    };
  }, [safeComms]);

  if (total === 0) return null;

  const marketPerformance = avgChange > 0 
    ? "trending upwards" 
    : avgChange < 0 
    ? "seeing a pullback" 
    : "showing mixed performance";

  // Mock sector performance since we don't have this in DB yet
  const sectors = [
    { name: "Energy", return: 2.4, color: "#ef4444" },
    { name: "Precious Metals", return: 1.2, color: "#10b981" },
    { name: "Agriculture", return: -0.8, color: "#f59e0b" },
    { name: "Industrial Metals", return: -1.5, color: "#64748b" },
  ];

  return (
    <div className="mb-8 w-full overflow-hidden relative">
      <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-background to-transparent z-10 pointer-events-none hidden md:block" />
      
      <div className="flex overflow-x-auto snap-x snap-mandatory gap-4 pb-4 pt-1 -mx-4 px-4 md:mx-0 md:px-0 hide-scrollbar" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
        
        {/* Card 1: Market Overview */}
        <div className="shrink-0 w-[300px] md:w-[350px] snap-start bg-card border border-border/50 rounded-xl p-5 shadow-sm flex flex-col justify-between hover:border-border transition-colors">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-[15px] font-semibold text-foreground tracking-tight">Market Overview</h3>
              <span className="text-[11px] font-medium text-muted-foreground bg-muted/30 px-2 py-0.5 rounded-full flex items-center gap-1">
                <span className={`w-1.5 h-1.5 rounded-full ${avgChange > 0 ? 'bg-[#10b981]' : 'bg-[#ef4444]'} animate-pulse`}></span>
                GLOBAL
              </span>
            </div>
            <p className="text-[13px] text-muted-foreground leading-relaxed mb-4">
              Commodity markets are <strong className="text-foreground font-medium">{marketPerformance}</strong> today. 
              The average price movement across all tracked commodities is 
              <span className={`font-semibold ml-1 ${avgChange > 0 ? 'text-[#10b981]' : avgChange < 0 ? 'text-[#ef4444]' : 'text-muted-foreground'}`}>
                {avgChange > 0 ? '+' : ''}{avgChange.toFixed(2)}%
              </span>.
            </p>
          </div>
          <div>
            <div className="pt-3 border-t border-border/40 flex items-center justify-between text-[10px] text-muted-foreground uppercase tracking-wider font-medium">
              <span>{new Date().toLocaleDateString("en-US", { month: "short", day: "2-digit", year: "numeric" })}</span>
              <span>{total} Commodities</span>
            </div>
          </div>
        </div>

        {/* Card 2: Top Movers */}
        <div className="shrink-0 w-[300px] md:w-[350px] snap-start bg-card border border-border/50 rounded-xl p-5 shadow-sm flex flex-col justify-between hover:border-border transition-colors">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-[15px] font-semibold text-foreground tracking-tight">Top Movers</h3>
            <span className="text-[11px] font-medium text-muted-foreground bg-muted/30 px-2 py-0.5 rounded-full">DAILY CHANGE</span>
          </div>
          <div className="space-y-3 mt-1">
            {topMovers.length > 0 ? topMovers.map((mover) => (
              <div key={mover.symbol} className="flex items-center justify-between group cursor-pointer">
                <div className="flex items-center gap-2 truncate pr-4">
                  <span className="text-[13px] font-semibold text-foreground">{mover.symbol}</span>
                  <span className="text-[12px] text-muted-foreground truncate">{mover.name}</span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className={`text-[12px] tabular-nums font-medium w-[45px] text-right ${mover.isUp ? 'text-[#10b981]' : 'text-[#ef4444]'}`}>
                    {mover.isUp ? '+' : ''}{mover.changePct.toFixed(2)}%
                  </span>
                </div>
              </div>
            )) : (
              <div className="text-[13px] text-muted-foreground text-center py-4">No significant movers today</div>
            )}
          </div>
        </div>

        {/* Card 3: Sector Trends */}
        <div className="shrink-0 w-[300px] md:w-[350px] snap-start bg-card border border-border/50 rounded-xl p-5 shadow-sm flex flex-col justify-between hover:border-border transition-colors relative">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-[15px] font-semibold text-foreground tracking-tight">Sector Trends</h3>
            <span className="text-[11px] font-medium text-muted-foreground bg-muted/30 px-2 py-0.5 rounded-full flex items-center gap-1">
              <Factory className="w-3 h-3" /> INDEX
            </span>
          </div>
          <div className="space-y-3 mt-1">
            {sectors.map((sector) => (
              <div key={sector.name} className="flex items-center justify-between group cursor-pointer">
                <span className="text-[13px] text-muted-foreground group-hover:text-foreground transition-colors font-medium truncate pr-4">{sector.name}</span>
                <div className="flex items-center gap-2 shrink-0">
                  <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden flex justify-end">
                    <div 
                      className="h-full rounded-full" 
                      style={{ 
                        width: `${Math.min(100, (Math.abs(sector.return) / 5) * 100)}%`,
                        backgroundColor: sector.color
                      }}
                    />
                  </div>
                  <span className={`text-[12px] tabular-nums font-medium w-[45px] text-right`} style={{ color: sector.color }}>
                    {sector.return > 0 ? '+' : ''}{sector.return.toFixed(1)}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Card 4: Market Breadth */}
        <div className="shrink-0 w-[300px] md:w-[350px] snap-start bg-card border border-border/50 rounded-xl p-5 shadow-sm flex flex-col justify-between hover:border-border transition-colors">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-[15px] font-semibold text-foreground tracking-tight">Market Breadth</h3>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </div>
            
            <div className="flex items-end justify-between mb-4">
              <div>
                <div className="text-[24px] font-bold text-foreground leading-none">{gainers}</div>
                <div className="text-[11px] text-muted-foreground uppercase tracking-wider font-medium mt-1">Advances</div>
              </div>
              <div className="text-center">
                <div className="text-[18px] font-semibold text-muted-foreground leading-none">{unchanged}</div>
                <div className="text-[11px] text-muted-foreground/70 uppercase tracking-wider font-medium mt-1">Flat</div>
              </div>
              <div className="text-right">
                <div className="text-[24px] font-bold text-foreground leading-none">{losers}</div>
                <div className="text-[11px] text-muted-foreground uppercase tracking-wider font-medium mt-1">Declines</div>
              </div>
            </div>

            {/* Breadth Bar */}
            <div className="h-2 w-full flex rounded-full overflow-hidden mb-4 bg-muted">
              <div className="bg-[#10b981]" style={{ width: `${total > 0 ? (gainers / total) * 100 : 0}%` }} />
              <div className="bg-muted-foreground/30" style={{ width: `${total > 0 ? (unchanged / total) * 100 : 0}%` }} />
              <div className="bg-[#ef4444]" style={{ width: `${total > 0 ? (losers / total) * 100 : 0}%` }} />
            </div>
          </div>
          
          <div className="pt-3 border-t border-border/40 flex items-center justify-between text-[11px] font-medium">
            <div className="flex items-center gap-1.5 text-[#10b981]">
              <TrendingUp className="h-3 w-3" />
              <span>{total > 0 ? ((gainers / total) * 100).toFixed(0) : 0}% Up</span>
            </div>
            <div className="flex items-center gap-1.5 text-[#ef4444]">
              <span>{total > 0 ? ((losers / total) * 100).toFixed(0) : 0}% Down</span>
              <TrendingDown className="h-3 w-3" />
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
