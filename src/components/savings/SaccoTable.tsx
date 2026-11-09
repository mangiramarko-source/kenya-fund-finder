import { useState, useMemo } from "react";
import { Plus, Check, Users, ShieldCheck, ExternalLink, ArrowUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { SaccoRecord } from "@/types/savings";
import { useUniversalCompare } from "@/hooks/useUniversalCompare";

interface SaccoTableProps {
  saccos: SaccoRecord[];
}

type SaccoSortKey = "interest" | "dividend" | "assets";

export const SaccoTable = ({ saccos }: SaccoTableProps) => {
  const [publicOnly, setPublicOnly] = useState(false);
  const [sortKey, setSortKey] = useState<SaccoSortKey>("interest");
  const { add, remove, isSelected } = useUniversalCompare();

  const filteredAndSorted = useMemo(() => {
    const list = saccos.filter((s) => {
      if (publicOnly && !s.openToPublic) return false;
      return true;
    });

    return list.sort((a, b) => {
      if (sortKey === "interest") return b.interestOnDepositsPct - a.interestOnDepositsPct;
      if (sortKey === "dividend") return b.dividendOnSharesPct - a.dividendOnSharesPct;
      if (sortKey === "assets") return b.totalAssetsKesBillions - a.totalAssetsKesBillions;
      return 0;
    });
  }, [saccos, publicOnly, sortKey]);

  const handleToggleCompare = (s: SaccoRecord) => {
    if (isSelected(s.id)) {
      remove(s.id);
    } else {
      add({
        id: s.id,
        category: "savings",
        title: s.name,
        subtitle: `${s.sasraLicense} • ${s.interestOnDepositsPct}% Rebate`,
        badge: `${s.interestOnDepositsPct}% p.a.`,
        data: s,
      });
    }
  };

  return (
    <div className="space-y-4">
      {/* Filter Section */}
      <div className="space-y-1.5">
        <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground block pl-1">
          Filter
        </span>

        {/* Horizontal Scrolling Pill Buttons */}
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-0.5">
          {/* Eligibility Pills */}
          <button
            type="button"
            onClick={() => setPublicOnly(false)}
            className={`shrink-0 inline-flex items-center px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all whitespace-nowrap cursor-pointer ${
              !publicOnly
                ? "bg-foreground text-background shadow-xs"
                : "border border-border/80 bg-card text-muted-foreground hover:bg-muted/40 hover:text-foreground"
            }`}
          >
            All SACCOs
          </button>
          <button
            type="button"
            onClick={() => setPublicOnly(true)}
            className={`shrink-0 inline-flex items-center px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all whitespace-nowrap cursor-pointer ${
              publicOnly
                ? "bg-foreground text-background shadow-xs"
                : "border border-border/80 bg-card text-muted-foreground hover:bg-muted/40 hover:text-foreground"
            }`}
          >
            Open to Public
          </button>

          <div className="h-4 w-[1px] bg-border/70 shrink-0 mx-0.5" />

          {/* Sort Selector */}
          {[
            { label: "Interest on Deposits", key: "interest" as const },
            { label: "Dividend on Shares", key: "dividend" as const },
            { label: "Asset Size", key: "assets" as const },
          ].map((s) => {
            const active = sortKey === s.key;
            return (
              <button
                key={s.key}
                type="button"
                onClick={() => setSortKey(s.key)}
                className={`shrink-0 inline-flex items-center px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all whitespace-nowrap cursor-pointer ${
                  active
                    ? "bg-foreground text-background shadow-xs"
                    : "border border-border/80 bg-card text-muted-foreground hover:bg-muted/40 hover:text-foreground"
                }`}
              >
                {s.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Desktop Table View */}
      <div className="hidden md:block rounded-2xl border border-border/80 bg-card overflow-hidden shadow-sm">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="border-b border-border bg-muted/40 text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
              <th className="py-3.5 px-4">SACCO Institution</th>
              <th className="py-3.5 px-3 text-right">Interest on Deposits</th>
              <th className="py-3.5 px-3 text-right">Net Return (15% WHT)</th>
              <th className="py-3.5 px-3 text-right">Share Dividend</th>
              <th className="py-3.5 px-3 text-right">Monthly Min</th>
              <th className="py-3.5 px-3">Eligibility</th>
              <th className="py-3.5 px-4 text-center">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/60">
            {filteredAndSorted.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-8 text-center text-muted-foreground">
                  No SACCOs match your selected filter.
                </td>
              </tr>
            ) : (
              filteredAndSorted.map((sacco) => {
                const selected = isSelected(sacco.id);

                return (
                  <tr
                    key={sacco.id}
                    className={`hover:bg-muted/30 transition-colors ${
                      selected ? "bg-emerald-500/[0.04]" : ""
                    }`}
                  >
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2.5">
                        <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-muted/80 text-foreground font-black text-xs shrink-0 border border-border/50">
                          {sacco.code ? sacco.code.slice(0, 3) : <Users className="h-4 w-4" />}
                        </div>
                        <div>
                          <div className="font-bold text-foreground text-sm flex items-center gap-1.5">
                            {sacco.name}
                            {sacco.websiteUrl && (
                              <a
                                href={sacco.websiteUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-muted-foreground hover:text-foreground"
                                title="Visit SACCO Website"
                              >
                                <ExternalLink className="h-3 w-3" />
                              </a>
                            )}
                          </div>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <Badge
                              variant="outline"
                              className="text-[10px] font-semibold py-0 px-1.5 h-4 border-border/70"
                            >
                              {sacco.sasraLicense}
                            </Badge>
                            <span className="text-[10px] text-muted-foreground">
                              Assets: KES {sacco.totalAssetsKesBillions}B
                            </span>
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-3 text-right">
                      <span className="text-sm font-black text-foreground tabular-nums">
                        {sacco.interestOnDepositsPct.toFixed(2)}%
                      </span>
                    </td>
                    <td className="py-3 px-3 text-right">
                      <span className="text-sm font-black text-emerald-600 dark:text-emerald-400 tabular-nums">
                        {sacco.netInterestPct.toFixed(2)}%
                      </span>
                    </td>
                    <td className="py-3 px-3 text-right">
                      <span className="font-bold text-foreground tabular-nums">
                        {sacco.dividendOnSharesPct.toFixed(2)}%
                      </span>
                    </td>
                    <td className="py-3 px-3 text-right">
                      <span className="font-semibold text-foreground tabular-nums">
                        KES {sacco.minMonthlyContribution.toLocaleString()}/mo
                      </span>
                    </td>
                    <td className="py-3 px-3">
                      <span className="text-[11px] text-muted-foreground font-medium block max-w-xs truncate" title={sacco.membershipCategory}>
                        {sacco.openToPublic ? "✓ Public" : "Restricted"}: {sacco.membershipCategory}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <Button
                        type="button"
                        size="sm"
                        variant={selected ? "default" : "outline"}
                        onClick={() => handleToggleCompare(sacco)}
                        className={`h-7 px-2.5 text-xs font-bold rounded-lg ${
                          selected
                            ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                            : "border-border/70 hover:bg-muted"
                        }`}
                      >
                        {selected ? (
                          <>
                            <Check className="h-3 w-3 mr-1" />
                            Added
                          </>
                        ) : (
                          <>
                            <Plus className="h-3 w-3 mr-1" />
                            Compare
                          </>
                        )}
                      </Button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Mobile Card View */}
      <div className="md:hidden space-y-2.5">
        {filteredAndSorted.length === 0 ? (
          <div className="py-8 text-center text-xs text-muted-foreground rounded-2xl border border-dashed border-border p-6">
            No SACCOs match your selected filter.
          </div>
        ) : (
          filteredAndSorted.map((sacco) => {
            const selected = isSelected(sacco.id);

            return (
              <div
                key={sacco.id}
                className={`rounded-2xl border p-4 bg-card transition-all ${
                  selected ? "border-emerald-500/60 bg-emerald-500/[0.04]" : "border-border/80"
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-muted/80 text-foreground font-black text-xs shrink-0 border border-border/50">
                      {sacco.code ? sacco.code.slice(0, 3) : <Users className="h-4 w-4" />}
                    </div>
                    <div>
                      <h4 className="font-extrabold text-foreground text-sm leading-tight">
                        {sacco.name}
                      </h4>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <Badge
                          variant="outline"
                          className="text-[10px] font-semibold py-0 px-1.5 h-4 border-border/70"
                        >
                          {sacco.sasraLicense}
                        </Badge>
                        <span className="text-[10px] text-muted-foreground">
                          {sacco.openToPublic ? "Open to Public" : "Restricted"}
                        </span>
                      </div>
                    </div>
                  </div>

                  <Button
                    type="button"
                    size="sm"
                    variant={selected ? "default" : "outline"}
                    onClick={() => handleToggleCompare(sacco)}
                    className={`h-7 px-2.5 text-xs font-bold rounded-lg ${
                      selected
                        ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                        : "border-border/70 hover:bg-muted"
                    }`}
                  >
                    {selected ? <Check className="h-3 w-3" /> : <Plus className="h-3 w-3" />}
                  </Button>
                </div>

                <div className="mt-3.5 pt-3 border-t border-border/50 grid grid-cols-3 gap-2 text-center">
                  <div>
                    <span className="text-[10px] font-bold text-muted-foreground block uppercase">
                      Interest (Rebate)
                    </span>
                    <span className="text-sm font-black text-foreground tabular-nums">
                      {sacco.interestOnDepositsPct.toFixed(2)}%
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-muted-foreground block uppercase">
                      Net Return
                    </span>
                    <span className="text-sm font-black text-emerald-600 dark:text-emerald-400 tabular-nums">
                      {sacco.netInterestPct.toFixed(2)}%
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-muted-foreground block uppercase">
                      Share Dividend
                    </span>
                    <span className="text-xs font-black text-foreground tabular-nums">
                      {sacco.dividendOnSharesPct.toFixed(2)}%
                    </span>
                  </div>
                </div>

                <div className="mt-2.5 pt-2 border-t border-border/40 text-[11px] text-muted-foreground">
                  <span className="font-semibold text-foreground/80">Membership: </span>
                  {sacco.membershipCategory}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
