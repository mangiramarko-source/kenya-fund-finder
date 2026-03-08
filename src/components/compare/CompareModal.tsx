import { Link } from "react-router-dom";
import { X, ExternalLink, Trophy, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCompare } from "@/hooks/useCompare";
import { formatYield } from "@/components/YieldChange";

const CompareModal = () => {
  const { selected, isOpen, setIsOpen, clear } = useCompare();

  if (!isOpen || selected.length < 2) return null;

  const metrics = [
    {
      label: "Annual Rate",
      key: "annual_yield" as const,
      format: (f: typeof selected[0]) => formatYield(f.annual_yield, f.yield_unit),
      best: "highest" as const,
    },
    {
      label: "Daily Yield",
      key: "daily_yield" as const,
      format: (f: typeof selected[0]) => formatYield(f.daily_yield, f.yield_unit),
      best: "highest" as const,
    },
    {
      label: "Management Fee",
      key: "management_fee" as const,
      format: (f: typeof selected[0]) => `${f.management_fee}%`,
      best: "lowest" as const,
    },
    {
      label: "Min. Investment",
      key: "minimum_investment" as const,
      format: (f: typeof selected[0]) => `KES ${f.minimum_investment.toLocaleString()}`,
      best: "lowest" as const,
    },
    {
      label: "Withdrawal",
      key: "withdrawal_time" as const,
      format: (f: typeof selected[0]) => f.withdrawal_time,
      best: null,
    },
  ];

  const getBestIndex = (key: string, direction: "highest" | "lowest" | null) => {
    if (!direction) return -1;
    const values = selected.map((f) => Number((f as any)[key]) || 0);
    if (direction === "highest") return values.indexOf(Math.max(...values));
    return values.indexOf(Math.min(...values));
  };

  return (
    <div className="fixed inset-0 z-[60] bg-background/80 backdrop-blur-sm flex items-start justify-center pt-8 sm:pt-16 px-4 overflow-y-auto">
      <div className="w-full max-w-4xl bg-card border border-border rounded-2xl shadow-2xl mb-8 animate-in fade-in zoom-in-95">
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-6 border-b border-border">
          <div>
            <h2 className="text-xl font-bold flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-accent" />
              Fund Comparison
            </h2>
            <p className="text-sm text-muted-foreground mt-0.5">
              Comparing {selected.length} funds side by side
            </p>
          </div>
          <Button variant="ghost" size="icon" onClick={() => setIsOpen(false)}>
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Fund headers */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left p-4 text-xs font-medium text-muted-foreground uppercase tracking-wider w-[140px] sm:w-[160px]">
                  Metric
                </th>
                {selected.map((fund) => (
                  <th key={fund.id} className="p-4 text-left min-w-[160px]">
                    <Link
                      to={`/compare/${fund.slug}`}
                      onClick={() => setIsOpen(false)}
                      className="text-sm font-semibold hover:text-accent transition-colors line-clamp-2"
                    >
                      {fund.name}
                    </Link>
                    <p className="text-[11px] text-muted-foreground mt-0.5 truncate">{fund.manager}</p>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {metrics.map((metric) => {
                const bestIdx = getBestIndex(metric.key, metric.best);
                return (
                  <tr key={metric.key} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                    <td className="p-4 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      {metric.label}
                    </td>
                    {selected.map((fund, idx) => (
                      <td key={fund.id} className="p-4">
                        <div className="flex items-center gap-2">
                          <span className={`text-sm font-bold tabular-nums ${
                            idx === bestIdx ? "text-accent" : "text-foreground"
                          }`}>
                            {metric.format(fund)}
                          </span>
                          {idx === bestIdx && metric.best && (
                            <Trophy className="h-3.5 w-3.5 text-accent shrink-0" />
                          )}
                        </div>
                      </td>
                    ))}
                  </tr>
                );
              })}
              {/* Description row */}
              <tr className="border-b border-border/50">
                <td className="p-4 text-xs font-medium text-muted-foreground uppercase tracking-wider align-top">
                  Description
                </td>
                {selected.map((fund) => (
                  <td key={fund.id} className="p-4">
                    <p className="text-xs text-muted-foreground leading-relaxed line-clamp-3">{fund.description}</p>
                  </td>
                ))}
              </tr>
              {/* Actions row */}
              <tr>
                <td className="p-4"></td>
                {selected.map((fund) => (
                  <td key={fund.id} className="p-4">
                    <div className="flex flex-col gap-2">
                      <Button asChild size="sm" variant="outline" className="text-xs h-8 w-fit">
                        <Link to={`/compare/${fund.slug}`} onClick={() => setIsOpen(false)}>
                          View Details
                        </Link>
                      </Button>
                      <Button asChild size="sm" variant="ghost" className="text-xs h-7 w-fit">
                        <a href={fund.website} target="_blank" rel="noopener noreferrer">
                          Website <ExternalLink className="ml-1 h-3 w-3" />
                        </a>
                      </Button>
                    </div>
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-border flex justify-between items-center">
          <p className="text-[10px] text-muted-foreground">
            <Trophy className="inline h-3 w-3 text-accent mr-1" />
            indicates best value for each metric
          </p>
          <Button variant="outline" size="sm" onClick={() => { clear(); setIsOpen(false); }} className="text-xs">
            Clear & Close
          </Button>
        </div>
      </div>
    </div>
  );
};

export default CompareModal;
