import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { ArrowUpDown, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { funds } from "@/data/funds";

type SortKey = "annualYield" | "minimumInvestment" | "managementFee";

const ComparePage = () => {
  const [sortKey, setSortKey] = useState<SortKey>("annualYield");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [managerFilter, setManagerFilter] = useState<string>("all");

  const managers = useMemo(() => [...new Set(funds.map((f) => f.manager))], []);

  const sorted = useMemo(() => {
    let list = managerFilter === "all" ? funds : funds.filter((f) => f.manager === managerFilter);
    return [...list].sort((a, b) => {
      const diff = a[sortKey] - b[sortKey];
      return sortDir === "desc" ? -diff : diff;
    });
  }, [sortKey, sortDir, managerFilter]);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir((d) => (d === "desc" ? "asc" : "desc"));
    else { setSortKey(key); setSortDir("desc"); }
  };

  const SortBtn = ({ label, field }: { label: string; field: SortKey }) => (
    <button onClick={() => toggleSort(field)} className="flex items-center gap-1 font-semibold hover:text-accent transition-colors">
      {label} <ArrowUpDown className="h-3 w-3" />
    </button>
  );

  return (
    <div className="container py-10">
      <h1 className="text-2xl md:text-3xl font-bold mb-2">Compare Money Market Funds</h1>
      <p className="text-muted-foreground mb-6">All funds listed are regulated by the Capital Markets Authority of Kenya.</p>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <Select value={managerFilter} onValueChange={setManagerFilter}>
            <SelectTrigger className="w-[220px]">
              <SelectValue placeholder="All Fund Managers" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Fund Managers</SelectItem>
              {managers.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <p className="text-xs text-muted-foreground self-center ml-auto">Last Updated: January 2025</p>
      </div>

      {/* Desktop table */}
      <div className="hidden md:block rounded-lg border border-border overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-muted">
              <th className="text-left px-4 py-3 font-semibold">Fund Name</th>
              <th className="text-left px-4 py-3 font-semibold">Manager</th>
              <th className="text-right px-4 py-3"><SortBtn label="Annual Yield" field="annualYield" /></th>
              <th className="text-right px-4 py-3 font-semibold">7-Day Yield</th>
              <th className="text-right px-4 py-3"><SortBtn label="Min. Investment" field="minimumInvestment" /></th>
              <th className="text-right px-4 py-3"><SortBtn label="Mgmt Fee" field="managementFee" /></th>
              <th className="text-left px-4 py-3 font-semibold">Withdrawal</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((fund, i) => (
              <tr key={fund.id} className={`border-t border-border ${i % 2 === 0 ? "bg-card" : "bg-muted/30"} hover:bg-muted/50 transition-colors`}>
                <td className="px-4 py-3 font-medium">{fund.name}</td>
                <td className="px-4 py-3 text-muted-foreground">{fund.manager}</td>
                <td className="px-4 py-3 text-right font-semibold text-accent">{fund.annualYield}%</td>
                <td className="px-4 py-3 text-right">{fund.sevenDayYield}%</td>
                <td className="px-4 py-3 text-right">KES {fund.minimumInvestment.toLocaleString()}</td>
                <td className="px-4 py-3 text-right">{fund.managementFee}%</td>
                <td className="px-4 py-3 text-muted-foreground">{fund.withdrawalTime}</td>
                <td className="px-4 py-3 text-right">
                  <Link to={`/compare/${fund.id}`} className="text-accent hover:underline text-xs font-medium">Details →</Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile cards */}
      <div className="md:hidden space-y-3">
        {sorted.map((fund) => (
          <Link key={fund.id} to={`/compare/${fund.id}`} className="block rounded-lg border border-border bg-card p-4 hover:shadow-md transition-shadow">
            <div className="flex justify-between items-start mb-2">
              <div>
                <h3 className="font-semibold">{fund.name}</h3>
                <p className="text-xs text-muted-foreground">{fund.manager}</p>
              </div>
              <span className="text-accent font-bold text-lg">{fund.annualYield}%</span>
            </div>
            <div className="grid grid-cols-3 gap-2 text-xs text-muted-foreground">
              <div>
                <span className="block font-medium text-foreground">Min. Invest</span>
                KES {fund.minimumInvestment.toLocaleString()}
              </div>
              <div>
                <span className="block font-medium text-foreground">Fee</span>
                {fund.managementFee}%
              </div>
              <div>
                <span className="block font-medium text-foreground">Withdrawal</span>
                {fund.withdrawalTime}
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
};

export default ComparePage;
