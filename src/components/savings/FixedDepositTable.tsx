import { useState, useMemo } from "react";
import { Search, SlidersHorizontal, Plus, Check, Landmark, ExternalLink, Shield } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { BankFixedDeposit } from "@/types/savings";
import { useUniversalCompare } from "@/hooks/useUniversalCompare";

interface FixedDepositTableProps {
  deposits: BankFixedDeposit[];
}

export const FixedDepositTable = ({ deposits }: FixedDepositTableProps) => {
  const [search, setSearch] = useState("");
  const [currency, setCurrency] = useState<"KES" | "USD">("KES");
  const [tenorFilter, setTenorFilter] = useState<number | "all">(12);
  const [tierFilter, setTierFilter] = useState<number | "all">("all");
  const { add, remove, isSelected } = useUniversalCompare();

  const filtered = useMemo(() => {
    return deposits.filter((d) => {
      if (d.currency !== currency) return false;
      if (tenorFilter !== "all" && d.tenorMonths !== tenorFilter) return false;
      if (tierFilter !== "all" && d.bankTier !== tierFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        return d.bankName.toLowerCase().includes(q) || (d.bankCode && d.bankCode.toLowerCase().includes(q));
      }
      return true;
    });
  }, [deposits, currency, tenorFilter, tierFilter, search]);

  const handleToggleCompare = (d: BankFixedDeposit) => {
    if (isSelected(d.id)) {
      remove(d.id);
    } else {
      add({
        id: d.id,
        category: "savings",
        title: d.bankName,
        subtitle: `${d.tenorMonths}M Fixed Deposit (${d.currency})`,
        badge: `${d.grossYieldPct}% p.a.`,
        data: d,
      });
    }
  };

  return (
    <div className="space-y-4">
      {/* Search & Filter Controls */}
      <div className="bg-card/60 p-3 sm:p-4 rounded-2xl border border-border/70 backdrop-blur-md space-y-3">
        {/* Search */}
        <div className="relative w-full max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search bank name..."
            className="pl-10 h-9 sm:h-10 text-xs sm:text-sm rounded-full bg-background border-border/80"
          />
        </div>

        {/* Filter Section */}
        <div className="space-y-1.5">
          <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground block pl-1">
            Filter
          </span>

          {/* Horizontal Scrolling Pill Buttons */}
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-0.5">
            {/* Currency Pills */}
            {(["KES", "USD"] as const).map((curr) => {
              const active = currency === curr;
              return (
                <button
                  key={curr}
                  type="button"
                  onClick={() => setCurrency(curr)}
                  className={`shrink-0 inline-flex items-center px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all whitespace-nowrap cursor-pointer ${
                    active
                      ? "bg-foreground text-background shadow-xs"
                      : "border border-border/80 bg-background text-muted-foreground hover:bg-muted/40 hover:text-foreground"
                  }`}
                >
                  {curr}
                </button>
              );
            })}

            <div className="h-4 w-[1px] bg-border/70 shrink-0 mx-0.5" />

            {/* Tenor Pills */}
            {[
              { label: "All Tenors", val: "all" as const },
              { label: "3M", val: 3 as const },
              { label: "6M", val: 6 as const },
              { label: "12M", val: 12 as const },
            ].map((t) => {
              const active = tenorFilter === t.val;
              return (
                <button
                  key={String(t.val)}
                  type="button"
                  onClick={() => setTenorFilter(t.val)}
                  className={`shrink-0 inline-flex items-center px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all whitespace-nowrap cursor-pointer ${
                    active
                      ? "bg-foreground text-background shadow-xs"
                      : "border border-border/80 bg-background text-muted-foreground hover:bg-muted/40 hover:text-foreground"
                  }`}
                >
                  {t.label}
                </button>
              );
            })}

            <div className="h-4 w-[1px] bg-border/70 shrink-0 mx-0.5" />

            {/* Tier Filter Pills */}
            {[
              { label: "All Tiers", val: "all" as const },
              { label: "Tier 1", val: 1 as const },
              { label: "Tier 2", val: 2 as const },
            ].map((tier) => {
              const active = tierFilter === tier.val;
              return (
                <button
                  key={String(tier.val)}
                  type="button"
                  onClick={() => setTierFilter(tier.val)}
                  className={`shrink-0 inline-flex items-center px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all whitespace-nowrap cursor-pointer ${
                    active
                      ? "bg-foreground text-background shadow-xs"
                      : "border border-border/80 bg-background text-muted-foreground hover:bg-muted/40 hover:text-foreground"
                  }`}
                >
                  {tier.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Desktop Table View */}
      <div className="hidden md:block rounded-2xl border border-border/80 bg-card overflow-hidden shadow-sm">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="border-b border-border bg-muted/40 text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
              <th className="py-3.5 px-4">Bank Institution</th>
              <th className="py-3.5 px-3">Tenor</th>
              <th className="py-3.5 px-3 text-right">Gross Yield (p.a.)</th>
              <th className="py-3.5 px-3 text-right">Net Return (after 15% WHT)</th>
              <th className="py-3.5 px-3 text-right">Min Deposit</th>
              <th className="py-3.5 px-3">Payout</th>
              <th className="py-3.5 px-4 text-center">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/60">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-8 text-center text-muted-foreground">
                  No bank fixed deposits match your selected filters.
                </td>
              </tr>
            ) : (
              filtered.map((deposit) => {
                const selected = isSelected(deposit.id);

                return (
                  <tr
                    key={deposit.id}
                    className={`hover:bg-muted/30 transition-colors ${
                      selected ? "bg-emerald-500/[0.04]" : ""
                    }`}
                  >
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2.5">
                        <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-muted/80 text-foreground font-black text-xs shrink-0 border border-border/50">
                          {deposit.bankCode ? deposit.bankCode.slice(0, 3) : <Landmark className="h-4 w-4" />}
                        </div>
                        <div>
                          <div className="font-bold text-foreground text-sm flex items-center gap-1.5">
                            {deposit.bankName}
                            {deposit.websiteUrl && (
                              <a
                                href={deposit.websiteUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-muted-foreground hover:text-foreground"
                                title="Visit Bank Website"
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
                              Tier {deposit.bankTier}
                            </Badge>
                            <span className="text-[10px] text-muted-foreground">
                              KDIC Insured
                            </span>
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-3">
                      <span className="font-extrabold text-foreground">
                        {deposit.tenorMonths} Months
                      </span>
                    </td>
                    <td className="py-3 px-3 text-right">
                      <span className="text-sm font-black text-foreground tabular-nums">
                        {deposit.grossYieldPct.toFixed(2)}%
                      </span>
                    </td>
                    <td className="py-3 px-3 text-right">
                      <span className="text-sm font-black text-emerald-600 dark:text-emerald-400 tabular-nums">
                        {deposit.netYieldPct.toFixed(2)}%
                      </span>
                    </td>
                    <td className="py-3 px-3 text-right">
                      <span className="font-semibold text-foreground tabular-nums">
                        {deposit.currency} {deposit.minDeposit.toLocaleString()}
                      </span>
                    </td>
                    <td className="py-3 px-3">
                      <span className="capitalize text-muted-foreground font-medium text-[11px]">
                        At {deposit.payoutFrequency}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <Button
                        type="button"
                        size="sm"
                        variant={selected ? "default" : "outline"}
                        onClick={() => handleToggleCompare(deposit)}
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
        {filtered.length === 0 ? (
          <div className="py-8 text-center text-xs text-muted-foreground rounded-2xl border border-dashed border-border p-6">
            No bank fixed deposits match your selected filters.
          </div>
        ) : (
          filtered.map((deposit) => {
            const selected = isSelected(deposit.id);

            return (
              <div
                key={deposit.id}
                className={`rounded-2xl border p-4 bg-card transition-all ${
                  selected ? "border-emerald-500/60 bg-emerald-500/[0.04]" : "border-border/80"
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-muted/80 text-foreground font-black text-xs shrink-0 border border-border/50">
                      {deposit.bankCode ? deposit.bankCode.slice(0, 3) : <Landmark className="h-4 w-4" />}
                    </div>
                    <div>
                      <h4 className="font-extrabold text-foreground text-sm leading-tight">
                        {deposit.bankName}
                      </h4>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <Badge
                          variant="outline"
                          className="text-[10px] font-semibold py-0 px-1.5 h-4 border-border/70"
                        >
                          Tier {deposit.bankTier}
                        </Badge>
                        <span className="text-[10px] text-muted-foreground">
                          {deposit.tenorMonths}M Lock-in
                        </span>
                      </div>
                    </div>
                  </div>

                  <Button
                    type="button"
                    size="sm"
                    variant={selected ? "default" : "outline"}
                    onClick={() => handleToggleCompare(deposit)}
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
                      Gross Yield
                    </span>
                    <span className="text-sm font-black text-foreground tabular-nums">
                      {deposit.grossYieldPct.toFixed(2)}%
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-muted-foreground block uppercase">
                      Net (WHT)
                    </span>
                    <span className="text-sm font-black text-emerald-600 dark:text-emerald-400 tabular-nums">
                      {deposit.netYieldPct.toFixed(2)}%
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-muted-foreground block uppercase">
                      Min Deposit
                    </span>
                    <span className="text-xs font-bold text-foreground tabular-nums">
                      {deposit.currency} {deposit.minDeposit >= 1000 ? `${deposit.minDeposit / 1000}k` : deposit.minDeposit}
                    </span>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
