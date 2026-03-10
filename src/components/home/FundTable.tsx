import { Link, useNavigate } from "react-router-dom";
import { ArrowRight, ArrowUpDown } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import YieldChange from "@/components/YieldChange";
import type { FundFromDB, YieldSnapshot } from "@/lib/api";

type SortKey = "annual_yield" | "daily_yield" | "management_fee" | "minimum_investment" | "name";

interface FundTableProps {
  funds: FundFromDB[];
  snapshots: Record<string, YieldSnapshot>;
  bestYield: number;
  sortKey: SortKey;
  sortDir: "asc" | "desc";
  onToggleSort: (key: SortKey) => void;
  loading: boolean;
  onClearSearch: () => void;
  hasSearch: boolean;
}

/** Map yield_unit to short currency label */
const currencyLabel = (unit: string) => {
  if (unit === "%" || unit === "KES") return "Sh";
  return unit;
};

const SortHeader = ({ label, field, sortKey, onToggleSort, className = "" }: { label: string; field: SortKey; sortKey: SortKey; onToggleSort: (key: SortKey) => void; className?: string }) => (
  <button onClick={() => onToggleSort(field)} className={`inline-flex items-center gap-1 font-semibold hover:text-accent transition-colors ${className}`}>
    {label}
    <ArrowUpDown className={`h-3 w-3 ${sortKey === field ? "text-accent" : "text-muted-foreground/50"}`} />
  </button>
);

const TableSkeleton = () => (
  <div className="rounded-xl border border-border overflow-hidden bg-card">
    <div className="bg-muted/70 px-4 py-3">
      <div className="flex gap-4">
        <Skeleton className="h-4 w-8" />
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-4 w-14" />
        <Skeleton className="h-4 w-24 ml-auto" />
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-4 w-16" />
        <Skeleton className="h-4 w-12" />
      </div>
    </div>
    {Array.from({ length: 6 }).map((_, i) => (
      <div key={i} className="flex items-center gap-4 px-4 py-3.5 border-t border-border">
        <Skeleton className="h-4 w-5" />
        <div className="flex-1">
          <Skeleton className="h-4 w-40 mb-1.5" />
          <Skeleton className="h-3 w-24" />
        </div>
        <Skeleton className="h-4 w-10" />
        <Skeleton className="h-5 w-16" />
        <Skeleton className="h-4 w-14" />
        <Skeleton className="h-4 w-14" />
        <Skeleton className="h-4 w-10" />
      </div>
    ))}
  </div>
);

const EmptyState = ({ hasSearch, onClearSearch }: { hasSearch: boolean; onClearSearch: () => void }) => (
  <tr>
    <td colSpan={8} className="text-center py-14">
      <div className="flex flex-col items-center gap-3">
        <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
          <span className="text-2xl">📊</span>
        </div>
        <p className="text-sm text-muted-foreground font-medium">No funds match your filters</p>
        {hasSearch && (
          <button onClick={onClearSearch} className="text-xs text-accent hover:text-accent/80 font-medium transition-colors">
            Clear search
          </button>
        )}
      </div>
    </td>
  </tr>
);

/** Format yield as percentage string (without unit prefix) */
const fmtYield = (value: number) => `${value}%`;

const FundTable = ({ funds, snapshots, bestYield, sortKey, sortDir, onToggleSort, loading, onClearSearch, hasSearch }: FundTableProps) => {
  const navigate = useNavigate();
  if (loading) return <TableSkeleton />;

  return (
    <div className="rounded-xl border border-border overflow-hidden bg-card">
      <table className="w-full text-sm table-fixed">
        <colgroup>
          <col className="w-10" />
          <col />
          <col className="w-16" />
          <col className="w-28" />
          <col className="w-28" />
          <col className="w-28" />
          <col className="w-16" />
          <col className="w-12" />
        </colgroup>
        <thead>
          <tr className="bg-muted/70 text-xs">
            <th className="text-left px-4 py-3 font-semibold text-muted-foreground">#</th>
            <th className="text-left px-4 py-3"><SortHeader label="Fund Name" field="name" sortKey={sortKey} onToggleSort={onToggleSort} /></th>
            <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Currency</th>
            <th className="text-right px-4 py-3"><SortHeader label="Daily Yield" field="daily_yield" sortKey={sortKey} onToggleSort={onToggleSort} className="justify-end" /></th>
            <th className="text-right px-4 py-3"><SortHeader label="Annual Rate" field="annual_yield" sortKey={sortKey} onToggleSort={onToggleSort} className="justify-end" /></th>
            <th className="text-right px-4 py-3 font-semibold text-muted-foreground">Change</th>
            <th className="text-right px-4 py-3"><SortHeader label="Fee" field="management_fee" sortKey={sortKey} onToggleSort={onToggleSort} className="justify-end" /></th>
            <th className="px-4 py-3"></th>
          </tr>
        </thead>
        <tbody>
          {funds.map((fund, i) => (
            <tr key={fund.id} onClick={() => navigate(`/compare/${fund.slug}`)} className="border-t border-border hover:bg-muted/30 transition-colors cursor-pointer">
              <td className="px-4 py-3.5 text-muted-foreground text-xs tabular-nums">{i + 1}</td>
              <td className="px-4 py-3.5">
                <Link to={`/compare/${fund.slug}`} className="font-semibold hover:text-accent transition-colors">
                  {fund.name}
                </Link>
                {fund.annual_yield === bestYield && bestYield > 0 && (
                  <Badge variant="default" className="ml-2 text-[9px] px-1.5 py-0 h-4 bg-accent text-accent-foreground align-middle">TOP</Badge>
                )}
                <span className="block text-xs text-muted-foreground mt-0.5">{fund.manager}</span>
              </td>
              <td className="px-4 py-3.5 text-xs font-medium text-muted-foreground">{currencyLabel(fund.yield_unit)}</td>
              <td className="px-4 py-3.5 text-right tabular-nums whitespace-nowrap text-muted-foreground">
                {fmtYield(fund.daily_yield)}
              </td>
              <td className="px-4 py-3.5 text-right whitespace-nowrap tabular-nums">
                <span className="font-bold text-accent text-base">{fmtYield(fund.annual_yield)}</span>
              </td>
              <td className="px-4 py-3.5 text-right whitespace-nowrap">
                {snapshots[fund.id] ? (
                  <YieldChange current={fund.annual_yield} previous={snapshots[fund.id]?.annual_yield} unit={fund.yield_unit} className="text-xs justify-end" />
                ) : (
                  <span className="text-xs text-muted-foreground">—</span>
                )}
              </td>
              <td className="px-4 py-3.5 text-right tabular-nums text-muted-foreground">{fund.management_fee}%</td>
              <td className="px-4 py-3.5 text-right">
                <Link to={`/compare/${fund.slug}`} className="text-accent hover:text-accent/80 transition-colors">
                  <ArrowRight className="h-4 w-4 inline-block" />
                </Link>
              </td>
            </tr>
          ))}
          {funds.length === 0 && <EmptyState hasSearch={hasSearch} onClearSearch={onClearSearch} />}
        </tbody>
      </table>
    </div>
  );
};

export default FundTable;
