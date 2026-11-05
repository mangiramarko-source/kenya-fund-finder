import { useState, useMemo } from "react";
import { ShieldCheck, Plus, Check, ExternalLink, ArrowUpDown, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useTreasuryData, type TBillAuction, type TreasuryBond } from "@/hooks/useTreasuryData";
import { useUniversalCompare } from "@/hooks/useUniversalCompare";

type SecurityFilter = "all" | "tbills" | "tax-free" | "bonds";

export const TreasurySavingsTable = () => {
  const { data, isLoading } = useTreasuryData();
  const [filter, setFilter] = useState<SecurityFilter>("all");
  const { add, remove, isSelected } = useUniversalCompare();

  const tbills = useMemo(() => data?.tbills || [], [data?.tbills]);
  const bonds = useMemo(() => data?.bonds || [], [data?.bonds]);

  const filteredTbills = useMemo(() => {
    if (filter === "tax-free" || filter === "bonds") return [];
    return tbills;
  }, [tbills, filter]);

  const filteredBonds = useMemo(() => {
    if (filter === "tbills") return [];
    if (filter === "tax-free") {
      return bonds.filter(
        (b) =>
          b.status === "Tax-Free" ||
          b.name?.toLowerCase().includes("infrastructure") ||
          b.issueNo?.toLowerCase().startsWith("ifb")
      );
    }
    return bonds;
  }, [bonds, filter]);

  const handleToggleCompareTbill = (t: TBillAuction) => {
    const id = `tbill-${t.days}d`;
    if (isSelected(id)) {
      remove(id);
    } else {
      add({
        id,
        category: "savings",
        title: `CBK ${t.type} Treasury Bill`,
        subtitle: `Government Sovereign Debt (${t.days} Days)`,
        badge: `${t.averageYield.toFixed(2)}% p.a.`,
        data: t,
      });
    }
  };

  const handleToggleCompareBond = (b: TreasuryBond) => {
    const id = `bond-${b.issueNo}`;
    if (isSelected(id)) {
      remove(id);
    } else {
      add({
        id,
        category: "savings",
        title: `${b.issueNo} Treasury Bond`,
        subtitle: `${b.tenorYears}Y ${b.status === "Tax-Free" ? "Tax-Free IFB" : "Fixed Coupon"}`,
        badge: `${b.couponRate.toFixed(2)}% p.a.`,
        data: b,
      });
    }
  };

  if (isLoading) {
    return (
      <div className="py-12 text-center text-sm text-muted-foreground animate-pulse">
        Loading latest Central Bank of Kenya (CBK) auction data...
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filter Section */}
      <div className="space-y-1.5">
        <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground block pl-1">
          Filter Securities
        </span>

        {/* Horizontal Scrolling Pill Buttons */}
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-0.5">
          {[
            { label: "All Government Securities", key: "all" as const },
            { label: "T-Bills (91D / 182D / 364D)", key: "tbills" as const },
            { label: "Tax-Free Infrastructure Bonds (IFB)", key: "tax-free" as const },
            { label: "Fixed Coupon Bonds", key: "bonds" as const },
          ].map((tab) => {
            const active = filter === tab.key;
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => setFilter(tab.key)}
                className={`shrink-0 inline-flex items-center px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all whitespace-nowrap cursor-pointer ${
                  active
                    ? "bg-foreground text-background shadow-xs"
                    : "border border-border/80 bg-card text-muted-foreground hover:bg-muted/40 hover:text-foreground"
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* DhowCSD Quick Notice Card */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-4 text-xs">
        <div className="flex items-start gap-2.5">
          <ShieldCheck className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
          <div className="space-y-0.5">
            <p className="font-bold text-foreground">Direct Sovereign Debt via CBK DhowCSD</p>
            <p className="text-muted-foreground leading-relaxed">
              T-Bills have a 15% Withholding Tax deducted at source. Infrastructure Bonds (IFBs) are 100% tax-exempt. Minimum: KES 100,000 for T-Bills; KES 50,000 for Bonds.
            </p>
          </div>
        </div>
        <a
          href="https://dhowcsd.centralbank.go.ke/"
          target="_blank"
          rel="noopener noreferrer"
          className="shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold transition-all text-xs"
        >
          <span>Open DhowCSD</span>
          <ExternalLink className="h-3 w-3" />
        </a>
      </div>

      {/* Desktop Table View */}
      <div className="hidden md:block rounded-2xl border border-border/80 bg-card overflow-hidden shadow-xs">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="border-b border-border bg-muted/40 text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
              <th className="py-3.5 px-4">Security Type</th>
              <th className="py-3.5 px-3 text-right">Gross Yield / Coupon</th>
              <th className="py-3.5 px-3 text-right">Net Return (after WHT)</th>
              <th className="py-3.5 px-3 text-right">Min Investment</th>
              <th className="py-3.5 px-3">Tax Status</th>
              <th className="py-3.5 px-4 text-center">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/60">
            {/* T-Bills */}
            {filteredTbills.map((t) => {
              const netYield = (t.averageYield * 0.85).toFixed(2);
              const isComp = isSelected(`tbill-${t.days}d`);
              return (
                <tr key={t.id} className="hover:bg-muted/30 transition-colors">
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2">
                      <div className="flex h-7 w-7 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold text-xs shrink-0">
                        {t.days}d
                      </div>
                      <div>
                        <span className="font-bold text-foreground block">
                          CBK {t.type} Treasury Bill
                        </span>
                        <span className="text-[11px] text-muted-foreground">
                          Auction: {t.auctionDate} • Tenor: {t.days} Days
                        </span>
                      </div>
                    </div>
                  </td>
                  <td className="py-3 px-3 text-right font-black text-foreground tabular-nums text-sm">
                    {t.averageYield.toFixed(2)}%
                  </td>
                  <td className="py-3 px-3 text-right font-black text-emerald-600 dark:text-emerald-400 tabular-nums text-sm">
                    {netYield}%
                  </td>
                  <td className="py-3 px-3 text-right font-bold text-foreground tabular-nums">
                    KES 100,000
                  </td>
                  <td className="py-3 px-3">
                    <Badge variant="outline" className="text-[10px] bg-muted/50 border-border/70 font-semibold">
                      15% WHT Deducted
                    </Badge>
                  </td>
                  <td className="py-3 px-4 text-center">
                    <Button
                      size="sm"
                      variant={isComp ? "default" : "outline"}
                      onClick={() => handleToggleCompareTbill(t)}
                      className={`h-7 px-2.5 text-xs font-bold rounded-lg ${
                        isComp
                          ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                          : "border-border/80 hover:bg-muted"
                      }`}
                    >
                      {isComp ? <Check className="h-3 w-3 mr-1" /> : <Plus className="h-3 w-3 mr-1" />}
                      {isComp ? "Added" : "Compare"}
                    </Button>
                  </td>
                </tr>
              );
            })}

            {/* Treasury Bonds */}
            {filteredBonds.map((b) => {
              const isTaxFree = b.status === "Tax-Free" || b.name?.toLowerCase().includes("infrastructure");
              const netYield = isTaxFree ? b.couponRate.toFixed(2) : (b.couponRate * 0.85).toFixed(2);
              const isComp = isSelected(`bond-${b.issueNo}`);
              return (
                <tr key={b.id} className="hover:bg-muted/30 transition-colors">
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2">
                      <div className="flex h-7 w-7 items-center justify-center rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 font-bold text-xs shrink-0">
                        {b.tenorYears}Y
                      </div>
                      <div>
                        <span className="font-bold text-foreground block">
                          {b.issueNo} Treasury Bond
                        </span>
                        <span className="text-[11px] text-muted-foreground">
                          {b.name || `Matures ${b.maturityDate}`}
                        </span>
                      </div>
                    </div>
                  </td>
                  <td className="py-3 px-3 text-right font-black text-foreground tabular-nums text-sm">
                    {b.couponRate.toFixed(2)}%
                  </td>
                  <td className="py-3 px-3 text-right font-black text-emerald-600 dark:text-emerald-400 tabular-nums text-sm">
                    {netYield}%
                  </td>
                  <td className="py-3 px-3 text-right font-bold text-foreground tabular-nums">
                    KES 50,000
                  </td>
                  <td className="py-3 px-3">
                    {isTaxFree ? (
                      <Badge className="text-[10px] bg-emerald-600 text-white font-bold">
                        100% Tax-Free
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-[10px] bg-muted/50 border-border/70 font-semibold">
                        15% WHT
                      </Badge>
                    )}
                  </td>
                  <td className="py-3 px-4 text-center">
                    <Button
                      size="sm"
                      variant={isComp ? "default" : "outline"}
                      onClick={() => handleToggleCompareBond(b)}
                      className={`h-7 px-2.5 text-xs font-bold rounded-lg ${
                        isComp
                          ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                          : "border-border/80 hover:bg-muted"
                      }`}
                    >
                      {isComp ? <Check className="h-3 w-3 mr-1" /> : <Plus className="h-3 w-3 mr-1" />}
                      {isComp ? "Added" : "Compare"}
                    </Button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Mobile Card View */}
      <div className="md:hidden space-y-3">
        {/* T-Bills */}
        {filteredTbills.map((t) => {
          const netYield = (t.averageYield * 0.85).toFixed(2);
          const isComp = isSelected(`tbill-${t.days}d`);
          return (
            <div
              key={t.id}
              className="rounded-2xl border border-border/80 bg-card p-4 space-y-3 shadow-xs"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <span className="font-bold text-foreground text-sm block">
                    CBK {t.type} Treasury Bill
                  </span>
                  <span className="text-xs text-muted-foreground">
                    Auction: {t.auctionDate} • Tenor: {t.days} Days
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-base font-black text-emerald-600 dark:text-emerald-400 block tabular-nums">
                    {netYield}%
                  </span>
                  <span className="text-[10px] text-muted-foreground uppercase font-bold">
                    Net Take-Home
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-border/60 text-xs">
                <div>
                  <span className="text-muted-foreground block text-[11px]">Gross CBK Yield</span>
                  <span className="font-bold text-foreground tabular-nums">{t.averageYield.toFixed(2)}% p.a.</span>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[11px]">Min Deposit</span>
                  <span className="font-bold text-foreground tabular-nums">KES 100,000</span>
                </div>
              </div>

              <div className="flex items-center justify-between pt-1">
                <Badge variant="outline" className="text-[10px] bg-muted/50 border-border/70 font-semibold">
                  15% WHT Deducted
                </Badge>
                <Button
                  size="sm"
                  variant={isComp ? "default" : "outline"}
                  onClick={() => handleToggleCompareTbill(t)}
                  className={`h-7 px-3 text-xs font-bold rounded-lg ${
                    isComp
                      ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                      : "border-border/80 hover:bg-muted"
                  }`}
                >
                  {isComp ? <Check className="h-3 w-3 mr-1" /> : <Plus className="h-3 w-3 mr-1" />}
                  {isComp ? "Added" : "Compare"}
                </Button>
              </div>
            </div>
          );
        })}

        {/* Treasury Bonds */}
        {filteredBonds.map((b) => {
          const isTaxFree = b.status === "Tax-Free" || b.name?.toLowerCase().includes("infrastructure");
          const netYield = isTaxFree ? b.couponRate.toFixed(2) : (b.couponRate * 0.85).toFixed(2);
          const isComp = isSelected(`bond-${b.issueNo}`);
          return (
            <div
              key={b.id}
              className="rounded-2xl border border-border/80 bg-card p-4 space-y-3 shadow-xs"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <span className="font-bold text-foreground text-sm block">
                    {b.issueNo} Treasury Bond
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {b.name || `Matures ${b.maturityDate}`}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-base font-black text-emerald-600 dark:text-emerald-400 block tabular-nums">
                    {netYield}%
                  </span>
                  <span className="text-[10px] text-muted-foreground uppercase font-bold">
                    {isTaxFree ? "Tax-Free Yield" : "Net Take-Home"}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-border/60 text-xs">
                <div>
                  <span className="text-muted-foreground block text-[11px]">Gross Coupon</span>
                  <span className="font-bold text-foreground tabular-nums">{b.couponRate.toFixed(2)}% p.a.</span>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[11px]">Min Deposit</span>
                  <span className="font-bold text-foreground tabular-nums">KES 50,000</span>
                </div>
              </div>

              <div className="flex items-center justify-between pt-1">
                {isTaxFree ? (
                  <Badge className="text-[10px] bg-emerald-600 text-white font-bold">
                    100% Tax-Free IFB
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-[10px] bg-muted/50 border-border/70 font-semibold">
                    15% WHT Deducted
                  </Badge>
                )}
                <Button
                  size="sm"
                  variant={isComp ? "default" : "outline"}
                  onClick={() => handleToggleCompareBond(b)}
                  className={`h-7 px-3 text-xs font-bold rounded-lg ${
                    isComp
                      ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                      : "border-border/80 hover:bg-muted"
                  }`}
                >
                  {isComp ? <Check className="h-3 w-3 mr-1" /> : <Plus className="h-3 w-3 mr-1" />}
                  {isComp ? "Added" : "Compare"}
                </Button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default TreasurySavingsTable;