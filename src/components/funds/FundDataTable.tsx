import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowUpDown, Shield } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { FundFromDB, FundType } from "@/lib/api";

type SortKey = "annual_yield" | "daily_yield" | "minimum_investment" | "management_fee" | "name" | "withdrawal";
type SortDir = "asc" | "desc";

const TYPE_LABELS: Record<FundType, string> = {
  money_market: "Money Market",
  fixed_income: "Fixed Income",
  balanced: "Balanced",
  equity: "Equity",
  bond: "Bond",
  special: "Special",
};

const parseDays = (s: string | null | undefined): number => {
  if (!s) return 99;
  const m = s.match(/(\d+)/);
  return m ? Number(m[1]) : 99;
};

interface FundDataTableProps {
  funds: FundFromDB[];
  defaultSort?: SortKey;
  defaultDir?: SortDir;
  showCategory?: boolean;
}

const FundDataTable = ({
  funds, defaultSort = "annual_yield", defaultDir = "desc", showCategory = false,
}: FundDataTableProps) => {
  const [sortKey, setSortKey] = useState<SortKey>(defaultSort);
  const [sortDir, setSortDir] = useState<SortDir>(defaultDir);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir(sortDir === "asc" ? "desc" : "asc");
    else { setSortKey(key); setSortDir(key === "name" || key === "minimum_investment" || key === "withdrawal" ? "asc" : "desc"); }
  };

  const sorted = useMemo(() => {
    const mul = sortDir === "asc" ? 1 : -1;
    return [...funds].sort((a, b) => {
      if (sortKey === "name") return mul * a.name.localeCompare(b.name);
      if (sortKey === "withdrawal") return mul * (parseDays(a.withdrawal_time) - parseDays(b.withdrawal_time));
      return mul * (((a as any)[sortKey] as number) - ((b as any)[sortKey] as number));
    });
  }, [funds, sortKey, sortDir]);

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      {/* Desktop */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 text-[10px] uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="text-left px-4 py-2.5">
                <SortBtn label="Fund" field="name" sortKey={sortKey} onToggle={toggleSort} />
              </th>
              {showCategory && <th className="text-left px-3 py-2.5">Category</th>}
              <th className="text-right px-3 py-2.5">
                <SortBtn label="Annual" field="annual_yield" sortKey={sortKey} onToggle={toggleSort} />
              </th>
              <th className="text-right px-3 py-2.5">
                <SortBtn label="Daily" field="daily_yield" sortKey={sortKey} onToggle={toggleSort} />
              </th>
              <th className="text-right px-3 py-2.5">
                <SortBtn label="Min." field="minimum_investment" sortKey={sortKey} onToggle={toggleSort} />
              </th>
              <th className="text-right px-3 py-2.5">
                <SortBtn label="Fee" field="management_fee" sortKey={sortKey} onToggle={toggleSort} />
              </th>
              <th className="text-right px-3 py-2.5">
                <SortBtn label="Withdrawal" field="withdrawal" sortKey={sortKey} onToggle={toggleSort} />
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/40">
            {sorted.map((f) => (
              <tr key={f.id} className="hover:bg-muted/30">
                <td className="px-4 py-2.5">
                  <Link to={`/compare/${f.slug}`} className="font-semibold text-foreground hover:text-accent inline-flex items-center gap-1.5">
                    {f.name}
                    {f.cma_licensed && (
                      <Shield className="h-3 w-3 text-accent/80" aria-label="CMA regulated" />
                    )}
                  </Link>
                  <p className="text-[11px] text-muted-foreground">{f.manager}</p>
                </td>
                {showCategory && (
                  <td className="px-3 py-2.5">
                    <Badge variant="secondary" className="text-[10px] rounded-md">
                      {TYPE_LABELS[f.fund_type] || f.fund_type}
                    </Badge>
                  </td>
                )}
                <td className="px-3 py-2.5 text-right tabular-nums font-semibold text-accent">{f.annual_yield.toFixed(2)}%</td>
                <td className="px-3 py-2.5 text-right tabular-nums text-muted-foreground">{f.daily_yield.toFixed(4)}%</td>
                <td className="px-3 py-2.5 text-right tabular-nums">KES {f.minimum_investment.toLocaleString("en-KE")}</td>
                <td className="px-3 py-2.5 text-right tabular-nums">{f.management_fee}%</td>
                <td className="px-3 py-2.5 text-right text-muted-foreground">{f.withdrawal_time}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile */}
      <div className="md:hidden divide-y divide-border/40">
        {sorted.map((f) => (
          <Link key={f.id} to={`/compare/${f.slug}`} className="block px-3.5 py-3 hover:bg-muted/20">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-foreground truncate inline-flex items-center gap-1.5">
                  {f.name}
                  {f.cma_licensed && <Shield className="h-3 w-3 text-accent/80 shrink-0" />}
                </p>
                <p className="text-[11px] text-muted-foreground truncate">{f.manager}</p>
                {showCategory && (
                  <Badge variant="secondary" className="text-[9px] rounded-md mt-1">
                    {TYPE_LABELS[f.fund_type] || f.fund_type}
                  </Badge>
                )}
              </div>
              <div className="text-right shrink-0">
                <p className="text-base font-bold tabular-nums text-accent">{f.annual_yield.toFixed(2)}%</p>
                <p className="text-[10px] text-muted-foreground tabular-nums">Daily {f.daily_yield.toFixed(4)}%</p>
              </div>
            </div>
            <div className="mt-2 grid grid-cols-3 gap-2 text-[10px] text-muted-foreground">
              <div><span className="block uppercase tracking-wider text-[9px]">Min</span><span className="text-foreground tabular-nums">KES {f.minimum_investment.toLocaleString("en-KE")}</span></div>
              <div><span className="block uppercase tracking-wider text-[9px]">Fee</span><span className="text-foreground tabular-nums">{f.management_fee}%</span></div>
              <div><span className="block uppercase tracking-wider text-[9px]">Withdrawal</span><span className="text-foreground">{f.withdrawal_time}</span></div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
};

const SortBtn = ({
  label, field, sortKey, onToggle,
}: { label: string; field: SortKey; sortKey: SortKey; onToggle: (k: SortKey) => void }) => (
  <button
    type="button"
    onClick={() => onToggle(field)}
    className="inline-flex items-center gap-1 font-semibold hover:text-accent transition-colors"
  >
    {label}
    <ArrowUpDown className={`h-3 w-3 ${sortKey === field ? "text-accent" : "text-muted-foreground/50"}`} />
  </button>
);

export default FundDataTable;
