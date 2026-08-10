import React from "react";
import {
  Car,
  TrendingUp,
  ShieldCheck,
  Wheat,
  ArrowRightLeft,
  PhoneCall,
  Factory,
  Building2,
  Zap,
  Briefcase,
  Coins,
  HardHat,
  ChevronRight,
  History,
} from "lucide-react";
import { SectorMetric } from "./SectorPerformanceGrid";

interface LeftSectorSidebarProps {
  sectors: SectorMetric[];
  selectedSector: string | null;
  onSelectSector: (sector: string | null) => void;
  recentStocks?: Array<{ symbol: string; name: string; price: number; day_change_percent: number }>;
  onSelectStock?: (symbol: string) => void;
}

// Icon mapping per sector
const sectorIcons: Record<string, React.ReactNode> = {
  "Automobiles & Accessories": <Car className="h-3.5 w-3.5 text-rose-500" />,
  Investment: <TrendingUp className="h-3.5 w-3.5 text-amber-500" />,
  Insurance: <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />,
  Agricultural: <Wheat className="h-3.5 w-3.5 text-lime-500" />,
  "Exchange Traded Funds": <ArrowRightLeft className="h-3.5 w-3.5 text-sky-500" />,
  Telecommunication: <PhoneCall className="h-3.5 w-3.5 text-blue-500" />,
  "Manufacturing & Allied": <Factory className="h-3.5 w-3.5 text-orange-500" />,
  Banking: <Building2 className="h-3.5 w-3.5 text-indigo-500" />,
  "Energy & Petroleum": <Zap className="h-3.5 w-3.5 text-yellow-500" />,
  "Commercial & Services": <Briefcase className="h-3.5 w-3.5 text-teal-500" />,
  "Investment Services": <Coins className="h-3.5 w-3.5 text-cyan-500" />,
  "Construction & Allied": <HardHat className="h-3.5 w-3.5 text-stone-400" />,
};

const formatValueStr = (cap: number) => {
  if (cap >= 1e12) return `${(cap / 1e12).toFixed(2)} T`;
  if (cap >= 1e9) return `${(cap / 1e9).toFixed(2)} B`;
  if (cap >= 1e6) return `${(cap / 1e6).toFixed(0)} M`;
  if (cap === 0) return "0";
  return `${cap.toLocaleString()}`;
};

export const LeftSectorSidebar: React.FC<LeftSectorSidebarProps> = ({
  sectors,
  selectedSector,
  onSelectSector,
  recentStocks = [
    { symbol: "COOP", name: "The Co-operative Bank of Kenya Ltd", price: 14.5, day_change_percent: 0.69 },
    { symbol: "SCOM", name: "Safaricom Plc", price: 14.8, day_change_percent: -0.67 },
    { symbol: "EQTY", name: "Equity Group Holdings Plc", price: 48.5, day_change_percent: 1.25 },
  ],
  onSelectStock,
}) => {
  return (
    <div className="space-y-4">
      {/* Equity Sectors Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-base font-bold text-foreground tracking-tight">Equity Sectors</h2>
        {selectedSector && (
          <button
            onClick={() => onSelectSector(null)}
            className="text-xs text-emerald-500 hover:underline font-semibold"
          >
            Clear
          </button>
        )}
      </div>

      {/* Main Sectors Container Card (Dark theme matching reference screenshot) */}
      <div className="rounded-xl border border-border bg-card overflow-hidden shadow-sm">
        <div className="divide-y divide-border/60">
          {sectors.map((sec) => {
            const isSelected = selectedSector === sec.name;
            const isUp = sec.avgDayChangePercent >= 0;
            const icon = sectorIcons[sec.name] || <Building2 className="h-3.5 w-3.5 text-primary" />;

            return (
              <div
                key={sec.name}
                onClick={() => onSelectSector(isSelected ? null : sec.name)}
                className={`flex items-center justify-between p-2.5 px-3 cursor-pointer transition-all duration-150 group text-xs ${
                  isSelected
                    ? "bg-emerald-500/10 border-l-4 border-l-emerald-500"
                    : "hover:bg-muted/50"
                }`}
              >
                {/* Sector Info (Icon + Name) */}
                <div className="flex items-center gap-2.5 min-w-0 flex-1 pr-2">
                  <div className="w-6 h-6 rounded-full bg-white dark:bg-zinc-900 border border-border flex items-center justify-center shrink-0 shadow-sm">
                    {icon}
                  </div>
                  <span
                    className={`font-semibold truncate ${
                      isSelected ? "text-emerald-500 dark:text-emerald-400" : "text-foreground group-hover:text-primary"
                    }`}
                    title={sec.name}
                  >
                    {sec.name}
                  </span>
                </div>

                {/* Sector Market Cap & Trend % */}
                <div className="flex items-center gap-3 shrink-0 text-right font-mono">
                  <span className="text-[11px] text-muted-foreground tabular-nums">
                    {formatValueStr(sec.totalMarketCap)}
                  </span>
                  <span
                    className={`text-[11px] font-bold tabular-nums flex items-center gap-0.5 min-w-[55px] justify-end ${
                      isUp ? "text-emerald-500" : "text-destructive"
                    }`}
                  >
                    {isUp ? "↗" : "↘"} {isUp ? "+" : ""}
                    {sec.avgDayChangePercent.toFixed(2)}%
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Recently Visited Section */}
      <div className="pt-2 space-y-2">
        <div className="flex items-center justify-between text-xs">
          <span className="font-semibold text-foreground flex items-center gap-1.5">
            <History className="h-3.5 w-3.5 text-muted-foreground" /> Recently Visited
          </span>
          <button
            onClick={() => onSelectSector(null)}
            className="text-emerald-500 hover:underline font-semibold text-[11px]"
          >
            All Symbols
          </button>
        </div>

        <div className="rounded-xl border border-border bg-card p-1.5 space-y-1">
          {recentStocks.map((s) => (
            <div
              key={s.symbol}
              onClick={() => onSelectStock && onSelectStock(s.symbol)}
              className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50 cursor-pointer transition-colors text-xs"
            >
              <div className="flex items-center gap-2 min-w-0 pr-2">
                <span className="font-bold text-foreground bg-muted px-1.5 py-0.5 rounded text-[11px]">
                  {s.symbol}
                </span>
                <span className="text-muted-foreground truncate text-[11px]" title={s.name}>
                  {s.name}
                </span>
              </div>

              <div className="text-right shrink-0 font-mono text-[11px]">
                <span className="text-foreground font-semibold tabular-nums">
                  KSh {s.price.toFixed(2)}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default LeftSectorSidebar;
