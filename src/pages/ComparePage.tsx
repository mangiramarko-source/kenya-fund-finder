import { useState, useMemo, useEffect } from "react";
import { Link } from "react-router-dom";
import { ArrowUpDown, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { fetchFunds, type FundFromDB } from "@/lib/api";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";

type SortKey = "annual_yield" | "minimum_investment" | "management_fee";

const ComparePage = () => {
  useDocumentTitle("Compare Money Market Funds – Kenya MMF Comparison", "Side-by-side comparison of Kenya's top money market funds by yield, fees, and minimum investment.");
  const [funds, setFunds] = useState<FundFromDB[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortKey, setSortKey] = useState<SortKey>("annual_yield");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [managerFilter, setManagerFilter] = useState<string>("all");

  useEffect(() => {
    fetchFunds().then((data) => { setFunds(data); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  const managers = useMemo(() => [...new Set(funds.map((f) => f.manager))], [funds]);

  const sorted = useMemo(() => {
    let list = managerFilter === "all" ? funds : funds.filter((f) => f.manager === managerFilter);
    return [...list].sort((a, b) => {
      const diff = a[sortKey] - b[sortKey];
      return sortDir === "desc" ? -diff : diff;
    });
  }, [funds, sortKey, sortDir, managerFilter]);

  const lastUpdated = useMemo(() => {
    if (funds.length === 0) return null;
    const latest = funds.reduce((max, f) => {
      const d = new Date(f.updated_at);
      return d > max ? d : max;
    }, new Date(0));
    return latest.toLocaleDateString("en-KE", { day: "numeric", month: "short", year: "numeric" });
  }, [funds]);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir((d) => (d === "desc" ? "asc" : "desc"));
    else { setSortKey(key); setSortDir("desc"); }
  };

  const SortBtn = ({ label, field }: { label: string; field: SortKey }) => (
    <button onClick={() => toggleSort(field)} className="flex items-center gap-1 font-semibold hover:text-accent transition-colors">
      {label} <ArrowUpDown className="h-3 w-3" />
    </button>
  );

  if (loading) return <div className="container py-20 text-center text-muted-foreground">Loading funds...</div>;
  return (
    <div className="container py-10">
      <h1 className="text-2xl md:text-3xl font-bold mb-1">Compare Money Market Funds</h1>
      <p className="text-muted-foreground mb-1">All funds listed are regulated by the Capital Markets Authority of Kenya.</p>
      {lastUpdated && (
        <p className="text-xs text-muted-foreground mb-6">Data last updated: <strong>{lastUpdated}</strong> · Yields are gross annual effective rates before 15% withholding tax.</p>
      )}

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

      {/* Desktop table */}
      <div className="hidden md:block rounded-lg border border-border overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-muted">
              <th className="text-left px-4 py-3 font-semibold">Fund Name</th>
              <th className="text-left px-4 py-3 font-semibold">Manager</th>
              <th className="text-right px-4 py-3"><SortBtn label="Annual Yield" field="annual_yield" /></th>
              <th className="text-right px-4 py-3"><SortBtn label="Min. Investment" field="minimum_investment" /></th>
              <th className="text-right px-4 py-3"><SortBtn label="Mgmt Fee" field="management_fee" /></th>
              <th className="text-left px-4 py-3 font-semibold">Withdrawal</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((fund, i) => (
              <tr key={fund.id} className={`border-t border-border ${i % 2 === 0 ? "bg-card" : "bg-muted/30"} hover:bg-muted/50 transition-colors`}>
                <td className="px-4 py-3 font-medium">{fund.name}</td>
                <td className="px-4 py-3 text-muted-foreground">{fund.manager}</td>
                <td className="px-4 py-3 text-right font-semibold text-accent">{fund.annual_yield}%</td>
                <td className="px-4 py-3 text-right">KES {fund.minimum_investment.toLocaleString()}</td>
                <td className="px-4 py-3 text-right">{fund.management_fee}%</td>
                <td className="px-4 py-3 text-muted-foreground">{fund.withdrawal_time}</td>
                <td className="px-4 py-3 text-right">
                  <Link to={`/compare/${fund.slug}`} className="text-accent hover:underline text-xs font-medium">Details →</Link>
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
            <div className="grid grid-cols-3 gap-2 text-xs text-muted-foreground">
              <div><span className="block font-medium text-foreground">Min. Invest</span>KES {fund.minimum_investment.toLocaleString()}</div>
              <div><span className="block font-medium text-foreground">Fee</span>{fund.management_fee}%</div>
              <div><span className="block font-medium text-foreground">Withdrawal</span>{fund.withdrawal_time}</div>
            </div>
          </Link>
        ))}
      </div>

      <div className="mt-8 p-4 rounded-lg bg-muted/50 border border-border">
        <p className="text-xs text-muted-foreground leading-relaxed">
          <strong>Disclaimer:</strong> Yields shown are gross annual effective rates before the 15% withholding tax. Past performance is not indicative of future results. Data is sourced from publicly available fund fact sheets and may not reflect real-time values. This platform does not offer investment advice. Please consult a licensed financial advisor before making investment decisions.
        </p>
      </div>
    </div>
  );
};

export default ComparePage;
