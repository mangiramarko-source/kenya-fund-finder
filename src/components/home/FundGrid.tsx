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

const MAX_VISIBLE = 8;

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
        {Array.from({ length: MAX_VISIBLE }).map((_, j) => (
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

const ROW_HEIGHT = 30; // px per fund row
const HEADER_HEIGHT = 34; // category header
const SUBHEADER_HEIGHT = 28; // column labels row
const FOOTER_HEIGHT = 34; // "see more" row

const CategoryCard = ({
  category,
  funds,
  snapshots,
  maxRows,
}: {
  category: string;
  funds: FundFromDB[];
  snapshots: Record<string, YieldSnapshot>;
  maxRows: number;
}) => {
  const navigate = useNavigate();
  const bestYield = funds.length > 0 ? Math.max(...funds.map((f) => f.annual_yield)) : 0;
  const sorted = [...funds].sort((a, b) => b.annual_yield - a.annual_yield);
  const visible = sorted.slice(0, maxRows);
  const hasMore = sorted.length > maxRows;

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden flex flex-col">
      {/* Header */}
      <div className="bg-muted/70 px-3 py-2 flex items-center justify-between" style={{ minHeight: HEADER_HEIGHT }}>
        <h3 className="text-xs font-bold text-foreground tracking-wide">
          {categoryLabels[category] || category}
        </h3>
        <span className="text-[10px] text-muted-foreground tabular-nums">{funds.length}</span>
      </div>

      {/* Column labels */}
      <div className="px-3" style={{ minHeight: SUBHEADER_HEIGHT }}>
        <div className="flex items-center text-[10px] text-muted-foreground font-medium py-1.5">
          <span className="flex-1">Fund</span>
          <span className="w-10 text-center">Unit</span>
          <span className="w-[60px] text-right">Annual</span>
          <span className="w-[52px] text-right">Chg</span>
        </div>
      </div>

      {/* Fund rows - fixed height area */}
      <div className="flex-1 divide-y divide-border/50">
        {visible.map((fund) => (
          <div
            key={fund.id}
            onClick={() => navigate(`/compare/${fund.slug}`)}
            className="flex items-center px-3 hover:bg-muted/30 cursor-pointer transition-colors"
            style={{ height: ROW_HEIGHT }}
          >
            <div className="flex-1 min-w-0 pr-1 flex items-center gap-1">
              <Link
                to={`/compare/${fund.slug}`}
                onClick={(e) => e.stopPropagation()}
                className="text-[11px] font-medium text-foreground hover:text-accent transition-colors truncate leading-tight"
                title={fund.name}
              >
                {fund.name}
              </Link>
              {fund.annual_yield === bestYield && bestYield > 0 && (
                <Badge variant="default" className="text-[8px] px-1 py-0 h-3 bg-accent text-accent-foreground shrink-0">TOP</Badge>
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

        {/* Empty padding rows to match maxRows height */}
        {visible.length < maxRows && Array.from({ length: maxRows - visible.length }).map((_, i) => (
          <div key={`pad-${i}`} style={{ height: ROW_HEIGHT }} />
        ))}

        {funds.length === 0 && (
          <div className="px-3 py-6 text-center text-xs text-muted-foreground">No funds</div>
        )}
      </div>

      {/* Footer: See more */}
      <div className="border-t border-border" style={{ minHeight: FOOTER_HEIGHT }}>
        {hasMore ? (
          <Link
            to={`/compare?type=${category}`}
            className="flex items-center justify-center gap-1 px-3 py-2 text-[11px] font-medium text-accent hover:text-accent/80 hover:bg-muted/30 transition-colors"
          >
            See all {funds.length} funds <ArrowRight className="h-3 w-3" />
          </Link>
        ) : (
          <div className="px-3 py-2 text-[11px] text-muted-foreground text-center">
            {funds.length} fund{funds.length !== 1 ? "s" : ""}
          </div>
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
      {rows.map((row, ri) => {
        // Find the max fund count in this row to equalize heights
        const maxInRow = Math.min(MAX_VISIBLE, Math.max(...row.map((cat) => grouped[cat].length)));

        return (
          <div key={ri} className="grid grid-cols-3 gap-4" style={{ alignItems: "stretch" }}>
            {row.map((cat) => (
              <CategoryCard key={cat} category={cat} funds={grouped[cat]} snapshots={snapshots} maxRows={maxInRow} />
            ))}
            {row.length < 3 && Array.from({ length: 3 - row.length }).map((_, i) => <div key={`empty-${i}`} />)}
          </div>
        );
      })}
    </div>
  );
};

export default FundGrid;
