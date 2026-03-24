import { Link, useNavigate } from "react-router-dom";
import { ArrowUpDown, ArrowUp, ArrowDown, Trophy, TrendingUp } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import YieldChange, { formatYield } from "@/components/YieldChange";
import type { FundFromDB, YieldSnapshot } from "@/lib/api";

type SortKey = "annual_yield" | "minimum_investment" | "management_fee";

interface FundSubTableProps {
  title: string;
  funds: FundFromDB[];
  snapshots: Record<string, YieldSnapshot>;
  sortKey: SortKey;
  sortDir: "asc" | "desc";
  toggleSort: (key: SortKey) => void;
  bestYield: number;
  totalInCategory: number;
}

const yieldBarWidth = (yield_: number, min: number, max: number) => {
  if (max === min) return 100;
  return Math.max(15, ((yield_ - min) / (max - min)) * 100);
};

const FundSubTable = ({
  title,
  funds,
  snapshots,
  sortKey,
  sortDir,
  toggleSort,
  bestYield,
  totalInCategory,
}: FundSubTableProps) => {
  const navigate = useNavigate();
  const yieldRange = (() => {
    if (funds.length === 0) return { min: 0, max: 1 };
    const yields = funds.map((f) => f.annual_yield);
    return { min: Math.min(...yields), max: Math.max(...yields) };
  })();

  const SortIcon = ({ field }: { field: SortKey }) => {
    if (sortKey !== field) return <ArrowUpDown className="h-3 w-3 text-muted-foreground" />;
    return sortDir === "desc"
      ? <ArrowDown className="h-3 w-3 text-accent" />
      : <ArrowUp className="h-3 w-3 text-accent" />;
  };

  const SortBtn = ({ label, field }: { label: string; field: SortKey }) => (
    <button
      onClick={() => toggleSort(field)}
      className={`flex items-center gap-1 font-semibold transition-colors ${sortKey === field ? "text-accent" : "hover:text-accent"}`}
    >
      {label} <SortIcon field={field} />
    </button>
  );

  if (funds.length === 0) return null;

  return (
    <div className="mb-6">
      <div className="flex items-center gap-2 mb-2.5">
        <h2 className="text-xs font-bold uppercase tracking-wide text-foreground">{title}</h2>
        <div className="h-px flex-1 bg-border" />
        <Badge variant="secondary" className="text-[9px] h-4 px-1.5 font-semibold">{funds.length}</Badge>
      </div>

      {/* Desktop / Tablet table */}
      <div className="hidden md:block rounded-lg border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-muted/50 border-b border-border text-xs">
                <th className="text-left px-5 py-3.5 font-semibold w-[3%]">#</th>
                <th className="text-left px-4 py-3.5 font-semibold">Fund Name</th>
                <th className="text-left px-4 py-3.5 font-semibold hidden lg:table-cell">Manager</th>
                <th className="text-right px-4 py-3.5 font-semibold hidden lg:table-cell">Daily Yield</th>
                <th className="px-4 py-3.5 min-w-[180px]">
                  <div className="flex justify-end">
                    <SortBtn label="Annual Rate" field="annual_yield" />
                  </div>
                </th>
                <th className="text-right px-4 py-3.5">
                  <SortBtn label="Min. Investment" field="minimum_investment" />
                </th>
                <th className="text-right px-4 py-3.5">
                  <SortBtn label="Mgmt Fee" field="management_fee" />
                </th>
                <th className="text-left px-4 py-3.5 font-semibold hidden lg:table-cell">Withdrawal</th>
                <th className="px-4 py-3.5 w-[70px]"></th>
              </tr>
            </thead>
            <tbody>
              {funds.map((fund, i) => {
                const isBest = fund.annual_yield === bestYield && totalInCategory > 1;
                return (
                  <tr
                    key={fund.id}
                    onClick={() => navigate(`/compare/${fund.slug}`)}
                    className={`border-t border-border transition-colors hover:bg-accent/5 cursor-pointer ${
                      isBest ? "bg-accent/[0.03]" : i % 2 === 0 ? "bg-card" : "bg-muted/20"
                    }`}
                  >
                    <td className="px-5 py-3.5 text-xs text-muted-foreground font-medium">{i + 1}</td>
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{fund.name}</span>
                        {isBest && (
                          <Badge className="bg-accent/10 text-accent border-accent/20 text-[10px] gap-0.5 h-5 px-1.5">
                            <Trophy className="h-2.5 w-2.5" /> Top
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5 lg:hidden">{fund.manager}</p>
                    </td>
                    <td className="px-4 py-3.5 text-muted-foreground hidden lg:table-cell">{fund.manager}</td>
                    <td className="px-4 py-3.5 text-right text-muted-foreground tabular-nums hidden lg:table-cell">
                      {formatYield(fund.daily_yield, fund.yield_unit)}
                      {snapshots[fund.id] && (
                        <YieldChange current={fund.daily_yield} previous={snapshots[fund.id]?.daily_yield} unit={fund.yield_unit} className="text-[10px] ml-1" />
                      )}
                    </td>
                    <td className="px-4 py-3.5 whitespace-nowrap">
                      <div className="grid items-center gap-2" style={{ gridTemplateColumns: 'minmax(0, 80px) auto auto' }}>
                        <div className="hidden xl:block h-2 bg-muted rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full bg-accent/60 transition-all"
                            style={{ width: `${yieldBarWidth(fund.annual_yield, yieldRange.min, yieldRange.max)}%` }}
                          />
                        </div>
                        <span className={`font-bold tabular-nums text-right min-w-[70px] ${isBest ? "text-accent" : "text-accent/80"}`}>
                          {formatYield(fund.annual_yield, fund.yield_unit)}
                        </span>
                        <span className="min-w-[65px] text-right">
                          {snapshots[fund.id] ? (
                            <YieldChange current={fund.annual_yield} previous={snapshots[fund.id]?.annual_yield} unit={fund.yield_unit} className="text-[10px]" />
                          ) : <span className="text-[10px] text-muted-foreground">—</span>}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3.5 text-right tabular-nums">
                      KES {fund.minimum_investment.toLocaleString()}
                    </td>
                    <td className="px-4 py-3.5 text-right tabular-nums">{fund.management_fee}%</td>
                    <td className="px-4 py-3.5 text-muted-foreground hidden lg:table-cell">{fund.withdrawal_time}</td>
                    <td className="px-4 py-3.5 text-right">
                      <Link
                        to={`/compare/${fund.slug}`}
                        className="inline-flex items-center gap-1 text-accent hover:text-accent/80 text-xs font-semibold transition-colors"
                      >
                        Details <span className="text-sm">→</span>
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mobile cards */}
      <div className="md:hidden space-y-3">
        {funds.map((fund) => {
          const isBest = fund.annual_yield === bestYield && totalInCategory > 1;
          return (
            <Link
              key={fund.id}
              to={`/compare/${fund.slug}`}
              className={`block rounded-xl border bg-card p-4 hover:shadow-md transition-all ${
                isBest ? "border-accent/30 shadow-sm" : "border-border"
              }`}
            >
              <div className="flex justify-between items-start mb-3">
                <div className="flex-1 min-w-0 mr-3">
                  <div className="flex items-center gap-2 mb-0.5">
                    <h3 className="font-semibold truncate">{fund.name}</h3>
                    {isBest && (
                      <Badge className="bg-accent/10 text-accent border-accent/20 text-[10px] gap-0.5 shrink-0">
                        <Trophy className="h-2.5 w-2.5" /> Top
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">{fund.manager}</p>
                </div>
                <div className="text-right shrink-0">
                  <span className="text-accent font-bold text-xl">{formatYield(fund.annual_yield, fund.yield_unit)}</span>
                  {snapshots[fund.id] && (
                    <YieldChange current={fund.annual_yield} previous={snapshots[fund.id]?.annual_yield} unit={fund.yield_unit} className="text-[10px]" />
                  )}
                  <p className="text-[10px] text-muted-foreground">annual</p>
                </div>
              </div>
              <div className="h-1.5 bg-muted rounded-full overflow-hidden mb-3">
                <div
                  className="h-full rounded-full bg-accent/50 transition-all"
                  style={{ width: `${yieldBarWidth(fund.annual_yield, yieldRange.min, yieldRange.max)}%` }}
                />
              </div>
              <div className="grid grid-cols-4 gap-2 text-xs text-muted-foreground">
                <div>
                  <span className="block font-medium text-foreground text-[11px]">Daily Yield</span>
                  {formatYield(fund.daily_yield, fund.yield_unit)}
                </div>
                <div>
                  <span className="block font-medium text-foreground text-[11px]">Min. Invest</span>
                  KES {fund.minimum_investment.toLocaleString()}
                </div>
                <div>
                  <span className="block font-medium text-foreground text-[11px]">Fee</span>
                  {fund.management_fee}%
                </div>
                <div>
                  <span className="block font-medium text-foreground text-[11px]">Withdrawal</span>
                  {fund.withdrawal_time}
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
};

export default FundSubTable;
