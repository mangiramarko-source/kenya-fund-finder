import { Link, useNavigate } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import YieldChange from "@/components/YieldChange";
import type { FundFromDB, YieldSnapshot } from "@/lib/api";

const categoryLabels: Record<string, string> = {
  money_market: "Money Market",
  fixed_income: "Fixed Income",
  balanced: "Balanced",
  equity: "Equity",
  bond: "Bond",
};

const categoryOrder = ["money_market", "fixed_income", "bond", "balanced", "equity"];

/** Format yield value */
const fmtYield = (value: number, unit: string) => {
  if (unit === "%") return `${value}%`;
  return value.toFixed(2);
};

const currencyLabel = (unit: string) => {
  if (unit === "%") return "%";
  if (unit === "KES") return "KSh";
  return unit;
};

interface FundGridProps {
  funds: FundFromDB[];
  snapshots: Record<string, YieldSnapshot>;
  loading: boolean;
}

const GridSkeleton = () => (
  <div className="grid grid-cols-3 gap-4">
    {Array.from({ length: 3 }).map((_, i) => (
      <div key={i} className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="bg-muted/70 px-3 py-2.5">
          <Skeleton className="h-4 w-24" />
        </div>
        {Array.from({ length: 5 }).map((_, j) => (
          <div key={j} className="flex items-center gap-2 px-3 py-2 border-t border-border">
            <Skeleton className="h-3 w-32 flex-1" />
            <Skeleton className="h-3 w-12" />
            <Skeleton className="h-3 w-10" />
          </div>
        ))}
      </div>
    ))}
  </div>
);

const CategoryCard = ({
  category,
  funds,
  snapshots,
}: {
  category: string;
  funds: FundFromDB[];
  snapshots: Record<string, YieldSnapshot>;
}) => {
  const navigate = useNavigate();
  const bestYield = funds.length > 0 ? Math.max(...funds.map((f) => f.annual_yield)) : 0;
  const sorted = [...funds].sort((a, b) => b.annual_yield - a.annual_yield);

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden flex flex-col">
      <div className="bg-muted/70 px-3 py-2 flex items-center justify-between">
        <h3 className="text-xs font-bold text-foreground tracking-wide">
          {categoryLabels[category] || category}
        </h3>
        <span className="text-[10px] text-muted-foreground tabular-nums">{funds.length}</span>
      </div>
      <div className="px-3 py-1">
        <div className="flex items-center text-[10px] text-muted-foreground font-medium py-1.5">
          <span className="flex-1">Fund</span>
          <span className="w-10 text-center">Unit</span>
          <span className="w-[60px] text-right">Annual</span>
          <span className="w-[52px] text-right">Chg</span>
        </div>
      </div>
      <div className="flex-1 divide-y divide-border/50">
        {sorted.map((fund) => (
          <div
            key={fund.id}
            onClick={() => navigate(`/compare/${fund.slug}`)}
            className="flex items-center px-3 py-[6px] hover:bg-muted/30 cursor-pointer transition-colors group"
          >
            <div className="flex-1 min-w-0 pr-1">
              <Link
                to={`/compare/${fund.slug}`}
                onClick={(e) => e.stopPropagation()}
                className="text-[11px] font-medium text-foreground hover:text-accent transition-colors truncate block leading-tight"
                title={fund.name}
              >
                {fund.name}
              </Link>
              {fund.annual_yield === bestYield && bestYield > 0 && (
                <Badge variant="default" className="text-[8px] px-1 py-0 h-3 bg-accent text-accent-foreground mt-0.5">TOP</Badge>
              )}
            </div>
            <span className="w-10 text-center text-[10px] text-muted-foreground shrink-0">
              {currencyLabel(fund.yield_unit)}
            </span>
            <span className="w-[60px] text-right text-[11px] font-bold text-accent tabular-nums shrink-0">
              {fmtYield(fund.annual_yield, fund.yield_unit)}
            </span>
            <span className="w-[52px] text-right shrink-0">
              {snapshots[fund.id] ? (
                <YieldChange
                  current={fund.annual_yield}
                  previous={snapshots[fund.id]?.annual_yield}
                  unit={fund.yield_unit}
                  className="text-[10px] justify-end"
                />
              ) : (
                <span className="text-[10px] text-muted-foreground">—</span>
              )}
            </span>
          </div>
        ))}
        {funds.length === 0 && (
          <div className="px-3 py-6 text-center text-xs text-muted-foreground">No funds</div>
        )}
      </div>
    </div>
  );
};

const FundGrid = ({ funds, snapshots, loading }: FundGridProps) => {
  if (loading) return <GridSkeleton />;

  // Group funds by category
  const grouped: Record<string, FundFromDB[]> = {};
  funds.forEach((f) => {
    if (!grouped[f.fund_type]) grouped[f.fund_type] = [];
    grouped[f.fund_type].push(f);
  });

  const categories = Object.keys(grouped).sort((a, b) => {
    const ai = categoryOrder.indexOf(a);
    const bi = categoryOrder.indexOf(b);
    return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi);
  });

  // Split into rows of 3
  const rows: string[][] = [];
  for (let i = 0; i < categories.length; i += 3) {
    rows.push(categories.slice(i, i + 3));
  }

  return (
    <div className="space-y-4">
      {rows.map((row, ri) => (
        <div key={ri} className="grid grid-cols-3 gap-4" style={{ alignItems: "start" }}>
          {row.map((cat) => (
            <CategoryCard key={cat} category={cat} funds={grouped[cat]} snapshots={snapshots} />
          ))}
          {/* Fill empty slots */}
          {row.length < 3 && Array.from({ length: 3 - row.length }).map((_, i) => <div key={`empty-${i}`} />)}
        </div>
      ))}
    </div>
  );
};

export default FundGrid;
