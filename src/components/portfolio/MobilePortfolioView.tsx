import { useState, useMemo } from "react";
import { usePortfolio, getCurrentValue, getPnL, getPnLPercent, ASSET_TYPE_LABELS, AssetType, PortfolioItem } from "@/hooks/usePortfolio";
import { usePortfolioChanges } from "@/hooks/usePortfolioChanges";
import { Plus, ShieldCheck, Sparkles, TrendingUp, TrendingDown, Minus, SlidersHorizontal, ArrowUpRight } from "lucide-react";
import AddInvestmentModal from "@/components/portfolio/AddInvestmentModal";
import EditHoldingModal from "@/components/portfolio/EditHoldingModal";
import PortfolioSummaryModal from "@/components/portfolio/PortfolioSummaryModal";
import PortfolioHoldingCard from "@/components/portfolio/PortfolioHoldingCard";

interface MobilePortfolioViewProps {
  currency: "KES" | "USD";
  setCurrency: (c: "KES" | "USD") => void;
}

const CATEGORY_COLORS: Record<AssetType, string> = {
  mmf: "#10B981",       // Emerald Green
  stock: "#6366F1",     // Indigo Blue
  fixed_income: "#F59E0B", // Amber / T-Bills
  fx: "#14B8A6",        // Teal
  commodity: "#6B7280", // Slate Grey
};

const CATEGORY_CHIPS: Array<{ key: "all" | AssetType; label: string }> = [
  { key: "all", label: "All" },
  { key: "mmf", label: "MMF" },
  { key: "stock", label: "Stocks" },
  { key: "fixed_income", label: "T-Bills" },
  { key: "fx", label: "FX" },
  { key: "commodity", label: "Commodities" },
];

const fmtCurrency = (val: number, curr: "KES" | "USD" = "KES") => {
  return new Intl.NumberFormat("en-KE", {
    style: "currency",
    currency: curr,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(val);
};

export default function MobilePortfolioView({ currency, setCurrency }: MobilePortfolioViewProps) {
  const { items, isLoading, addItem, updateItem, deleteItem, totalValue, totalPnL, totalPnLPercent, allocation } = usePortfolio();
  const { changes } = usePortfolioChanges(items);

  const [activeCategory, setActiveCategory] = useState<"all" | AssetType>("all");
  const [editItem, setEditItem] = useState<PortfolioItem | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showSummaryModal, setShowSummaryModal] = useState(false);

  // Calculate allocation percentages
  const allocationShares = useMemo(() => {
    const total = Object.values(allocation).reduce((a, b) => a + b, 0);
    if (total === 0) return [];
    return Object.entries(allocation)
      .filter(([, val]) => val > 0)
      .map(([type, val]) => ({
        type: type as AssetType,
        label: ASSET_TYPE_LABELS[type as AssetType] || type,
        value: val,
        pct: (val / total) * 100,
        color: CATEGORY_COLORS[type as AssetType] || "#6B7280",
      }))
      .sort((a, b) => b.value - a.value);
  }, [allocation]);

  // Filtered holdings
  const filteredItems = useMemo(() => {
    if (activeCategory === "all") return items;
    return items.filter((i) => i.asset_type === activeCategory);
  }, [items, activeCategory]);

  const recentChangePct = useMemo(() => {
    const valid = changes.filter((c) => c.deltaPct != null);
    if (!valid.length) return null;
    return valid.reduce((s, c) => s + (c.deltaPct || 0), 0) / valid.length;
  }, [changes]);

  const isEmpty = !isLoading && items.length === 0;

  return (
    <div className="space-y-5 pb-20 px-3 sm:px-4 pt-2">
      {/* Mobile Title Header */}
      <div className="mb-1">
        <h1 className="text-2xl font-bold text-foreground tracking-tight">Portfolio</h1>
        <p className="text-sm text-muted-foreground mt-1">Track and manage your investments across MMFs, Stocks, T-Bills and FX.</p>
      </div>

      {/* ─── 1. Total Value Summary Card ─── */}
      <div className="bg-card border border-border/75 rounded-3xl p-5 shadow-sm space-y-4 dark:bg-neutral-900/90 dark:border-white/10">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Total value
          </span>
          <div className="flex bg-muted rounded-full p-0.5 border border-border/50 text-[11px] font-semibold dark:bg-neutral-800">
            <button
              onClick={() => setCurrency("KES")}
              className={`px-3 py-1 rounded-full transition-all ${
                currency === "KES"
                  ? "bg-card text-foreground shadow-xs font-bold dark:bg-neutral-700"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              KES
            </button>
            <button
              onClick={() => setCurrency("USD")}
              className={`px-3 py-1 rounded-full transition-all ${
                currency === "USD"
                  ? "bg-card text-foreground shadow-xs font-bold dark:bg-neutral-700"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              USD
            </button>
          </div>
        </div>

        <div>
          <div className="text-2xl sm:text-3xl font-extrabold text-foreground tracking-tight tabular-nums">
            {fmtCurrency(totalValue, currency)}
          </div>
          <div className="flex items-center gap-1.5 mt-1">
            {recentChangePct != null ? (
              <span
                className={`inline-flex items-center gap-1 text-xs font-bold ${
                  recentChangePct >= 0
                    ? "text-emerald-600 dark:text-emerald-400"
                    : "text-rose-600 dark:text-rose-400"
                }`}
              >
                {recentChangePct >= 0 ? (
                  <TrendingUp className="h-3.5 w-3.5" />
                ) : (
                  <TrendingDown className="h-3.5 w-3.5" />)}
                {recentChangePct >= 0 ? "+" : ""}
                {recentChangePct.toFixed(2)}% today
              </span>
            ) : (
              <span
                className={`inline-flex items-center gap-1 text-xs font-bold ${
                  totalPnL >= 0
                    ? "text-emerald-600 dark:text-emerald-400"
                    : "text-rose-600 dark:text-rose-400"
                }`}
              >
                {totalPnL >= 0 ? <TrendingUp className="h-3.5 w-3.5" /> : <TrendingDown className="h-3.5 w-3.5" />}
                {totalPnL >= 0 ? "+" : ""}
                {totalPnLPercent.toFixed(2)}% total
              </span>
            )}
            <span className="text-xs text-muted-foreground font-medium">
              ({fmtCurrency(totalPnL, currency)})
            </span>
          </div>
        </div>

        {/* Multi-segment Allocation Bar */}
        {allocationShares.length > 0 && (
          <div>
            <div className="h-2.5 rounded-full overflow-hidden flex gap-0.5 bg-muted/60 dark:bg-neutral-800">
              {allocationShares.map((item) => (
                <div
                  key={item.type}
                  style={{ width: `${Math.max(item.pct, 2)}%`, backgroundColor: item.color }}
                  className="h-full transition-all duration-300 first:rounded-l-full last:rounded-r-full"
                  title={`${item.label}: ${item.pct.toFixed(1)}%`}
                />
              ))}
            </div>

            {/* Allocation Legend */}
            <div className="flex flex-wrap gap-x-3.5 gap-y-1.5 text-xs text-muted-foreground font-medium mt-3">
              {allocationShares.map((item) => (
                <span key={item.type} className="inline-flex items-center gap-1.5">
                  <span
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: item.color }}
                  />
                  <span>
                    {item.type === "fixed_income" ? "T-Bills" : item.type === "stock" ? "Stocks" : item.type.toUpperCase()}{" "}
                    <strong className="text-foreground font-semibold">{item.pct.toFixed(0)}%</strong>
                  </span>
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex items-center gap-3 pt-1">
          <button
            onClick={() => setShowAddModal(true)}
            className="flex-1 bg-[#00A651] hover:bg-[#008f45] active:scale-[0.99] text-white font-semibold rounded-full px-4 py-3 text-xs sm:text-sm flex items-center justify-center gap-2 shadow-sm transition-all"
          >
            <Plus className="h-4 w-4 stroke-[3]" />
            Add investment
          </button>

          <button
            onClick={() => setShowSummaryModal(true)}
            className="border border-border/90 hover:bg-muted/50 active:scale-[0.99] text-foreground font-semibold rounded-full px-5 py-3 text-xs sm:text-sm flex items-center justify-center transition-all dark:border-white/20"
          >
            Report
          </button>
        </div>

        {/* Sub-note */}
        <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground/80 pt-3 border-t border-border/40">
          <ShieldCheck className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
          <span>100% mock — no real money, live Kenyan market data.</span>
        </div>
      </div>

      {/* ─── 2. Holdings Section ─── */}
      <div className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <h2 className="text-base font-bold text-foreground flex items-center gap-1.5">
            Holdings <span className="text-muted-foreground font-semibold text-sm">({items.length})</span>
          </h2>
          <button
            onClick={() => setShowSummaryModal(true)}
            className="text-xs font-bold text-[#00A651] hover:underline flex items-center gap-0.5"
          >
            Manage
          </button>
        </div>

        {/* Horizontal Category Scroll */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none -mx-1 px-1">
          {CATEGORY_CHIPS.map((chip) => {
            const isActive = activeCategory === chip.key;
            return (
              <button
                key={chip.key}
                onClick={() => setActiveCategory(chip.key)}
                className={`whitespace-nowrap rounded-full px-4 py-1.5 text-xs font-semibold transition-all shrink-0 ${
                  isActive
                    ? "bg-[#00A651] text-white shadow-xs"
                    : "bg-card border border-border/80 text-muted-foreground hover:text-foreground dark:bg-neutral-900 dark:border-white/10"
                }`}
              >
                {chip.label}
              </button>
            );
          })}
        </div>

        {/* Holdings Cards List */}
        {isEmpty ? (
          <div className="bg-card border border-dashed border-border rounded-2xl p-6 text-center text-sm text-muted-foreground space-y-3 dark:bg-neutral-900/50">
            <p>No holdings added in this category.</p>
            <button
              onClick={() => setShowAddModal(true)}
              className="inline-flex items-center gap-1.5 bg-[#00A651] text-white font-semibold text-xs px-4 py-2 rounded-full shadow-xs"
            >
              <Plus className="h-3.5 w-3.5" /> Add First Holding
            </button>
          </div>
        ) : (
          <div className="space-y-2.5">
            {filteredItems.map((item) => {
              const itemChange = changes.find((c) => c.itemId === item.id);
              return (
                <PortfolioHoldingCard
                  key={item.id}
                  item={item}
                  currency={currency}
                  totalValue={totalValue}
                  change={itemChange}
                  onClick={(item) => setEditItem(item)}
                />
              );
            })}
          </div>
        )}
      </div>





      {/* Modals */}
      <AddInvestmentModal
        open={showAddModal}
        onOpenChange={setShowAddModal}
        onAdd={(item) => {
          addItem.mutate(item);
          setShowAddModal(false);
        }}
        isPending={addItem.isPending}
      />

      <EditHoldingModal
        item={editItem}
        open={!!editItem}
        onOpenChange={(o) => {
          if (!o) setEditItem(null);
        }}
        onSave={(id, payload) => {
          updateItem.mutate(
            { id, patch: payload, note: payload.notes },
            { onSuccess: () => setEditItem(null) }
          );
        }}
        onDelete={(id) => {
          deleteItem.mutate(id, { onSuccess: () => setEditItem(null) });
        }}
        isPending={updateItem.isPending || deleteItem.isPending}
      />

      <PortfolioSummaryModal
        open={showSummaryModal}
        onOpenChange={setShowSummaryModal}
        currency={currency}
      />
    </div>
  );
}
