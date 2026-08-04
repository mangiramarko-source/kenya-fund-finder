import React, { useMemo } from 'react';
import { Area, AreaChart, ResponsiveContainer, YAxis } from 'recharts';
import { Stock } from '../types';
import { TrendingUp, TrendingDown, Minus, Activity, ArrowRight } from 'lucide-react';

interface MarketSummaryProps {
  stocks: Stock[];
  history?: any[];
}

export function MarketSummary({ stocks, history }: MarketSummaryProps) {
  const safeStocks = stocks || [];
  
  // Calculate Market Breadth and Overview dynamically
  const totalStocks = safeStocks.length || 0;
  let gainers = 0;
  let losers = 0;
  let totalMarketCap = 0;
  
  const sectorData = new Map<string, { totalReturn: number; count: number }>();

  for (const s of safeStocks) {
    // Breadth
    if (s.day_change > 0) gainers++;
    else if (s.day_change < 0) losers++;

    // Market Cap
    if (s.market_cap) totalMarketCap += s.market_cap;

    // Sector Aggregation for average return
    if (s.sector) {
      const current = sectorData.get(s.sector) || { totalReturn: 0, count: 0 };
      current.totalReturn += s.day_change_percent || 0;
      current.count += 1;
      sectorData.set(s.sector, current);
    }
  }

  const unchanged = totalStocks > 0 ? totalStocks - gainers - losers : 0;

  // Top Sectors (sort by highest average return)
  const topSectors = Array.from(sectorData.entries())
    .map(([name, data]) => ({
      name,
      return: data.totalReturn / data.count
    }))
    .sort((a, b) => b.return - a.return)
    .slice(0, 5);

  // Fallback mock sectors if no data
  if (topSectors.length === 0) {
    topSectors.push(
      { name: 'Consumer Discretionary', return: 16.64 },
      { name: 'Telecom', return: 2.52 },
      { name: 'Utilities', return: 2.50 },
      { name: 'Materials', return: 1.96 },
      { name: 'Financials', return: 1.60 }
    );
  }

  // Real Valuation Data
  const valuationData = useMemo(() => {
    if (history && history.length > 0) {
      const allPEs = history.filter(h => h.average_pe > 0).map(h => h.average_pe);
      const overallAvg = allPEs.length > 0 ? allPEs.reduce((a, b) => a + b, 0) / allPEs.length : 0;
      return history.map(h => ({
        pe: Number(h.average_pe?.toFixed(1) || 0),
        avg: Number(overallAvg.toFixed(1))
      }));
    }

    // Mock fallback while table is empty
    const data = [];
    let currentPE = 15;
    for (let i = 0; i < 30; i++) {
      currentPE = currentPE + (Math.random() - 0.5) * 1.5;
      if (currentPE < 5) currentPE = 5;
      data.push({ pe: Number(currentPE.toFixed(1)), avg: 7.1 });
    }
    data[data.length - 1].pe = 8.2;
    return data;
  }, [history]);
  
  const latestValuation = valuationData[valuationData.length - 1] || { pe: 0, avg: 0 };
  const pePremium = latestValuation.avg > 0 
    ? ((latestValuation.pe - latestValuation.avg) / latestValuation.avg) * 100 
    : 0;

  const renderReturn = (val: number) => {
    if (val > 0) return <span className="text-[#10b981]">+{val.toFixed(1)}%</span>;
    if (val < 0) return <span className="text-[#ef4444]">{val.toFixed(1)}%</span>;
    return <span className="text-muted-foreground">{val.toFixed(1)}%</span>;
  };

  return (
    <div className="mb-8 w-full overflow-hidden relative">
      {/* Fade indicators for horizontal scroll */}
      <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-background to-transparent z-10 pointer-events-none hidden md:block" />
      
      <div className="flex overflow-x-auto snap-x snap-mandatory gap-4 pb-4 pt-1 -mx-4 px-4 md:mx-0 md:px-0 hide-scrollbar" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
        
        {/* Card 1: Market Overview */}
        <div className="shrink-0 w-[300px] md:w-[350px] snap-start bg-card border border-border/50 rounded-xl p-5 shadow-sm flex flex-col justify-between hover:border-border transition-colors">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-[15px] font-semibold text-foreground tracking-tight">Market Overview</h3>
              <span className="text-[11px] font-medium text-muted-foreground bg-muted/30 px-2 py-0.5 rounded-full flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-[#10b981] animate-pulse"></span>
                KENYA
              </span>
            </div>
            <div className="grid grid-cols-4 gap-2 mb-4">
              <div className="flex flex-col">
                <span className="text-[10px] text-muted-foreground uppercase mb-1">7D</span>
                <span className="text-[14px] font-semibold text-[#10b981]">+2.0%</span>
              </div>
              <div className="flex flex-col">
                <span className="text-[10px] text-muted-foreground uppercase mb-1">3M</span>
                <span className="text-[14px] font-semibold text-[#10b981]">+17.0%</span>
              </div>
              <div className="flex flex-col">
                <span className="text-[10px] text-muted-foreground uppercase mb-1">1Y</span>
                <span className="text-[14px] font-semibold text-[#10b981]">+52.3%</span>
              </div>
              <div className="flex flex-col">
                <span className="text-[10px] text-muted-foreground uppercase mb-1">YTD</span>
                <span className="text-[14px] font-semibold text-[#10b981]">+26.2%</span>
              </div>
            </div>
          </div>
          <div>
            <p className="text-[12px] text-muted-foreground leading-relaxed mb-3">
              Total Market Cap is <span className="text-foreground font-medium">KSh {(totalMarketCap / 1e9).toFixed(1)}B</span>. Earnings are forecast to grow by 14% annually.
            </p>
            <div className="pt-3 border-t border-border/40 flex items-center justify-between text-[10px] text-muted-foreground uppercase tracking-wider font-medium">
              <span>{new Date().toLocaleDateString("en-US", { month: "short", day: "2-digit", year: "numeric" })}</span>
              <span>{totalStocks} Companies</span>
            </div>
          </div>
        </div>

        {/* Card 2: Valuation Sparkline */}
        <div className="shrink-0 w-[300px] md:w-[350px] snap-start bg-card border border-border/50 rounded-xl p-5 shadow-sm flex flex-col justify-between hover:border-border transition-colors relative">
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-[15px] font-semibold text-foreground tracking-tight">Market Valuation</h3>
              <span className="text-[11px] font-medium text-muted-foreground bg-muted/30 px-2 py-0.5 rounded-full">30D PE</span>
            </div>
            <div className="flex items-baseline justify-between mb-2">
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold text-foreground">{latestValuation.pe.toFixed(1)}x</span>
                <span className="text-[12px] text-muted-foreground">P/E</span>
              </div>
              <div className="text-[11px] text-muted-foreground flex flex-col items-end">
                <span>Avg: {latestValuation.avg.toFixed(1)}x</span>
                <span className={pePremium > 0 ? "text-[#ef4444]" : "text-[#10b981]"}>
                  {pePremium > 0 ? "+" : ""}{pePremium.toFixed(1)}% {pePremium > 0 ? "Premium" : "Discount"}
                </span>
              </div>
            </div>
          </div>
          <div className="h-[60px] w-full mt-auto -mx-2 relative">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={valuationData}>
                <defs>
                  <linearGradient id="colorPe" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <YAxis domain={['dataMin - 1', 'dataMax + 1']} hide />
                <Area 
                  type="monotone" 
                  dataKey="pe" 
                  stroke="#10b981" 
                  strokeWidth={2}
                  fillOpacity={1} 
                  fill="url(#colorPe)" 
                />
                <Area 
                  type="monotone" 
                  dataKey="avg" 
                  stroke="#eab308" 
                  strokeWidth={1}
                  strokeDasharray="3 3"
                  fill="none" 
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Card 3: Sector Trends */}
        <div className="shrink-0 w-[300px] md:w-[350px] snap-start bg-card border border-border/50 rounded-xl p-5 shadow-sm flex flex-col justify-between hover:border-border transition-colors">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-[15px] font-semibold text-foreground tracking-tight">Top Sectors</h3>
            <span className="text-[11px] font-medium text-muted-foreground bg-muted/30 px-2 py-0.5 rounded-full">7D RETURN</span>
          </div>
          <div className="space-y-3 mt-1">
            {topSectors.map((sector) => (
              <div key={sector.name} className="flex items-center justify-between group cursor-pointer">
                <span className="text-[13px] text-muted-foreground group-hover:text-foreground transition-colors font-medium truncate pr-4">{sector.name}</span>
                <div className="flex items-center gap-2 shrink-0">
                  <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden flex justify-end">
                    <div 
                      className="h-full bg-[#10b981] rounded-full" 
                      style={{ width: `${Math.min(100, (sector.return / 20) * 100)}%` }}
                    />
                  </div>
                  <span className="text-[12px] tabular-nums font-medium text-[#10b981] w-[45px] text-right">
                    +{sector.return.toFixed(1)}%
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
              <div className="bg-[#10b981]" style={{ width: `${(gainers / totalStocks) * 100}%` }} />
              <div className="bg-muted-foreground/30" style={{ width: `${(unchanged / totalStocks) * 100}%` }} />
              <div className="bg-[#ef4444]" style={{ width: `${(losers / totalStocks) * 100}%` }} />
            </div>
          </div>
          
          <div className="pt-3 border-t border-border/40 flex items-center justify-between text-[11px] font-medium">
            <span className="text-muted-foreground">Current Sentiment</span>
            <span className={gainers > losers ? "text-[#10b981]" : "text-[#ef4444]"}>
              {gainers > losers ? "Bullish" : "Bearish"}
            </span>
          </div>
        </div>

      </div>
      
      {/* CSS to hide scrollbar for webkit but allow scrolling */}
      <style dangerouslySetInnerHTML={{__html: `
        .hide-scrollbar::-webkit-scrollbar {
          display: none;
        }
      `}} />
    </div>
  );
}
