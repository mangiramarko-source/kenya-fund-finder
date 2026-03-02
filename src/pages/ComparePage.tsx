import { useState, useMemo, useEffect } from "react";
import { Link } from "react-router-dom";
import { ArrowUpDown, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { fetchFunds, type FundFromDB, type FundType, FUND_TYPE_LABELS } from "@/lib/api";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";

type SortKey = "annual_yield" | "minimum_investment" | "management_fee";

const fundTypes: FundType[] = ["money_market", "fixed_income", "balanced", "equity", "bond"];

const ComparePage = () => {
  useDocumentTitle("Compare Unit Trust Funds – Kenya Fund Comparison", "Side-by-side comparison of Kenya's top unit trust funds by yield, fees, and minimum investment.");
  const [funds, setFunds] = useState<FundFromDB[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortKey, setSortKey] = useState<SortKey>("annual_yield");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [managerFilter, setManagerFilter] = useState<string>("all");
  const [activeType, setActiveType] = useState<FundType>("money_market");

  useEffect(() => {
    fetchFunds().then((data) => { setFunds(data); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  const filteredByType = useMemo(() => funds.filter((f) => f.fund_type === activeType), [funds, activeType]);

  const managers = useMemo(() => [...new Set(filteredByType.map((f) => f.manager))], [filteredByType]);

  const sorted = useMemo(() => {
    let list = managerFilter === "all" ? filteredByType : filteredByType.filter((f) => f.manager === managerFilter);
    return [...list].sort((a, b) => {
      const diff = a[sortKey] - b[sortKey];
      return sortDir === "desc" ? -diff : diff;
    });
  }, [filteredByType, sortKey, sortDir, managerFilter]);

  const lastUpdated = useMemo(() => {
    if (filteredByType.length === 0) return null;
    const latest = filteredByType.reduce((max, f) => {
      const d = new Date(f.updated_at);
      return d > max ? d : max;
    }, new Date(0));
    return latest.toLocaleDateString("en-KE", { day: "numeric", month: "short", year: "numeric" });
  }, [filteredByType]);

  const typeCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    funds.forEach((f) => { counts[f.fund_type] = (counts[f.fund_type] || 0) + 1; });
    return counts;
  }, [funds]);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir((d) => (d === "desc" ? "asc" : "desc"));
    else { setSortKey(key); setSortDir("desc"); }
  };

  const handleTypeChange = (val: string) => {
    setActiveType(val as FundType);
    setManagerFilter("all");
  };

  const SortBtn = ({ label, field }: { label: string; field: SortKey }) => (
    <button onClick={() => toggleSort(field)} className="flex items-center gap-1 font-semibold hover:text-accent transition-colors">
      {label} <ArrowUpDown className="h-3 w-3" />
    </button>
  );

  if (loading) return <div className="container py-20 text-center text-muted-foreground">Loading funds...</div>;
  return (
    <div className="container py-10">
      <h1 className="text-2xl md:text-3xl font-bold mb-1">Compare Unit Trust Funds</h1>
      <p className="text-muted-foreground mb-4">All funds listed are regulated by the Capital Markets Authority of Kenya.</p>

      {/* Fund type tabs */}
      <Tabs value={activeType} onValueChange={handleTypeChange} className="mb-6">
        <TabsList className="w-full justify-start overflow-x-auto flex-nowrap">
          {fundTypes.map((type) => (
            <TabsTrigger key={type} value={type} className="whitespace-nowrap gap-1.5">
              {FUND_TYPE_LABELS[type]}
              {typeCounts[type] ? (
                <span className="text-[10px] bg-muted-foreground/10 rounded-full px-1.5 py-0.5">{typeCounts[type]}</span>
              ) : null}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {lastUpdated && (
        <p className="text-xs text-muted-foreground mb-4">Data last updated: <strong>{lastUpdated}</strong> · Yields are gross annual effective rates before 15% withholding tax.</p>
      )}

      {managers.length > 1 && (
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <Select value={managerFilter} onValueChange={setManagerFilter}>
              <SelectTrigger className="w-[220px]"><SelectValue placeholder="All Fund Managers" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Fund Managers</SelectItem>
                {managers.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>
      )}

      {sorted.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <p className="text-lg font-medium mb-1">No {FUND_TYPE_LABELS[activeType]} funds yet</p>
          <p className="text-sm">Check back soon — we're adding more funds regularly.</p>
        </div>
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden md:block rounded-lg border border-border overflow-hidden overflow-x-auto">
            <table className="w-full text-sm table-fixed min-w-[800px]">
              <thead>
                <tr className="bg-muted">
                  <th className="text-left px-4 py-3 font-semibold w-[20%]">Fund Name</th>
                  <th className="text-left px-4 py-3 font-semibold w-[15%]">Manager</th>
                  <th className="text-right px-4 py-3 font-semibold w-[10%]">Daily Yield</th>
                  <th className="text-right px-4 py-3 w-[12%]"><SortBtn label="Annual Rate" field="annual_yield" /></th>
                  <th className="text-right px-4 py-3 w-[14%]"><SortBtn label="Min. Investment" field="minimum_investment" /></th>
                  <th className="text-right px-4 py-3 w-[10%]"><SortBtn label="Mgmt Fee" field="management_fee" /></th>
                  <th className="text-left px-4 py-3 font-semibold w-[11%]">Withdrawal</th>
                  <th className="px-4 py-3 w-[8%]"></th>
                </tr>
              </thead>
              <tbody>
                {sorted.map((fund, i) => (
                  <tr key={fund.id} className={`border-t border-border ${i % 2 === 0 ? "bg-card" : "bg-muted/30"} hover:bg-muted/50 transition-colors`}>
                    <td className="px-4 py-3 font-medium truncate">{fund.name}</td>
                    <td className="px-4 py-3 text-muted-foreground truncate">{fund.manager}</td>
                    <td className="px-4 py-3 text-right text-muted-foreground tabular-nums">{fund.daily_yield}%</td>
                    <td className="px-4 py-3 text-right font-semibold text-accent tabular-nums">{fund.annual_yield}%</td>
                    <td className="px-4 py-3 text-right tabular-nums">KES {fund.minimum_investment.toLocaleString()}</td>
                    <td className="px-4 py-3 text-right tabular-nums">{fund.management_fee}%</td>
                    <td className="px-4 py-3 text-muted-foreground">{fund.withdrawal_time}</td>
                    <td className="px-4 py-3 text-right">
                      <Link to={`/compare/${fund.slug}`} className="text-accent hover:underline text-xs font-medium whitespace-nowrap">Details →</Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="md:hidden space-y-3">
            {sorted.map((fund) => (
              <Link key={fund.id} to={`/compare/${fund.slug}`} className="block rounded-lg border border-border bg-card p-4 hover:shadow-md transition-shadow">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <h3 className="font-semibold">{fund.name}</h3>
                    <p className="text-xs text-muted-foreground">{fund.manager}</p>
                  </div>
                  <span className="text-accent font-bold text-lg">{fund.annual_yield}%</span>
                </div>
                <div className="grid grid-cols-4 gap-2 text-xs text-muted-foreground">
                  <div><span className="block font-medium text-foreground">Daily Yield</span>{fund.daily_yield}%</div>
                  <div><span className="block font-medium text-foreground">Min. Invest</span>KES {fund.minimum_investment.toLocaleString()}</div>
                  <div><span className="block font-medium text-foreground">Fee</span>{fund.management_fee}%</div>
                  <div><span className="block font-medium text-foreground">Withdrawal</span>{fund.withdrawal_time}</div>
                </div>
              </Link>
            ))}
          </div>
        </>
      )}

      <div className="mt-8 p-4 rounded-lg bg-muted/50 border border-border">
        <p className="text-xs text-muted-foreground leading-relaxed">
          <strong>Disclaimer:</strong> Yields shown are gross annual effective rates before the 15% withholding tax. Past performance is not indicative of future results. Data is sourced from publicly available fund fact sheets and may not reflect real-time values. This platform does not offer investment advice. Please consult a licensed financial advisor before making investment decisions.
        </p>
      </div>
    </div>
  );
};

export default ComparePage;
