import React from "react";
import {
  Building2,
  PhoneCall,
  Factory,
  Briefcase,
  TrendingUp,
  ShieldCheck,
  Zap,
  HardHat,
  Wheat,
  Layers,
} from "lucide-react";

export interface SectorMetric {
  name: string;
  count: number;
  totalMarketCap: number;
  totalVolume: number;
  avgDayChangePercent: number;
}

interface SectorPerformanceGridProps {
  sectors: SectorMetric[];
  selectedSector: string | null;
  onSelectSector: (sector: string | null) => void;
}

const getSectorIcon = (sectorName: string) => {
  const name = sectorName.toLowerCase();
  if (name.includes("bank") || name.includes("finan")) return <Building2 className="h-4 w-4" />;
  if (name.includes("telecom")) return <PhoneCall className="h-4 w-4" />;
  if (name.includes("manuf") || name.includes("allied")) return <Factory className="h-4 w-4" />;
  if (name.includes("comm") || name.includes("service")) return <Briefcase className="h-4 w-4" />;
  if (name.includes("invest")) return <TrendingUp className="h-4 w-4" />;
  if (name.includes("insur")) return <ShieldCheck className="h-4 w-4" />;
  if (name.includes("energ") || name.includes("petrol")) return <Zap className="h-4 w-4" />;
  if (name.includes("construct")) return <HardHat className="h-4 w-4" />;
  if (name.includes("agri")) return <Wheat className="h-4 w-4" />;
  return <Layers className="h-4 w-4" />;
};

const formatMarketCapShort = (cap: number) => {
  if (cap >= 1e12) return `KSh ${(cap / 1e12).toFixed(1)}T`;
  if (cap >= 1e9) return `KSh ${(cap / 1e9).toFixed(1)}B`;
  if (cap >= 1e6) return `KSh ${(cap / 1e6).toFixed(0)}M`;
  return `KSh ${cap.toLocaleString()}`;
};

export const SectorPerformanceGrid: React.FC<SectorPerformanceGridProps> = ({
  sectors,
  selectedSector,
  onSelectSector,
}) => {
  if (!sectors || sectors.length === 0) return null;

  return (
    <div className="space-y-3 my-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
          <Layers className="h-4 w-4 text-emerald-500" /> NSE Sector Performance
        </h3>
        {selectedSector && (
          <button
            onClick={() => onSelectSector(null)}
            className="text-xs text-primary hover:underline font-medium"
          >
            Clear Filter
          </button>
        )}
      </div>

      <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide no-scrollbar">
        {/* All Sectors Pill */}
        <button
          onClick={() => onSelectSector(null)}
          className={`flex-shrink-0 flex items-center gap-2 px-3.5 py-2.5 rounded-xl border text-xs font-semibold transition-all ${
            selectedSector === null
              ? "bg-emerald-500/10 border-emerald-500/50 text-emerald-600 dark:text-emerald-400 shadow-sm"
              : "bg-card border-border text-muted-foreground hover:border-foreground/20 hover:text-foreground"
          }`}
        >
          <Layers className="h-4 w-4" />
          <span>All Sectors</span>
        </button>

        {sectors.map((sector) => {
          const isSelected = selectedSector === sector.name;
          const isUp = sector.avgDayChangePercent > 0;
          const isDown = sector.avgDayChangePercent < 0;

          return (
            <button
              key={sector.name}
              onClick={() => onSelectSector(isSelected ? null : sector.name)}
              className={`flex-shrink-0 min-w-[160px] p-3 rounded-xl border text-left transition-all relative overflow-hidden group ${
                isSelected
                  ? "bg-emerald-500/10 border-emerald-500/50 text-foreground ring-1 ring-emerald-500/30"
                  : "bg-card border-border text-foreground hover:border-foreground/30 hover:bg-muted/30"
              }`}
            >
              <div className="flex items-center justify-between gap-2 mb-1.5">
                <div className="flex items-center gap-1.5 text-muted-foreground group-hover:text-foreground transition-colors">
                  {getSectorIcon(sector.name)}
                  <span className="font-semibold text-xs truncate max-w-[100px]" title={sector.name}>
                    {sector.name}
                  </span>
                </div>
                <span
                  className={`text-[11px] font-bold tabular-nums px-1.5 py-0.5 rounded ${
                    isUp
                      ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                      : isDown
                      ? "bg-destructive/15 text-destructive"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  {isUp ? "+" : ""}
                  {sector.avgDayChangePercent.toFixed(2)}%
                </span>
              </div>

              <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                <span>{sector.count} stocks</span>
                <span className="font-medium tabular-nums">{formatMarketCapShort(sector.totalMarketCap)}</span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default SectorPerformanceGrid;
