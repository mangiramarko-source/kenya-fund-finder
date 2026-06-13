import { Link } from "react-router-dom";
import { X, ExternalLink, ArrowUp, ArrowDown, GitCompareArrows } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCompare } from "@/hooks/useCompare";
import { formatYield } from "@/components/YieldChange";
import DisclaimerBlock from "@/components/DisclaimerBlock";

type Extreme = "highest" | "lowest" | null;

const CompareModal = () => {
  const { selected, isOpen, setIsOpen, clear } = useCompare();

  if (!isOpen || selected.length < 2) return null;

  const metrics: { label: string; key: keyof typeof selected[0]; format: (f: typeof selected[0]) => string; extreme: Extreme }[] = [
    {
      label: "Annual Rate",
      key: "annual_yield",
      format: (f) => formatYield(f.annual_yield, f.yield_unit),
      extreme: "highest",
    },
    {
      label: "Daily Yield",
      key: "daily_yield",
      format: (f) => formatYield(f.daily_yield, f.yield_unit),
      extreme: "highest",
    },
    {
      label: "Management Fee",
      key: "management_fee",
      format: (f) => `${f.management_fee}%`,
      extreme: "lowest",
    },
    {
      label: "Min. Investment",
      key: "minimum_investment",
      format: (f) => `KES ${f.minimum_investment.toLocaleString()}`,
      extreme: "lowest",
    },
    {
      label: "Withdrawal",
      key: "withdrawal_time",
      format: (f) => f.withdrawal_time,
      extreme: null,
    },
  ];

  const getExtremeIndex = (key: string, direction: Extreme) => {
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
              <GitCompareArrows className="h-5 w-5 text-accent" />
              Side-by-side data
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
                const extremeIdx = getExtremeIndex(metric.key as string, metric.extreme);
                const extremeLabel =
                  metric.extreme === "highest"
                    ? "Highest value in this comparison"
                    : metric.extreme === "lowest"
                      ? "Lowest value in this comparison"
                      : "";
                return (
                  <tr key={metric.key as string} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                    <td className="p-4 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      {metric.label}
                    </td>
                    {selected.map((fund, idx) => (
                      <td key={fund.id} className="p-4">
                        <div className="flex items-center gap-1.5">
                          <span className={`text-sm font-bold tabular-nums ${
                            idx === extremeIdx ? "text-foreground" : "text-muted-foreground"
                          }`}>
                            {metric.format(fund)}
                          </span>
                          {idx === extremeIdx && metric.extreme && (
                            <span
                              className="inline-flex items-center text-muted-foreground/70 shrink-0"
                              title={extremeLabel}
                              aria-label={extremeLabel}
                            >
                              {metric.extreme === "highest"
                                ? <ArrowUp className="h-3 w-3" />
                                : <ArrowDown className="h-3 w-3" />}
                            </span>
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
                      {fund.website && /^https?:\/\//i.test(fund.website) && (
                        <Button asChild size="sm" variant="ghost" className="text-xs h-7 w-fit">
                          <a href={fund.website} target="_blank" rel="noopener noreferrer">
                            Website <ExternalLink className="ml-1 h-3 w-3" />
                          </a>
                        </Button>
                      )}
                    </div>
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-border space-y-3">
          <div className="flex justify-between items-center gap-3 flex-wrap">
            <p className="text-[10px] text-muted-foreground inline-flex items-center gap-2 flex-wrap">
              <span className="inline-flex items-center gap-1"><ArrowUp className="h-3 w-3" /> Highest value in this comparison</span>
              <span className="text-muted-foreground/40">·</span>
              <span className="inline-flex items-center gap-1"><ArrowDown className="h-3 w-3" /> Lowest value in this comparison</span>
            </p>
            <Button variant="outline" size="sm" onClick={() => { clear(); setIsOpen(false); }} className="text-xs">
              Clear & Close
            </Button>
          </div>
          <DisclaimerBlock variant="compact" />
        </div>
      </div>
    </div>
  );
};

export default CompareModal;
