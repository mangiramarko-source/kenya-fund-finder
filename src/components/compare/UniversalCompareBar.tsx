import { X, GitCompareArrows } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useUniversalCompare, type CompareAssetCategory } from "@/hooks/useUniversalCompare";

const CATEGORY_TAGS: Record<CompareAssetCategory, string> = {
  fund: "Funds",
  stock: "Stocks",
  currency: "FX",
  commodity: "Commodities",
};

export const UniversalCompareBar = () => {
  const { selected, category, remove, clear, setIsOpen } = useUniversalCompare();

  if (selected.length === 0 || !category) return null;

  const categoryName = CATEGORY_TAGS[category] || "Items";
  const canCompare = selected.length >= 2;

  return (
    <div className="fixed bottom-20 md:bottom-6 inset-x-4 max-w-xl mx-auto z-40 animate-in slide-in-from-bottom-5 duration-300">
      <div className="rounded-2xl border border-border/80 bg-card/95 backdrop-blur-md p-2.5 shadow-2xl flex items-center gap-2 dark:bg-neutral-900/95 dark:border-white/10">
        {/* Category Indicator Badge */}
        <div className="shrink-0 flex items-center gap-1.5 pl-1.5 pr-2 border-r border-border/60">
          <div className="flex h-7 w-7 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
            <GitCompareArrows className="h-4 w-4" />
          </div>
          <div className="hidden sm:block">
            <span className="text-xs font-bold text-foreground block leading-tight">
              {categoryName}
            </span>
            <span className="text-[10px] text-muted-foreground font-semibold">
              {selected.length}/4 selected
            </span>
          </div>
        </div>

        {/* Selected Item Pills */}
        <div className="flex-1 flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
          {selected.map((item) => (
            <div
              key={item.id}
              className="inline-flex items-center gap-1 rounded-full bg-muted/80 pl-2.5 pr-1.5 py-1 text-xs font-semibold whitespace-nowrap shrink-0 border border-border/60"
            >
              <span className="max-w-[100px] truncate text-foreground">{item.subtitle || item.title}</span>
              <button
                type="button"
                onClick={() => remove(item.id)}
                className="h-4 w-4 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted"
                aria-label={`Remove ${item.title}`}
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>

        {/* Actions: Clear & Compare CTA */}
        <div className="shrink-0 flex items-center gap-1.5">
          <Button
            variant="ghost"
            size="sm"
            onClick={clear}
            className="h-8 px-2 text-xs font-semibold text-muted-foreground hover:text-foreground rounded-full"
          >
            Clear
          </Button>
          <Button
            size="sm"
            onClick={() => setIsOpen(true)}
            disabled={!canCompare}
            className="h-8 px-3.5 text-xs font-bold rounded-full bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm disabled:opacity-50"
          >
            Compare {canCompare ? `(${selected.length})` : "peers"}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default UniversalCompareBar;
