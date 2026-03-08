import { X, BarChart3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCompare } from "@/hooks/useCompare";

const CompareBar = () => {
  const { selected, remove, clear, setIsOpen } = useCompare();

  if (selected.length === 0) return null;

  return (
    <div className="fixed bottom-0 inset-x-0 z-50 border-t border-border bg-card/95 backdrop-blur-md shadow-lg animate-in slide-in-from-bottom-4">
      <div className="container max-w-7xl py-3 flex items-center gap-3">
        <div className="flex items-center gap-1.5 mr-2">
          <BarChart3 className="h-4 w-4 text-accent" />
          <span className="text-sm font-semibold hidden sm:inline">Compare</span>
          <span className="text-xs text-muted-foreground">({selected.length}/4)</span>
        </div>

        <div className="flex-1 flex items-center gap-2 overflow-x-auto scrollbar-hide">
          {selected.map((fund) => (
            <div
              key={fund.id}
              className="flex items-center gap-1.5 rounded-full bg-muted px-3 py-1.5 text-xs font-medium whitespace-nowrap shrink-0"
            >
              <span className="max-w-[120px] sm:max-w-[180px] truncate">{fund.name}</span>
              <button
                onClick={() => remove(fund.id)}
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Button
            variant="ghost"
            size="sm"
            onClick={clear}
            className="text-xs h-8"
          >
            Clear
          </Button>
          <Button
            size="sm"
            onClick={() => setIsOpen(true)}
            disabled={selected.length < 2}
            className="h-8 text-xs bg-accent text-accent-foreground hover:bg-accent/90"
          >
            Compare {selected.length >= 2 ? `(${selected.length})` : ""}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default CompareBar;
